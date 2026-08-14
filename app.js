// ============================================================
// Klase — app.js
// Vanilla JS, no build step. Supabase for data + realtime.
// ============================================================

// ---- Supabase config -----------------------------------------------------
// Only the PUBLISHABLE key belongs here. It is safe to ship in client code —
// it is the key meant to be public, and access is controlled by the RLS
// policies in schema.sql. Never put a service_role key or JWT secret in
// frontend code; those grant full, unrestricted database access.
const SUPABASE_URL = "https://quvdlrprqcvoaewqqbwl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Wqryh5egoh0Mq1kFITCOAA_5BPJ_5Ci";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---- Gate password ---------------------------------------------------------
// This is a shared "class password", not per-user security — it lives in
// plain text in this file (visible to anyone who opens dev tools). That's
// the tradeoff of "no email signup, just a password", and fine for a small
// private group tool. Don't rely on it to protect anything sensitive.
const GATE_PASSWORD = "koleheyo";

const LS_KEYS = {
  userId: "klase_user_id",
  userName: "klase_user_name",
  authed: "klase_authed",
  theme: "klase_theme",
};

// ============================================================
// Utilities
// ============================================================

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "ngayon lang";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatClock(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

/** Heuristic "does this look like a real full name" check — not perfect,
 *  just enough to discourage obvious placeholder junk like "asdf" or "test". */
function looksLikeRealName(raw) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 4 || name.length > 60) return false;

  const words = name.split(" ");
  if (words.length < 2) return false; // require at least first + last name

  const wordPattern = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ'’.-]{2,}$/;
  for (const w of words) {
    if (!wordPattern.test(w)) return false;
    if (/(.)\1{2,}/i.test(w)) return false; // "aaaa", "kkkk" style mashing
    if (w.length >= 4 && !/[aeiouAEIOUÀ-ÖØ-öø-ÿ]/.test(w)) return false; // no vowel at all in a longer word
  }
  return true;
}

function titleCase(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================
// Toast
// ============================================================

let toastTimer = null;
function showToast(message, variant = "default") {
  const el = $("#toast");
  clearTimeout(toastTimer);
  el.className = "toast" + (variant === "error" ? " error" : "");
  el.textContent = message;
  el.hidden = false;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";

  toastTimer = setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => { el.hidden = true; }, 220);
  }, 2600);
}

// ============================================================
// Confetti — small paper-scrap burst, used on save/success
// ============================================================

function burstConfetti(originEl, count = 16) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue("--amber").trim(),
    getComputedStyle(document.documentElement).getPropertyValue("--teal").trim(),
  ];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    piece.style.left = `${cx}px`;
    piece.style.top = `${cy}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * dist - 30}px`);
    piece.style.setProperty("--rot", `${(Math.random() * 520 - 260).toFixed(0)}deg`);
    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

// ============================================================
// Theme
// ============================================================

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = $('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0a0a0c"
    );
  }
}

function initTheme() {
  const saved = localStorage.getItem(LS_KEYS.theme);
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(preferred);
}

function toggleTheme(clickEvent, btn) {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const size = Math.hypot(window.innerWidth, window.innerHeight) * 0.9;
    const ripple = document.createElement("div");
    ripple.className = "theme-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${cx - size / 2}px`;
    ripple.style.top = `${cy - size / 2}px`;
    document.body.appendChild(ripple);
    requestAnimationFrame(() => requestAnimationFrame(() => ripple.classList.add("grow")));
    ripple.addEventListener("transitionend", () => ripple.remove());
  }

  btn.classList.add("spin");
  setTimeout(() => btn.classList.remove("spin"), 520);

  applyTheme(next);
  localStorage.setItem(LS_KEYS.theme, next);
}

// ============================================================
// Auth gate
// ============================================================

function getSession() {
  const authed = localStorage.getItem(LS_KEYS.authed) === "1";
  const name = localStorage.getItem(LS_KEYS.userName);
  const userId = localStorage.getItem(LS_KEYS.userId);
  if (authed && name && userId) return { name, userId };
  return null;
}

function showGateError(message) {
  const errEl = $("#gateError");
  errEl.textContent = message;
  errEl.hidden = false;
  errEl.style.animation = "none";
  void errEl.offsetWidth;
  errEl.style.animation = "";

  const card = $(".gate-card");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const nameRaw = $("#nameInput").value;
  const password = $("#passwordInput").value;

  if (!looksLikeRealName(nameRaw)) {
    showGateError("I-type ang buo mong pangalan (first at last name).");
    return;
  }
  if (password !== GATE_PASSWORD) {
    showGateError("Mali ang password. Subukan ulit.");
    $("#passwordInput").value = "";
    $("#passwordInput").focus();
    return;
  }

  const name = titleCase(nameRaw);
  const userId = uuid();
  localStorage.setItem(LS_KEYS.userName, name);
  localStorage.setItem(LS_KEYS.userId, userId);
  localStorage.setItem(LS_KEYS.authed, "1");

  const card = $(".gate-card");
  card.classList.add("success");
  setTimeout(() => enterApp({ name, userId }), 260);
}

