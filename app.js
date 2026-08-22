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

// The real subject list, read off Ray's class schedule photo — colors match
// that schedule's color-coding so Subjects/Calendar/Recap all speak the
// same visual language.
const SUBJECT_COLORS = {
  "Computer Programming": "#6b6b74",
  "Introduction to Computing": "#4d7ea8",
  "Understanding the Self": "#c99a2e",
  "Purposive Communication": "#8b7cc9",
  "Philippine Popular Culture": "#d6478f",
  "The Contemporary World": "#c9b382",
  "National Service Training Program": "#5cb88a",
  "PE": "#6fb3d9",
  "Euthenics 1": "#d99384",
};
const SUBJECT_LIST = Object.keys(SUBJECT_COLORS);

// A separate, deliberately vibrant palette just for the "not done yet" neon
// glow — the muted SUBJECT_COLORS above (matched to the real schedule photo)
// look flat as a glow, so the glow gets its own punchier red/blue/pink/etc.
const NEON_GLOW_COLORS = {
  "Computer Programming": "#00e5ff",
  "Introduction to Computing": "#2f6fff",
  "Understanding the Self": "#ffe600",
  "Purposive Communication": "#b026ff",
  "Philippine Popular Culture": "#ff2d95",
  "The Contemporary World": "#ff9100",
  "National Service Training Program": "#39ff14",
  "PE": "#00d4ff",
  "Euthenics 1": "#ff073a",
};

// Embedded directly (not a separate file) so it always works regardless
// of whether image files made it into the deployed repo.
const DEFAULT_AVATAR_DATA_URI = "data:image/jpeg;base64,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";

// Class schedule, read off the actual timetable photo — powers the
// Calendar tab. Times are 24h "HH:MM".
const SCHEDULE = [
  { day: "Mon", subject: "Computer Programming", room: "LabE", start: "07:00", end: "10:00" },
  { day: "Mon", subject: "Introduction to Computing", room: "LabF", start: "10:00", end: "13:00" },
  { day: "Mon", subject: "Understanding the Self", room: "B201", start: "13:00", end: "15:00" },
  { day: "Mon", subject: "Purposive Communication", room: "B403", start: "16:00", end: "18:00" },

  { day: "Tue", subject: "Philippine Popular Culture", room: "B302", start: "07:00", end: "08:00" },
  { day: "Tue", subject: "The Contemporary World", room: "B401", start: "08:00", end: "10:00" },
  { day: "Tue", subject: "National Service Training Program", room: "B201", start: "11:00", end: "13:00" },

  { day: "Wed", subject: "PE", room: "Court B", start: "14:30", end: "17:00" },
  { day: "Wed", subject: "Euthenics 1", room: "A203", start: "17:30", end: "18:30" },

  { day: "Thu", subject: "Introduction to Computing", room: "labD", start: "08:30", end: "10:00" },
  { day: "Thu", subject: "Computer Programming", room: "LabF", start: "10:00", end: "12:30" },
  { day: "Thu", subject: "Understanding the Self", room: "B201", start: "13:00", end: "15:00" },
  { day: "Thu", subject: "Purposive Communication", room: "B403", start: "16:00", end: "18:00" },

  { day: "Fri", subject: "Philippine Popular Culture", room: "B302", start: "07:00", end: "08:00" },
  { day: "Fri", subject: "The Contemporary World", room: "B401", start: "08:00", end: "10:00" },
  { day: "Fri", subject: "National Service Training Program", room: "B201", start: "11:00", end: "13:00" },
];
const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CALENDAR_START_MIN = 6 * 60 + 30; // 6:30 AM
const CALENDAR_END_MIN = 19 * 60; // 7:00 PM
const CALENDAR_SLOT_MIN = 30;

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutesClock(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Compact "6:30" style, no AM/PM — matches the time labels in the actual
 *  schedule photo, used for every half-hour row in the calendar. */
function formatMinutesShort(mins) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// JS Date#getDay() (0=Sun..6=Sat) -> index into CALENDAR_DAYS (Mon..Fri)
const JS_DAY_TO_CALENDAR_INDEX = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

function renderCalendar() {
  const grid = $("#calendarGrid");
  grid.innerHTML = "";

  const todayColIdx = JS_DAY_TO_CALENDAR_INDEX[new Date().getDay()];

  const totalSlots = (CALENDAR_END_MIN - CALENDAR_START_MIN) / CALENDAR_SLOT_MIN;
  grid.style.gridTemplateRows = `34px repeat(${totalSlots}, 26px)`;

  const corner = document.createElement("div");
  corner.className = "cal-corner";
  corner.style.gridColumn = "1";
  corner.style.gridRow = "1";
  grid.appendChild(corner);

  CALENDAR_DAYS.forEach((day, i) => {
    const h = document.createElement("div");
    h.className = "cal-day-header" + (i === todayColIdx ? " today" : "");
    h.textContent = day;
    h.style.gridColumn = String(i + 2);
    h.style.gridRow = "1";
    grid.appendChild(h);
  });

  for (let slot = 0; slot < totalSlots; slot++) {
    const minutes = CALENDAR_START_MIN + slot * CALENDAR_SLOT_MIN;
    const label = document.createElement("div");
    label.className = "cal-time-label";
    label.textContent = formatMinutesShort(minutes);
    label.style.gridColumn = "1";
    label.style.gridRow = String(slot + 2);
    grid.appendChild(label);

    CALENDAR_DAYS.forEach((day, i) => {
      const cell = document.createElement("div");
      cell.className = "cal-cell-bg";
      cell.style.gridColumn = String(i + 2);
      cell.style.gridRow = String(slot + 2);
      grid.appendChild(cell);
    });
  }

  SCHEDULE.forEach((item) => {
    const dayIdx = CALENDAR_DAYS.indexOf(item.day);
    if (dayIdx === -1) return;
    const startRow = Math.round((timeToMinutes(item.start) - CALENDAR_START_MIN) / CALENDAR_SLOT_MIN) + 2;
    const endRow = Math.round((timeToMinutes(item.end) - CALENDAR_START_MIN) / CALENDAR_SLOT_MIN) + 2;

    const color = SUBJECT_COLORS[item.subject] || "#f2a33d";
    const block = document.createElement("div");
    block.className = "cal-block";
    block.style.gridColumn = String(dayIdx + 2);
    block.style.gridRow = `${startRow} / ${endRow}`;
    block.style.background = hexToRgba(color, 0.2);
    block.style.borderColor = color;
    block.style.color = color;

    const name = document.createElement("div");
    name.className = "cal-block-name";
    name.textContent = item.subject;
    block.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "cal-block-meta";
    meta.textContent = `${item.room} · ${formatMinutesClock(timeToMinutes(item.start))}`;
    block.appendChild(meta);

    grid.appendChild(block);
  });
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const LS_KEYS = {
  userId: "klase_user_id",
  userName: "klase_user_name",
  authed: "klase_authed",
  theme: "klase_theme",
  installDismissed: "klase_install_banner_dismissed",
  compactSubjects: "klase_compact_subjects",
};

// the live, Supabase-synced identity of whoever is using the app right now —
// {userId, name, position, avatarUrl}. Subject/settings code that has no
// session parameter threaded to it reads this directly.
let currentSession = null;

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
// Confirm modal — replaces window.confirm() with an in-app UI modal.
// Usage: const ok = await showConfirm("Sigurado ka ba?"); if (!ok) return;
// ============================================================

let confirmResolve = null;

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    $("#confirmMessage").textContent = message;
    $("#confirmOverlay").hidden = false;
  });
}

