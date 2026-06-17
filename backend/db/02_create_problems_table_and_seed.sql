CREATE TABLE IF NOT EXISTS problems (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  example_input TEXT,
  example_output TEXT,
  constraints TEXT
);

INSERT INTO problems (title, description, difficulty, example_input, example_output, constraints)
VALUES
  (
    'Two Sum',
    'Given an array of integers and a target value, return indices of two numbers such that they add up to target. Assume exactly one valid answer exists.',
    'easy',
    'nums = [2,7,11,15], target = 9',
    '[0,1]',
    '2 <= nums.length <= 10^4; -10^9 <= nums[i], target <= 10^9'
  ),
  (
    'Valid Parentheses',
    'Given a string containing just characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.',
    'easy',
    's = "()[]{}"',
    'true',
    '1 <= s.length <= 10^4; s consists only of bracket characters'
  ),
  (
    'Longest Substring Without Repeating Characters',
    'Given a string s, find the length of the longest substring without repeating characters.',
    'medium',
    's = "abcabcbb"',
    '3',
    '0 <= s.length <= 5 * 10^4; s may include letters, digits, symbols, and spaces'
  ),
  (
    'Merge Intervals',
    'Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return non-overlapping intervals covering all intervals.',
    'medium',
    'intervals = [[1,3],[2,6],[8,10],[15,18]]',
    '[[1,6],[8,10],[15,18]]',
    '1 <= intervals.length <= 10^4; 0 <= start_i <= end_i <= 10^4'
  ),
  (
    'Trapping Rain Water',
    'Given n non-negative integers representing an elevation map where width of each bar is 1, compute how much water can be trapped after raining.',
    'hard',
    'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
    '6',
    '1 <= height.length <= 2 * 10^4; 0 <= height[i] <= 10^5'
  );
