const API_URL = "/api";

const taskList = document.getElementById("taskList");
const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const pendingCount = document.getElementById("pendingCount");
const completionRate = document.getElementById("completionRate");
const progressFill = document.getElementById("progressFill");
const statusMessage = document.getElementById("statusMessage");

function setStatus(msg, isError, isLoading) {
  statusMessage.textContent = msg;
  statusMessage.className = isError
    ? "status error"
    : isLoading
      ? "status loading"
      : "status";
}

function formatDate(value) {
  var d = new Date(value);
  if (Number.isNaN(d.getTime())) return "just now";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  var completed = tasks.filter(function(t) { return t.completed; }).length;
  var pending = tasks.length - completed;
  var pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  totalCount.textContent = tasks.length;
  doneCount.textContent = completed;
  pendingCount.textContent = pending;
  completionRate.textContent = pct + "%";
  progressFill.style.width = pct + "%";

  if (tasks.length === 0) {
    var el = document.createElement("div");
    el.className = "empty";
    el.innerHTML = '<div class="empty-title">Nothing here yet</div>' +
      '<div class="empty-sub">Add your first task and it\'ll show up here.</div>';
    taskList.appendChild(el);
    return;
  }

  tasks.forEach(function(task) {
    var row = document.createElement("div");
    row.className = task.completed ? "task done" : "task";

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(task.completed);
    cb.addEventListener("change", function() { updateTask(task.id, cb.checked); });

    var body = document.createElement("div");
    body.className = "task-body";

    var name = document.createElement("div");
    name.className = task.completed ? "task-name crossed" : "task-name";
    name.textContent = task.title;

    var date = document.createElement("div");
    date.className = "task-date";
    date.textContent = formatDate(task.created_at);

    body.appendChild(name);
    body.appendChild(date);

    var del = document.createElement("button");
    del.className = "del";
    del.textContent = "remove";
    del.addEventListener("click", function() { deleteTask(task.id); });

    row.appendChild(cb);
    row.appendChild(body);
    row.appendChild(del);
    taskList.appendChild(row);
  });
}

async function request(path, options) {
  var res = await fetch(API_URL + path, options || {});

  if (!res.ok) {
    var msg = "Request failed";
    try {
      var data = await res.json();
      msg = data.error || msg;
    } catch (_) {
      msg = res.statusText || msg;
    }
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function loadTasks() {
  try {
    setStatus("Loading...", false, true);
    var tasks = await request("/tasks");
    renderTasks(tasks);
    setStatus("");
  } catch (err) {
    renderTasks([]);
    setStatus("Backend isn't responding: " + err.message, true);
  }
}

async function addTask() {
  var title = taskInput.value.trim();
  if (!title) return;

  addButton.disabled = true;

  try {
    await request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title }),
    });
    taskInput.value = "";
    setStatus("");
    await loadTasks();
  } catch (err) {
    setStatus("Couldn't add that: " + err.message, true);
  } finally {
    addButton.disabled = false;
    taskInput.focus();
  }
}

async function updateTask(id, completed) {
  try {
    await request("/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: completed }),
    });
    await loadTasks();
  } catch (err) {
    setStatus("Couldn't update that: " + err.message, true);
    await loadTasks();
  }
}

async function deleteTask(id) {
  try {
    await request("/tasks/" + id, { method: "DELETE" });
    await loadTasks();
  } catch (err) {
    setStatus("Couldn't remove that: " + err.message, true);
  }
}

addButton.addEventListener("click", addTask);
taskInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") addTask();
});

loadTasks();
