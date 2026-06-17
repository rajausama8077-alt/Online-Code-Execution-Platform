/** API language id sent in run payload (matches backend contract). */
export const API_LANGUAGES = ["python", "javascript", "cpp", "java"];

/** @typedef {'python' | 'javascript' | 'cpp' | 'java'} ApiLanguage */

export const LANGUAGE_OPTIONS = [
  { id: "python", label: "Python", monacoId: "python" },
  { id: "javascript", label: "JavaScript", monacoId: "javascript" },
  { id: "cpp", label: "C++", monacoId: "cpp" },
  { id: "java", label: "Java", monacoId: "java" },
];

const DEFAULTS = {
  python: `print("Hello, World!")`,
  javascript: `console.log("Hello, World!");`,
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
};

/** @param {ApiLanguage} id */
export function getDefaultBuffer(id) {
  return DEFAULTS[id] ?? "";
}

/** @param {string} id */
export function isApiLanguage(id) {
  return API_LANGUAGES.includes(id);
}
