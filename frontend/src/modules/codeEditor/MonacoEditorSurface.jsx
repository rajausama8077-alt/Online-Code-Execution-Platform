import { memo, useCallback } from "react";
import Editor from "@monaco-editor/react";

const defaultOptions = {
  minimap: { enabled: true, scale: 1 },
  fontSize: 14,
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  detectIndentation: true,
  formatOnType: true,
  formatOnPaste: true,
  wordWrap: "on",
  bracketPairColorization: { enabled: true },
  smoothScrolling: true,
  padding: { top: 8, bottom: 8 },
  renderLineHighlight: "line",
  cursorBlinking: "smooth",
  folding: true,
  glyphMargin: true,
  readOnly: false,
};

function MonacoEditorSurfaceComponent({
  value,
  onChange,
  monacoLanguage,
  theme = "vs-dark",
  onMount,
}) {
  const handleMount = useCallback(
    (editor, monaco) => {
      onMount?.(editor, monaco);
    },
    [onMount],
  );

  return (
    <Editor
      className="monaco-editor-surface"
      height="100%"
      theme={theme}
      language={monacoLanguage}
      value={value}
      onChange={onChange}
      options={defaultOptions}
      onMount={handleMount}
      loading={<div className="monaco-editor-surface__loading">Loading editor…</div>}
    />
  );
}

export const MonacoEditorSurface = memo(MonacoEditorSurfaceComponent);
