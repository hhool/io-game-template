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
    hintMouse: "Arrow keys or move mouse to steer. Right mouse = boost.",
    hintTouch: "Touch & drag to move. Two fingers = boost.",
    hintTouchPoint: "Touch and hold to steer towards that point. Two fingers = boost.",
    touchGuide: "Drag to move",
    touchGuidePoint: "Hold to steer",
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
    hintMouse: "Стрелки или ведите мышью для управления. Правая кнопка — ускорение.",
    hintTouch: "Коснитесь и тяните для движения. Два пальца — ускорение.",
    hintTouchPoint: "Коснитесь и удерживайте, чтобы вести к точке. Два пальца — ускорение.",
    touchGuide: "Тяните для движения",
    touchGuidePoint: "Удерживайте для управления",
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
    hintMouse: "Flèches ou déplacez la souris pour diriger. Clic droit = boost.",
    hintTouch: "Touchez et faites glisser pour bouger. Deux doigts = boost.",
    hintTouchPoint: "Touchez et maintenez pour viser ce point. Deux doigts = boost.",
    touchGuide: "Glissez pour bouger",
    touchGuidePoint: "Maintenez pour diriger",
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
    hintMouse: "方向键或移动鼠标控制方向；右键加速。",
    hintTouch: "手指按住拖动控制方向；双指按住加速。",
    hintTouchPoint: "按住触摸点控制朝向；双指按住加速。",
    touchGuide: "拖动控制方向",
    touchGuidePoint: "按住控制方向",
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
    hintMouse: "Pfeile oder Maus bewegen zum Steuern. Rechtsklick = Boost.",
    hintTouch: "Berühren und ziehen zum Bewegen. Zwei Finger = Boost.",
    hintTouchPoint: "Berühren und halten zum Steuern. Zwei Finger = Boost.",
    touchGuide: "Ziehen zum Bewegen",
    touchGuidePoint: "Halten zum Steuern",
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
    hintMouse: "الأسهم أو حرّك الفأرة للتوجيه. زر الفأرة الأيمن = تسريع.",
    hintTouch: "المس واسحب للحركة. إصبعان = تسريع.",
    hintTouchPoint: "المس واضغط للتوجيه نحو النقطة. إصبعان = تسريع.",
    touchGuide: "اسحب للحركة",
    touchGuidePoint: "اضغط للتوجيه",
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

