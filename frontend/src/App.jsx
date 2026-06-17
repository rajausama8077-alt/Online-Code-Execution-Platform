import axios from "axios";
import { useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Navbar } from "./components/Navbar.jsx";
import { EditorPage } from "./pages/EditorPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { LeaderboardPage } from "./pages/LeaderboardPage.jsx";
import { ProblemsPage } from "./pages/ProblemsPage.jsx";
import { ProblemSolvePage } from "./pages/ProblemSolvePage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { SubmissionsPage } from "./pages/SubmissionsPage.jsx";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:5000";

const POLL_MS = 2000;
const MAX_MEANINGFUL_POLLS = 15;
const MAX_TOTAL_POLLS = 60;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPendingNoJob(d) {
  return d && d.status === "pending" && (d.result === null || d.result === undefined);
}

function normalizeExecution(data) {
  return {
    stdout: typeof data.stdout === "string" ? data.stdout : "",
    stderr: typeof data.stderr === "string" ? data.stderr : "",
    executionTime:
      typeof data.executionTime === "string" ? data.executionTime : "",
    memory: typeof data.memory === "string" ? data.memory : "",
    exitCode: typeof data.exitCode === "number" ? data.exitCode : undefined,
  };
}

/**
 * POST /run → 202 { jobId } → poll GET /run/jobs/:id every 2s (max 15 non–job-not-found polls).
 */
async function runOnServer(payload) {
  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const post = await axios.post(`${API_BASE}/run`, payload, {
    headers: { "Content-Type": "application/json", ...authHeaders },
    validateStatus: () => true,
  });

  const postData = post.data;
  if (!postData || typeof postData !== "object") {
    throw new Error("Unexpected response from server");
  }

  if (typeof postData.error === "string" && postData.error.trim()) {
    return {
      stdout: "",
      stderr: postData.error.trim(),
      executionTime: "",
      memory: "",
    };
  }

  if (post.status === 400) {
    return normalizeExecution(postData);
  }

  if (post.status !== 202 || typeof postData.jobId !== "string") {
    if (post.status >= 400) {
      return {
        stdout: "",
        stderr:
          typeof postData.stderr === "string" && postData.stderr.trim()
            ? postData.stderr
            : "Request failed",
        executionTime: "",
        memory: "",
      };
    }
    throw new Error("Unexpected response from server (expected 202 + jobId)");
  }

  const { jobId } = postData;
  console.log("[run] jobId", jobId);

  let meaningfulPolls = 0;
  let totalPolls = 0;

  while (totalPolls < MAX_TOTAL_POLLS) {
    if (totalPolls > 0) await sleep(POLL_MS);

    const poll = await axios.get(
      `${API_BASE}/run/jobs/${encodeURIComponent(jobId)}`,
      { headers: authHeaders, validateStatus: () => true },
    );
    totalPolls += 1;

    console.log("[run] poll response", {
      jobId,
      totalPolls,
      meaningfulPolls,
      httpStatus: poll.status,
      data: poll.data,
    });

    const d = poll.data;
    if (!d || typeof d !== "object") {
      throw new Error("Unexpected poll response");
    }

    if (isPendingNoJob(d)) {
      continue;
    }

    if (typeof d.error === "string" && d.error.trim() && poll.status >= 400) {
      return {
        stdout: "",
        stderr: d.error.trim(),
        executionTime: "",
        memory: "",
      };
    }

    if (d.status === "completed") {
      return normalizeExecution(d.result ?? {});
    }

    if (d.status === "failed") {
      return normalizeExecution(d.result ?? {});
    }

    if (poll.status >= 500) {
      return {
        stdout: "",
        stderr: "Execution service unavailable. Please try again.",
        executionTime: "",
        memory: "",
      };
    }

    meaningfulPolls += 1;
    if (meaningfulPolls >= MAX_MEANINGFUL_POLLS) {
      return {
        stdout: "",
        stderr:
          "Timed out waiting for execution result (15 polls without completed/failed).",
        executionTime: "",
        memory: "",
      };
    }
  }

  return {
    stdout: "",
    stderr: "Timed out waiting for execution result (too many polls).",
    executionTime: "",
    memory: "",
  };
}

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token") || "";
    const rawUser = localStorage.getItem("auth_user");
    let user = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = null;
      }
    }
    return { token, user };
  });

  const isLoggedIn = Boolean(auth.token);
  const authUser = useMemo(() => auth.user, [auth.user]);
  const isAdmin = authUser?.role === "admin";

  /** @param {{ token: string; user?: { id: number; username: string; email: string; role?: string } }} payload */
  function handleAuthSuccess(payload) {
    const token = String(payload?.token ?? "");
    if (!token) return;
    let tokenRole;
    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1] || ""));
      tokenRole = tokenPayload?.role;
    } catch {
      tokenRole = undefined;
    }
    const user =
      payload?.user && typeof payload.user === "object"
        ? { ...payload.user, role: payload.user.role ?? tokenRole }
        : null;
    localStorage.setItem("token", token);
    if (user) localStorage.setItem("auth_user", JSON.stringify(user));
    setAuth({ token, user });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setAuth({ token: "", user: null });
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar authUser={authUser} onLogout={handleLogout} />
        <main className="app-shell__main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route
              path="/admin"
              element={
                isLoggedIn ? <AdminPage token={auth.token} isAdmin={isAdmin} /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/problems/:problemId"
              element={<ProblemSolvePage onRun={runOnServer} />}
            />
            <Route path="/editor" element={<EditorPage onRun={runOnServer} />} />
            <Route
              path="/login"
              element={
                <LoginPage isLoggedIn={isLoggedIn} onAuthSuccess={handleAuthSuccess} />
              }
            />
            <Route
              path="/register"
              element={
                <RegisterPage isLoggedIn={isLoggedIn} onAuthSuccess={handleAuthSuccess} />
              }
            />
            <Route
              path="/submissions"
              element={
                isLoggedIn ? <SubmissionsPage token={auth.token} /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
