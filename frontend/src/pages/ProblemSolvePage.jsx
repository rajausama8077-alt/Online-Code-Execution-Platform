import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CodeEditorWorkspace } from "../modules/codeEditor";
import "./ProblemSolvePage.css";

function difficultyClass(d) {
  if (typeof d === "string" && d.toLowerCase() === "easy") {
    return "difficulty difficulty--easy";
  }
  if (typeof d === "string" && d.toLowerCase() === "hard") {
    return "difficulty difficulty--hard";
  }
  return "difficulty difficulty--medium";
}

/** @param {{ onRun: (payload: { language: string; code: string }) => unknown }} props */
export function ProblemSolvePage({ onRun }) {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadProblem() {
      try {
        setLoading(true);
        setError("");
        const id = problemId == null ? "" : String(problemId);
        const res = await fetch(
          `http://localhost:5000/api/problems/${encodeURIComponent(id)}`,
        );
        if (res.status === 404) {
          throw new Error("Problem not found");
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch problem (${res.status})`);
        }
        const data = await res.json();
        if (alive) setProblem(data && typeof data === "object" ? data : null);
      } catch (err) {
        if (alive) {
          setProblem(null);
          setError(err?.message || "Failed to fetch problem");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadProblem();
    return () => {
      alive = false;
    };
  }, [problemId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const pid = Number(problemId);
    if (!token || !Number.isInteger(pid) || pid <= 0) return;
    let alive = true;
    async function loadSolvedStatus() {
      try {
        const res = await fetch("http://localhost:5000/api/submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const solved = Array.isArray(data)
          ? data.some(
              (row) =>
                Number(row.problem_id) === pid &&
                String(row.status ?? "").toLowerCase() === "accepted",
            )
          : false;
        if (alive) setIsSolved(solved);
      } catch {
        if (alive) setIsSolved(false);
      }
    }
    void loadSolvedStatus();
    return () => {
      alive = false;
    };
  }, [problemId]);

  if (loading) {
    return (
      <div className="problem-solve problems-root">
        <div className="problem-solve__missing">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="problem-solve problems-root">
        <div className="problem-solve__missing">
          <p>{error}</p>
          <p>
            <Link to="/problems">Back to problems</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="problem-solve problems-root">
        <div className="problem-solve__missing">
          <p>Problem not found.</p>
          <p>
            <Link to="/problems">Back to problems</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="problem-solve problems-root">
      <header className="problem-solve__toolbar">
        <Link className="problem-solve__back" to="/problems">
          ← Problems
        </Link>
        <h1>{problem.title}</h1>
        <span className={difficultyClass(problem.difficulty)}>
          {String(problem.difficulty ?? "").toLowerCase()}
        </span>
        {isSolved ? <span className="problem-solve__solved-badge">✅ Solved</span> : null}
      </header>

      <div className="problem-solve__grid">
        <aside className="problem-solve__desc" aria-label="Problem description">
          <h2>Description</h2>
          <div className="problem-solve__body">{problem.description}</div>
        </aside>
        <main className="problem-solve__editor" aria-label="Code workspace">
          <CodeEditorWorkspace
            key={problem.id}
            onRun={onRun}
            workspaceTitle="Editor"
            problemId={Number(problem.id)}
          />
        </main>
      </div>
    </div>
  );
}
