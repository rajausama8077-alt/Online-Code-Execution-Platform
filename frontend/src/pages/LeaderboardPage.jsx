import { useEffect, useState } from "react";
import "./LeaderboardPage.css";

function medalForRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

export function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadLeaderboard() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("http://localhost:5000/api/leaderboard");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch leaderboard");
        }
        if (alive) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to fetch leaderboard");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadLeaderboard();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="leaderboard-page problems-root">
      <header className="leaderboard-page__head">
        <h1>Leaderboard</h1>
        <p className="leaderboard-page__sub">Top users by accepted submissions.</p>
      </header>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="leaderboard-page__error">{error}</p>
      ) : (
        <div className="leaderboard-page__table-wrap">
          <table className="leaderboard-page__table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Problems Solved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rank = i + 1;
                const medal = medalForRank(rank);
                return (
                  <tr key={`${row.username}-${rank}`}>
                    <td>
                      {medal ? (
                        <span className="leaderboard-page__rank">
                          <span aria-hidden>{medal}</span> #{rank}
                        </span>
                      ) : (
                        `#${rank}`
                      )}
                    </td>
                    <td>{row.username}</td>
                    <td>{row.solved}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
