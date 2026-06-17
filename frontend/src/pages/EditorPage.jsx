import { Link } from "react-router-dom";
import { CodeEditorWorkspace } from "../modules/codeEditor";
import "./EditorPage.css";

/** @param {{ onRun: (payload: { language: string; code: string }) => unknown }} props */
export function EditorPage({ onRun }) {
  return (
    <div className="editor-page problems-root">
      <nav className="editor-page__nav" aria-label="Primary">
        <Link className="editor-page__link" to="/problems">
          ← Problems
        </Link>
      </nav>
      <CodeEditorWorkspace onRun={onRun} />
    </div>
  );
}
