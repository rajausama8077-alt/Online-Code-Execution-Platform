import { Link } from "react-router-dom";
import "./HomePage.css";

export function HomePage() {
  return (
    <div className="home-page problems-root">
      <section className="home-page__hero">
        <h1>Online Code Execution Platform</h1>
        <p className="home-page__subtitle">
          Practice, run, and improve with a fast coding workflow designed like a
          real competitive programming platform.
        </p>
        <div className="home-page__actions">
          <Link className="home-page__btn home-page__btn--primary" to="/problems">
            Start Solving
          </Link>
          <Link className="home-page__btn home-page__btn--secondary" to="/leaderboard">
            View Leaderboard
          </Link>
        </div>
      </section>

      <section className="home-page__features" aria-label="Platform features">
        <article className="home-page__feature-card">
          <h2>Multi-Language Support</h2>
          <p>Code in Python, JavaScript, C++, and Java with language-tailored execution.</p>
        </article>
        <article className="home-page__feature-card">
          <h2>Secure Sandbox</h2>
          <p>Run inside isolated Docker containers with strict limits and no network access.</p>
        </article>
        <article className="home-page__feature-card">
          <h2>Real-time Results</h2>
          <p>Get stdout, stderr, and execution status quickly while tracking your submissions.</p>
        </article>
      </section>
    </div>
  );
}