function initGate() {
  $("#loginForm").addEventListener("submit", handleLoginSubmit);

  $("#togglePassword").addEventListener("click", () => {
    const input = $("#passwordInput");
    const btn = $("#togglePassword");
    const isText = input.type === "text";
    input.type = isText ? "password" : "text";
    btn.innerHTML = `<i data-lucide="${isText ? "eye" : "eye-off"}"></i>`;
    refreshIcons();
  });

  $("#gateThemeToggle").addEventListener("click", (e) => toggleTheme(e, $("#gateThemeToggle")));
}

function logout() {
  localStorage.removeItem(LS_KEYS.authed);
  teardownRealtime();
  $("#app").hidden = true;
  $("#authGate").hidden = false;
  $("#loginForm").reset();
  $(".gate-card").classList.remove("success");
}

// ============================================================
// Navigation between Chats / Subjects
// ============================================================

let currentView = "subjects";

function switchView(view, { animateIcon = true } = {}) {
  if (view === currentView) return;
  currentView = view;

  $("#subjectsView").classList.toggle("hidden-view", view !== "subjects");
  $("#chatsView").classList.toggle("hidden-view", view !== "chats");
  $("#viewTitle").textContent = view === "subjects" ? "Subjects" : "Chats";

  $$(".nav-btn").forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.setAttribute("aria-current", active ? "page" : "false");
    if (active && animateIcon) {
      btn.classList.remove("bounce");
      void btn.offsetWidth;
      btn.classList.add("bounce");
    }
  });

  const indicator = $("#navIndicator");
  indicator.style.transform = view === "subjects" ? "translateX(0)" : "translateX(100%)";

  if (view === "chats") scrollChatToBottom(true);
}

function initNav() {
  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

// ============================================================
// Subjects
// ============================================================

let subjectsCache = [];
let editingSubjectId = null;

function renderSubjects() {
  const grid = $("#subjectsGrid");
  const empty = $("#subjectsEmpty");
  grid.innerHTML = "";

  if (subjectsCache.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  subjectsCache.forEach((subj) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.style.setProperty(
      "--card-accent",
      subj.id.charCodeAt(0) % 2 === 0
        ? getComputedStyle(document.documentElement).getPropertyValue("--teal")
        : getComputedStyle(document.documentElement).getPropertyValue("--amber")
    );

    const name = document.createElement("div");
    name.className = "subject-card-name";
    name.textContent = subj.subject_name;

    const content = document.createElement("div");
    content.className = "subject-card-content";
    content.textContent = subj.content;

    const meta = document.createElement("div");
    meta.className = "subject-card-meta";
    const author = document.createElement("span");
    author.className = "subject-card-author";
    author.textContent = subj.author_name;
    const time = document.createElement("span");
    time.textContent = timeAgo(subj.updated_at || subj.created_at);
    meta.append(author, time);

    card.append(name, content, meta);
    card.dataset.id = subj.id;
    card.addEventListener("click", () => openSubjectModal("edit", subj));
    grid.appendChild(card);
  });
}

async function fetchSubjects() {
  const { data, error } = await sb
    .from("subjects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Hindi ma-load ang subjects.", "error");
    return;
  }
  subjectsCache = data || [];
  renderSubjects();
}

function openSubjectModal(mode, subj = null) {
  editingSubjectId = mode === "edit" ? subj.id : null;
  $("#modalTitle").textContent = mode === "edit" ? "Edit subject" : "Add subject";
  $("#subjectNameInput").value = mode === "edit" ? subj.subject_name : "";
  $("#subjectContentInput").value = mode === "edit" ? subj.content : "";
  $("#subjectContentInput").style.height = "auto";
  $("#deleteSubjectBtn").hidden = mode !== "edit";

  $("#subjectModal").hidden = false;
  refreshIcons();
  setTimeout(() => $("#subjectNameInput").focus(), 80);
}

function closeSubjectModal() {
  $("#subjectModal").hidden = true;
  editingSubjectId = null;
  $("#subjectForm").reset();
}

async function handleSubjectSubmit(e) {
  e.preventDefault();
  const subject_name = $("#subjectNameInput").value.trim();
  const content = $("#subjectContentInput").value.trim();
  if (!subject_name || !content) return;

  const session = getSession();
  const saveBtn = e.target.querySelector('button[type="submit"]');
  saveBtn.disabled = true;

  let error;
  const wasEditing = !!editingSubjectId;
  if (editingSubjectId) {
    ({ error } = await sb
      .from("subjects")
      .update({ subject_name, content })
      .eq("id", editingSubjectId));
  } else {
    ({ error } = await sb
      .from("subjects")
      .insert({ subject_name, content, author_name: session.name }));
  }

  saveBtn.disabled = false;

  if (error) {
    console.error(error);
    showToast("Hindi na-save. Subukan ulit.", "error");
    return;
  }

  burstConfetti(saveBtn);
  showToast(wasEditing ? "Na-update na." : "Naidagdag na.");
  closeSubjectModal();
  fetchSubjects();
}

