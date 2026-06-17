const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");
const { Worker } = require("bullmq");
const { QUEUE_NAME, connection } = require("../queues/codeRunQueue");

const execAsync = util.promisify(exec);

/** @type {Record<string, string>} */
const DOCKER_IMAGES = {
  python: "python:3.10-slim",
  javascript: "node:18-slim",
  cpp: "gcc:latest",
  java: "eclipse-temurin:17-jdk-jammy",
};

const EXEC_TIMEOUT_MS = 60000;

/**
 * Host directory path safe for `docker run -v` on Windows cmd/PowerShell.
 * @param {string} hostDir
 */
function dockerHostMountPath(hostDir) {
  const abs = path.resolve(hostDir);
  return `"${abs.replace(/"/g, '\\"')}"`;
}

/**
 * Run user { code, language, stdin } inside Docker; return stdout/stderr/exitCode.
 * @param {string} code
 * @param {string} language
 * @param {string} stdin
 * @returns {Promise<{ stdout: string; stderr: string; exitCode: number }>}
 */
async function runUserCodeInDocker(code, language, stdin) {
  const image = DOCKER_IMAGES[language];
  if (!image) {
    return {
      stdout: "",
      stderr: `Unsupported language: ${language}`,
      exitCode: 1,
    };
  }
  await execAsync(`docker pull ${image}`);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "code-exec-"));

  try {
    if (language === "python") {
      fs.writeFileSync(path.join(workDir, "script.py"), code, "utf8");
    } else if (language === "javascript") {
      fs.writeFileSync(path.join(workDir, "script.js"), code, "utf8");
    } else if (language === "cpp") {
      fs.writeFileSync(path.join(workDir, "main.cpp"), code, "utf8");
    } else if (language === "java") {
      fs.writeFileSync(path.join(workDir, "Main.java"), code, "utf8");
    }
    fs.writeFileSync(path.join(workDir, "stdin.txt"), typeof stdin === "string" ? stdin : "", "utf8");

    const vol = `${dockerHostMountPath(workDir)}:/code:rw`;

    /** @type {string} */
    let cmd;
    if (language === "python") {
      const inner = "python /code/script.py < /code/stdin.txt";
      cmd = `docker run --rm --memory=256m --cpus=1 --network none -v ${vol} ${image} sh -c ${JSON.stringify(inner)}`;
    } else if (language === "javascript") {
      const inner = "node /code/script.js < /code/stdin.txt";
      cmd = `docker run --rm --memory=256m --cpus=1 --network none -v ${vol} ${image} sh -c ${JSON.stringify(inner)}`;
    } else if (language === "cpp") {
      const inner = "g++ /code/main.cpp -O2 -o /code/prog && /code/prog < /code/stdin.txt";
      cmd = `docker run --rm --memory=256m --cpus=1 --network none -v ${vol} ${image} sh -c ${JSON.stringify(inner)}`;
    } else {
      const inner = "javac /code/Main.java && java -cp /code Main < /code/stdin.txt";
      cmd = `docker run --rm --memory=256m --cpus=1 --network none -v ${vol} ${image} sh -c ${JSON.stringify(inner)}`;
    }

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
      });
      return {
        stdout: stdout != null ? String(stdout) : "",
        stderr: stderr != null ? String(stderr) : "",
        exitCode: 0,
      };
    } catch (err) {
      const stdout = err.stdout != null ? String(err.stdout) : "";
      const stderrParts = [err.stderr != null ? String(err.stderr) : ""];
      if (err.killed || err.signal) {
        stderrParts.push(
          err.signal === "SIGTERM" || err.killed
            ? "Process timed out (10 second limit)."
            : `Signal: ${err.signal || "unknown"}`,
        );
      }
      if (err.message && !stderrParts.join("\n").includes(err.message)) {
        stderrParts.push(err.message);
      }
      let exitCode =
        typeof err.code === "number" && !Number.isNaN(err.code) ? err.code : 1;
      if (err.killed) exitCode = 124;
      return {
        stdout,
        stderr: stderrParts.filter(Boolean).join("\n").trimEnd(),
        exitCode,
      };
    }
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * BullMQ worker for queue `code-run` (same name as {@link QUEUE_NAME}).
 * @returns {import("bullmq").Worker}
 */
function startCodeRunWorker() {
  const concurrency = Math.max(
    1,
    Math.min(32, Number(process.env.WORKER_CONCURRENCY) || 2),
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { language, code, stdin } = job.data;
      return runUserCodeInDocker(code, language, typeof stdin === "string" ? stdin : "");
    },
    { connection, concurrency },
  );

  worker.on("failed", (job, err) => {
    console.error(`[code-run] job ${job?.id} failed:`, err?.message || err);
  });

  worker.on("error", (err) => {
    console.error("[code-run] worker error:", err?.message || err);
  });

  return worker;
}

module.exports = { startCodeRunWorker, runUserCodeInDocker };
