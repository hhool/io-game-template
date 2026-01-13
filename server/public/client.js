const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const hudEl = document.getElementById("hud");
const loginEl = document.getElementById("login");

const statusEl = document.getElementById("status");
const meEl = document.getElementById("me");
const roomEl = document.getElementById("room");
const fpsEl = document.getElementById("fps");
const lbEl = document.getElementById("lb");

const btnQuick = document.getElementById("btnQuick");
const btnSpectate = document.getElementById("btnSpectate");
const btnLeave = document.getElementById("btnLeave");

const langSel = document.getElementById("lang");
const nickInput = document.getElementById("nick");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const bestLineEl = document.getElementById("bestLine");
const historyEl = document.getElementById("history");

const loginTitleEl = document.getElementById("loginTitle");
const labelLangEl = document.getElementById("labelLang");
const labelNickEl = document.getElementById("labelNick");
const recentTitleEl = document.getElementById("recentTitle");
const hudTitleEl = document.getElementById("hudTitle");
const lbTitleEl = document.getElementById("lbTitle");
const hintEl = document.getElementById("hint");

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const STORAGE_TOKEN = "1wlgame_token";
const STORAGE_PROFILE = "1wlgame_profile_v1";

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      nick: typeof parsed.nick === "string" ? parsed.nick : "",
      bestScore: Number.isFinite(parsed.bestScore) ? parsed.bestScore : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      lang: typeof parsed.lang === "string" ? parsed.lang : "en",
    };
  } catch {
    return { nick: "", bestScore: 0, history: [], lang: "en" };
  }
}