function settleConfirm(result) {
  $("#confirmOverlay").hidden = true;
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

function initConfirmModal() {
  $("#confirmOkBtn").addEventListener("click", () => settleConfirm(true));
  $("#confirmCancelBtn").addEventListener("click", () => settleConfirm(false));
  $("#confirmOverlay").addEventListener("click", (e) => {
    if (e.target.id === "confirmOverlay") settleConfirm(false);
  });
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

/** Compact subjects view — cards shrink to just the subject name.
 *  Same on/off, remember-it-in-localStorage shape as the theme toggle. */
function applyCompactSubjects(isCompact) {
  $("#subjectsGrid").classList.toggle("compact", isCompact);
  $("#compactToggleBtn").setAttribute("aria-pressed", String(isCompact));
}

function initCompactSubjects() {
  const saved = localStorage.getItem(LS_KEYS.compactSubjects) === "1";
  applyCompactSubjects(saved);
}

function toggleCompactSubjects() {
  const isCompact = !$("#subjectsGrid").classList.contains("compact");
  applyCompactSubjects(isCompact);
  localStorage.setItem(LS_KEYS.compactSubjects, isCompact ? "1" : "0");
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
  setTimeout(() => enterApp({ name, userId }), 900);
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
  closeSettings();
  $("#app").hidden = true;
  $("#authGate").hidden = false;
  $("#loginForm").reset();
  $(".gate-card").classList.remove("success");
}

// ============================================================
// Navigation between Chats / Subjects
// ============================================================

let currentView = "subjects";
let calendarRendered = false;

const VIEW_META = {
  subjects: { title: "Subjects", index: 0 },
  recap: { title: "Recap", index: 1 },
  calendar: { title: "Calendar", index: 2 },
  chats: { title: "Chats", index: 3 },
};

function switchView(view, { animateIcon = true } = {}) {
  if (view === currentView) return;
  currentView = view;

  $("#subjectsView").classList.toggle("hidden-view", view !== "subjects");
  $("#recapView").classList.toggle("hidden-view", view !== "recap");
  $("#calendarView").classList.toggle("hidden-view", view !== "calendar");
  $("#chatsView").classList.toggle("hidden-view", view !== "chats");
  $("#viewTitle").textContent = VIEW_META[view].title;

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
  indicator.style.transform = `translateX(${VIEW_META[view].index * 100}%)`;

  if (view === "chats") scrollChatToBottom(true);
  if (view === "calendar" && !calendarRendered) {
    renderCalendar();
    calendarRendered = true;
  }
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
let pendingSubjectImageFile = null;
let subjectChecksCache = new Map(); // subject_id -> [{userId, userName}]
let currentlyViewedSubjectId = null;

function populateSubjectOptions() {
  const select = $("#subjectNameInput");
  SUBJECT_LIST.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function iAmDoneWith(subjectId) {
  const list = subjectChecksCache.get(subjectId);
  return !!(list && currentSession && list.some((c) => c.userId === currentSession.userId));
}

function isPastDue(subj) {
  return Boolean(subj.expires_at) && new Date(subj.expires_at).getTime() <= Date.now();
}

function buildSubjectCard(subj, { historic = false } = {}) {
  const color = SUBJECT_COLORS[subj.subject_name] || "#f2a33d";
  const glowColor = NEON_GLOW_COLORS[subj.subject_name] || color;

  const card = document.createElement("button");
  card.type = "button";
  // history cards skip the urgent neon-pulse treatment, done or not —
  // it's the deadline that's stale, not something to still rush toward
  card.className = "subject-card" + (!historic && !iAmDoneWith(subj.id) ? " not-done" : "");
  card.style.setProperty("--card-accent", color);
  card.style.setProperty("--card-glow", hexToRgba(glowColor, 0.65));

  const name = document.createElement("div");
  name.className = "subject-card-name";
  name.textContent = subj.subject_name;
  name.style.color = color;
  card.appendChild(name);

  if (subj.image_url) {
    const thumb = document.createElement("img");
    thumb.className = "subject-card-thumb";
    thumb.src = subj.image_url;
    thumb.alt = "";
    thumb.loading = "lazy";
    card.appendChild(thumb);
  }

  const content = document.createElement("div");
  content.className = "subject-card-content";
  content.textContent = subj.content;
  card.appendChild(content);

  const meta = document.createElement("div");
  meta.className = "subject-card-meta";
  const author = document.createElement("span");
  author.className = "subject-card-author";
  author.textContent = subj.author_name;
  meta.appendChild(author);

  if (subj.expires_at) {
    const due = document.createElement("span");
    due.className = "subject-card-due";
    due.textContent = "Due " + new Date(subj.expires_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    meta.appendChild(due);
  } else {
    const time = document.createElement("span");
    time.textContent = timeAgo(subj.updated_at || subj.created_at);
    meta.appendChild(time);
  }
  card.appendChild(meta);

  card.dataset.id = subj.id;
  card.addEventListener("click", () => openViewSubjectModal(subj));
  return card;
}

function renderSubjects() {
  const grid = $("#subjectsGrid");
  const empty = $("#subjectsEmpty");
  const historySection = $("#historySection");
  const historyGrid = $("#subjectsHistoryGrid");
  const historyCount = $("#historyCount");
  grid.innerHTML = "";
  historyGrid.innerHTML = "";

  const active = subjectsCache.filter((s) => !isPastDue(s));
  const past = subjectsCache.filter(isPastDue);

  if (active.length === 0) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
    // not-yet-done (still glowing) cards float to the top; within each
    // group the existing most-recently-updated-first order is kept
    const ordered = [...active].sort((a, b) => {
      const aDone = iAmDoneWith(a.id) ? 1 : 0;
      const bDone = iAmDoneWith(b.id) ? 1 : 0;
      return aDone - bDone;
    });
    ordered.forEach((subj) => grid.appendChild(buildSubjectCard(subj)));
  }

  // History: past-due items, never auto-deleted from Supabase — just
  // moved out of the live grid. Most-recently-expired first. Ray deletes
  // the row himself in Supabase whenever he actually wants it gone.
  if (past.length === 0) {
    historySection.hidden = true;
  } else {
    historySection.hidden = false;
    historyCount.textContent = String(past.length);
    const orderedPast = [...past].sort(
      (a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
    );
    orderedPast.forEach((subj) => historyGrid.appendChild(buildSubjectCard(subj, { historic: true })));
  }
}

const OFFLINE_KEYS = {
  subjects: "klase_offline_subjects",
  checks: "klase_offline_checks",
};

function readOfflineCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeOfflineCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // storage full/unavailable — non-critical, offline viewing just won't work
  }
}

async function fetchSubjects() {
  // Fetch everything — no expiry filter here anymore. Past-due items used
  // to be dropped from subjectsCache entirely, which looked like an
  // auto-delete. Now renderSubjects() buckets them into History instead;
  // nothing gets removed from Supabase unless Ray does it himself.
  const { data, error } = await sb
    .from("subjects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    // offline / network error — fall back to whatever was last saved so
    // assignments still open with no connection. Only chat needs live data.
    const cached = readOfflineCache(OFFLINE_KEYS.subjects);
    if (cached) {
      subjectsCache = cached;
      renderSubjects();
      showToast("Offline — huling na-save na data ito.", "error");
      return;
    }
    showToast("Hindi ma-load ang subjects.", "error");
    return;
  }

  subjectsCache = data || [];
  renderSubjects();
  writeOfflineCache(OFFLINE_KEYS.subjects, data || []);
}

function rebuildChecksCache(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const list = map.get(row.subject_id) || [];
    list.push({ userId: row.user_id, userName: row.user_name });
    map.set(row.subject_id, list);
  });
  subjectChecksCache = map;
}

async function fetchSubjectChecks() {
  const { data, error } = await sb.from("subject_checks").select("*");
  if (error) {
    console.error(error);
    const cached = readOfflineCache(OFFLINE_KEYS.checks);
    if (cached) {
      rebuildChecksCache(cached);
      renderSubjects();
      if (currentlyViewedSubjectId) renderDoneSection(currentlyViewedSubjectId);
    }
    return;
  }
  rebuildChecksCache(data || []);
  renderSubjects();
  if (currentlyViewedSubjectId) renderDoneSection(currentlyViewedSubjectId);
  writeOfflineCache(OFFLINE_KEYS.checks, data || []);
}

function renderDoneSection(subjectId) {
  const list = subjectChecksCache.get(subjectId) || [];
  const iAmDone = iAmDoneWith(subjectId);

  const btn = $("#markDoneBtn");
  btn.classList.toggle("checked", iAmDone);
  $("#markDoneBtnLabel").textContent = iAmDone ? "Tapos ka na dito" : "Tapos na ako dito";
  btn.dataset.id = subjectId;

  const doneList = $("#doneList");
  doneList.innerHTML = "";
  if (list.length === 0) {
    const empty = document.createElement("span");
    empty.className = "done-list-empty";
    empty.textContent = "Wala pang tapos dito.";
    doneList.appendChild(empty);
  } else {
    list.forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "done-chip";
      chip.innerHTML = '<i data-lucide="check"></i>';
      chip.append(c.userName);
      doneList.appendChild(chip);
    });
  }
  refreshIcons();
}