// --- Input model (keyboard + touch) ---
const STORAGE_TOUCH_GUIDE = "1wlgame_touch_guide_seen_v1";
const STORAGE_CFG = "1wlgame_cfg_v1";
const isTouchCapable =
  (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
  (typeof window !== "undefined" && "ontouchstart" in window);

const defaultConfig = {
  controls: {
    enableKeyboard: true,
    enableMouse: true,
    mouseMode: "point", // point
    enableTouch: isTouchCapable,
    touchMode: isTouchCapable ? "joystick" : "off", // joystick | point | off
    prefer: isTouchCapable ? "touch" : "mouse", // touch | mouse | keyboard
  },
  guide: {
    touchGuideOnFirstUse: true,
  },
};

function deepMerge(a, b) {
  if (!b || typeof b !== "object") return a;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object") {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function loadLocalConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_CFG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalConfig(overrides) {
  try {
    localStorage.setItem(STORAGE_CFG, JSON.stringify(overrides || {}));
  } catch {
    // ignore
  }
}

let runtimeOverrides = loadLocalConfig() || {};
let config = deepMerge(defaultConfig, runtimeOverrides);

const inputModel = {
  useKeyboard: true,
  useTouch: isTouchCapable,
  useMouse: true,
  keyboard: { ax: 0, ay: 0, boost: false },
  mouse: { ax: 0, ay: 0, boost: false, active: false },
  touch: { ax: 0, ay: 0, boost: false, active: false },
  get() {
    const prefer = config?.controls?.prefer || "touch";

    const order =
      prefer === "mouse"
        ? ["mouse", "touch", "keyboard"]
        : prefer === "keyboard"
          ? ["keyboard", "touch", "mouse"]
          : ["touch", "mouse", "keyboard"];

    for (const k of order) {
      if (k === "touch" && this.useTouch && this.touch.active) return this.touch;
      if (k === "mouse" && this.useMouse && this.mouse.active) return this.mouse;
      if (k === "keyboard" && this.useKeyboard) return this.keyboard;
    }
    return { ax: 0, ay: 0, boost: false };
  },
  setKeyboard(ax, ay, boost) {
    this.keyboard = { ax, ay, boost: Boolean(boost) };
  },
  setMouse(ax, ay, boost, active) {
    this.mouse = { ax, ay, boost: Boolean(boost), active: Boolean(active) };
  },
  setTouch(ax, ay, boost, active) {
    this.touch = { ax, ay, boost: Boolean(boost), active: Boolean(active) };
  },
  resetMouse() {
    this.setMouse(0, 0, false, false);
  },
  resetTouch() {
    this.setTouch(0, 0, false, false);
  },
};

// Touch joystick state for guide/rendering
const joystick = {
  enabled: isTouchCapable,
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  maxR: 70,
  deadzone: 10,
  showGuide:
    isTouchCapable &&
    config?.guide?.touchGuideOnFirstUse !== false &&
    localStorage.getItem(STORAGE_TOUCH_GUIDE) !== "1",
};

const pointControl = {
  enabled: isTouchCapable,
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeStick(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < joystick.deadzone) return { ax: 0, ay: 0 };
  const capped = Math.min(joystick.maxR, len);
  const nx = dx / (len || 1);
  const ny = dy / (len || 1);
  const mag = capped / joystick.maxR;
  return { ax: nx * mag, ay: ny * mag };
}

function touchBoostFromEvent(e) {
  // PointerEvent doesn't expose touches; use navigator maxTouchPoints + active pointers heuristic.
  // We treat "two fingers down" as boost by tracking active pointer count.
  return activePointers.size >= 2;
}

function setTouchGuideSeen() {
  if (!joystick.showGuide) return;
  joystick.showGuide = false;
  localStorage.setItem(STORAGE_TOUCH_GUIDE, "1");
}

function applyConfig(nextCfg, opts) {
  config = deepMerge(config, nextCfg || {});
  if (opts?.persist) {
    runtimeOverrides = deepMerge(runtimeOverrides, nextCfg || {});
    saveLocalConfig(runtimeOverrides);
  }

  const c = config.controls || {};
  inputModel.useKeyboard = c.enableKeyboard !== false;
  inputModel.useMouse = c.enableMouse !== false;
  inputModel.useTouch = c.enableTouch !== false && isTouchCapable;

  const touchMode = c.touchMode || "joystick";
  joystick.enabled = inputModel.useTouch && touchMode === "joystick";
  pointControl.enabled = inputModel.useTouch && touchMode === "point";

  // Update guide behavior
  joystick.showGuide =
    inputModel.useTouch &&
    (joystick.enabled || pointControl.enabled) &&
    config?.guide?.touchGuideOnFirstUse !== false &&
    localStorage.getItem(STORAGE_TOUCH_GUIDE) !== "1";

  applyLang();
}

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
  // Hint depends on current input scheme
  if (joystick.enabled) hintEl.textContent = t("hintTouch");
  else if (pointControl.enabled) hintEl.textContent = t("hintTouchPoint");
  else if (inputModel.useMouse) hintEl.textContent = t("hintMouse") || t("hint");
  else hintEl.textContent = t("hint");
  lbTitleEl.textContent = t("leaderboard");

  recentTitleEl.textContent = t("recent");
  renderStats();
}

function setTouchControlsEnabled(enabled) {
  inputModel.useTouch = Boolean(enabled) && isTouchCapable;
  if (!inputModel.useTouch) inputModel.resetTouch();
  const touchMode = config?.controls?.touchMode || "joystick";
  joystick.enabled = inputModel.useTouch && touchMode === "joystick";
  pointControl.enabled = inputModel.useTouch && touchMode === "point";
  applyLang();
}

function setKeyboardControlsEnabled(enabled) {
  inputModel.useKeyboard = Boolean(enabled);
}

function setMouseControlsEnabled(enabled) {
  inputModel.useMouse = Boolean(enabled);
  if (!inputModel.useMouse) inputModel.resetMouse();
  applyLang();
}

