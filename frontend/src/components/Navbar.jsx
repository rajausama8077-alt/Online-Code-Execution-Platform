import { Link } from "react-router-dom";
import "./Navbar.css";

/** @param {{ authUser: { username?: string; role?: string } | null; onLogout: () => void }} props */
export function Navbar({ authUser, onLogout }) {
  let storedUser;
  try {
    const raw = localStorage.getItem("auth_user");
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }
  const effectiveUser = storedUser && typeof storedUser === "object" ? storedUser : authUser;
  const user = effectiveUser;
  console.log("user role in navbar:", user?.role);
  const isAdmin = effectiveUser?.role === "admin";
  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <nav className="app-navbar__links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/problems">Problems</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/submissions">Submissions</Link>
          {isAdmin ? <Link to="/admin">Admin</Link> : null}
        </nav>

        {effectiveUser ? (
          <div className="app-navbar__auth">
            <span className="app-navbar__user">Hi, {effectiveUser.username}</span>
            <button type="button" className="app-navbar__btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="app-navbar__auth">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}
