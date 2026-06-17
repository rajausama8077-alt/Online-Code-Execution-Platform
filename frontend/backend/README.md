# Mini HackerRank Backend

This backend provides:

- secure sandboxed code execution using Docker containers
- support for `python`, `java`, and `cpp`
- problem management via admin API
- leaderboard aggregation by accepted submissions
- user registration/login and submission tracking

## Requirements

- Node.js 18+
- Docker installed and running

## Run

1. Open a terminal in `frontend/backend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

The backend listens on `http://localhost:5000` by default.

## Default admin account

- username: `admin`
- password: `admin123`

## Notes

- Problems are seeded automatically on first run.
- The execution sandbox uses Docker with `--network none`, memory and CPU limits.
- If Docker is unavailable, execution jobs will fail gracefully.