async function handleToggleDone() {
  if (!currentSession) return;
  const subjectId = $("#markDoneBtn").dataset.id;
  if (!subjectId) return;

  const already = iAmDoneWith(subjectId);

  if (already) {
    // unchecking is a quick undo, no confirmation needed
    const { error } = await sb
      .from("subject_checks")
      .delete()
      .eq("subject_id", subjectId)
      .eq("user_id", currentSession.userId);
    if (error) {
      console.error(error);
      showToast("May error, subukan ulit.", "error");
      return;
    }
    await fetchSubjectChecks();
    return;
  }

  const ok = await showConfirm("Sigurado ka bang tapos ka na dito?");
  if (!ok) return;

  const { error } = await sb.from("subject_checks").insert({
    subject_id: subjectId,
    user_id: currentSession.userId,
    user_name: currentSession.name,
  });
  if (error) {
    console.error(error);
    showToast("May error, subukan ulit.", "error");
    return;
  }
  burstConfetti($("#markDoneBtn"));
  await fetchSubjectChecks();
}

function resetSubjectImagePicker() {
  pendingSubjectImageFile = null;
  $("#subjectImageFileRow").hidden = true;
  $("#subjectImageFileName").textContent = "";
}

function openAddSubjectModal() {
  $("#modalTitle").textContent = "Add subject";
  $("#subjectForm").hidden = false;
  $("#subjectViewBody").hidden = true;
  $("#subjectForm").reset();
  $("#subjectContentInput").style.height = "auto";
  resetSubjectImagePicker();

  $("#subjectModal").hidden = false;
  refreshIcons();
}

/** Clicking an existing card only ever opens a read-only view — editing
 *  isn't offered. Only someone whose profile position is "developer" gets
 *  a Delete button here. */