function saveProfile() {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

function sanitizeNick(nick) {
  if (typeof nick !== "string") return "";
  return nick.replace(/[\r\n\t]/g, " ").trim().slice(0, 16);
}

const I18N = {
  en: {
    loginTitle: "1wlgame",
    labelLang: "Language",
    labelNick: "Nickname",
    nickPlaceholder: "Enter your nickname",
    enter: "Enter",
    best: "Best score",
    recent: "Recent results (max 5)",
    hudTitle: "1wlgame IO Prototype",
    quick: "Quick Match",
    spectate: "Spectate",
    leave: "Leave",
    hint: "WASD/Arrow keys to move, Shift to boost (demo).",
    leaderboard: "Leaderboard",
    connecting: "connecting…",
    connected: "connected",
    disconnected: "disconnected",
    notConnected: "not connected",
    needNick: "Please enter a nickname first.",
    gameOver: (score) => `Game Over. Score: ${score}`,
  },
  ru: {
    loginTitle: "1wlgame",
    labelLang: "Язык",
    labelNick: "Ник",
    nickPlaceholder: "Введите ник",
    enter: "Войти",
    best: "Лучший счёт",
    recent: "Последние результаты (до 5)",
    hudTitle: "1wlgame IO Prototype",
    quick: "Быстрый матч",
    spectate: "Наблюдать",
    leave: "Выйти",
    hint: "WASD/Стрелки — движение, Shift — ускорение.",
    leaderboard: "Таблица лидеров",
    connecting: "подключение…",
    connected: "подключено",
    disconnected: "отключено",
    notConnected: "нет соединения",
    needNick: "Сначала введите ник.",
    gameOver: (score) => `Игра окончена. Счёт: ${score}`,
  },
  fr: {
    loginTitle: "1wlgame",
    labelLang: "Langue",
    labelNick: "Pseudo",
    nickPlaceholder: "Entrez votre pseudo",
    enter: "Entrer",
    best: "Meilleur score",
    recent: "Résultats récents (max 5)",
    hudTitle: "1wlgame IO Prototype",
    quick: "Match rapide",
    spectate: "Observer",
    leave: "Quitter",
    hint: "WASD/Flèches pour bouger, Shift pour booster.",
    leaderboard: "Classement",
    connecting: "connexion…",
    connected: "connecté",
    disconnected: "déconnecté",
    notConnected: "pas connecté",
    needNick: "Veuillez d'abord saisir un pseudo.",
    gameOver: (score) => `Partie terminée. Score : ${score}`,
  },
  zh: {
    loginTitle: "1wlgame",
    labelLang: "语言",
    labelNick: "昵称",
    nickPlaceholder: "请输入昵称",
    enter: "进入",
    best: "最佳成绩",
    recent: "最近战绩（最多 5 条）",
    hudTitle: "1wlgame IO Prototype",
    quick: "快速匹配",
    spectate: "观战",
    leave: "离开",
    hint: "WASD/方向键移动，Shift 加速（示例）。",
    leaderboard: "排行榜",
    connecting: "连接中…",
    connected: "已连接",
    disconnected: "已断开",
    notConnected: "未连接",
    needNick: "请先输入昵称。",
    gameOver: (score) => `游戏结束，得分：${score}`,
  },
  de: {
    loginTitle: "1wlgame",
    labelLang: "Sprache",
    labelNick: "Nickname",
    nickPlaceholder: "Nickname eingeben",
    enter: "Start",
    best: "Bester Score",
    recent: "Letzte Ergebnisse (max. 5)",
    hudTitle: "1wlgame IO Prototype",
    quick: "Schnelles Match",
    spectate: "Zuschauen",
    leave: "Verlassen",
    hint: "WASD/Pfeile zum Bewegen, Shift für Boost.",
    leaderboard: "Rangliste",
    connecting: "verbinde…",
    connected: "verbunden",
    disconnected: "getrennt",
    notConnected: "nicht verbunden",
    needNick: "Bitte zuerst einen Nickname eingeben.",
    gameOver: (score) => `Game Over. Score: ${score}`,
  },
  ar: {
    loginTitle: "1wlgame",
    labelLang: "اللغة",
    labelNick: "الاسم",
    nickPlaceholder: "أدخل الاسم",
    enter: "دخول",
    best: "أفضل نتيجة",
    recent: "آخر النتائج (حد أقصى 5)",
    hudTitle: "1wlgame IO Prototype",
    quick: "مباراة سريعة",
    spectate: "مشاهدة",
    leave: "مغادرة",
    hint: "WASD/الأسهم للحركة، Shift للتسريع.",
    leaderboard: "لوحة الصدارة",
    connecting: "جارٍ الاتصال…",
    connected: "متصل",
    disconnected: "غير متصل",
    notConnected: "غير متصل",
    needNick: "الرجاء إدخال الاسم أولاً.",
    gameOver: (score) => `انتهت اللعبة. النتيجة: ${score}`,
  },
};

let token = localStorage.getItem(STORAGE_TOKEN);
let profile = loadProfile();
let lang = I18N[profile.lang] ? profile.lang : "en";
let nick = sanitizeNick(profile.nick);
let profileConfirmed = false;
let autoQuickRequested = false;
let joinInFlight = false;

function t(key) {
  const dict = I18N[lang] || I18N.en;
  return dict[key] ?? I18N.en[key] ?? key;
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  loginTitleEl.textContent = t("loginTitle");
  labelLangEl.textContent = t("labelLang");
  labelNickEl.textContent = t("labelNick");
  nickInput.placeholder = t("nickPlaceholder");
  btnLogin.textContent = t("enter");

  hudTitleEl.textContent = t("hudTitle");
  btnQuick.textContent = t("quick");
  btnSpectate.textContent = t("spectate");
  btnLeave.textContent = t("leave");
  hintEl.textContent = t("hint");
  lbTitleEl.textContent = t("leaderboard");

  recentTitleEl.textContent = t("recent");
  renderStats();
}

function renderStats() {
  const best = Math.max(0, profile.bestScore | 0);
  bestLineEl.textContent = `${t("best")}: ${best}`;
  historyEl.innerHTML = "";
  const items = (profile.history || []).slice(0, 5);
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "-";
    historyEl.appendChild(li);
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    const date = new Date(it.ts || Date.now());
    const when = date.toLocaleString(lang);
    li.textContent = `${when}  ·  score=${it.score}`;
    historyEl.appendChild(li);
  }
}

function recordResult(score) {
  const s = Math.max(0, Number(score) | 0);
  profile.bestScore = Math.max(profile.bestScore | 0, s);
  const entry = { ts: Date.now(), score: s };
  profile.history = [entry, ...(profile.history || [])].slice(0, 5);
  saveProfile();
  renderStats();
}

function showLogin(message = "") {
  loginEl.classList.remove("hidden");
  hudEl.classList.add("hidden");
  loginMsg.textContent = message || "";
  btnQuick.disabled = true;
  btnSpectate.disabled = true;
  btnLeave.disabled = true;
  autoQuickRequested = false;
  joinInFlight = false;
}

function showGame() {
  loginEl.classList.add("hidden");
  hudEl.classList.remove("hidden");
  btnQuick.disabled = !profileConfirmed;
  btnSpectate.disabled = false;
}

function tryAutoQuickMatch() {
  if (!autoQuickRequested) return;
  if (!socket.connected) return;
  if (!nick) return;
  if (!profileConfirmed) return;
  if (currentRoomId) return;
  if (joinInFlight) return;
  autoQuickRequested = false;
  joinInFlight = true;
  socket.emit("mm:join", { mode: "play" });
}

langSel.value = lang;
langSel.addEventListener("change", () => {
  const next = langSel.value;
  lang = I18N[next] ? next : "en";
  profile.lang = lang;
  saveProfile();
  applyLang();
});

nickInput.value = nick;
btnLogin.addEventListener("click", () => {
  const v = sanitizeNick(nickInput.value);
  if (!v) {
    showLogin(t("needNick"));
    nickInput.focus();
    return;
  }
  nick = v;
  profile.nick = nick;
  saveProfile();
  meEl.textContent = `nick: ${nick}`;
  profileConfirmed = false;
  btnQuick.disabled = true;
  autoQuickRequested = true;
  joinInFlight = false;
  socket.emit("profile:set", { nick });
  showGame();

  // If the server already knows the nick (e.g. session restore), join immediately.
  tryAutoQuickMatch();
});
nickInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

// If the page is opened from another port (or even file://), force the Socket.IO
// connection to the backend server on :6868 by default.
const qs = new URLSearchParams(window.location.search);
const backendUrl =
  qs.get("server") ||
  (window.location.port === "6868"
    ? window.location.origin
    : `http://${window.location.hostname || "localhost"}:6868`);

const socket = io(backendUrl, {
  transports: ["polling", "websocket"],
  auth: { token },
});

let myId = null;
let currentRoomId = null;
let currentMode = null;
let world = { width: 2800, height: 1800 };
let lastSnapshot = { ts: 0, players: [], pellets: [] };
let prevSnapshot = null;

const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function getAxis() {
  let ax = 0;
  let ay = 0;
  if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
  if (keys.has("arrowright") || keys.has("d")) ax += 1;
  if (keys.has("arrowup") || keys.has("w")) ay -= 1;
  if (keys.has("arrowdown") || keys.has("s")) ay += 1;
  const boost = keys.has("shift");
  return { ax, ay, boost };
}

socket.on("connect", () => {
  statusEl.textContent = `${t("connected")} (${backendUrl})`;
});

socket.on("disconnect", () => {
  statusEl.textContent = t("disconnected");
});

socket.on("connect_error", (err) => {
  const msg = err?.message || String(err);
  statusEl.textContent = `connect_error (${backendUrl}): ${msg}`;
  console.error("[socket] connect_error", err);
});

socket.on("auth", (payload) => {
  if (payload?.token && payload.token !== token) {
    token = payload.token;
    localStorage.setItem(STORAGE_TOKEN, token);
  }
  if (payload?.nick && !nick) {
    nick = sanitizeNick(payload.nick);
    profile.nick = nick;
    saveProfile();
  }
  if (payload?.nick) {
    profileConfirmed = true;
    btnQuick.disabled = false;
    tryAutoQuickMatch();
  }
  if (payload?.playerId) {
    myId = payload.playerId;
  }
  if (nick) meEl.textContent = `nick: ${nick}`;
});

socket.on("hello", (payload) => {
  if (payload?.playerId && !myId) myId = payload.playerId;
  if (payload?.nick && !nick) {
    nick = sanitizeNick(payload.nick);
    profile.nick = nick;
    saveProfile();
    nickInput.value = nick;
  }
});

socket.on("profile:ok", (payload) => {
  if (payload?.nick) {
    nick = sanitizeNick(payload.nick);
    profile.nick = nick;
    saveProfile();
    meEl.textContent = `nick: ${nick}`;
    profileConfirmed = true;
    btnQuick.disabled = false;
    tryAutoQuickMatch();
  }
});

socket.on("login:required", () => {
  profileConfirmed = false;
  joinInFlight = false;
  showLogin(t("needNick"));
});

socket.on("game:over", (payload = {}) => {
  const score = payload.score ?? 0;
  recordResult(score);

  // reset in-room UI
  currentRoomId = null;
  currentMode = null;
  roomEl.textContent = "";
  lbEl.innerHTML = "";
  btnLeave.disabled = true;

  // go back to login page
  profileConfirmed = false;
  joinInFlight = false;
  showLogin(I18N[lang]?.gameOver ? I18N[lang].gameOver(score) : I18N.en.gameOver(score));
});

