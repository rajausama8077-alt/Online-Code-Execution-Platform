import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

/** Must run before `monaco-editor` initializes (Vite worker URL). */
globalThis.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
