const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const crypto = require("crypto");
const { spawn } = require("child_process");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me";
const DB_PATH = path.join(__dirname, "db.sqlite");
const TEMP_ROOT = path.join(os.tmpdir(), "mini-hackerrank");
const VALID_LANGUAGES = ["python", "java", "cpp"];

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

const db = new sqlite3.Database(DB_PATH);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function bootstrapDatabase() {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      example_input TEXT,
      example_output TEXT,
      constraints TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      stdin TEXT,
      stdout TEXT,
      stderr TEXT,
      status TEXT NOT NULL,
      execution_time_ms INTEGER,
      memory_limit TEXT,
      exit_code INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(problem_id) REFERENCES problems(id)
    )
  `);

  const adminUser = await getAsync("SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!adminUser) {
    const passwordHash = bcrypt.hashSync("admin123", 10);
    await runAsync(
      "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)"
      , ["admin", passwordHash, "admin", new Date().toISOString()],
    );
    console.log("Created default admin user: admin / admin123");
  }

  const problems = [
    {
      slug: "hello-world",
      title: "Hello World",
      description: "Print exactly \"Hello, World!\" to stdout.",
      difficulty: "easy",
      example_input: "",
      example_output: "Hello, World!",
      constraints: "No special constraints.",
    },
    {
      slug: "sum-two-numbers",
      title: "Sum of Two Numbers",
      description: "Read two integers from stdin and print their sum.",
      difficulty: "easy",
      example_input: "3 5",
      example_output: "8",
      constraints: "Two integers fit in a 32-bit signed range.",
    },
    {
      slug: "reverse-string",
      title: "Reverse a String",
      description: "Read a string and print it reversed.",
      difficulty: "medium",
      example_input: "hello",
      example_output: "olleh",
      constraints: "1 <= length(S) <= 1000",
    },
  ];

  for (const problem of problems) {
    await runAsync(
      `INSERT OR IGNORE INTO problems (slug, title, description, difficulty, example_input, example_output, constraints, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        problem.slug,
        problem.title,
        problem.description,
        problem.difficulty,
        problem.example_input,
        problem.example_output,
        problem.constraints,
        new Date().toISOString(),
      ],
    );
  }
}

