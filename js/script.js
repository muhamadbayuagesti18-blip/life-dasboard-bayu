const $ = (selector) => document.querySelector(selector);
const STORAGE = { tasks: "lifeboard_tasks_v1", links: "lifeboard_links_v1", name: "lifeboard_name_v1", theme: "lifeboard_theme_v1", duration: "lifeboard_duration_v1", schedule: "lifeboard_schedule_v1", goals: "lifeboard_goals_v1" };

function readStorage(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function writeStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

let tasks = readStorage(STORAGE.tasks, []);
let links = readStorage(STORAGE.links, []);
let schedule = readStorage(STORAGE.schedule, []);
let goals = readStorage(STORAGE.goals, []);
let userName = localStorage.getItem(STORAGE.name) || "";
let duration = Number(localStorage.getItem(STORAGE.duration)) || 25;
let remaining = duration * 60;
let timerInterval = null;
let timerRunning = false;
let editingTaskId = null;
let toastTimeout;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2300);
}

function updateClock() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleTimeString("id-ID", { hour12: false });
  $("#fullDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#topDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
  const hour = now.getHours();
  let greeting = "Selamat malam";
  if (hour >= 4 && hour < 11) greeting = "Selamat pagi";
  else if (hour >= 11 && hour < 15) greeting = "Selamat siang";
  else if (hour >= 15 && hour < 18) greeting = "Selamat sore";
  $("#greeting").textContent = `${greeting}${userName ? ", " + userName : "!"}`;
  $("#year").textContent = now.getFullYear();
}
function saveName() {
  userName = $("#userName").value.trim().slice(0, 24);
  localStorage.setItem(STORAGE.name, userName);
  updateClock();
  showToast(userName ? `Senang melihatmu, ${userName}!` : "Nama berhasil diperbarui.");
}

function renderStats() {
  const done = tasks.filter(task => task.done).length;
  $("#doneTasks").textContent = done;
  $("#pendingTasks").textContent = tasks.length - done;
  $("#taskCount").textContent = `${tasks.length} tugas`;
  $("#doneBadge").textContent = `${done}/${tasks.length} selesai`;
  const pendingText = tasks.length - done;
  $("#taskSummary").textContent = tasks.length
    ? `${pendingText} tugas menunggu, ${done} selesai`
    : "Belum ada tugas";
  $("#scheduleCount").textContent = `${schedule.length} kegiatan`;
  $("#goalCount").textContent = `${goals.length} target`;
  $("#totalGoals").textContent = goals.length;
}
function renderTasks() {
  const list = $("#taskList");
  list.innerHTML = "";
  const sort = $("#taskSort").value;
  let visible = [...tasks];
  if (sort === "oldest") visible.reverse();
  if (sort === "pending") visible.sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
  visible.forEach(task => {
    const li = document.createElement("li");
    li.className = `task-item${task.done ? " completed" : ""}`;
    const check = document.createElement("input");
    check.type = "checkbox"; check.className = "task-check"; check.checked = task.done;
    check.setAttribute("aria-label", `Tandai ${task.text} ${task.done ? "belum selesai" : "selesai"}`);
    check.addEventListener("change", () => toggleTask(task.id));
    const text = document.createElement("span"); text.className = "task-text"; text.textContent = task.text;
    const actions = document.createElement("div"); actions.className = "task-actions";
    const edit = document.createElement("button"); edit.className = "mini-action"; edit.type = "button"; edit.textContent = "✎"; edit.title = "Edit tugas"; edit.setAttribute("aria-label", "Edit tugas"); edit.addEventListener("click", () => openEdit(task.id));
    const del = document.createElement("button"); del.className = "mini-action"; del.type = "button"; del.textContent = "×"; del.title = "Hapus tugas"; del.setAttribute("aria-label", "Hapus tugas"); del.addEventListener("click", () => deleteTask(task.id));
    actions.append(edit, del); li.append(check, text, actions); list.append(li);
  });
  $("#emptyTasks").hidden = tasks.length > 0;
  renderStats();
}
function addTask(text) {
  tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, done: false, createdAt: Date.now() });
  writeStorage(STORAGE.tasks, tasks); renderTasks(); showToast("Tugas berhasil ditambahkan.");
}
function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
  writeStorage(STORAGE.tasks, tasks); renderTasks();
}
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  writeStorage(STORAGE.tasks, tasks); renderTasks(); showToast("Tugas dihapus.");
}
function openEdit(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  editingTaskId = id; $("#editTaskInput").value = task.text; $("#editDialog").showModal(); $("#editTaskInput").focus();
}
function saveEdit(event) {
  event.preventDefault();
  const text = $("#editTaskInput").value.trim();
  if (!text || !editingTaskId) return;
  tasks = tasks.map(task => task.id === editingTaskId ? { ...task, text } : task);
  writeStorage(STORAGE.tasks, tasks); renderTasks(); $("#editDialog").close(); showToast("Tugas berhasil diperbarui.");
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
function renderTimer() {
  $("#timerDisplay").textContent = formatTime(remaining);
  $("#timerMode").textContent = timerRunning ? "SEDANG FOKUS" : "WAKTU FOKUS";
  $("#timerCaption").textContent = timerRunning ? "Tetap semangat, kamu bisa!" : (remaining === 0 ? "Sesi selesai. Kerja bagus!" : "Siap untuk mulai?");
  const progress = 1 - remaining / (duration * 60);
  $("#timerRing").style.background = `conic-gradient(var(--primary) ${progress * 360}deg, var(--line) 0deg)`;
}
function startTimer() {
  if (timerRunning) return;
  if (remaining <= 0) remaining = duration * 60;
  timerRunning = true; renderTimer();
  timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      remaining = 0; clearInterval(timerInterval); timerRunning = false;
      renderTimer(); showToast("Waktu fokus selesai. Istirahat sejenak!"); return;
    }
    renderTimer();
  }, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null; timerRunning = false; renderTimer();
}
function resetTimer() {
  stopTimer(); remaining = duration * 60; renderTimer(); showToast("Timer diatur ulang.");
}
function applyDuration() {
  const value = Number($("#durationInput").value);
  if (!Number.isInteger(value) || value < 1 || value > 180) {
    showToast("Masukkan durasi 1 sampai 180 menit."); return;
  }
  stopTimer(); duration = value; remaining = duration * 60;
  localStorage.setItem(STORAGE.duration, String(duration)); renderTimer(); showToast(`Durasi diubah menjadi ${duration} menit.`);
}

