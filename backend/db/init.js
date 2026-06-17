const fs = require("fs");
const path = require("path");
const { query, pool } = require("../db");

async function run() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const seedPath = path.join(__dirname, "seed.sql");

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const seedSql = fs.readFileSync(seedPath, "utf8");

  try {
    await query(schemaSql);
    await query(seedSql);
    console.log("Database initialized: schema + seed applied.");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Database init failed:", err?.message || err);
  process.exit(1);
});
