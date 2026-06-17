import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import "./AuthPage.css";

/**
 * @param {{
 *   isLoggedIn: boolean;
 *   onAuthSuccess: (payload: { token: string; user: { id: number; username: string; email: string } }) => void;
 * }} props
 */
export function LoginPage({ isLoggedIn, onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) return <Navigate to="/problems" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      if (!data?.token) throw new Error("Missing token in response");
      onAuthSuccess(data);
      try {
        console.log(
          "auth_user from localStorage:",
          JSON.parse(localStorage.getItem("auth_user")),
        );
      } catch {
        console.log("auth_user from localStorage:", null);
      }
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Login</h1>
      <p className="auth-page__sub">Access your account to continue.</p>
      {error ? <div className="auth-page__error">{error}</div> : null}
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">
          Email
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label htmlFor="login-password">
          Password
          <div className="auth-page__password-row">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-page__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <span className="auth-page__toggle-icon" aria-hidden>
                {showPassword ? "🙈" : "👁"}
              </span>
            </button>
          </div>
        </label>
        <button className="auth-page__btn" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <div className="auth-page__switch">
        No account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}
