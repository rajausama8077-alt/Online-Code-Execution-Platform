require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validateRunInput } = require("./validateSubmission");
const { codeRunQueue } = require("./queues/codeRunQueue");
const { startCodeRunWorker } = require("./workers/codeRunWorker");
const { query } = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "256kb" }));

/** Start BullMQ worker as soon as the API process boots (processes `code-run` jobs). */
const worker = startCodeRunWorker();
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

function getAuthUserFromRequest(req) {
  const auth = req.headers?.authorization;
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getAuthUserFromRequest(req);
  if (!user || typeof user.id !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.authUser = user;
  return next();
}

async function requireAdmin(req, res, next) {
  const user = getAuthUserFromRequest(req);
  if (!user || typeof user.id !== "number") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await query(
      "SELECT id, username, email, role FROM users WHERE id = $1 LIMIT 1",
      [user.id],
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const dbUser = result.rows[0];
    if (dbUser.role !== "admin") {
      return res.status(403).json({ error: "Access Denied" });
    }
    req.authUser = dbUser;
    return next();
  } catch (err) {
    console.error("[requireAdmin] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to verify admin role" });
  }
}

async function saveSubmissionForCompletedJob(job, userId, result) {
  const savedFor = Array.isArray(job?.data?.savedSubmissionUserIds)
    ? job.data.savedSubmissionUserIds
    : [];
  if (savedFor.includes(userId)) return;

  const code = typeof job?.data?.code === "string" ? job.data.code : "";
  const language = typeof job?.data?.language === "string" ? job.data.language : "";
  const stdin = typeof job?.data?.stdin === "string" ? job.data.stdin : "";
  const problemId = Number.isInteger(job?.data?.problemId) ? job.data.problemId : null;

  const stdout = typeof result?.stdout === "string" ? result.stdout : "";
  const stderr = typeof result?.stderr === "string" ? result.stderr : "";
  const exitCode = typeof result?.exitCode === "number" ? result.exitCode : 1;
  const status = exitCode === 0 ? (stderr.trim() ? "wrong_answer" : "accepted") : "error";

  await query(
    `INSERT INTO submissions
      (user_id, problem_id, code, language, stdin, stdout, stderr, exit_code, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, problemId, code, language, stdin, stdout, stderr, exitCode, status],
  );

  await job.updateData({
    ...job.data,
    savedSubmissionUserIds: [...savedFor, userId],
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, queue: "code-run" });
});

app.get("/ping", (req, res) => res.json({ ok: true }));

app.post("/api/register", async (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash],
    );

    const user = inserted.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("[/api/register] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await query(
      "SELECT id, username, email, role, password, created_at FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
    };
    console.log("user role:", user.role);
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.json({ token, user });
  } catch (err) {
    console.error("[/api/login] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to login user" });
  }
});

app.get("/api/problems", async (_req, res) => {
  try {
    const result = await query("SELECT * FROM problems ORDER BY id");
    return res.json(result.rows);
  } catch (err) {
    console.error("[/api/problems] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch problems" });
  }
});

app.get("/api/problems/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("SELECT * FROM problems WHERE id = $1", [id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: "Problem not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("[/api/problems/:id] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch problem" });
  }
});

app.get("/api/admin/problems", requireAdmin, async (_req, res) => {
  try {
    const result = await query("SELECT * FROM problems ORDER BY id DESC");
    return res.json(result.rows);
  } catch (err) {
    console.error("[/api/admin/problems GET] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch problems" });
  }
});

app.post("/api/admin/problems", requireAdmin, async (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const difficulty = String(req.body?.difficulty ?? "").trim().toLowerCase();
  const exampleInput = String(req.body?.example_input ?? "");
  const exampleOutput = String(req.body?.example_output ?? "");
  const constraints = String(req.body?.constraints ?? "");

  if (!title || !description || !difficulty) {
    return res.status(400).json({
      error: "title, description and difficulty are required",
    });
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({ error: "difficulty must be easy, medium, or hard" });
  }

  try {
    const result = await query(
      `INSERT INTO problems
        (title, description, difficulty, example_input, example_output, constraints)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, difficulty, exampleInput, exampleOutput, constraints],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[/api/admin/problems POST] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to create problem" });
  }
});

app.get("/api/leaderboard", async (_req, res) => {
  try {
    const result = await query(
      `SELECT
         u.username,
         COUNT(s.id) AS solved
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'accepted'
       GROUP BY u.username
       ORDER BY solved DESC
       LIMIT 20`,
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("[/api/leaderboard] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.get("/api/submissions", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         s.id,
         s.user_id,
         s.problem_id,
         s.code,
         s.language,
         s.stdin,
         s.stdout,
         s.stderr,
         s.exit_code,
         s.status,
         s.created_at,
         p.title AS problem_title
       FROM submissions s
       LEFT JOIN problems p ON p.id = s.problem_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.authUser.id],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("[/api/submissions] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

/** Accept { code, language, stdin }; enqueue on BullMQ `code-run`; return { jobId }. */
app.post("/run", async (req, res) => {
  const { code, language, stdin, problemId: rawProblemId } = req.body ?? {};
  const problemId =
    rawProblemId === undefined || rawProblemId === null || rawProblemId === ""
      ? null
      : Number(rawProblemId);

  try {
    validateRunInput({ code, language, stdin, problemId });
    const job = await codeRunQueue.add(
      "execute",
      {
        language,
        code,
        stdin: typeof stdin === "string" ? stdin : "",
        problemId,
      },
      {
        removeOnComplete: { age: 300 },
        removeOnFail: false,
      },
    );
    return res.status(202).json({
      jobId: String(job.id),
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({
        stdout: "",
        stderr: err.message || "Bad request",
        executionTime: "",
        memory: "",
      });
    }
    console.error("[/run] enqueue error:", err?.message || err);
    return res.status(503).json({
      error: "Execution service unavailable. Please try again.",
    });
  }
});

/** Poll job: `{ status, result }` — `result` is `job.returnvalue` when completed. */
app.get("/run/jobs/:jobId", async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await codeRunQueue.getJob(jobId);
    if (!job) {
      return res.json({ status: "pending", result: null });
    }

    const state = await job.getState();

    if (state === "completed") {
      const result = job.returnvalue;
      if (!result || typeof result !== "object") {
        return res.status(500).json({
          error: "Execution service unavailable. Please try again.",
        });
      }
      const authUser = getAuthUserFromRequest(req);
      if (authUser && typeof authUser.id === "number") {
        try {
          await saveSubmissionForCompletedJob(job, authUser.id, result);
        } catch (err) {
          console.error("[/run/jobs] submission save error:", err?.message || err);
        }
      }
      return res.json({ status: "completed", result });
    }

    if (state === "failed") {
      const stderr =
        typeof job.failedReason === "string" && job.failedReason.trim()
          ? job.failedReason.trim()
          : "Job failed";
      return res.json({
        status: "failed",
        result: { stdout: "", stderr, exitCode: 1 },
      });
    }

    return res.json({ status: state, result: null });
  } catch (err) {
    console.error("[/run/jobs] error:", err?.message || err);
    return res.status(503).json({
      error: "Execution service unavailable. Please try again.",
    });
  }
});

async function shutdown(signal) {
  console.log(`Shutting down (${signal})…`);
  try {
    await worker.close();
  } catch (e) {
    console.error("worker.close:", e?.message || e);
  }
  try {
    await codeRunQueue.close();
  } catch (e) {
    console.error("queue.close:", e?.message || e);
  }
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("BullMQ worker running for queue: code-run (Docker executor)");
});
