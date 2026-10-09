const { Pool } = require("pg");
const { createApp } = require("./app");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "todoapp",
  port: Number(process.env.DB_PORT || 5432),
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

const PORT = process.env.PORT || 5000;
const app = createApp(pool);

initDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });

    async function shutdown(signal) {
      console.log(`${signal} received; shutting down`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