// Expose a tiny API for debugging/feature flags
window.gameControls = {
  setTouchControlsEnabled,
  setKeyboardControlsEnabled,
  setMouseControlsEnabled,
  configure: (partial) => applyConfig(partial, { persist: true }),
  getConfig: () => JSON.parse(JSON.stringify(config)),
  getInput: () => ({ ...inputModel.get() }),
};

// Apply defaults + local overrides immediately
applyConfig(null, { persist: false });

// Load config.json (optional)
fetch("/config.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : null))
  .then((cfg) => {
    if (cfg) applyConfig(cfg, { persist: false });
  })
  .catch(() => {
    // ignore
  });

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

const activePointers = new Set();

function getCanvasCenterClient() {
  const r = canvas.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

// Unified pointer-based touch joystick
canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (!inputModel.useTouch) return;
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    activePointers.add(e.pointerId);

    // Touch point mode: steer towards screen point
    if (pointControl.enabled) {
      if (!pointControl.active) {
        pointControl.active = true;
        pointControl.pointerId = e.pointerId;
      }
      pointControl.x = e.clientX;
      pointControl.y = e.clientY;
      setTouchGuideSeen();

      const { cx, cy } = getCanvasCenterClient();
      const dx = pointControl.x - cx;
      const dy = pointControl.y - cy;
      const v = normalizeStick(dx, dy);
      inputModel.setTouch(v.ax, v.ay, touchBoostFromEvent(e), true);
      return;
    }

    if (!joystick.enabled) return;

    // Start controlling with the first active pointer only
    if (!joystick.active) {
      joystick.active = true;
      joystick.pointerId = e.pointerId;
      joystick.startX = e.clientX;
      joystick.startY = e.clientY;
      joystick.x = e.clientX;
      joystick.y = e.clientY;
      setTouchGuideSeen();

      // Immediately take over input (even before dragging)
      const boost = touchBoostFromEvent(e);
      inputModel.setTouch(0, 0, boost, true);
    } else {
      // Non-controlling pointer down: update boost state
      const boost = touchBoostFromEvent(e);
      const cur = inputModel.touch;
      if (cur.active) inputModel.setTouch(cur.ax, cur.ay, boost, true);
    }
  },
  { passive: true }
);

canvas.addEventListener(
  "pointermove",
  (e) => {
    if (!inputModel.useTouch) return;
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;

    if (pointControl.enabled) {
      if (!pointControl.active) return;
      if (e.pointerId !== pointControl.pointerId) return;
      pointControl.x = e.clientX;
      pointControl.y = e.clientY;
      const { cx, cy } = getCanvasCenterClient();
      const dx = pointControl.x - cx;
      const dy = pointControl.y - cy;
      const v = normalizeStick(dx, dy);
      inputModel.setTouch(v.ax, v.ay, touchBoostFromEvent(e), true);
      return;
    }

    if (!joystick.enabled) return;
    if (!joystick.active) return;
    if (e.pointerId !== joystick.pointerId) return;
    joystick.x = e.clientX;
    joystick.y = e.clientY;

    const dx = joystick.x - joystick.startX;
    const dy = joystick.y - joystick.startY;
    const v = normalizeStick(dx, dy);
    inputModel.setTouch(v.ax, v.ay, touchBoostFromEvent(e), true);
  },
  { passive: true }
);

function endPointer(e) {
  if (!inputModel.useTouch) return;
  activePointers.delete(e.pointerId);

  if (pointControl.enabled) {
    if (pointControl.active && e.pointerId === pointControl.pointerId) {
      pointControl.active = false;
      pointControl.pointerId = null;
      inputModel.resetTouch();
    } else if (pointControl.active) {
      const boost = touchBoostFromEvent(e);
      const tcur = inputModel.touch;
      inputModel.setTouch(tcur.ax, tcur.ay, boost, true);
    }
    return;
  }

  if (!joystick.enabled) return;
  if (joystick.active && e.pointerId === joystick.pointerId) {
    joystick.active = false;
    joystick.pointerId = null;
    inputModel.resetTouch();
  } else {
    // pointer lifted that wasn't the controlling one; update boost state
    if (joystick.active) {
      const boost = touchBoostFromEvent(e);
      const tcur = inputModel.touch;
      inputModel.setTouch(tcur.ax, tcur.ay, boost, true);
    }
  }
}

canvas.addEventListener("pointerup", endPointer, { passive: true });
canvas.addEventListener("pointercancel", endPointer, { passive: true });

function getAxis() {
  let ax = 0;
  let ay = 0;
  if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
  if (keys.has("arrowright") || keys.has("d")) ax += 1;
  if (keys.has("arrowup") || keys.has("w")) ay -= 1;
  if (keys.has("arrowdown") || keys.has("s")) ay += 1;
  const boost = keys.has("shift");
  inputModel.setKeyboard(ax, ay, boost);
  return inputModel.get();
}

// Desktop mouse control (hold mouse button -> steer)
function mouseVecFromEvent(e) {
  const { cx, cy } = getCanvasCenterClient();
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;
  return normalizeStick(dx, dy);
}

function mouseMode() {
  return config?.controls?.mouseMode || "point";
}

function updateMouseFromEvent(e) {
  if (!inputModel.useMouse) return;
  const v = mouseVecFromEvent(e);
  const boost = (e.buttons & 2) !== 0 || e.shiftKey;
  const mode = mouseMode();
  if (mode === "hold") {
    const active = (e.buttons & 1) !== 0 || (e.buttons & 2) !== 0;
    if (!active) return inputModel.resetMouse();
    return inputModel.setMouse(v.ax, v.ay, boost, true);
  }
  // mode: point (default)
  return inputModel.setMouse(v.ax, v.ay, boost, true);
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener(
  "mouseleave",
  () => {
    inputModel.resetMouse();
  },
  { passive: true }
);

canvas.addEventListener(
  "mousedown",
  (e) => {
    if (!inputModel.useMouse) return;
    if (e.button !== 0 && e.button !== 2) return;
    updateMouseFromEvent(e);
  },
  { passive: true }
);

window.addEventListener(
  "mousemove",
  (e) => {
    if (!inputModel.useMouse) return;
    // In point mode we always steer while cursor is over the canvas.
    if (mouseMode() === "point") {
      if (e.target !== canvas) return;
      updateMouseFromEvent(e);
      return;
    }
    // In hold mode, only steer while mouse buttons are held.
    if (!inputModel.mouse.active) return;
    updateMouseFromEvent(e);
  },
  { passive: true }
);

window.addEventListener(
  "mouseup",
  (e) => {
    if (!inputModel.useMouse) return;
    if (mouseMode() === "hold") {
      if (e.button === 0 || e.button === 2) inputModel.resetMouse();
      return;
    }
    // point mode: keep steering, but update boost state
    updateMouseFromEvent(e);
  },
  { passive: true }
);

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

  // Touch guide overlay (screen-space)
  if ((joystick.enabled && (joystick.active || joystick.showGuide)) || (pointControl.enabled && (pointControl.active || joystick.showGuide))) {
    if (joystick.enabled) {
      const cx = joystick.active ? joystick.startX : window.innerWidth * 0.25;
      const cy = joystick.active ? joystick.startY : window.innerHeight * 0.75;
      const dx = joystick.active ? joystick.x - joystick.startX : 0;
      const dy = joystick.active ? joystick.y - joystick.startY : 0;
      const len = Math.hypot(dx, dy);
      const r = joystick.maxR;
      const knobR = 18;

      let kx = cx;
      let ky = cy;
      if (joystick.active && len > 0.001) {
        const capped = Math.min(r, len);
        kx = cx + (dx / len) * capped;
        ky = cy + (dy / len) * capped;
      }

      ctx.save();
      ctx.globalAlpha = joystick.active ? 0.75 : 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(79,195,247,0.55)";
      ctx.beginPath();
      ctx.arc(kx, ky, knobR, 0, Math.PI * 2);
      ctx.fill();

      if (joystick.showGuide) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "13px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(t("touchGuide"), cx, cy - r - 14);
      }

      ctx.restore();
    } else if (pointControl.enabled) {
      const cx = pointControl.active ? pointControl.x : window.innerWidth * 0.75;
      const cy = pointControl.active ? pointControl.y : window.innerHeight * 0.75;
      const r = 26;

      ctx.save();
      ctx.globalAlpha = pointControl.active ? 0.75 : 0.45;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      if (joystick.showGuide) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "13px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(t("touchGuidePoint"), cx, cy - r - 14);
      }

      ctx.restore();
    }
  }

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
