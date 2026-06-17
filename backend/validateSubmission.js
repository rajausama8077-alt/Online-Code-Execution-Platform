const MAX_CODE_BYTES = 120_000;
const MAX_STDIN_BYTES = 64_000;
const SUPPORTED = new Set(["python", "javascript", "cpp", "java"]);

/**
 * @param {{ code: unknown; language: unknown; stdin?: unknown; problemId?: unknown }} input
 */
function validateRunInput(input) {
  const { code, language, stdin, problemId } = input;
  if (typeof language !== "string" || !SUPPORTED.has(language)) {
    const err = new Error(`Unsupported language: ${language}`);
    err.statusCode = 400;
    throw err;
  }
  if (typeof code !== "string" || !code.trim()) {
    const err = new Error("Code must be a non-empty string");
    err.statusCode = 400;
    throw err;
  }
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    const err = new Error(`Code exceeds maximum size (${MAX_CODE_BYTES} bytes)`);
    err.statusCode = 400;
    throw err;
  }
  if (stdin !== undefined && typeof stdin !== "string") {
    const err = new Error("stdin must be a string");
    err.statusCode = 400;
    throw err;
  }
  if (typeof stdin === "string" && Buffer.byteLength(stdin, "utf8") > MAX_STDIN_BYTES) {
    const err = new Error(`stdin exceeds maximum size (${MAX_STDIN_BYTES} bytes)`);
    err.statusCode = 400;
    throw err;
  }
  if (
    problemId !== undefined &&
    problemId !== null &&
    (!Number.isInteger(problemId) || problemId <= 0)
  ) {
    const err = new Error("problemId must be a positive integer");
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { validateRunInput, SUPPORTED };
