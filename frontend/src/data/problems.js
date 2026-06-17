/** @typedef {'Easy' | 'Medium' | 'Hard'} ProblemDifficulty */

/** @typedef {'python' | 'javascript' | 'cpp' | 'java'} ApiLanguageId */

/**
 * @typedef {{
 *   id: string;
 *   title: string;
 *   difficulty: ProblemDifficulty;
 *   description: string;
 *   defaultLanguage: ApiLanguageId;
 *   starters?: Partial<Record<ApiLanguageId, string>>;
 * }} CodingProblem
 */

/** @type {CodingProblem[]} */
export const PROBLEMS = [
  {
    id: "hello-world",
    title: "Hello World",
    difficulty: "Easy",
    defaultLanguage: "python",
    description: `Write a program that prints exactly:

Hello, World!

Use your language's standard output.`,
    starters: {
      python: `print("Hello, World!")`,
      javascript: `// Print Hello, World!\n`,
      cpp: `#include <iostream>

int main() {
    return 0;
}
`,
      java: `public class Main {
    public static void main(String[] args) {
        
    }
}
`,
    },
  },
  {
    id: "sum-two-numbers",
    title: "Sum of Two Numbers",
    difficulty: "Easy",
    defaultLanguage: "python",
    description: `Read two integers from standard input (space-separated on one line) and print their sum.

Example:
Input: 3 5
Output: 8`,
    starters: {
      python: `# Read two integers and print their sum\n`,
      javascript: `// Read from stdin and print sum\n`,
      cpp: `#include <iostream>

int main() {
    return 0;
}
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        
    }
}
`,
    },
  },
  {
    id: "reverse-string",
    title: "Reverse a String",
    difficulty: "Medium",
    defaultLanguage: "javascript",
    description: `Given a string S, print its reverse.

Constraints: 1 ≤ length(S) ≤ 1000

Example:
Input: hello
Output: olleh`,
    starters: {
      python: `s = input().strip()\n`,
      javascript: `const readline = require("readline");\n`,
      cpp: `#include <iostream>
#include <string>

int main() {
    return 0;
}
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        
    }
}
`,
    },
  },
  {
    id: "merge-intervals-lite",
    title: "Non-overlapping Intervals",
    difficulty: "Hard",
    defaultLanguage: "java",
    description: `You are given N intervals [L, R]. Count how many pairs of intervals overlap (share at least one integer point).

For this practice problem, you may assume N ≤ 100 and use a straightforward O(N²) check.

Print a single integer: the number of overlapping pairs.`,
    starters: {
      python: `n = int(input())\n`,
      javascript: `// Parse intervals and count overlapping pairs\n`,
      cpp: `#include <iostream>
#include <vector>

int main() {
    return 0;
}
`,
      java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        
    }
}
`,
    },
  },
];

/** @param {string} id */
export function getProblemById(id) {
  return PROBLEMS.find((p) => p.id === id) ?? null;
}
