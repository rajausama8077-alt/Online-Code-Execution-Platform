# Online Code Execution Platform

A Mini HackerRank — write code in the browser, run it securely in Docker, and compete on the leaderboard.

**Supports:** Python · JavaScript · C++ · Java

\---

## Prerequisites

Make sure you have these installed before starting:

* [Node.js v18+](https://nodejs.org)
* [Docker Desktop](https://www.docker.com/products/docker-desktop) — must be **running** before you start
* [Git](https://git-scm.com)

\---

## Setup

### 1\. Clone the repository

```bash
git clone https://github.com/Hussnainulhaq/online-code-execution-platform.git
cd online-code-execution-platform
```

### 2\. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 3\. Start Redis and PostgreSQL via Docker

```bash
docker run -d --name redis-server -p 6379:6379 redis:alpine

docker run -d \\\\
  --name code-platform-postgres \\\\
  -e POSTGRES\\\_PASSWORD=postgres \\\\
  -e POSTGRES\\\_DB=code\\\_platform \\\\
  -p 5432:5432 \\\\
  -v pgdata:/var/lib/postgresql/data \\\\
  postgres
```

> \\\*\\\*Windows users\\\*\\\* — run each command separately in PowerShell or CMD.

### 4\. Pull language images

```bash
docker pull python:3.10-slim
docker pull node:18-slim
docker pull gcc:latest
docker pull eclipse-temurin:17-jdk-jammy
```

### 5\. Set up the database

```bash
cd backend
node db/init.js
node db/createAdmin.js
```

### 6\. Create a `.env` file inside the `backend` folder

Create a file called `.env` inside the `backend` folder with this content:

```
PORT=5000
DATABASE\\\_URL=postgresql://postgres:postgres@127.0.0.1:5432/code\\\_platform
REDIS\\\_URL=redis://127.0.0.1:6379
JWT\\\_SECRET=change\\\_this\\\_to\\\_a\\\_random\\\_secret
```

\---

## Running the Project

You need **two terminals** open at the same time.

**Terminal 1 — Backend:**

```bash
cd backend
node index.js
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Then open your browser and go to: **http://localhost:5173**

\---

## Default Admin Account

After running `node db/createAdmin.js`, use these credentials to log in as admin:

|Field|Value|
|-|-|
|Email|admin@platform.com|
|Password|Admin@123|

Admin can create new problems from the **Admin** link in the navbar.

\---

## Project Structure

```
online-code-execution-platform/
├── backend/
│   ├── db/
│   │   ├── schema.sql        # Database tables
│   │   ├── seed.sql          # Sample problems
│   │   ├── init.js           # Run to create tables + seed
│   │   └── createAdmin.js    # Run to create admin user
│   ├── queues/
│   │   └── codeRunQueue.js   # BullMQ queue setup
│   ├── workers/
│   │   └── codeRunWorker.js  # Docker execution engine
│   ├── db.js                 # PostgreSQL connection
│   └── index.js              # Express API server
└── frontend/
    └── src/
        ├── pages/            # All React pages
        ├── components/       # Navbar and shared components
        └── App.jsx           # Routes
```

\---

## Features

* **Code Editor** — Monaco Editor (same as VS Code) with syntax highlighting
* **Secure Execution** — Code runs in isolated Docker containers with memory and CPU limits
* **Multi-language** — Python, JavaScript, C++, Java
* **Custom Input** — Provide stdin input before running code
* **Problems** — Curated problem set with Easy/Medium/Hard difficulty
* **Authentication** — Register and login with JWT
* **Submissions** — View your full submission history
* **Leaderboard** — Ranked by number of accepted submissions
* **Admin Panel** — Create and manage problems (admin only)

\---

## Troubleshooting

**"Cannot connect to Docker"**
→ Make sure Docker Desktop is open and Engine is running (green icon in taskbar)

**"ECONNREFUSED 6379" (Redis error)**
→ Run: `docker start redis-server`

**"ECONNREFUSED 5432" (PostgreSQL error)**
→ Run: `docker start code-platform-postgres`

**Port 5000 already in use**
→ Run: `npx kill-port 5000` then restart the backend

**Old process still running after restart**
→ Windows: `netstat -ano | findstr :5000` then `taskkill /PID <number> /F`

\---

## Tech Stack

|Layer|Technology|
|-|-|
|Frontend|React.js + Monaco Editor|
|Backend|Node.js + Express|
|Execution|Docker containers|
|Queue|BullMQ + Redis|
|Database|PostgreSQL|
|Auth|JWT + Bcrypt|



