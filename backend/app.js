const express = require("express");
const cors = require("cors");

function createApp(pool) {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/health/live", (_req, res) => {
    res.json({ status: "ok", service: "backend" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ready", service: "backend" });
    } catch (_err) {
      res.status(503).json({ status: "not-ready", service: "backend" });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "backend" });
  });

  app.get("/tasks", async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, title, completed, created_at FROM tasks ORDER BY id DESC"
      );
      res.json(result.rows);
    } catch (_err) {
      res.status(500).json({ error: "Unable to load tasks" });
    }
  });

  app.post("/tasks", async (req, res) => {
    try {
      const title = String(req.body.title || "").trim();

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const result = await pool.query(
        "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed, created_at",
        [title]
      );

      return res.status(201).json(result.rows[0]);
    } catch (_err) {
      return res.status(500).json({ error: "Unable to create task" });
    }
  });

  app.put("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;

      if (typeof completed !== "boolean") {
        return res.status(400).json({ error: "Completed must be a boolean" });
      }

      const result = await pool.query(
        "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at",
        [completed, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.json(result.rows[0]);
    } catch (_err) {
      return res.status(500).json({ error: "Unable to update task" });
    }
  });

  app.delete("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM tasks WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.status(204).send();
    } catch (_err) {
      return res.status(500).json({ error: "Unable to remove task" });
    }
  });

  return app;
}

module.exports = { createApp };
