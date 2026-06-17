import { useCallback, useMemo, useRef, useState } from "react";
import { MonacoEditorSurface } from "./MonacoEditorSurface.jsx";
import {
  API_LANGUAGES,
  LANGUAGE_OPTIONS,
  getDefaultBuffer,
  isApiLanguage,
} from "./languages.js";
import "./CodeEditorWorkspace.css";

/**
 * @typedef {{ language: string; code: string; stdin: string; problemId?: number }} RunPayload
 */

/**
 * @typedef {{
 *   stdout: string;
 *   stderr: string;
 *   executionTime?: string;
 *   memory?: string | null;
 *   exitCode?: number;
 * }} ExecutionResult
 */

/**
 * @param {{
 *   onRun?: (payload: RunPayload) => void | Promise<ExecutionResult | void>;
 *   initialLanguage?: string;
 *   initialBuffers?: Partial<Record<string, string>>;
 *   workspaceTitle?: string;
 *   problemId?: number | null;
 * }} props
 */
export function CodeEditorWorkspace({
  onRun,
  initialLanguage,
  initialBuffers,
  workspaceTitle,
  problemId,
}) {
  const [language, setLanguage] = useState(() =>
    initialLanguage && isApiLanguage(initialLanguage)
      ? initialLanguage
      : "python",
  );
  const [buffers, setBuffers] = useState(() => {
    const base = Object.fromEntries(
      API_LANGUAGES.map((id) => [id, getDefaultBuffer(id)]),
    );
    if (initialBuffers && typeof initialBuffers === "object") {
      for (const id of API_LANGUAGES) {
        const v = initialBuffers[id];
        if (typeof v === "string") base[id] = v;
      }
    }
    return base;
  });
  const [execution, setExecution] = useState(
    /** @type {ExecutionResult | null} */ (null),
  );
  const [stdin, setStdin] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const editorRef = useRef(null);

  const monacoLanguage = useMemo(() => {
    const opt = LANGUAGE_OPTIONS.find((o) => o.id === language);
    return opt?.monacoId ?? "plaintext";
  }, [language]);

  const handleChange = useCallback(
    (value) => {
      setBuffers((prev) => ({ ...prev, [language]: value ?? "" }));
    },
    [language],
  );

  const handleLanguageChange = useCallback((e) => {
    const next = e.target.value;
    if (isApiLanguage(next)) setLanguage(next);
  }, []);

  const handleMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleFormat = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const format = editor.getAction("editor.action.formatDocument");
    const reindent = editor.getAction("editor.action.reindentlines");
    if (format) {
      format.run().catch(() => reindent?.run());
    } else {
      reindent?.run();
    }
  }, []);

  const handleRun = useCallback(async () => {
    const code = buffers[language] ?? "";
    const payload = { language, code, stdin };
    if (Number.isInteger(problemId) && problemId > 0) payload.problemId = problemId;
    setRunLoading(true);
    setExecution(null);
    try {
      const maybe = onRun?.(payload);
      const result =
        maybe && typeof maybe.then === "function" ? await maybe : maybe;
      if (result && typeof result === "object") {
        setExecution({
          stdout: String(result.stdout ?? ""),
          stderr: String(result.stderr ?? ""),
          executionTime: result.executionTime,
          memory: result.memory ?? null,
          exitCode:
            typeof result.exitCode === "number" ? result.exitCode : undefined,
        });
      } else {
        setExecution({
          stdout: "",
          stderr:
            "No result from onRun. Pass an async function that returns { stdout, stderr, executionTime, memory }.",
          executionTime: "0ms",
          memory: null,
        });
      }
    } catch (err) {
      const ax = err?.response?.data;
      setExecution({
        stdout: typeof ax?.stdout === "string" ? ax.stdout : "",
        stderr:
          (typeof ax?.stderr === "string" && ax.stderr) ||
          err?.message ||
          String(err),
        executionTime:
          typeof ax?.executionTime === "string" ? ax.executionTime : "0ms",
        memory: ax?.memory ?? null,
        exitCode:
          typeof ax?.exitCode === "number" ? ax.exitCode : undefined,
      });
    } finally {
      setRunLoading(false);
    }
  }, [buffers, language, onRun, stdin, problemId]);

  const outputText = useMemo(() => {
    if (!execution) return "";
    const out = execution.stdout ?? "";
    const err = execution.stderr ?? "";
    return `stdout\n${out}\n\nstderr\n${err}`;
  }, [execution]);

  return (
    <div className="ide-app">
      <header className="ide-app__header">
        <h1 className="ide-app__title">
          {workspaceTitle?.trim() ? workspaceTitle.trim() : "Code Editor"}
        </h1>
        <span className="ide-app__spacer" aria-hidden />
        <div>
          <label className="ide-app__label" htmlFor="ide-language">
            Language
          </label>
          <select
            id="ide-language"
            className="ide-app__select"
            value={language}
            onChange={handleLanguageChange}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ide-app__actions">
          <button
            type="button"
            className="ide-app__btn ide-app__btn--secondary"
            onClick={handleFormat}
          >
            Format
          </button>
          <button
            type="button"
            className="ide-app__btn ide-app__btn--run"
            onClick={() => void handleRun()}
            disabled={runLoading}
          >
            {runLoading ? "Running..." : "Run Code"}
          </button>
        </div>
      </header>

      <div className="ide-app__split" role="presentation">
        <section
          className="ide-app__pane ide-app__pane--editor"
          aria-label="Source code"
        >
          <div className="ide-app__pane-head">Source</div>
          <div
            className="ide-app__editor-host"
            role="region"
            aria-label="Code editor"
          >
            <MonacoEditorSurface
              monacoLanguage={monacoLanguage}
              value={buffers[language]}
              onChange={handleChange}
              onMount={handleMount}
            />
          </div>
        </section>

        <section className="ide-app__pane ide-app__pane--stdin" aria-label="Program input">
          <div className="ide-app__pane-head">Input (stdin)</div>
          <textarea
            className="ide-app__stdin-body"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Provide stdin here. It will be piped into the program."
            spellCheck={false}
          />
        </section>

        <section
          className="ide-app__pane ide-app__pane--output"
          aria-label="Program output"
        >
          <div className="ide-app__pane-head ide-app__pane-head--output">
            Output
          </div>
          <pre className="ide-app__output-body">
            {runLoading ? (
              <span className="ide-app__output-placeholder">Running...</span>
            ) : outputText ? (
              outputText
            ) : (
              <span className="ide-app__output-placeholder">
                Run code to see stdout / stderr from the sandbox here.
              </span>
            )}
          </pre>
        </section>
      </div>
    </div>
  );
}
