const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createApp } = require("../app");

const calls = [];
const pool = {
  async query(sql, params = []) {
    calls.push({ sql, params });

    if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
    if (sql.startsWith("SELECT id")) return { rows: [] };
    if (sql.startsWith("INSERT INTO tasks")) {
      return {
        rows: [{ id: 1, title: params[0], completed: false, created_at: new Date().toISOString() }],
      };
    }
    if (sql.startsWith("UPDATE tasks")) {
      return {
        rowCount: 1,
        rows: [{ id: Number(params[1]), title: "Test", completed: params[0] }],
      };
    }
    if (sql.startsWith("DELETE FROM tasks")) return { rowCount: 1, rows: [{ id: params[0] }] };

    throw new Error(`Unexpected query: ${sql}`);
  },
};

let server;
let baseUrl;

before(async () => {
  const app = createApp(pool);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test("liveness and readiness endpoints succeed", async () => {
  const live = await fetch(`${baseUrl}/health/live`);
  assert.equal(live.status, 200);
  assert.equal((await live.json()).status, "ok");

  const ready = await fetch(`${baseUrl}/health/ready`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, "ready");
});

test("task title is required", async () => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "   " }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Title is required" });
});

test("task creation uses a parameterized query", async () => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Ship the pipeline" }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).title, "Ship the pipeline");

  const insert = calls.find((call) => call.sql.startsWith("INSERT INTO tasks"));
  assert.deepEqual(insert.params, ["Ship the pipeline"]);
  assert.match(insert.sql, /VALUES \(\$1\)/);
});
