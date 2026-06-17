require("dotenv").config();

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL missing. Check .env file");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

pool.on("error", (err) => {
  console.error("[postgres] Unexpected error:", err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};