function openViewSubjectModal(subj) {
  currentlyViewedSubjectId = subj.id;
  $("#modalTitle").textContent = subj.subject_name;
  $("#modalTitle").style.color = SUBJECT_COLORS[subj.subject_name] || "";
  $("#subjectForm").hidden = true;
  $("#subjectViewBody").hidden = false;

  const imgWrap = $("#subjectViewImageWrap");
  if (subj.image_url) {
    $("#subjectViewImage").src = subj.image_url;
    imgWrap.hidden = false;
  } else {
    imgWrap.hidden = true;
  }

  $("#subjectViewContent").textContent = subj.content;

  const meta = $("#subjectViewMeta");
  meta.innerHTML = "";
  const author = document.createElement("span");
  author.textContent = subj.author_name;
  const time = document.createElement("span");
  time.textContent = subj.expires_at
    ? "Due " + new Date(subj.expires_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
    : timeAgo(subj.updated_at || subj.created_at);
  meta.append(author, time);

  renderDoneSection(subj.id);

  const deleteBtn = $("#deleteSubjectBtn");
  const canDelete = (currentSession?.position || "").trim().toLowerCase() === "developer";
  deleteBtn.hidden = !canDelete;
  deleteBtn.dataset.id = subj.id;

  $("#subjectModal").hidden = false;
  refreshIcons();
}

function closeSubjectModal() {
  $("#subjectModal").hidden = true;
  $("#modalTitle").style.color = "";
  currentlyViewedSubjectId = null;
}

async function handleSubjectSubmit(e) {
  e.preventDefault();
  const subject_name = $("#subjectNameInput").value;
  const content = $("#subjectContentInput").value.trim();
  if (!subject_name || !content) return;

  const dueRaw = $("#subjectDueInput").value; // "YYYY-MM-DD" or ""
  const expires_at = dueRaw ? new Date(`${dueRaw}T23:59:59`).toISOString() : null;

  const saveBtn = e.target.querySelector('button[type="submit"]');
  saveBtn.disabled = true;

  try {
    let image_url = null;
    if (pendingSubjectImageFile) {
      const { blob, contentType } = await prepareImageForUpload(pendingSubjectImageFile);
      const path = `${currentSession.userId}/${Date.now()}-${uuid()}.jpg`;
      const { error: upErr } = await sb.storage
        .from("subject-images")
        .upload(path, blob, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = sb.storage.from("subject-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { error } = await sb.from("subjects").insert({
      subject_name,
      content,
      expires_at,
      image_url,
      author_name: currentSession.name,
    });
    if (error) throw error;

    burstConfetti(saveBtn);
    showToast("Naidagdag na.");
    closeSubjectModal();
    fetchSubjects();
  } catch (err) {
    console.error(err);
    showToast("Hindi na-save. Subukan ulit.", "error");
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleDeleteSubject() {
  const id = $("#deleteSubjectBtn").dataset.id;
  if (!id) return;
  const ok = await showConfirm("Sigurado ka bang tatanggalin ito?");
  if (!ok) return;

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
  populateSubjectOptions();
  initCompactSubjects();

  $("#addSubjectBtn").addEventListener("click", openAddSubjectModal);
  $("#compactToggleBtn").addEventListener("click", toggleCompactSubjects);
  $("#historyToggleBtn").addEventListener("click", () => {
    const btn = $("#historyToggleBtn");
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
    $("#subjectsHistoryGrid").hidden = isOpen;
  });
  $("#closeModalBtn").addEventListener("click", closeSubjectModal);
  $("#cancelSubjectBtn").addEventListener("click", closeSubjectModal);
  $("#closeViewBtn").addEventListener("click", closeSubjectModal);
  $("#subjectModal").addEventListener("click", (e) => {
    if (e.target.id === "subjectModal") closeSubjectModal();
  });
  $("#subjectForm").addEventListener("submit", handleSubjectSubmit);
  $("#deleteSubjectBtn").addEventListener("click", handleDeleteSubject);
  $("#markDoneBtn").addEventListener("click", handleToggleDone);

  const contentInput = $("#subjectContentInput");
  contentInput.addEventListener("input", () => {
    contentInput.style.height = "auto";
    contentInput.style.height = `${Math.min(contentInput.scrollHeight, 420)}px`;
  });

  $("#subjectAttachImageBtn").addEventListener("click", () => $("#subjectImageInput").click());
  $("#subjectImageInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    pendingSubjectImageFile = file;
    $("#subjectImageFileName").textContent = file.name;
    $("#subjectImageFileRow").hidden = false;
    refreshIcons();
  });
  $("#subjectImageRemoveBtn").addEventListener("click", resetSubjectImagePicker);
}

// ============================================================
// Recap (Lessons) — mirrors the Subjects add/view pattern, just
// simpler: no due date, no photo, no mark-as-done.
// ============================================================

let lessonsCache = [];

function populateRecapSubjectOptions() {
  const select = $("#recapSubjectInput");
  SUBJECT_LIST.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function renderLessons() {
  const grid = $("#recapGrid");
  const empty = $("#recapEmpty");
  grid.innerHTML = "";

  if (lessonsCache.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  lessonsCache.forEach((lesson) => {
    const color = SUBJECT_COLORS[lesson.subject_name] || "#f2a33d";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.style.setProperty("--card-accent", color);

    const subjTag = document.createElement("div");
    subjTag.className = "subject-card-due";
    subjTag.style.color = color;
    subjTag.textContent = lesson.subject_name;
    card.appendChild(subjTag);

    const name = document.createElement("div");
    name.className = "subject-card-name";
    name.textContent = lesson.title;
    card.appendChild(name);

    const content = document.createElement("div");
    content.className = "subject-card-content";
    content.textContent = lesson.content;
    card.appendChild(content);

    const meta = document.createElement("div");
    meta.className = "subject-card-meta";
    const author = document.createElement("span");
    author.className = "subject-card-author";
    author.textContent = lesson.author_name;
    const time = document.createElement("span");
    time.textContent = timeAgo(lesson.updated_at || lesson.created_at);
    meta.append(author, time);
    card.appendChild(meta);

    card.dataset.id = lesson.id;
    card.addEventListener("click", () => openViewRecapModal(lesson));
    grid.appendChild(card);
  });
}

async function fetchLessons() {
  const { data, error } = await sb
    .from("lessons")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Hindi ma-load ang recap.", "error");
    return;
  }
  lessonsCache = data || [];
  renderLessons();
}

function openAddRecapModal() {
  $("#recapModalTitle").textContent = "Add recap";
  $("#recapModalTitle").style.color = "";
  $("#recapForm").hidden = false;
  $("#recapViewBody").hidden = true;
  $("#recapForm").reset();
  $("#recapContentInput").style.height = "auto";
  $("#recapModal").hidden = false;
  refreshIcons();
}

function openViewRecapModal(lesson) {
  const color = SUBJECT_COLORS[lesson.subject_name] || "";
  $("#recapModalTitle").textContent = lesson.title;
  $("#recapModalTitle").style.color = color;
  $("#recapForm").hidden = true;
  $("#recapViewBody").hidden = false;
  $("#recapViewContent").textContent = lesson.content;

  const meta = $("#recapViewMeta");
  meta.innerHTML = "";
  const subj = document.createElement("span");
  subj.textContent = lesson.subject_name;
  subj.style.color = color;
  subj.style.fontWeight = "700";
  const author = document.createElement("span");
  author.textContent = lesson.author_name;
  meta.append(subj, author);

  const deleteBtn = $("#deleteRecapBtn");
  const canDelete = (currentSession?.position || "").trim().toLowerCase() === "developer";
  deleteBtn.hidden = !canDelete;
  deleteBtn.dataset.id = lesson.id;

  $("#recapModal").hidden = false;
  refreshIcons();
}

function closeRecapModal() {
  $("#recapModal").hidden = true;
  $("#recapModalTitle").style.color = "";
}

async function handleRecapSubmit(e) {
  e.preventDefault();
  const subject_name = $("#recapSubjectInput").value;
  const title = $("#recapTitleInput").value.trim();
  const content = $("#recapContentInput").value.trim();
  if (!subject_name || !title || !content) return;

  const saveBtn = e.target.querySelector('button[type="submit"]');
  saveBtn.disabled = true;

  const { error } = await sb.from("lessons").insert({
    subject_name,
    title,
    content,
    author_name: currentSession.name,
  });

  saveBtn.disabled = false;

  if (error) {
    console.error(error);
    showToast("Hindi na-save. Subukan ulit.", "error");
    return;
  }
  burstConfetti(saveBtn);
  showToast("Naidagdag na.");
  closeRecapModal();
  fetchLessons();
}

async function handleDeleteRecap() {
  const id = $("#deleteRecapBtn").dataset.id;
  if (!id) return;
  const ok = await showConfirm("Sigurado ka bang tatanggalin ito?");
  if (!ok) return;

  const { error } = await sb.from("lessons").delete().eq("id", id);
  if (error) {
    console.error(error);
    showToast("Hindi natanggal.", "error");
    return;
  }
  showToast("Tinanggal na.");
  closeRecapModal();
  fetchLessons();
}

function initRecap() {
  populateRecapSubjectOptions();

  $("#addRecapBtn").addEventListener("click", openAddRecapModal);
  $("#closeRecapModalBtn").addEventListener("click", closeRecapModal);
  $("#cancelRecapBtn").addEventListener("click", closeRecapModal);
  $("#closeRecapViewBtn").addEventListener("click", closeRecapModal);
  $("#recapModal").addEventListener("click", (e) => {
    if (e.target.id === "recapModal") closeRecapModal();
  });
  $("#recapForm").addEventListener("submit", handleRecapSubmit);
  $("#deleteRecapBtn").addEventListener("click", handleDeleteRecap);

  const contentInput = $("#recapContentInput");
  contentInput.addEventListener("input", () => {
    contentInput.style.height = "auto";
    contentInput.style.height = `${Math.min(contentInput.scrollHeight, 420)}px`;
  });
}

// ============================================================
// Chats
// ============================================================

let chatCache = [];
// tracks the last group actually in the DOM so new messages (optimistic
// send or realtime) can be appended into it when the sender matches,
// instead of re-rendering everything on every message.
let lastRenderedGroup = null; // { senderId, groupEl, bubblesEl }

function scrollChatToBottom(instant = false) {
  const el = $("#chatMessages");
  el.scrollTo({ top: el.scrollHeight, behavior: instant ? "auto" : "smooth" });
}

function updateScrollButtonVisibility() {
  const el = $("#chatMessages");
  const btn = $("#scrollBottomBtn");
  if (!el || !btn) return;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  btn.hidden = distanceFromBottom < 150;
}

/** One bubble + its timestamp. Multiple of these stack inside a group. */
function renderBubbleUnit(msg) {
  const unit = document.createElement("div");
  unit.className = "bubble-unit";

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (msg.image_url ? " has-image" : "");

  if (msg.image_url) {
    const img = document.createElement("img");
    img.src = msg.image_url;
    img.alt = "Shared image";
    img.className = "bubble-image";
    img.loading = "lazy";
    img.addEventListener("click", () => window.open(msg.image_url, "_blank"));
    bubble.appendChild(img);
  }
  if (msg.message) {
    const text = document.createElement("div");
    text.className = "bubble-text";
    text.textContent = msg.message;
    bubble.appendChild(text);
  }
  unit.appendChild(bubble);

  const time = document.createElement("div");
  time.className = "bubble-time";
  time.textContent = formatClock(msg.created_at);
  unit.appendChild(time);

  return unit;
}

/** Builds one Messenger-style group: name (others only) + avatar + a
 *  stack of bubbles. Avatar sits at the bottom for other people's groups,
 *  top for your own — see the group-row CSS for the actual alignment. */
function renderMessageGroupEl(group, session) {
  const isOwn = group.senderId === session.userId;

  const wrap = document.createElement("div");
  wrap.className = "msg-group " + (isOwn ? "own" : "other");
  wrap.dataset.senderId = group.senderId;

  if (!isOwn) {
    const name = document.createElement("div");
    name.className = "group-name";
    name.textContent = group.senderName;
    wrap.appendChild(name);
  }

  const row = document.createElement("div");
  row.className = "group-row";

  const lastMsg = group.messages[group.messages.length - 1];
  const avatar = document.createElement("img");
  avatar.className = "group-avatar";
  avatar.alt = "";
  avatar.src = lastMsg.sender_avatar_url || DEFAULT_AVATAR_DATA_URI;
  avatar.addEventListener("error", function onErr() {
    avatar.removeEventListener("error", onErr);
    avatar.src = DEFAULT_AVATAR_DATA_URI;
  });

  const bubbles = document.createElement("div");
  bubbles.className = "group-bubbles";
  group.messages.forEach((msg) => bubbles.appendChild(renderBubbleUnit(msg)));

  if (isOwn) {
    row.append(bubbles, avatar);
  } else {
    row.append(avatar, bubbles);
  }
  wrap.appendChild(row);

  return { el: wrap, bubblesEl: bubbles };
}

function groupConsecutiveMessages(messages) {
  const groups = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.sender_id) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.sender_id, senderName: msg.sender_name, messages: [msg] });
    }
  }
  return groups;
}

