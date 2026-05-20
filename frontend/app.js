const API_URL = "/api";

const taskList = document.getElementById("taskList");
const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const statusMessage = document.getElementById("statusMessage");

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError ? "status-line error" : "status-line";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  totalCount.textContent = String(tasks.length);
  doneCount.textContent = String(tasks.filter((task) => task.completed).length);

  if (tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No tasks yet. Add the first one.";
    taskList.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "task-card";

    const main = document.createElement("div");
    main.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = Boolean(task.completed);
    checkbox.addEventListener("change", () => updateTask(task.id, checkbox.checked));

    const textWrap = document.createElement("div");

    const text = document.createElement("div");
    text.className = task.completed ? "task-text done" : "task-text";
    text.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = task.completed
      ? `Completed • ${formatDate(task.created_at)}`
      : `Pending • ${formatDate(task.created_at)}`;

    textWrap.append(text, meta);
    main.append(checkbox, textWrap);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(removeButton);
    card.append(main, actions);
    taskList.appendChild(card);
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    let message = "Request failed";

    try {
      const data = await response.json();
      message = data.error || message;
    } catch (error) {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadTasks() {
  try {
    setStatus("Loading tasks...");
    const tasks = await request("/tasks");
    renderTasks(tasks);
    setStatus("Tasks synced with backend.");
  } catch (error) {
    renderTasks([]);
    setStatus(`Could not load tasks: ${error.message}`, true);
  }
}

async function addTask() {
  const title = taskInput.value.trim();

  if (!title) {
    setStatus("Enter a task title first.", true);
    return;
  }

  addButton.disabled = true;

  try {
    await request("/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    taskInput.value = "";
    setStatus("Task added.");
    await loadTasks();
  } catch (error) {
    setStatus(`Could not add task: ${error.message}`, true);
  } finally {
    addButton.disabled = false;
    taskInput.focus();
  }
}

async function updateTask(id, completed) {
  try {
    await request(`/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed }),
    });

    setStatus(completed ? "Task marked complete." : "Task moved back to pending.");
    await loadTasks();
  } catch (error) {
    setStatus(`Could not update task: ${error.message}`, true);
    await loadTasks();
  }
}

async function deleteTask(id) {
  try {
    await request(`/tasks/${id}`, {
      method: "DELETE",
    });

    setStatus("Task deleted.");
    await loadTasks();
  } catch (error) {
    setStatus(`Could not delete task: ${error.message}`, true);
  }
}

addButton.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

loadTasks();
