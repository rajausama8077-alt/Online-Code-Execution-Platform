const bcrypt = require("bcrypt");
const { query, pool } = require("../db");

async function run() {
  const username = "admin";
  const email = "admin2@test.com";
  const password = "admin123";
  const role = "admin";

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [username, email, passwordHash, role],
    );

    if (result.rowCount === 0) {
      console.log("Admin user already exists, nothing inserted.");
    } else {
      console.log("Admin user created.");
    }
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Failed to create admin user:", err?.message || err);
  process.exit(1);
});