function renderAllChat(session) {
  const container = $("#chatMessages");
  container.innerHTML = "";
  lastRenderedGroup = null;

  groupConsecutiveMessages(chatCache).forEach((group) => {
    const { el, bubblesEl } = renderMessageGroupEl(group, session);
    container.appendChild(el);
    lastRenderedGroup = { senderId: group.senderId, groupEl: el, bubblesEl };
  });
  scrollChatToBottom(true);
}

/** Appends one new message — continuing the last visible group if it's
 *  from the same sender, or starting a fresh group otherwise. Used by
 *  both the optimistic local send and the realtime handler so the two
 *  paths always produce the same grouping. */
function appendChatMessage(msg, session) {
  const container = $("#chatMessages");

  if (lastRenderedGroup && lastRenderedGroup.senderId === msg.sender_id) {
    lastRenderedGroup.bubblesEl.appendChild(renderBubbleUnit(msg));
    const avatarEl = lastRenderedGroup.groupEl.querySelector(".group-avatar");
    if (avatarEl && msg.sender_avatar_url) avatarEl.src = msg.sender_avatar_url;
    return;
  }

  const group = { senderId: msg.sender_id, senderName: msg.sender_name, messages: [msg] };
  const { el, bubblesEl } = renderMessageGroupEl(group, session);
  container.appendChild(el);
  lastRenderedGroup = { senderId: msg.sender_id, groupEl: el, bubblesEl };
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
  const now = Date.now();
  chatCache = (data || []).filter(
    (m) => !m.expires_at || new Date(m.expires_at).getTime() > now
  );
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

  // Insert and render immediately from the returned row — don't wait for the
  // realtime echo to come back over the socket, that's what made sending
  // feel laggy/broken before. The realtime subscription below still exists
  // for picking up messages from *other* people live.
  const { data, error } = await sb
    .from("chat_messages")
    .insert({
      sender_id: session.userId,
      sender_name: session.name,
      sender_avatar_url: session.avatarUrl || null,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    showToast("Hindi naipadala ang mensahe.", "error");
    input.value = message;
    return;
  }

  chatCache.push(data);
  appendChatMessage(data, session);
  scrollChatToBottom();
}

/** Resize + re-encode an image client-side before upload, so a phone photo
 *  doesn't balloon Supabase Storage usage. */
function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Tries to compress/re-encode the image for a smaller upload. Some files
 *  (notably HEIC photos straight off an iPhone) can't be decoded by the
 *  browser's <canvas> at all, which used to make the whole upload fail —
 *  this falls back to uploading the original file untouched instead of
 *  failing outright. */
async function prepareImageForUpload(file, maxDim = 1600, quality = 0.82) {
  try {
    const blob = await compressImage(file, maxDim, quality);
    return { blob, contentType: "image/jpeg", ext: "jpg" };
  } catch (err) {
    console.warn("Image compression failed, uploading original file instead:", err);
    const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop() : "jpg";
    return { blob: file, contentType: file.type || "application/octet-stream", ext };
  }
}

async function sendImageMessage(session, file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast("Masyadong malaki ang image (max 15MB).", "error");
    return;
  }

  const caption = $("#chatInput").value.trim();
  $("#chatInput").value = "";
  $("#chatInput").style.height = "auto";

  // temporary placeholder — deliberately NOT tracked in lastRenderedGroup,
  // so it doesn't affect grouping once it's swapped for the real message
  const placeholder = document.createElement("div");
  placeholder.className = "msg-group own";
  const pRow = document.createElement("div");
  pRow.className = "group-row";
  const pBubbles = document.createElement("div");
  pBubbles.className = "group-bubbles";
  const pb = document.createElement("div");
  pb.className = "bubble has-image uploading";
  const spinner = document.createElement("div");
  spinner.className = "upload-spinner";
  pb.appendChild(spinner);
  pBubbles.appendChild(pb);
  pRow.appendChild(pBubbles);
  placeholder.appendChild(pRow);
  $("#chatMessages").appendChild(placeholder);
  scrollChatToBottom();

  try {
    const { blob, contentType } = await prepareImageForUpload(file);
    const path = `${session.userId}/${Date.now()}-${uuid()}.jpg`;

    const { error: upErr } = await sb.storage
      .from("chat-images")
      .upload(path, blob, { contentType, upsert: false });
    if (upErr) throw upErr;

    const { data: urlData } = sb.storage.from("chat-images").getPublicUrl(path);

    const { data, error } = await sb
      .from("chat_messages")
      .insert({
        sender_id: session.userId,
        sender_name: session.name,
        sender_avatar_url: session.avatarUrl || null,
        message: caption,
        image_url: urlData.publicUrl,
      })
      .select()
      .single();
    if (error) throw error;

    placeholder.remove();
    chatCache.push(data);
    appendChatMessage(data, session);
    scrollChatToBottom();
  } catch (err) {
    console.error(err);
    placeholder.remove();
    const detail = err?.message ? ` (${err.message})` : "";
    showToast(`Hindi na-send ang image${detail}`, "error");
  }
}