function renderLinks() {
  const container = $("#quickLinks"); container.innerHTML = "";
  links.forEach(link => {
    const a = document.createElement("a"); a.className = "quick-link"; a.href = link.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    const avatar = document.createElement("span"); avatar.className = "link-avatar"; avatar.textContent = link.name.charAt(0).toUpperCase();
    const name = document.createElement("span"); name.textContent = link.name; name.title = link.url;
    const remove = document.createElement("button"); remove.className = "remove-link"; remove.type = "button"; remove.textContent = "×"; remove.title = "Hapus tautan"; remove.setAttribute("aria-label", `Hapus ${link.name}`);
    remove.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); links = links.filter(item => item.id !== link.id); writeStorage(STORAGE.links, links); renderLinks(); showToast("Tautan dihapus."); });
    a.append(avatar, name, remove); container.append(a);
  });
  if (!links.length) {
    const empty = document.createElement("p"); empty.className = "small-note"; empty.textContent = "Belum ada tautan. Tambahkan situs favoritmu."; container.append(empty);
  }
}
function normalizeUrl(value) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("URL tidak valid");
  return parsed.href;
}
function addLink(name, url) {
  links.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name, url });
  writeStorage(STORAGE.links, links); renderLinks(); showToast("Tautan berhasil disimpan.");
}

function formatScheduleDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / 86400000);
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Besok";
  if (diffDays === -1) return "Kemarin";
  return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function renderSchedule() {
  const list = $("#scheduleList"); list.innerHTML = "";
  const sorted = [...schedule].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );
  sorted.forEach(item => {
    const li = document.createElement("li"); li.className = "schedule-item";
    const time = document.createElement("div"); time.className = "schedule-time";
    time.innerHTML = `<strong>${item.time}</strong><span>${formatScheduleDate(item.date)}</span>`;
    const body = document.createElement("div"); body.className = "schedule-body";
    const title = document.createElement("span"); title.className = "schedule-title"; title.textContent = item.title;
    const actions = document.createElement("div"); actions.className = "task-actions";
    const del = document.createElement("button"); del.className = "mini-action"; del.type = "button"; del.textContent = "×"; del.title = "Hapus kegiatan"; del.setAttribute("aria-label", `Hapus ${item.title}`);
    del.addEventListener("click", () => {
      schedule = schedule.filter(entry => entry.id !== item.id);
      writeStorage(STORAGE.schedule, schedule); renderSchedule(); showToast("Kegiatan dihapus.");
    });
    actions.append(del); body.append(title, actions); li.append(time, body); list.append(li);
  });
  $("#emptySchedule").hidden = schedule.length > 0;
  renderStats();
}
function addSchedule(title, date, time) {
  schedule.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, date, time });
  writeStorage(STORAGE.schedule, schedule); renderSchedule();
}

