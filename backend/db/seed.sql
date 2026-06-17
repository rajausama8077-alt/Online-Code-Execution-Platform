TRUNCATE TABLE submissions, problems RESTART IDENTITY;

INSERT INTO users (username, email, password, role)
VALUES (
  'admin',
  'admin@test.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO problems (
  title,
  description,
  difficulty,
  example_input,
  example_output,
  constraints
)
VALUES
  (
    'Hello World',
    'Write a program that prints exactly: Hello, World!',
    'easy',
    '(no input)',
    'Hello, World!',
    'Output must match exactly, including punctuation and capitalization.'
  ),
  (
    'Sum of Two Numbers',
    'Read two integers from standard input and print their sum.',
    'easy',
    '3 5',
    '8',
    '-10^9 <= a, b <= 10^9'
  ),
  (
    'Reverse a String',
    'Given a single string S, print the reverse of S.',
    'medium',
    'hello',
    'olleh',
    '1 <= |S| <= 1000'
  ),
  (
    'Non-overlapping Intervals',
    'Given N intervals [L, R], count how many pairs of intervals overlap (share at least one integer point).',
    'hard',
    '4\n1 3\n2 6\n8 10\n15 18',
    '1',
    '1 <= N <= 100 for this version; use an O(N^2) approach if needed.'
  );