function initChat(session) {
  const form = $("#chatForm");
  const input = $("#chatInput");
  const attachBtn = $("#attachImageBtn");
  const imageInput = $("#imageInput");

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

  attachBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) sendImageMessage(session, file);
  });

  $("#chatMessages").addEventListener("scroll", updateScrollButtonVisibility);
  $("#scrollBottomBtn").addEventListener("click", () => scrollChatToBottom());
}

// ============================================================
// Profile — synced with the `profiles` table in Supabase so a
// person's name/position can be viewed and edited from Supabase
// itself, not just trapped in their own browser's localStorage.
// ============================================================

async function ensureProfile(rawSession) {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", rawSession.userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { ...rawSession, avatarUrl: null };
  }

  if (data) {
    // Supabase is the source of truth once a profile exists — a name/position
    // edited there should show up here without the person doing anything.
    localStorage.setItem(LS_KEYS.userName, data.name);
    return { userId: rawSession.userId, name: data.name, position: data.position, avatarUrl: data.avatar_url };
  }

  // first time this device has ever logged in — create its profile row
  const { data: created, error: insErr } = await sb
    .from("profiles")
    .insert({ id: rawSession.userId, name: rawSession.name })
    .select()
    .single();

  if (insErr) {
    console.error(insErr);
    return { ...rawSession, avatarUrl: null };
  }
  return { userId: rawSession.userId, name: created.name, position: created.position, avatarUrl: created.avatar_url };
}