function renderGoals() {
  const list = $("#goalList"); list.innerHTML = "";
  goals.forEach(goal => {
    const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
    const li = document.createElement("li"); li.className = `goal-item${percent >= 100 ? " achieved" : ""}`;
    const head = document.createElement("div"); head.className = "goal-head";
    const name = document.createElement("span"); name.className = "goal-name"; name.textContent = goal.name;
    const value = document.createElement("span"); value.className = "goal-value"; value.textContent = `${goal.current}/${goal.target}`;
    head.append(name, value);
    const bar = document.createElement("div"); bar.className = "goal-bar";
    const fill = document.createElement("div"); fill.className = "goal-fill"; fill.style.width = `${percent}%`;
    bar.append(fill);
    const controls = document.createElement("div"); controls.className = "goal-controls";
    const minus = document.createElement("button"); minus.className = "mini-action"; minus.type = "button"; minus.textContent = "−"; minus.title = "Kurangi kemajuan"; minus.setAttribute("aria-label", `Kurangi kemajuan ${goal.name}`);
    minus.addEventListener("click", () => updateGoal(goal.id, -1));
    const plus = document.createElement("button"); plus.className = "mini-action goal-plus"; plus.type = "button"; plus.textContent = "+"; plus.title = "Tambah kemajuan"; plus.setAttribute("aria-label", `Tambah kemajuan ${goal.name}`);
    plus.addEventListener("click", () => updateGoal(goal.id, 1));
    const del = document.createElement("button"); del.className = "mini-action"; del.type = "button"; del.textContent = "×"; del.title = "Hapus target"; del.setAttribute("aria-label", `Hapus target ${goal.name}`);
    del.addEventListener("click", () => {
      goals = goals.filter(item => item.id !== goal.id);
      writeStorage(STORAGE.goals, goals); renderGoals(); showToast("Target dihapus.");
    });
    controls.append(minus, plus, del);
    li.append(head, bar, controls); list.append(li);
  });
  $("#emptyGoals").hidden = goals.length > 0;
  renderStats();
}
function updateGoal(id, delta) {
  goals = goals.map(goal => {
    if (goal.id !== id) return goal;
    const current = Math.max(0, Math.min(goal.target, goal.current + delta));
    if (current === goal.target && delta > 0) showToast(`Target "${goal.name}" tercapai. Hebat!`);
    return { ...goal, current };
  });
  writeStorage(STORAGE.goals, goals); renderGoals();
}
function addGoal(name, target) {
  goals.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name, target, current: 0 });
  writeStorage(STORAGE.goals, goals); renderGoals();
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  $("#themeIcon").textContent = theme === "dark" ? "☀" : "☾";
  $("#themeToggle").setAttribute("aria-label", theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap");
  localStorage.setItem(STORAGE.theme, theme);
}

$("#saveName").addEventListener("click", saveName);
$("#userName").addEventListener("keydown", event => { if (event.key === "Enter") saveName(); });
$("#themeToggle").addEventListener("click", () => applyTheme(document.body.classList.contains("dark") ? "light" : "dark"));
$("#taskForm").addEventListener("submit", event => {
  event.preventDefault(); const input = $("#taskInput"); const value = input.value.trim();
  if (value) { addTask(value); input.value = ""; input.focus(); }
});
$("#taskSort").addEventListener("change", renderTasks);
$("#editForm").addEventListener("submit", saveEdit);
$("#editForm").addEventListener("close", () => { editingTaskId = null; });
$("#startTimer").addEventListener("click", startTimer);
$("#stopTimer").addEventListener("click", stopTimer);
$("#resetTimer").addEventListener("click", resetTimer);
$("#applyDuration").addEventListener("click", applyDuration);
$("#linkForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#linkName").value.trim(); const rawUrl = $("#linkUrl").value.trim();
  try {
    if (!name) throw new Error("Isi nama situs terlebih dahulu.");
    const url = normalizeUrl(rawUrl);
    if (links.some(link => link.url === url)) throw new Error("Tautan tersebut sudah tersimpan.");
    addLink(name, url); $("#linkForm").reset();
  } catch (error) { showToast(error.message || "Periksa kembali alamat situs."); }
});

$("#scheduleForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#scheduleTitle").value.trim();
  const date = $("#scheduleDate").value;
  const time = $("#scheduleTime").value;
  if (!title) { showToast("Isi nama kegiatan terlebih dahulu."); return; }
  if (!date || !time) { showToast("Lengkapi tanggal dan jam kegiatan."); return; }
  addSchedule(title, date, time);
  $("#scheduleForm").reset();
  showToast("Kegiatan berhasil ditambahkan.");
});
$("#goalForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#goalName").value.trim();
  const target = Number($("#goalTarget").value);
  if (!name) { showToast("Isi nama target terlebih dahulu."); return; }
  if (!Number.isInteger(target) || target < 1 || target > 9999) { showToast("Target harus berupa angka 1 sampai 9999."); return; }
  addGoal(name, target);
  $("#goalForm").reset();
  showToast("Target berhasil ditambahkan.");
});

function init() {
  $("#userName").value = userName;
  $("#durationInput").value = duration;
  applyTheme(localStorage.getItem(STORAGE.theme) || "light");
  updateClock(); setInterval(updateClock, 1000);
  renderTimer(); renderTasks(); renderLinks(); renderSchedule(); renderGoals();
}
init();