async function handleDeleteSubject() {
  if (!editingSubjectId) return;
  if (!confirm("Sigurado ka bang tatanggalin ito?")) return;

  const id = editingSubjectId;
  const cardEl = $(`#subjectsGrid .subject-card[data-id="${id}"]`);
  if (cardEl) cardEl.classList.add("removing");

  const { error } = await sb.from("subjects").delete().eq("id", id);
  if (error) {
    console.error(error);
    showToast("Hindi natanggal.", "error");
    return;
  }
  showToast("Tinanggal na.");
  closeSubjectModal();
  fetchSubjects();
}

function initSubjects() {
  $("#addSubjectBtn").addEventListener("click", () => openSubjectModal("add"));
  $("#closeModalBtn").addEventListener("click", closeSubjectModal);
  $("#cancelSubjectBtn").addEventListener("click", closeSubjectModal);
  $("#subjectModal").addEventListener("click", (e) => {
    if (e.target.id === "subjectModal") closeSubjectModal();
  });
  $("#subjectForm").addEventListener("submit", handleSubjectSubmit);
  $("#deleteSubjectBtn").addEventListener("click", handleDeleteSubject);

  const contentInput = $("#subjectContentInput");
  contentInput.addEventListener("input", () => {
    contentInput.style.height = "auto";
    contentInput.style.height = `${Math.min(contentInput.scrollHeight, 420)}px`;
  });
}

// ============================================================
// Chats
// ============================================================

let chatCache = [];

function scrollChatToBottom(instant = false) {
  const el = $("#chatMessages");
  el.scrollTo({ top: el.scrollHeight, behavior: instant ? "auto" : "smooth" });
}

function renderChatMessage(msg, session) {
  const row = document.createElement("div");
  row.className = "bubble-row " + (msg.sender_id === session.userId ? "own" : "other");

  if (msg.sender_id !== session.userId) {
    const name = document.createElement("div");
    name.className = "bubble-name";
    name.textContent = msg.sender_name;
    row.appendChild(name);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = msg.message;
  row.appendChild(bubble);

  const time = document.createElement("div");
  time.className = "bubble-time";
  time.textContent = formatClock(msg.created_at);
  row.appendChild(time);

  return row;
}

function renderAllChat(session) {
  const container = $("#chatMessages");
  container.innerHTML = "";
  chatCache.forEach((msg) => container.appendChild(renderChatMessage(msg, session)));
  scrollChatToBottom(true);
}

async function fetchChat(session) {
  const { data, error } = await sb
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    console.error(error);
    showToast("Hindi ma-load ang chat.", "error");
    return;
  }
  chatCache = data || [];
  renderAllChat(session);
}

async function sendChatMessage(session) {
  const input = $("#chatInput");
  const message = input.value.trim();
  if (!message) return;

  const sendBtn = $("#chatForm button[type='submit']");
  sendBtn.classList.remove("launch");
  void sendBtn.offsetWidth;
  sendBtn.classList.add("launch");

  input.value = "";
  input.style.height = "auto";

  const { error } = await sb.from("chat_messages").insert({
    sender_id: session.userId,
    sender_name: session.name,
    message,
  });

  if (error) {
    console.error(error);
    showToast("Hindi naipadala ang mensahe.", "error");
  }
}

function initChat(session) {
  const form = $("#chatForm");
  const input = $("#chatInput");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendChatMessage(session);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(session);
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });
}

// ============================================================
// Realtime subscriptions
// ============================================================

let subjectsChannel = null;
let chatChannel = null;

function setupRealtime(session) {
  subjectsChannel = sb
    .channel("public:subjects")
    .on("postgres_changes", { event: "*", schema: "public", table: "subjects" }, () => {
      fetchSubjects();
    })
    .subscribe();

  chatChannel = sb
    .channel("public:chat_messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
      const msg = payload.new;
      if (chatCache.some((m) => m.id === msg.id)) return;
      chatCache.push(msg);
      const container = $("#chatMessages");
      const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      container.appendChild(renderChatMessage(msg, session));
      if (wasNearBottom || msg.sender_id === session.userId) scrollChatToBottom();
    })
    .subscribe();
}

function teardownRealtime() {
  if (subjectsChannel) sb.removeChannel(subjectsChannel);
  if (chatChannel) sb.removeChannel(chatChannel);
  subjectsChannel = null;
  chatChannel = null;
}

// ============================================================
// App bootstrap
// ============================================================

let chatInitialized = false;

function enterApp(session) {
  $("#authGate").hidden = true;
  $("#app").hidden = false;
  $("#userChip").textContent = session.name;

  if (!chatInitialized) {
    initChat(session);
    chatInitialized = true;
  }

  fetchSubjects();
  fetchChat(session);
  setupRealtime(session);
  refreshIcons();
}

function init() {
  initTheme();
  initGate();
  initNav();
  initSubjects();

  $("#themeToggle").addEventListener("click", (e) => toggleTheme(e, $("#themeToggle")));
  $("#logoutBtn").addEventListener("click", logout);

  const session = getSession();
  if (session) {
    enterApp(session);
  } else {
    $("#authGate").hidden = false;
  }

  refreshIcons();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("SW failed:", err));
    });
  }
}

document.addEventListener("DOMContentLoaded", init);