function signJwt(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function authMiddleware(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function makeJobStatus() {
  return {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    result: null,
    payload: null,
  };
}

const jobs = new Map();

async function executeSandboxedCode({ language, code, stdin }) {
  const config = {
    python: {
      fileName: "Main.py",
      image: "python:3.12-slim",
      command: "python Main.py",
    },
    java: {
      fileName: "Main.java",
      image: "openjdk:17-slim",
      command: "javac Main.java && java -cp . Main",
    },
    cpp: {
      fileName: "Main.cpp",
      image: "gcc:13.2.0",
      command: "g++ Main.cpp -O2 -std=c++17 -o Main && ./Main",
    },
  }[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = path.join(TEMP_ROOT, crypto.randomUUID());
  await fs.mkdir(tempDir, { recursive: true });
  const sourcePath = path.join(tempDir, config.fileName);
  await fs.writeFile(sourcePath, code, "utf8");

  const dockerArgs = [
    "run",
    "--rm",
    "--network",
    "none",
    "--memory",
    "256m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "100",
    "--security-opt",
    "no-new-privileges",
    "-v",
    `${tempDir}:/workspace:rw`,
    "-w",
    "/workspace",
    config.image,
    "bash",
    "-lc",
    config.command,
  ];

  const processStart = Date.now();
  const proc = spawn("docker", dockerArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 10000,
  });

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  if (stdin) {
    proc.stdin.write(stdin);
  }
  proc.stdin.end();

  const result = await new Promise((resolve) => {
    proc.on("error", (err) => resolve({ error: err }));
    proc.on("close", (code, signal) => resolve({ code, signal }));
  });

  const executionTimeMs = Date.now() - processStart;

  await fs.rm(tempDir, { recursive: true, force: true });

  if (result.error) {
    return {
      stdout: "",
      stderr: String(result.error.message || "Docker execution failed"),
      exitCode: null,
      executionTimeMs,
      memoryLimit: "256MB",
    };
  }

  const exitCode = result.code === null ? undefined : result.code;
  if (result.signal === "SIGTERM" || result.signal === "SIGKILL") {
    stderr += stderr ? "\n" : "";
    stderr += "Execution timed out.";
  }

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    exitCode,
    executionTimeMs,
    memoryLimit: "256MB",
  };
}

function normalizeOutput(text) {
  return String(text ?? "").trim().replace(/\r\n/g, "\n");
}

async function processJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "running";
  try {
    const execution = await executeSandboxedCode(job.payload);
    const problem = job.payload.problemId
      ? await getAsync("SELECT * FROM problems WHERE slug = ?", [job.payload.problemId])
      : null;
    let submissionStatus = "completed";
    let extra = {};

    if (problem) {
      const expected = normalizeOutput(problem.example_output);
      const actual = normalizeOutput(execution.stdout);
      if (execution.exitCode !== 0) {
        submissionStatus = "runtime_error";
      } else if (expected !== actual) {
        submissionStatus = "wrong_answer";
      } else {
        submissionStatus = "accepted";
      }
      extra = { problemStatus: submissionStatus };
    }

    job.result = {
      stdout: execution.stdout,
      stderr: execution.stderr,
      executionTime: `${execution.executionTimeMs}ms`,
      memory: execution.memoryLimit,
      exitCode: execution.exitCode,
      ...extra,
    };
    job.status = "completed";

    if (job.payload.userId && problem) {
      const user = await getAsync("SELECT id FROM users WHERE id = ?", [job.payload.userId]);
      if (user) {
        await runAsync(
          `INSERT INTO submissions (user_id, problem_id, language, code, stdin, stdout, stderr, status, execution_time_ms, memory_limit, exit_code, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.payload.userId,
            problem.id,
            job.payload.language,
            job.payload.code,
            job.payload.stdin || "",
            execution.stdout,
            execution.stderr,
            submissionStatus,
            execution.executionTimeMs,
            execution.memoryLimit,
            execution.exitCode,
            new Date().toISOString(),
          ],
        );
      }
    }
  } catch (error) {
    job.status = "failed";
    job.result = {
      stdout: "",
      stderr: String(error.message || "Execution failed"),
      executionTime: "0ms",
      memory: "256MB",
    };
  }
}

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || username.length < 3 || !password || password.length < 6) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const existing = await getAsync("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) {
    return res.status(400).json({ error: "Username already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await runAsync(
    "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
    [username, passwordHash, "user", new Date().toISOString()],
  );
  const user = { id: result.lastID, username, role: "user" };
  return res.json({ token: signJwt(user), user });
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = await getAsync("SELECT * FROM users WHERE username = ?", [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  return res.json({ token: signJwt(user), user: { id: user.id, username: user.username, role: user.role } });
});

app.get("/api/problems", async (req, res) => {
  const rows = await allAsync(
    "SELECT slug AS id, title, description, difficulty FROM problems ORDER BY created_at DESC",
  );
  return res.json(rows.map((item) => ({ ...item, id: item.id, difficulty: item.difficulty })));
});

app.get("/api/problems/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const problem = await getAsync(
    "SELECT slug AS id, title, description, difficulty, example_input, example_output, constraints FROM problems WHERE slug = ?",
    [id],
  );
  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }
  return res.json(problem);
});

app.post("/api/admin/problems", authMiddleware, adminOnly, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const difficulty = String(req.body.difficulty || "easy").trim().toLowerCase();
  const exampleInput = String(req.body.example_input || "").trim();
  const exampleOutput = String(req.body.example_output || "").trim();
  const constraints = String(req.body.constraints || "").trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `problem-${Date.now()}`;

  if (!title || !description || !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({ error: "Title, description, and valid difficulty are required." });
  }

  await runAsync(
    `INSERT INTO problems (slug, title, description, difficulty, example_input, example_output, constraints, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, title, description, difficulty, exampleInput, exampleOutput, constraints, new Date().toISOString()],
  );

  const problem = await getAsync("SELECT slug AS id, title, description, difficulty, example_input, example_output, constraints FROM problems WHERE slug = ?", [slug]);
  return res.status(201).json(problem);
});

app.get("/api/leaderboard", async (req, res) => {
  const rows = await allAsync(
    `SELECT u.username,
            COUNT(CASE WHEN s.status = 'accepted' THEN 1 END) AS solved,
            COUNT(*) AS submissions,
            SUM(CASE WHEN s.status = 'accepted' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS acceptance_rate
       FROM users u
       LEFT JOIN submissions s ON s.user_id = u.id
      GROUP BY u.id
      ORDER BY solved DESC, acceptance_rate DESC, u.username ASC
      LIMIT 20`,
  );
  return res.json(rows.map((row) => ({
    username: row.username,
    solved: Number(row.solved || 0),
    submissions: Number(row.submissions || 0),
    acceptanceRate: Number(row.acceptance_rate || 0).toFixed(2),
  })));
});

app.get("/api/admin/leaderboard", authMiddleware, adminOnly, async (req, res) => {
  const rows = await allAsync(
    `SELECT u.username,
            COUNT(CASE WHEN s.status = 'accepted' THEN 1 END) AS solved,
            COUNT(*) AS submissions,
            SUM(CASE WHEN s.status = 'accepted' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS acceptance_rate
       FROM users u
       LEFT JOIN submissions s ON s.user_id = u.id
      GROUP BY u.id
      ORDER BY solved DESC, acceptance_rate DESC, u.username ASC`,
  );
  return res.json(rows.map((row) => ({
    username: row.username,
    solved: Number(row.solved || 0),
    submissions: Number(row.submissions || 0),
    acceptanceRate: Number(row.acceptance_rate || 0).toFixed(2),
  })));
});

app.get("/api/submissions", authMiddleware, async (req, res) => {
  const query = req.user.role === "admin"
    ? `SELECT s.id, s.language, s.status, s.execution_time_ms, s.memory_limit, s.exit_code, s.created_at,
                p.slug AS problem_id, p.title AS problem_title, u.username
           FROM submissions s
           JOIN problems p ON p.id = s.problem_id
           JOIN users u ON u.id = s.user_id
          ORDER BY s.created_at DESC`
    : `SELECT s.id, s.language, s.status, s.execution_time_ms, s.memory_limit, s.exit_code, s.created_at,
                p.slug AS problem_id, p.title AS problem_title
           FROM submissions s
           JOIN problems p ON p.id = s.problem_id
          WHERE s.user_id = ?
          ORDER BY s.created_at DESC`;

  const rows = req.user.role === "admin"
    ? await allAsync(query)
    : await allAsync(query, [req.user.id]);

  return res.json(rows.map((row) => ({
    id: row.id,
    problem_id: row.problem_id,
    problem_title: row.problem_title,
    language: row.language,
    status: row.status,
    executionTime: `${row.execution_time_ms ?? 0}ms`,
    memory: row.memory_limit,
    exitCode: row.exit_code,
    createdAt: row.created_at,
    username: row.username,
  })));
});

app.post("/run", async (req, res) => {
  const { language, code, stdin = "", problemId } = req.body || {};
  if (!language || typeof language !== "string" || !VALID_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Invalid language. Supported: python, java, cpp." });
  }
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required." });
  }

  let userId = null;
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = payload.sub;
    } catch {
      userId = null;
    }
  }

  const job = makeJobStatus();
  job.payload = { language, code, stdin, problemId, userId };
  jobs.set(job.id, job);
  processJob(job.id).catch((error) => {
    console.error("Job failure", error);
  });

  return res.status(202).json({ jobId: job.id });
});

app.get("/run/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  return res.json({ status: job.status, result: job.result });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

bootstrapDatabase()
  .then(() => {
    return fs.mkdir(TEMP_ROOT, { recursive: true });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });
