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
    const color = SUBJECT_COLORS[subj.subject_name] || "#f2a33d";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card" + (iAmDoneWith(subj.id) ? "" : " not-done");
    card.style.setProperty("--card-accent", color);
    card.style.setProperty("--card-glow", hexToRgba(color, 0.55));

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
    grid.appendChild(card);
  });
}

async function fetchSubjects() {
  // Fetch everything and filter expiry in JS rather than as a server-side
  // filter — a filter referencing expires_at would hard-fail the whole
  // query on any project that hasn't run the latest schema.sql yet. This
  // way the list still loads even on an older schema; it just won't hide
  // expired notes until the column exists.
  const { data, error } = await sb
    .from("subjects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Hindi ma-load ang subjects.", "error");
    return;
  }
  const now = Date.now();
  subjectsCache = (data || []).filter(
    (s) => !s.expires_at || new Date(s.expires_at).getTime() > now
  );
  renderSubjects();
}

async function fetchSubjectChecks() {
  const { data, error } = await sb.from("subject_checks").select("*");
  if (error) {
    console.error(error);
    return;
  }
  const map = new Map();
  (data || []).forEach((row) => {
    const list = map.get(row.subject_id) || [];
    list.push({ userId: row.user_id, userName: row.user_name });
    map.set(row.subject_id, list);
  });
  subjectChecksCache = map;
  renderSubjects();
  if (currentlyViewedSubjectId) renderDoneSection(currentlyViewedSubjectId);
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
  $("#subjectImagePreviewWrap").hidden = true;
  $("#subjectImagePreview").src = "";
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

  $("#addSubjectBtn").addEventListener("click", openAddSubjectModal);
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
    const reader = new FileReader();
    reader.onload = () => {
      $("#subjectImagePreview").src = reader.result;
      $("#subjectImagePreviewWrap").hidden = false;
    };
    reader.readAsDataURL(file);
  });
  $("#subjectImageRemoveBtn").addEventListener("click", resetSubjectImagePicker);
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
  avatar.src = lastMsg.sender_avatar_url || "profile.jpg";
  avatar.addEventListener("error", function onErr() {
    avatar.removeEventListener("error", onErr);
    avatar.src = "profile.jpg";
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
    showToast("Hindi na-send ang image. Check ang Storage setup.", "error");
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
  $("#accountAvatarImg").src = session.avatarUrl || "profile.jpg";
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
    showToast("Hindi na-upload ang photo. Check ang Storage setup.", "error");
  }
}

// ============================================================
// Settings drawer — Account / About / Add suggestion
// ============================================================

function openSettings(session) {
  renderAccount(session);
  fetchAboutCredits();

  $("#settingsOverlay").hidden = false;
  const btn = $("#settingsBtn");
  btn.classList.add("menu-open");
  btn.innerHTML = '<i data-lucide="x"></i>';
  refreshIcons();
}

function closeSettings() {
  $("#settingsOverlay").hidden = true;
  const btn = $("#settingsBtn");
  btn.classList.remove("menu-open");
  btn.innerHTML = '<i data-lucide="menu"></i>';
  refreshIcons();
}

async function fetchAboutCredits() {
  const el = $("#aboutCredits");
  el.innerHTML = '<span class="about-credits-empty">Loading...</span>';

  const { data, error } = await sb
    .from("profiles")
    .select("name, position")
    .or("position.ilike.developer,position.ilike.admin")
    .order("position", { ascending: true });

  if (error || !data || data.length === 0) {
    el.innerHTML = '<span class="about-credits-empty">Wala pang naka-set na developer/admin sa Supabase.</span>';
    return;
  }

  el.innerHTML = "";
  data.forEach((p) => {
    const chip = document.createElement("span");
    chip.className = "credit-chip";
    chip.textContent = `${p.name} — ${p.position}`;
    el.appendChild(chip);
  });
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
    closeSettings();
    logout();
  });
  $("#suggestionForm").addEventListener("submit", (e) => handleSuggestionSubmit(e, session));

  $("#changeAvatarBtn").addEventListener("click", () => $("#avatarInput").click());
  $("#avatarInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) handleAvatarChange(file);
  });
}

// ============================================================
// Realtime subscriptions
// ============================================================

let subjectsChannel = null;
let chatChannel = null;
let profileChannel = null;
let subjectChecksChannel = null;

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
  subjectsChannel = null;
  chatChannel = null;
  profileChannel = null;
  subjectChecksChannel = null;
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
  fetchChat(session);
  setupRealtime(session);
  refreshIcons();
}

function init() {
  initTheme();
  initGate();
  initNav();
  initSubjects();
  initConfirmModal();

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