function renderAccount(session) {
  $("#accountAvatarImg").src = session.avatarUrl || DEFAULT_AVATAR_DATA_URI;
  $("#accountName").textContent = session.name;
  const posEl = $("#accountPosition");
  if (session.position) {
    posEl.textContent = session.position;
    posEl.hidden = false;
  } else {
    posEl.hidden = true;
  }
}

/** Upload a new profile picture, update Supabase, and refresh the UI. */
async function handleAvatarChange(file) {
  if (!currentSession) return;
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast("Masyadong malaki ang photo (max 15MB).", "error");
    return;
  }

  try {
    const { blob, contentType, ext } = await prepareImageForUpload(file, 512, 0.85);
    const path = `${currentSession.userId}/${Date.now()}.${ext}`;

    const { error: upErr } = await sb.storage
      .from("avatars")
      .upload(path, blob, { contentType, upsert: true });
    if (upErr) throw upErr;

    const { data: urlData } = sb.storage.from("avatars").getPublicUrl(path);

    const { error } = await sb
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", currentSession.userId);
    if (error) throw error;

    currentSession.avatarUrl = urlData.publicUrl;
    renderAccount(currentSession);
    showToast("Na-update ang profile picture.");
  } catch (err) {
    console.error(err);
    const detail = err?.message ? ` (${err.message})` : "";
    showToast(`Hindi na-upload ang photo${detail}`, "error");
  }
}

// ============================================================
// Settings drawer — Account / About / Add suggestion
// ============================================================

function openSettings(session) {
  renderAccount(session);

  $("#settingsOverlay").hidden = false;
  const btn = $("#settingsBtn");
  btn.classList.add("menu-open");
  btn.innerHTML = '<i data-lucide="x"></i>';
  refreshIcons();
}

function closeSettings() {
  $("#settingsOverlay").hidden = true;
  $("#adminUsersPanel").hidden = true;
  adminPanelOpen = false;
  const btn = $("#settingsBtn");
  btn.classList.remove("menu-open");
  btn.innerHTML = '<i data-lucide="menu"></i>';
  refreshIcons();
}

// ============================================================
// Circle — full-screen view of every registered user, arranged
// around a ring. Developers are pulled out and pinned to the top.
// ============================================================

function polarPoint(centerPx, radiusPx, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180; // 0deg = straight up, clockwise
  return {
    x: centerPx + radiusPx * Math.sin(rad),
    y: centerPx - radiusPx * Math.cos(rad),
  };
}

function renderCirclePlates(users) {
  const ring = $("#circleRing");
  ring.innerHTML = "";

  if (users.length === 0) {
    const empty = document.createElement("div");
    empty.className = "circle-empty";
    empty.textContent = "Wala pang users.";
    ring.appendChild(empty);
    return;
  }

  const stagePx = ring.clientWidth;
  const center = stagePx / 2;
  const radius = stagePx * 0.42;

  const devs = users.filter((u) => (u.position || "").trim().toLowerCase() === "developer");
  const others = users.filter((u) => (u.position || "").trim().toLowerCase() !== "developer");

  function makePlate(user, angleDeg, isDev) {
    const { x, y } = polarPoint(center, radius, angleDeg);
    const plate = document.createElement("div");
    plate.className = "circle-plate" + (isDev ? " dev" : "");
    plate.style.left = `${x}px`;
    plate.style.top = `${y}px`;

    const img = document.createElement("img");
    img.src = user.avatar_url || DEFAULT_AVATAR_DATA_URI;
    img.alt = "";
    plate.appendChild(img);

    const label = document.createElement("span");
    label.className = "circle-plate-name";
    label.textContent = user.name;
    plate.appendChild(label);

    ring.appendChild(plate);
  }

  const devSpread = 24;
  devs.forEach((dev, i) => {
    const offset = (i - (devs.length - 1) / 2) * devSpread;
    makePlate(dev, offset, true);
  });

  const gapDeg = devs.length > 0 ? 50 : 0;
  const usableArc = 360 - gapDeg;
  const startAngle = gapDeg / 2;
  others.forEach((u, i) => {
    const angle = startAngle + (others.length > 0 ? (usableArc / others.length) * i : 0);
    makePlate(u, angle, false);
  });
}

async function openCircle() {
  $("#circleOverlay").hidden = false;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    const ring = $("#circleRing");
    ring.innerHTML = '<div class="circle-empty">Hindi ma-load ang users.</div>';
    return;
  }

  // wait a frame so the (just-unhidden) stage has real layout dimensions
  // before positioning plates against its pixel size
  requestAnimationFrame(() => renderCirclePlates(data || []));
}

function closeCircle() {
  $("#circleOverlay").hidden = true;
}

async function handleSuggestionSubmit(e, session) {
  e.preventDefault();
  const input = $("#suggestionInput");
  const message = input.value.trim();
  if (!message) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const { error } = await sb.from("suggestions").insert({
    author_id: session.userId,
    author_name: session.name,
    message,
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    showToast("Hindi naipadala ang suggestion.", "error");
    return;
  }

  input.value = "";
  burstConfetti(btn);
  showToast("Salamat sa suggestion!");
}

function initSettings(session) {
  $("#settingsBtn").addEventListener("click", () => openSettings(session));
  $("#closeSettingsBtn").addEventListener("click", closeSettings);
  $("#settingsOverlay").addEventListener("click", (e) => {
    if (e.target.id === "settingsOverlay") closeSettings();
  });
  $("#drawerLogoutBtn").addEventListener("click", () => {
    // logging out is intentionally disabled — accounts are meant to be
    // permanent per device. The only way one goes away is if it's deleted
    // directly in Supabase.
    showToast("Para matanggal ang account mo, sabihin sa developer/admin.");
  });
  $("#suggestionForm").addEventListener("submit", (e) => handleSuggestionSubmit(e, session));

  $("#changeAvatarBtn").addEventListener("click", () => $("#avatarInput").click());
  $("#avatarInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) handleAvatarChange(file);
  });

  $("#settingsTitle").addEventListener("click", toggleAdminUsersPanel);

  $("#openCircleBtn").addEventListener("click", openCircle);
  $("#closeCircleBtn").addEventListener("click", closeCircle);
}

