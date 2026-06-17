import { useEffect, useMemo, useState } from "react";
import "./AdminPage.css";

/** @param {{ token: string; isAdmin: boolean }} props */
export function AdminPage({ token, isAdmin }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [exampleInput, setExampleInput] = useState("");
  const [exampleOutput, setExampleOutput] = useState("");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState("");

  const disabled = useMemo(
    () => loading || !title.trim() || !description.trim() || !difficulty.trim(),
    [loading, title, description, difficulty],
  );

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    async function loadLeaderboard() {
      setBoardLoading(true);
      setBoardError("");
      try {
        const res = await fetch("http://localhost:5000/api/admin/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load leaderboard");
        }
        if (alive) setLeaderboard(Array.isArray(data) ? data : []);
      } catch (err) {
        if (alive) setBoardError(err?.message || "Failed to load leaderboard");
      } finally {
        if (alive) setBoardLoading(false);
      }
    }
    void loadLeaderboard();
    return () => {
      alive = false;
    };
  }, [isAdmin, token]);

  if (!isAdmin) {
    return (
      <div className="admin-page problems-root">
        <h1>Admin Panel</h1>
        <p className="admin-page__error">Access Denied</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/admin/problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          difficulty,
          example_input: exampleInput,
          example_output: exampleOutput,
          constraints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create problem");
      setMessage(`Problem created: ${data.title}`);
      setTitle("");
      setDescription("");
      setDifficulty("easy");
      setExampleInput("");
      setExampleOutput("");
      setConstraints("");
    } catch (err) {
      setError(err?.message || "Failed to create problem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page problems-root">
      <h1>Admin Panel</h1>
      <p className="admin-page__sub">Create new coding problems.</p>
      {message ? <p className="admin-page__ok">{message}</p> : null}
      {error ? <p className="admin-page__error">{error}</p> : null}
      <form className="admin-page__form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>
        <label>
          Example Input
          <textarea rows={3} value={exampleInput} onChange={(e) => setExampleInput(e.target.value)} />
        </label>
        <label>
          Example Output
          <textarea rows={3} value={exampleOutput} onChange={(e) => setExampleOutput(e.target.value)} />
        </label>
        <label>
          Constraints
          <textarea rows={3} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
        </label>
        <button type="submit" disabled={disabled}>
          {loading ? "Creating..." : "Create Problem"}
        </button>
      </form>

      <section className="admin-page__leaderboard">
        <h2>Leaderboard Overview</h2>
        {boardLoading ? (
          <p>Loading leaderboard...</p>
        ) : boardError ? (
          <p className="admin-page__error">{boardError}</p>
        ) : (
          <div className="admin-page__leaderboard-wrap">
            <table className="admin-page__leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Solved</th>
                  <th>Submissions</th>
                  <th>Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={`${row.username}-${index}`}>
                    <td>#{index + 1}</td>
                    <td>{row.username}</td>
                    <td>{row.solved}</td>
                    <td>{row.submissions}</td>
                    <td>{row.acceptanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
