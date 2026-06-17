import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import "./AuthPage.css";

/**
 * @param {{
 *   isLoggedIn: boolean;
 *   onAuthSuccess: (payload: { token: string; user: { id: number; username: string; email: string } }) => void;
 * }} props
 */
export function RegisterPage({ isLoggedIn, onAuthSuccess }) {
  const [username, setUsername] = useState("");
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
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }
      if (!data?.token) throw new Error("Missing token in response");
      onAuthSuccess(data);
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Register</h1>
      <p className="auth-page__sub">Create your account to start solving.</p>
      {error ? <div className="auth-page__error">{error}</div> : null}
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <label htmlFor="register-username">
          Username
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label htmlFor="register-email">
          Email
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label htmlFor="register-password">
          Password
          <div className="auth-page__password-row">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
      <div className="auth-page__switch">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}