/** Secret: tapping the "Settings" title reveals the full user list, but
 *  only for someone whose own profile position is "developer" — everyone
 *  else's tap does nothing, silently. */
let adminPanelOpen = false;

async function toggleAdminUsersPanel() {
  if ((currentSession?.position || "").trim().toLowerCase() !== "developer") return;
  adminPanelOpen = !adminPanelOpen;
  $("#adminUsersPanel").hidden = !adminPanelOpen;
  if (adminPanelOpen) await loadAdminUsers();
}

async function loadAdminUsers() {
  const list = $("#adminUsersList");
  list.innerHTML = '<span class="about-credits-empty">Loading...</span>';

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = '<span class="about-credits-empty">Hindi ma-load ang users.</span>';
    return;
  }

  list.innerHTML = "";
  (data || []).forEach((u) => {
    const row = document.createElement("div");
    row.className = "admin-user-row";

    const avatar = document.createElement("img");
    avatar.className = "admin-user-avatar";
    avatar.src = u.avatar_url || DEFAULT_AVATAR_DATA_URI;
    avatar.alt = "";

    const info = document.createElement("div");
    info.className = "admin-user-info";
    const name = document.createElement("div");
    name.className = "admin-user-name";
    name.textContent = u.name;
    info.appendChild(name);
    if (u.position) {
      const pos = document.createElement("span");
      pos.className = "admin-user-position";
      pos.textContent = u.position;
      info.appendChild(pos);
    }

    row.append(avatar, info);
    list.appendChild(row);
  });

  if ((data || []).length === 0) {
    list.innerHTML = '<span class="about-credits-empty">Wala pang users.</span>';
  }
}

// ============================================================
// Realtime subscriptions
// ============================================================

let subjectsChannel = null;
let chatChannel = null;
let profileChannel = null;
let subjectChecksChannel = null;
let lessonsChannel = null;

function setupRealtime(session) {
  subjectsChannel = sb
    .channel("public:subjects")
    .on("postgres_changes", { event: "*", schema: "public", table: "subjects" }, () => {
      fetchSubjects();
    })
    .subscribe();

  subjectChecksChannel = sb
    .channel("public:subject_checks")
    .on("postgres_changes", { event: "*", schema: "public", table: "subject_checks" }, () => {
      fetchSubjectChecks();
    })
    .subscribe();

  lessonsChannel = sb
    .channel("public:lessons")
    .on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, () => {
      fetchLessons();
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
      appendChatMessage(msg, session);
      if (wasNearBottom || msg.sender_id === session.userId) scrollChatToBottom();
    })
    .subscribe();

  // live-sync this device's own profile — if a name/position gets edited
  // in Supabase while the app is open, it updates here without a reload
  profileChannel = sb
    .channel(`public:profiles:${session.userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${session.userId}` },
      (payload) => {
        session.name = payload.new.name;
        session.position = payload.new.position;
        session.avatarUrl = payload.new.avatar_url;
        localStorage.setItem(LS_KEYS.userName, session.name);
        renderAccount(session);
      }
    )
    .subscribe();
}

function teardownRealtime() {
  if (subjectsChannel) sb.removeChannel(subjectsChannel);
  if (chatChannel) sb.removeChannel(chatChannel);
  if (profileChannel) sb.removeChannel(profileChannel);
  if (subjectChecksChannel) sb.removeChannel(subjectChecksChannel);
  if (lessonsChannel) sb.removeChannel(lessonsChannel);
  subjectsChannel = null;
  chatChannel = null;
  profileChannel = null;
  subjectChecksChannel = null;
  lessonsChannel = null;
}

// ============================================================
// App bootstrap
// ============================================================

let listenersWired = false;

async function enterApp(rawSession) {
  currentSession = await ensureProfile(rawSession);
  const session = currentSession;

  $("#authGate").hidden = true;
  $("#app").hidden = false;
  renderAccount(session);

  if (!listenersWired) {
    initChat(session);
    initSettings(session);
    listenersWired = true;
  }

  fetchSubjects();
  fetchSubjectChecks();
  fetchLessons();
  fetchChat(session);
  setupRealtime(session);
  refreshIcons();
}

// ============================================================
// PWA install prompt — a custom in-app "Install app" UI, since the
// browser's own hidden menu option wasn't a reliable enough path for
// people to actually find and use.
// ============================================================

let deferredInstallPrompt = null;

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function updateInstallUI() {
  const banner = $("#installBanner");
  const settingsBtn = $("#settingsInstallBtn");
  const settingsHint = $("#settingsInstallHint");

  settingsBtn.hidden = false;
  settingsBtn.disabled = false;

  if (isStandaloneDisplay()) {
    banner.hidden = true;
    settingsBtn.hidden = true;
    settingsHint.textContent = "Naka-install na ang app sa device mo.";
    return;
  }

  if (deferredInstallPrompt) {
    settingsHint.textContent = "";
    if (!localStorage.getItem(LS_KEYS.installDismissed)) banner.hidden = false;
    return;
  }

  if (isIOSDevice()) {
    // iOS Safari never fires beforeinstallprompt — there's nothing to
    // trigger programmatically, so just show the manual steps instead
    // of a button that would do nothing.
    banner.hidden = true;
    settingsBtn.hidden = true;
    settingsHint.textContent = 'Sa Safari: pindutin ang Share button, tapos piliin ang "Add to Home Screen".';
    return;
  }

  banner.hidden = true;
  settingsBtn.disabled = true;
  settingsHint.textContent = "Hindi pa available ang install ngayon — i-refresh ang page.";
}

async function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (choice.outcome === "accepted") {
    showToast("Ina-install na ang app!");
  }
  updateInstallUI();
}

function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    updateInstallUI();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    localStorage.removeItem(LS_KEYS.installDismissed);
    updateInstallUI();
    showToast("Na-install na ang Klase!");
  });

  $("#installBannerBtn").addEventListener("click", triggerInstall);
  $("#installBannerDismissBtn").addEventListener("click", () => {
    $("#installBanner").hidden = true;
    localStorage.setItem(LS_KEYS.installDismissed, "1");
  });
  $("#settingsInstallBtn").addEventListener("click", triggerInstall);

  updateInstallUI();
}

function init() {
  initTheme();
  initGate();
  initNav();
  initSubjects();
  initRecap();
  initConfirmModal();
  initInstallPrompt();

  $("#themeToggle").addEventListener("click", (e) => toggleTheme(e, $("#themeToggle")));

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