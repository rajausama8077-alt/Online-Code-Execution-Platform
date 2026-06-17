import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SubmissionsPage.css";

/** @param {{ token: string }} props */
export function SubmissionsPage({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("http://localhost:5000/api/submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch submissions");
        if (alive) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to fetch submissions");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="submissions-page problems-root">
      <header className="submissions-page__head">
        <h1>Submissions</h1>
      </header>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="submissions-page__error">{error}</p>
      ) : rows.length === 0 ? (
        <p>No submissions yet. Solve a <Link to="/problems">problem</Link> first.</p>
      ) : (
        <div className="submissions-page__table-wrap">
          <table className="submissions-page__table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Language</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.problem_id ? (
                      <Link to={`/problems/${row.problem_id}`}>
                        {row.problem_title || `Problem #${row.problem_id}`}
                      </Link>
                    ) : (
                      row.problem_title || "Problem N/A"
                    )}
                  </td>
                  <td>{row.language}</td>
                  <td>
                    <span className={`submissions-page__status submissions-page__status--${row.status}`}>
                      {String(row.status ?? "").replace("_", " ")}
                    </span>
                  </td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