socket.on("room:joined", ({ room, mode }) => {
  joinInFlight = false;
  currentRoomId = room?.id ?? null;
  currentMode = mode;
  roomEl.textContent = currentRoomId ? `room: ${currentRoomId} (${mode})` : "";
  btnLeave.disabled = !currentRoomId;
  statusEl.textContent = "in-room";
});

socket.on("room:left", () => {
  joinInFlight = false;
  currentRoomId = null;
  currentMode = null;
  roomEl.textContent = "";
  btnLeave.disabled = true;
  lbEl.innerHTML = "";
  statusEl.textContent = `${t("connected")} (${backendUrl})`;
});

socket.on("state", (snap) => {
  if (snap?.roomId && currentRoomId && snap.roomId !== currentRoomId) return;
  prevSnapshot = lastSnapshot;
  lastSnapshot = snap;
});

socket.on("leaderboard", (payload) => {
  if (payload?.roomId && currentRoomId && payload.roomId !== currentRoomId) return;
  const top = payload?.top ?? [];
  lbEl.innerHTML = "";
  for (const entry of top) {
    const li = document.createElement("li");
    const label = entry.name ? entry.name : entry.id.slice(0, 6);
    li.textContent = `${label}  score=${entry.score}`;
    lbEl.appendChild(li);
  }
});

setInterval(() => {
  if (!socket.connected) return;
  if (currentMode !== "play") return;
  if (!currentRoomId) return;
  socket.emit("input", getAxis());
}, 1000 / 30);

btnQuick.addEventListener("click", () => {
  if (!nick) {
    showLogin(t("needNick"));
    return;
  }
  if (!socket.connected) {
    statusEl.textContent = `${t("notConnected")} (${backendUrl})`;
    return;
  }
  if (currentRoomId || joinInFlight) return;
  joinInFlight = true;
  socket.emit("mm:join", { mode: "play" });
});

btnSpectate.addEventListener("click", () => {
  if (!socket.connected) {
    statusEl.textContent = `${t("notConnected")} (${backendUrl})`;
    return;
  }
  socket.emit("mm:join", { mode: "spectate" });
});

btnLeave.addEventListener("click", () => {
  socket.emit("room:leave");
});

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawGrid(camX, camY) {
  const step = 80;
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

let lastFrameTs = performance.now();
let fpsAcc = 0;
let fpsCount = 0;

function frame(now) {
  const dt = now - lastFrameTs;
  lastFrameTs = now;
  fpsAcc += dt;
  fpsCount += 1;
  if (fpsAcc >= 500) {
    const fps = Math.round((fpsCount / fpsAcc) * 1000);
    fpsEl.textContent = `${fps} fps`;
    fpsAcc = 0;
    fpsCount = 0;
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // interpolation factor based on snapshot times
  const s1 = lastSnapshot;
  const s0 = prevSnapshot;

  let interp = 1;
  if (s0 && s1.ts > s0.ts) {
    const renderTs = Date.now() - 100; // 100ms interpolation delay
    interp = (renderTs - s0.ts) / (s1.ts - s0.ts);
    interp = Math.max(0, Math.min(1, interp));
  }

  const players0 = new Map((s0?.players ?? []).map((p) => [p.id, p]));

  // find my player for camera
  const me1 = (s1.players || []).find((p) => p.id === myId) || s1.players?.[0];
  const camTargetX = me1 ? me1.x : world.width / 2;
  const camTargetY = me1 ? me1.y : world.height / 2;

  const camX = camTargetX - window.innerWidth / 2;
  const camY = camTargetY - window.innerHeight / 2;

  // background
  drawGrid(camX, camY);

  // world bounds
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, world.width, world.height);

  // pellets
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (const pel of s1.pellets || []) {
    ctx.beginPath();
    ctx.arc(pel.x, pel.y, pel.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // players
  for (const p1 of s1.players || []) {
    const p0 = players0.get(p1.id);
    const x = p0 ? lerp(p0.x, p1.x, interp) : p1.x;
    const y = p0 ? lerp(p0.y, p1.y, interp) : p1.y;
    const r = p0 ? lerp(p0.r, p1.r, interp) : p1.r;

    ctx.beginPath();
    ctx.fillStyle = p1.color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (p1.id === myId) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${p1.score}`, x, y + 4);

    const name = p1.name || (p1.id ? p1.id.slice(0, 6) : "");
    if (name) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "11px system-ui";
      ctx.fillText(name, x, y - r - 8);
    }
  }

  ctx.restore();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Initial UI
applyLang();
renderStats();
showLogin("");
nickInput.focus();
