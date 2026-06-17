import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./ProblemsPage.css";

function difficultyClass(d) {
  if (typeof d === "string" && d.toLowerCase() === "easy") {
    return "difficulty difficulty--easy";
  }
  if (typeof d === "string" && d.toLowerCase() === "hard") {
    return "difficulty difficulty--hard";
  }
  return "difficulty difficulty--medium";
}

export function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadProblems() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("http://localhost:5000/api/problems");
        if (!res.ok) {
          throw new Error(`Failed to fetch problems (${res.status})`);
        }
        const data = await res.json();
        if (alive) setProblems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to fetch problems");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadProblems();
    return () => {
      alive = false;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProblems = problems.filter((p) => {
    const difficulty = String(p.difficulty ?? "").toLowerCase();
    const title = String(p.title ?? "").toLowerCase();
    const byDifficulty = difficultyFilter === "all" || difficulty === difficultyFilter;
    const byTitle = !normalizedSearch || title.includes(normalizedSearch);
    return byDifficulty && byTitle;
  });
  const totalCount = filteredProblems.length;

  return (
    <div className="problems-page problems-root">
      <header className="problems-page__head">
        <div className="problems-page__head-row">
          <h1>Problems</h1>
          <Link className="problems-page__editor-link" to="/editor">
            Blank editor
          </Link>
        </div>
        <p className="problems-page__sub">
          Pick a challenge. Each opens with the statement on the left and the
          editor on the right.
        </p>
      </header>

      <section className="problems-page__filters" aria-label="Problem filters">
        <div className="problems-page__difficulty-group">
          {["all", "easy", "medium", "hard"].map((level) => (
            <button
              key={level}
              type="button"
              className={`problems-page__chip ${
                difficultyFilter === level ? "problems-page__chip--active" : ""
              }`}
              onClick={() => setDifficultyFilter(level)}
            >
              {level === "all" ? "All" : level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="problems-page__search"
          type="search"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <div className="problems-page__count">Total Problems: {totalCount}</div>

      <ul className="problems-page__list">
        {loading ? (
          <li>Loading...</li>
        ) : error ? (
          <li>{error}</li>
        ) : filteredProblems.map((p) => (
          <li key={p.id}>
            <Link className="problems-page__link" to={`/problems/${p.id}`}>
              <span className={difficultyClass(p.difficulty)}>
                {String(p.difficulty ?? "").toLowerCase()}
              </span>
              <h2 className="problems-page__title">{p.title}</h2>
              <span className="problems-page__chev" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
