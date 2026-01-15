const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const hudEl = document.getElementById("hud");
const loginEl = document.getElementById("login");
const debugPanelEl = document.getElementById("debugPanel");

const statusEl = document.getElementById("status");
const meEl = document.getElementById("me");
const roomEl = document.getElementById("room");
const fpsEl = document.getElementById("fps");
const lbEl = document.getElementById("lb");
const lbBoardEl = document.getElementById("lbBoard");
const btnLbToggle = document.getElementById("btnLbToggle");
const hudRulesEl = document.getElementById("hudRules");
const lbColNameEl = document.getElementById("lbColName");
const lbColScoreEl = document.getElementById("lbColScore");
const playersColNameEl = document.getElementById("playersColName");
const playersColScoreEl = document.getElementById("playersColScore");
const infoBoardEl = document.getElementById("infoBoard");
const infoTitleEl = document.getElementById("infoTitle");
const btnInfoToggle = document.getElementById("btnInfoToggle");
const infoLabelPingEl = document.getElementById("infoLabelPing");
const infoLabelFpsEl = document.getElementById("infoLabelFps");
const infoLabelPlayersEl = document.getElementById("infoLabelPlayers");
const infoLabelPelletsEl = document.getElementById("infoLabelPellets");
const infoLabelYouEl = document.getElementById("infoLabelYou");
const hudPingEl = document.getElementById("hudPing");
const hudPlayersCountEl = document.getElementById("hudPlayersCount");
const hudPelletsCountEl = document.getElementById("hudPelletsCount");
const hudYouScoreEl = document.getElementById("hudYouScore");
const playersBoardEl = document.getElementById("playersBoard");
const playersTitleEl = document.getElementById("playersTitle");
const playersEl = document.getElementById("players");
const btnPlayersToggle = document.getElementById("btnPlayersToggle");

const btnHudToggle = document.getElementById("btnHudToggle");
const minimapTitleEl = document.getElementById("minimapTitle");
const btnMinimapToggle = document.getElementById("btnMinimapToggle");

const btnLeave = document.getElementById("btnLeave");

const langSel = document.getElementById("lang");
const nickInput = document.getElementById("nick");
const rulesSel = document.getElementById("rules");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const bestLineEl = document.getElementById("bestLine");
const historyEl = document.getElementById("history");
const statsTitleEl = document.getElementById("statsTitle");
const bestTitleEl = document.getElementById("bestTitle");
const colDateEl = document.getElementById("colDate");
const colScoreEl = document.getElementById("colScore");
const recentColDateEl = document.getElementById("recentColDate");
const recentColScoreEl = document.getElementById("recentColScore");
const btnStatsToggle = document.getElementById("btnStatsToggle");
const statsBodyEl = document.getElementById("statsBody");

function setLoginMessage(msg) {
  if (!loginMsg) return;
  loginMsg.textContent = msg || "";
}

// Surface runtime errors on the login screen so "click does nothing" has a visible cause.
window.addEventListener("error", (e) => {
  const message = e?.message ? String(e.message) : "Unknown error";
  if (loginEl && !loginEl.classList.contains("hidden")) {
    setLoginMessage(`JS error: ${message}`);
  }
  // eslint-disable-next-line no-console
  console.error("[window.error]", e);
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = e?.reason;
  const message = reason?.message ? String(reason.message) : String(reason || "Unknown rejection");
  if (loginEl && !loginEl.classList.contains("hidden")) {
    setLoginMessage(`Promise error: ${message}`);
  }
  // eslint-disable-next-line no-console
  console.error("[window.unhandledrejection]", e);
});

// --- Custom dropdowns (desktop/device-emulation), backed by native <select> ---
const customDropdowns = new Map();

function setupCustomDropdownForSelect(selectEl) {
  if (!selectEl) return null;
  // Avoid relying on HTMLSelectElement instanceof checks (can be finicky across WebViews/realms).
  if (String(selectEl.tagName || "").toUpperCase() !== "SELECT") return null;
  const wrap = selectEl.closest(".dropdownWrap");
  if (!wrap) return null;
  const btn = wrap.querySelector(".ddBtn");
  const list = wrap.querySelector(".ddList");
  if (!btn || !list) return null;

  const close = () => {
    wrap.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    if (btn.disabled) return;
    wrap.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    const first = list.querySelector(".ddItem");
    if (first) first.focus?.();
  };

  const toggle = () => {
    if (wrap.classList.contains("open")) close();
    else open();
  };

  const update = () => {
    const opt = selectEl.selectedOptions && selectEl.selectedOptions[0] ? selectEl.selectedOptions[0] : selectEl.options[selectEl.selectedIndex];
    btn.textContent = opt ? opt.textContent : "";
    btn.disabled = Boolean(selectEl.disabled);
    const selectedValue = selectEl.value;
    for (const item of Array.from(list.querySelectorAll(".ddItem"))) {
      const isSel = item.getAttribute("data-value") === selectedValue;
      item.setAttribute("aria-selected", isSel ? "true" : "false");
    }
  };

  const rebuild = () => {
    list.innerHTML = "";
    for (const opt of Array.from(selectEl.options || [])) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ddItem";
      item.setAttribute("role", "option");
      item.setAttribute("data-value", opt.value);
      item.textContent = opt.textContent;
      item.addEventListener("click", () => {
        if (selectEl.disabled) return;
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        update();
        close();
        btn.focus?.();
      });
      list.appendChild(item);
    }
    update();
  };

  btn.addEventListener("click", toggle);
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    } else if (e.key === "Escape") {
      close();
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrap.classList.contains("open")) return;
    if (wrap.contains(e.target)) return;
    close();
  });
  document.addEventListener("keydown", (e) => {
    if (!wrap.classList.contains("open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      btn.focus?.();
    }
  });

  // Keep in sync when code updates options/disabled dynamically.
  const mo = new MutationObserver(() => {
    rebuild();
  });
  mo.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });

  selectEl.addEventListener("change", () => update());

  const api = { selectEl, wrap, btn, list, rebuild, update, close, open };
  customDropdowns.set(selectEl.id, api);
  rebuild();
  return api;
}

function updateCustomDropdown(selectId) {
  customDropdowns.get(selectId)?.update?.();
}

function rebuildCustomDropdown(selectId) {
  customDropdowns.get(selectId)?.rebuild?.();
}

const loginTitleEl = document.getElementById("loginTitle");
const labelLangEl = document.getElementById("labelLang");
const labelNickEl = document.getElementById("labelNick");
const labelRulesEl = document.getElementById("labelRules");
const recentTitleEl = document.getElementById("recentTitle");
const hudTitleEl = document.getElementById("hudTitle");
const lbTitleEl = document.getElementById("lbTitle");
const hintEl = document.getElementById("hint");

setupCustomDropdownForSelect(langSel);
setupCustomDropdownForSelect(rulesSel);

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  // Use the element's real CSS pixel size. On mobile, `100vh` / `innerHeight` can disagree
  // (browser UI shows/hides), which causes the canvas to be stretched and circles become ovals.
  const r = canvas.getBoundingClientRect();
  const cssW = Math.max(1, r.width || window.innerWidth || 1);
  const cssH = Math.max(1, r.height || window.innerHeight || 1);
  const w = Math.floor(cssW * dpr);
  const h = Math.floor(cssH * dpr);

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  // Draw using CSS pixel coordinates.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
// Mobile browser UI can change the visual viewport without firing a window resize.
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}
resize();

const STORAGE_TOKEN = "1wlgame_token";
const STORAGE_PROFILE = "1wlgame_profile_v1";
const STORAGE_RULES = "1wlgame_rulesId_v1";

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadProfile() {
  try {
    const raw = storageGet(STORAGE_PROFILE);
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
  storageSet(STORAGE_PROFILE, JSON.stringify(profile));
}

function sanitizeNick(nick) {
  if (typeof nick !== "string") return "";
  return nick.replace(/[\r\n\t]/g, " ").trim().slice(0, 16);
}

function normalizeRulesId(v) {
  if (typeof v !== "string") return null;
  let id = v.trim().toLowerCase();
  if (!id) return null;

  // Accept any safe rules id so new rulesets work without a client release.
  // Keep this conservative to avoid weird URL/localStorage injection.
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return null;
  return id;
}

function isTextInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function shouldEnableDebugFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const v = q.get("debug") ?? q.get("dbg");
    return v === "1" || v === "true" || v === "yes";
  } catch {
    return false;
  }
}

let debugEnabled = shouldEnableDebugFromUrl();
let lastRulesOkAt = 0;
let lastRulesOk = null;
let lastDebugRenderAt = 0;

let serverRulesCatalog = null;
let serverRulesCatalogAt = 0;

function setDebugEnabled(enabled) {
  debugEnabled = Boolean(enabled);
  if (!debugPanelEl) return;
  debugPanelEl.classList.toggle("hidden", !debugEnabled);
}

function msAgo(ts) {
  if (!ts) return "never";
  const d = Date.now() - ts;
  if (d < 0) return "0ms";
  if (d < 1000) return `${d}ms`;
  if (d < 60_000) return `${(d / 1000).toFixed(1)}s`;
  return `${Math.round(d / 1000)}s`;
}

function renderDebugPanel(force) {
  if (!debugEnabled) return;
  if (!debugPanelEl) return;
  const now = Date.now();
  if (!force && now - lastDebugRenderAt < 200) return;
  lastDebugRenderAt = now;

  const s = lastSnapshot || {};
  const pellets = Array.isArray(s.pellets) ? s.pellets.length : 0;
  const players = Array.isArray(s.players) ? s.players.length : 0;
  const me = (s.players || []).find((p) => p.id === myId) || null;
  const rc = currentRulesId ? rulesCfgFor(currentRulesId) : null;
  const rcAgar = rc?.agar && typeof rc.agar === "object" ? rc.agar : null;

  const selectedRulesId = normalizeRulesId(rulesSel?.value);
  const activeRulesId = normalizeRulesId(currentRulesId);
  const knownRules = Array.isArray(serverRulesCatalog)
    ? serverRulesCatalog
        .map((r) => ({
          id: normalizeRulesId(r?.id),
          label: typeof r?.label === "string" ? r.label : null,
        }))
        .filter((r) => r.id)
    : [];
  // Fallback to whatever is currently in the <select>.
  if (!knownRules.length && rulesSel) {
    for (const opt of Array.from(rulesSel.options || [])) {
      const id = normalizeRulesId(opt?.value);
      if (!id) continue;
      knownRules.push({ id, label: typeof opt.textContent === "string" ? opt.textContent : null });
    }
  }

  const lines = [];
  lines.push("Debug (toggle: D, url: ?debug=1)");
  lines.push(`backend=${backendUrl}`);
  lines.push(`mode=${currentMode ?? "-"} room=${currentRoomId ?? "-"}`);
  lines.push(`rules=${currentRulesId ?? "-"} pending=${pendingRulesId ?? "-"}`);
  lines.push(`snap.ts=${s.ts ?? "-"} (${msAgo(s.ts)} ago)`);
  lines.push(`players=${players} pellets=${pellets}`);
  if (me) lines.push(`me: x=${me.x?.toFixed?.(1) ?? me.x} y=${me.y?.toFixed?.(1) ?? me.y} r=${me.r?.toFixed?.(1) ?? me.r} score=${me.score ?? "-"}`);

  if (pellets && Array.isArray(s.pellets)) {
    let invalid = 0;
    let inView = 0;
    const camTargetX = me ? me.x : world.width / 2;
    const camTargetY = me ? me.y : world.height / 2;
    const camX = camTargetX - window.innerWidth / 2;
    const camY = camTargetY - window.innerHeight / 2;

    for (const pel of s.pellets) {
      const x = Number(pel?.x);
      const y = Number(pel?.y);
      const r = Number(pel?.r);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) {
        invalid++;
        continue;
      }
      if (x >= camX && x <= camX + window.innerWidth && y >= camY && y <= camY + window.innerHeight) inView++;
    }

    const p0 = s.pellets[0];
    if (p0) lines.push(`pel0: x=${p0.x} y=${p0.y} r=${p0.r}`);
    lines.push(`pellets in view≈${inView} invalid=${invalid}`);
  }
  lines.push(`rules:setConfig lastSent=${msAgo(lastRulesSentAt)} ago jsonLen=${lastRulesSent?.json?.length ?? 0}`);
  lines.push(`rules:ok last=${msAgo(lastRulesOkAt)} ago`);

  if (knownRules.length) {
    lines.push("");
    lines.push(`Rules (server=${msAgo(serverRulesCatalogAt)} ago):`);
    const max = 24;
    for (const r of knownRules.slice(0, max)) {
      const isSelected = selectedRulesId && r.id === selectedRulesId;
      const isActive = activeRulesId && r.id === activeRulesId;
      const mark = `${isActive ? ">" : " "}${isSelected ? "*" : " "}`; // > active, * selected
      const label = r.label && r.label !== r.id ? ` (${r.label})` : "";
      lines.push(`${mark} ${r.id}${label}`);
    }
    if (knownRules.length > max) lines.push(`  … +${knownRules.length - max} more`);
    lines.push("  legend: > active in-room, * selected in dropdown");
  }

  if (rcAgar) lines.push(`agar cfg: ${JSON.stringify(rcAgar)}`);
  if (lastRulesOk) lines.push(`last rules:ok: ${JSON.stringify(lastRulesOk)}`);

  debugPanelEl.textContent = lines.join("\n");
}

const I18N = {
  en: {
    loginTitle: "1wlgame",
    labelLang: "Language",
    labelNick: "Nickname",
    labelRules: "Rules",
    nickPlaceholder: "Enter your nickname",
    enter: "Enter",
    best: "Best score",
    recent: "Recent results (max 5)",
    stats: "Stats",
    date: "Date",
    score: "Score",
    show: "Show",
    hide: "Hide",
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
    players: "Players",
    gameInfo: "Game Info",
    labelPing: "Ping",
    labelFps: "FPS",
    labelPlayersCount: "Players",
    labelPellets: "Pellets",
    labelYou: "You",
    hudRoom: "Room",
    hudRules: "Rules",
    inRoom: "in-room",
    connectError: "connect_error",
    hudShow: "Show HUD",
    hudHide: "Hide HUD",
    minimap: "Minimap",
    joining: "Joining…",
    loginWait: "Waiting for server…",
    connecting: "connecting…",
    connected: "connected",
    disconnected: "disconnected",
    notConnected: "not connected",
    needNick: "Please enter a nickname first.",
    gameOver: (score) => `Game Over. Score: ${score}`,
    gameOverEaten: (score, by) => `Eaten${by ? ` by ${by}` : ""}. Score: ${score}`,
    gameOverBorder: (score) => `Out of bounds. Score: ${score}`,
  },
  ru: {
    loginTitle: "1wlgame",
    labelLang: "Язык",
    labelNick: "Ник",
    labelRules: "Правила",
    nickPlaceholder: "Введите ник",
    enter: "Войти",
    best: "Лучший счёт",
    recent: "Последние результаты (до 5)",
    stats: "Статистика",
    date: "Дата",
    score: "Счёт",
    show: "Показать",
    hide: "Скрыть",
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
    players: "Игроки",
    gameInfo: "Информация",
    labelPing: "Пинг",
    labelFps: "FPS",
    labelPlayersCount: "Игроки",
    labelPellets: "Еда",
    labelYou: "Вы",
    hudRoom: "Комната",
    hudRules: "Правила",
    inRoom: "в комнате",
    connectError: "ошибка подключения",
    hudShow: "Показать HUD",
    hudHide: "Скрыть HUD",
    minimap: "Миникарта",
    joining: "Входим…",
    loginWait: "Ожидание сервера…",
    connecting: "подключение…",
    connected: "подключено",
    disconnected: "отключено",
    notConnected: "нет соединения",
    needNick: "Сначала введите ник.",
    gameOver: (score) => `Игра окончена. Счёт: ${score}`,
    gameOverEaten: (score, by) => `Съели${by ? `: ${by}` : ""}. Счёт: ${score}`,
    gameOverBorder: (score) => `Вышли за границу. Счёт: ${score}`,
  },
  fr: {
    loginTitle: "1wlgame",
    labelLang: "Langue",
    labelNick: "Pseudo",
    labelRules: "Règles",
    nickPlaceholder: "Entrez votre pseudo",
    enter: "Entrer",
    best: "Meilleur score",
    recent: "Résultats récents (max 5)",
    stats: "Stats",
    date: "Date",
    score: "Score",
    show: "Afficher",
    hide: "Masquer",
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
    players: "Joueurs",
    gameInfo: "Infos de jeu",
    labelPing: "Ping",
    labelFps: "FPS",
    labelPlayersCount: "Joueurs",
    labelPellets: "Granules",
    labelYou: "Vous",
    hudRoom: "Salle",
    hudRules: "Règles",
    inRoom: "en salle",
    connectError: "erreur de connexion",
    hudShow: "Afficher HUD",
    hudHide: "Masquer HUD",
    minimap: "Minicarte",
    joining: "Connexion…",
    loginWait: "En attente du serveur…",
    connecting: "connexion…",
    connected: "connecté",
    disconnected: "déconnecté",
    notConnected: "pas connecté",
    needNick: "Veuillez d'abord saisir un pseudo.",
    gameOver: (score) => `Partie terminée. Score : ${score}`,
    gameOverEaten: (score, by) => `Dévoré${by ? ` par ${by}` : ""}. Score : ${score}`,
    gameOverBorder: (score) => `Hors limites. Score : ${score}`,
  },
  zh: {
    loginTitle: "1wlgame",
    labelLang: "语言",
    labelNick: "昵称",
    labelRules: "规则",
    nickPlaceholder: "请输入昵称",
    enter: "进入",
    best: "最佳成绩",
    recent: "最近战绩（最多 5 条）",
    stats: "战绩",
    date: "日期",
    score: "分数",
    show: "显示",
    hide: "隐藏",
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
    players: "玩家",
    gameInfo: "游戏信息",
    labelPing: "延迟",
    labelFps: "FPS",
    labelPlayersCount: "玩家",
    labelPellets: "食物",
    labelYou: "你",
    hudRoom: "房间",
    hudRules: "规则",
    inRoom: "房间中",
    connectError: "连接错误",
    hudShow: "显示 HUD",
    hudHide: "隐藏 HUD",
    minimap: "小地图",
    joining: "正在进入…",
    loginWait: "等待服务器响应…",
    connecting: "连接中…",
    connected: "已连接",
    disconnected: "已断开",
    notConnected: "未连接",
    needNick: "请先输入昵称。",
    gameOver: (score) => `游戏结束，得分：${score}`,
    gameOverEaten: (score, by) => `被吞噬${by ? `（${by}）` : ""}，得分：${score}`,
    gameOverBorder: (score) => `越界死亡，得分：${score}`,
  },
  de: {
    loginTitle: "1wlgame",
    labelLang: "Sprache",
    labelNick: "Nickname",
    labelRules: "Regeln",
    nickPlaceholder: "Nickname eingeben",
    enter: "Start",
    best: "Bester Score",
    recent: "Letzte Ergebnisse (max. 5)",
    stats: "Statistik",
    date: "Datum",
    score: "Punkte",
    show: "Anzeigen",
    hide: "Ausblenden",
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
    players: "Spieler",
    gameInfo: "Spielinfo",
    labelPing: "Ping",
    labelFps: "FPS",
    labelPlayersCount: "Spieler",
    labelPellets: "Pellets",
    labelYou: "Du",
    hudRoom: "Raum",
    hudRules: "Regeln",
    inRoom: "im Raum",
    connectError: "Verbindungsfehler",
    hudShow: "HUD anzeigen",
    hudHide: "HUD ausblenden",
    minimap: "Minikarte",
    joining: "Beitreten…",
    loginWait: "Warte auf Server…",
    connecting: "verbinde…",
    connected: "verbunden",
    disconnected: "getrennt",
    notConnected: "nicht verbunden",
    needNick: "Bitte zuerst einen Nickname eingeben.",
    gameOver: (score) => `Game Over. Score: ${score}`,
    gameOverEaten: (score, by) => `Gefressen${by ? ` von ${by}` : ""}. Score: ${score}`,
    gameOverBorder: (score) => `Außerhalb der Grenzen. Score: ${score}`,
  },
  ar: {
    loginTitle: "1wlgame",
    labelLang: "اللغة",
    labelNick: "الاسم",
    labelRules: "القواعد",
    nickPlaceholder: "أدخل الاسم",
    enter: "دخول",
    best: "أفضل نتيجة",
    recent: "آخر النتائج (حد أقصى 5)",
    stats: "الإحصائيات",
    date: "التاريخ",
    score: "النتيجة",
    show: "إظهار",
    hide: "إخفاء",
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
    players: "اللاعبون",
    gameInfo: "معلومات اللعبة",
    labelPing: "بينغ",
    labelFps: "FPS",
    labelPlayersCount: "اللاعبون",
    labelPellets: "الحبيبات",
    labelYou: "أنت",
    hudRoom: "الغرفة",
    hudRules: "القواعد",
    inRoom: "في الغرفة",
    connectError: "خطأ اتصال",
    hudShow: "إظهار HUD",
    hudHide: "إخفاء HUD",
    minimap: "خريطة مصغّرة",
    joining: "جارٍ الدخول…",
    loginWait: "بانتظار الخادم…",
    connecting: "جارٍ الاتصال…",
    connected: "متصل",
    disconnected: "غير متصل",
    notConnected: "غير متصل",
    needNick: "الرجاء إدخال الاسم أولاً.",
    gameOver: (score) => `انتهت اللعبة. النتيجة: ${score}`,
    gameOverEaten: (score, by) => `تم افتراسك${by ? ` بواسطة ${by}` : ""}. النتيجة: ${score}`,
    gameOverBorder: (score) => `خارج الحدود. النتيجة: ${score}`,
  },
};

let token = storageGet(STORAGE_TOKEN);
let profile = loadProfile();
let lang = I18N[profile.lang] ? profile.lang : "en";
let nick = sanitizeNick(profile.nick);
let hudPanelHidden = Boolean(profile.hudPanelHidden);
let profileConfirmed = false;
let joinInFlight = false;
let joinRequested = false;
let socket = null;

function setHudPanelHidden(hidden) {
  const h = Boolean(hidden);
  hudPanelHidden = h;
  profile.hudPanelHidden = h;
  saveProfile();

  if (hudEl) hudEl.classList.toggle("hidden", h);
  if (btnHudToggle) {
    btnHudToggle.classList.remove("hidden");
    btnHudToggle.setAttribute("aria-pressed", h ? "true" : "false");
    btnHudToggle.textContent = h ? t("hudShow") : t("hudHide");
  }
}

if (btnHudToggle) {
  btnHudToggle.addEventListener("click", () => {
    // Only meaningful in-game; on login screen the button is hidden.
    setHudPanelHidden(!hudPanelHidden);
  });
}

// --- Runtime state (declare early to avoid TDZ when applyLang/applyConfig run) ---
let myId = null;
let currentRoomId = null;
let currentMode = null;
let currentRulesId = null;
let pendingRulesId = null;

// Player meta is broadcast separately to reduce state payload size.
// Keyed by numeric pid (compact id used in state payloads).
const playersMeta = new Map();
const playerPidById = new Map();
const playerIdByPid = new Map();
// Slim state uses numeric pid; keep an authoritative local state to apply deltas.
const playersStateByPid = new Map();
let world = { width: 2800, height: 1800 };
let lastSnapshot = { ts: 0, players: [], pellets: [] };
let prevSnapshot = null;

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
    touchMode: isTouchCapable ? "point" : "off", // joystick | point | off
    prefer: isTouchCapable ? "touch" : "mouse", // touch | mouse | keyboard
  },
  minimap: {
    enabled: true,
    position: "top-right", // top-left | top-right | bottom-left | bottom-right | custom
    anchor: "top-left", // used when position === 'custom'
    size: 160, // square size in px (number) OR set width/height
    width: null,
    height: null,
    margin: 12,
    x: 12, // used when position === 'custom' (from top-left)
    y: 12,
    opacity: 0.92,
  },
  bots: {
    enabled: false,
    count: 6,
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
    const raw = storageGet(STORAGE_CFG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalConfig(overrides) {
  try {
    storageSet(STORAGE_CFG, JSON.stringify(overrides || {}));
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
  lastDir: { ax: 0, ay: 0, valid: false },
  recordLastDir(ax, ay) {
    if (!ax && !ay) return;
    this.lastDir = { ax, ay, valid: true };
  },
  get() {
    const prefer = config?.controls?.prefer || "touch";

    const nonZero = (v) => Math.abs(v.ax) + Math.abs(v.ay) > 1e-4;

    const order =
      prefer === "mouse"
        ? ["mouse", "touch", "keyboard"]
        : prefer === "keyboard"
          ? ["keyboard", "touch", "mouse"]
          : ["touch", "mouse", "keyboard"];

    for (const k of order) {
      if (k === "touch" && this.useTouch && this.touch.active && nonZero(this.touch)) return this.touch;
      if (k === "mouse" && this.useMouse && this.mouse.active && nonZero(this.mouse)) return this.mouse;
      if (k === "keyboard" && this.useKeyboard && nonZero(this.keyboard)) return this.keyboard;
    }

    if (this.lastDir.valid) return { ax: this.lastDir.ax, ay: this.lastDir.ay, boost: false };
    return { ax: 0, ay: 0, boost: false };
  },
  setKeyboard(ax, ay, boost) {
    this.keyboard = { ax, ay, boost: Boolean(boost) };
    this.recordLastDir(ax, ay);
  },
  setMouse(ax, ay, boost, active) {
    this.mouse = { ax, ay, boost: Boolean(boost), active: Boolean(active) };
    if (this.mouse.active) this.recordLastDir(ax, ay);
  },
  setTouch(ax, ay, boost, active) {
    this.touch = { ax, ay, boost: Boolean(boost), active: Boolean(active) };
    if (this.touch.active) this.recordLastDir(ax, ay);
  },
  resetMouse() {
    this.setMouse(0, 0, false, false);
  },
  releaseMouse() {
    this.mouse = { ...this.mouse, active: false };
  },
  resetTouch() {
    this.setTouch(0, 0, false, false);
  },
  releaseTouch() {
    this.touch = { ...this.touch, active: false };
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
    storageGet(STORAGE_TOUCH_GUIDE) !== "1",
};

const pointControl = {
  enabled: isTouchCapable,
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
};

const mouseJoystick = {
  active: false,
  pending: false,
  timer: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  maxR: 70,
  deadzone: 10,
};

const MOUSE_JOYSTICK_LONGPRESS_MS = 220;
const MOUSE_JOYSTICK_CANCEL_MOVE_PX = 8;

function cancelMouseJoystickPending() {
  mouseJoystick.pending = false;
  if (mouseJoystick.timer) {
    clearTimeout(mouseJoystick.timer);
    mouseJoystick.timer = null;
  }
}

function stopMouseJoystick() {
  cancelMouseJoystickPending();
  mouseJoystick.active = false;
}

function startMouseJoystickLongPress(e) {
  cancelMouseJoystickPending();
  mouseJoystick.pending = true;
  mouseJoystick.startX = e.clientX;
  mouseJoystick.startY = e.clientY;
  mouseJoystick.x = e.clientX;
  mouseJoystick.y = e.clientY;

  mouseJoystick.timer = setTimeout(() => {
    mouseJoystick.timer = null;
    if (!mouseJoystick.pending) return;
    mouseJoystick.pending = false;
    mouseJoystick.active = true;
    // Take over input without forcing a new direction until the user drags.
    inputModel.setMouse(0, 0, false, true);
  }, MOUSE_JOYSTICK_LONGPRESS_MS);
}

function updateMouseJoystickFromEvent(e) {
  mouseJoystick.x = e.clientX;
  mouseJoystick.y = e.clientY;
  const dx = mouseJoystick.x - mouseJoystick.startX;
  const dy = mouseJoystick.y - mouseJoystick.startY;
  const v = normalizeStick(dx, dy, { deadzone: mouseJoystick.deadzone, maxR: mouseJoystick.maxR });
  const boost = e.shiftKey || (e.buttons & 2) !== 0;
  if (!v.ax && !v.ay) return inputModel.releaseMouse();
  return inputModel.setMouse(v.ax, v.ay, boost, true);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function minimapCfg() {
  const m = config?.minimap || {};
  const size = typeof m.size === "number" ? m.size : defaultConfig.minimap.size;
  const width = typeof m.width === "number" ? m.width : size;
  const height = typeof m.height === "number" ? m.height : size;
  return {
    enabled: m.enabled !== false,
    position: typeof m.position === "string" ? m.position : defaultConfig.minimap.position,
    anchor: typeof m.anchor === "string" ? m.anchor : defaultConfig.minimap.anchor,
    width: Math.max(60, Math.min(420, width)),
    height: Math.max(60, Math.min(420, height)),
    margin: typeof m.margin === "number" ? m.margin : defaultConfig.minimap.margin,
    x: typeof m.x === "number" ? m.x : defaultConfig.minimap.x,
    y: typeof m.y === "number" ? m.y : defaultConfig.minimap.y,
    opacity: typeof m.opacity === "number" ? m.opacity : defaultConfig.minimap.opacity,
  };
}

function minimapRect() {
  const m = minimapCfg();
  const w = m.width;
  const h = m.height;
  const margin = m.margin;
  const posRaw = (m.position || "top-right").toLowerCase();
  const pos =
    posRaw === "tl" || posRaw === "top-left" || posRaw === "left-top"
      ? "top-left"
      : posRaw === "tr" || posRaw === "top-right" || posRaw === "right-top"
        ? "top-right"
        : posRaw === "bl" || posRaw === "bottom-left" || posRaw === "left-bottom"
          ? "bottom-left"
          : posRaw === "br" || posRaw === "bottom-right" || posRaw === "right-bottom"
            ? "bottom-right"
            : "custom";

  let x = margin;
  let y = margin;
  if (pos === "top-right") x = window.innerWidth - margin - w;
  if (pos === "bottom-left") y = window.innerHeight - margin - h;
  if (pos === "bottom-right") {
    x = window.innerWidth - margin - w;
    y = window.innerHeight - margin - h;
  }
  if (pos === "custom") {
    const aRaw = (m.anchor || "top-left").toLowerCase();
    const anchor =
      aRaw === "tl" || aRaw === "top-left" || aRaw === "left-top"
        ? "top-left"
        : aRaw === "tr" || aRaw === "top-right" || aRaw === "right-top"
          ? "top-right"
          : aRaw === "bl" || aRaw === "bottom-left" || aRaw === "left-bottom"
            ? "bottom-left"
            : aRaw === "br" || aRaw === "bottom-right" || aRaw === "right-bottom"
              ? "bottom-right"
              : "top-left";

    const ox = m.x;
    const oy = m.y;
    if (anchor === "top-left") {
      x = ox;
      y = oy;
    } else if (anchor === "top-right") {
      x = window.innerWidth - w - ox;
      y = oy;
    } else if (anchor === "bottom-left") {
      x = ox;
      y = window.innerHeight - h - oy;
    } else {
      x = window.innerWidth - w - ox;
      y = window.innerHeight - h - oy;
    }
  }

  // Clamp to screen
  x = clamp(x, 0, Math.max(0, window.innerWidth - w));
  y = clamp(y, 0, Math.max(0, window.innerHeight - h));
  return { x, y, w, h, opacity: m.opacity };
}

function drawMinimap(snap, camX, camY) {
  const m = minimapCfg();
  if (!m.enabled) return;
  // Do not render minimap on the login screen.
  if (!loginEl.classList.contains("hidden")) return;
  if (!snap) return;

  const rect = minimapRect();
  const pad = 6;
  const innerX = rect.x + pad;
  const innerY = rect.y + pad;
  const innerW = rect.w - pad * 2;
  const innerH = rect.h - pad * 2;
  if (innerW <= 0 || innerH <= 0) return;

  ctx.save();
  ctx.globalAlpha = clamp(rect.opacity, 0.2, 1);

  // Panel
  const r = 10;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h, r);
  ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h, r);
  ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y, r);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.w, rect.y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // World bounds (scaled to fit inner rect)
  const sx = innerW / (world.width || 1);
  const sy = innerH / (world.height || 1);

  const mapX = (wx) => innerX + wx * sx;
  const mapY = (wy) => innerY + wy * sy;

  ctx.globalAlpha = clamp(rect.opacity, 0.2, 1);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // Pellets (light)
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (const pel of snap.pellets || []) {
    const px = mapX(pel.x);
    const py = mapY(pel.y);
    // 1px dot
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  // Players
  for (const p of snap.players || []) {
    const px = mapX(p.x);
    const py = mapY(p.y);
    const isMe = p.id === myId;
    ctx.fillStyle = isMe ? "rgba(255,255,255,0.95)" : p.color || "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(px, py, isMe ? 2.6 : 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Viewport rectangle (camera)
  const vx0 = clamp(camX, 0, world.width);
  const vy0 = clamp(camY, 0, world.height);
  const vx1 = clamp(camX + window.innerWidth, 0, world.width);
  const vy1 = clamp(camY + window.innerHeight, 0, world.height);
  const rx = mapX(vx0);
  const ry = mapY(vy0);
  const rw = (vx1 - vx0) * sx;
  const rh = (vy1 - vy0) * sy;
  ctx.strokeStyle = "rgba(79,195,247,0.70)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx, ry, rw, rh);

  ctx.restore();
}

function normalizeStick(dx, dy, opts) {
  const deadzone = typeof opts?.deadzone === "number" ? opts.deadzone : joystick.deadzone;
  const maxR = typeof opts?.maxR === "number" ? opts.maxR : joystick.maxR;
  const len = Math.hypot(dx, dy);
  if (len < deadzone) return { ax: 0, ay: 0 };
  const capped = Math.min(maxR, len);
  const nx = dx / (len || 1);
  const ny = dy / (len || 1);
  const mag = capped / maxR;
  return { ax: nx * mag, ay: ny * mag };
}

function touchBoostFromEvent(e) {
  // PointerEvent doesn't expose touches; use navigator maxTouchPoints + active pointers heuristic.
  // We treat "two fingers down" as boost by tracking active pointer count.
  return activePointers.size === 2;
}

function setTouchGuideSeen() {
  if (!joystick.showGuide) return;
  joystick.showGuide = false;
  storageSet(STORAGE_TOUCH_GUIDE, "1");
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
    storageGet(STORAGE_TOUCH_GUIDE) !== "1";

  applyLang();

  // If we're already in a room, sync bots config to server.
  syncBotsConfigToServer(false);

  // If we're already in a room, sync rules tuning to server.
  syncRulesConfigToServer(false);
}

function botsCfg() {
  const b = config?.bots || {};
  const enabled = Boolean(b.enabled);
  const count = Number.isFinite(b.count) ? Math.max(0, Math.min(30, Math.floor(b.count))) : defaultConfig.bots.count;
  return { enabled, count };
}

function safeJsonClone(v) {
  try {
    return v == null ? null : JSON.parse(JSON.stringify(v));
  } catch {
    return null;
  }
}

function rulesCfgFor(rulesId) {
  const rid = normalizeRulesId(rulesId);
  if (!rid) return null;
  const entry = config?.rules?.[rid];
  if (!entry || typeof entry !== "object") return null;
  return safeJsonClone(entry);
}

let lastBotsSent = { enabled: null, count: null, roomId: null };
let lastBotsSentAt = 0;
function syncBotsConfigToServer(force) {
  if (!socket?.connected) return;
  if (currentMode !== "play") return;
  if (!currentRoomId) return;

  const b = botsCfg();
  const now = Date.now();
  if (!force) {
    if (lastBotsSent.roomId === currentRoomId && lastBotsSent.enabled === b.enabled && lastBotsSent.count === b.count) return;
    if (now - lastBotsSentAt < 350) return;
  }

  lastBotsSent = { enabled: b.enabled, count: b.count, roomId: currentRoomId };
  lastBotsSentAt = now;
  socket.emit("bots:set", { enabled: b.enabled, count: b.count });
}

let lastRulesSent = { roomId: null, rulesId: null, json: null };
let lastRulesSentAt = 0;
function syncRulesConfigToServer(force) {
  if (!socket?.connected) return;
  if (currentMode !== "play") return;
  if (!currentRoomId) return;
  if (!currentRulesId) return;

  const rc = rulesCfgFor(currentRulesId);
  if (!rc) return;
  const json = JSON.stringify(rc);

  const now = Date.now();
  if (!force) {
    if (lastRulesSent.roomId === currentRoomId && lastRulesSent.rulesId === currentRulesId && lastRulesSent.json === json) return;
    if (now - lastRulesSentAt < 350) return;
  }

  lastRulesSent = { roomId: currentRoomId, rulesId: currentRulesId, json };
  lastRulesSentAt = now;
  socket.emit("rules:setConfig", { rulesId: currentRulesId, rulesConfig: rc });
}

function t(key) {
  const dict = I18N[lang] || I18N.en;
  return dict[key] ?? I18N.en[key] ?? key;
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  if (loginTitleEl) loginTitleEl.textContent = t("loginTitle");
  if (labelLangEl) labelLangEl.textContent = t("labelLang");
  if (labelNickEl) labelNickEl.textContent = t("labelNick");
  if (labelRulesEl) labelRulesEl.textContent = t("labelRules");
  if (nickInput) nickInput.placeholder = t("nickPlaceholder");
  if (btnLogin) btnLogin.textContent = t("enter");


  if (hudTitleEl) hudTitleEl.textContent = t("hudTitle");
  if (btnLeave) btnLeave.textContent = t("leave");
  // Hint depends on current input scheme
  if (hintEl) {
    if (joystick.enabled) hintEl.textContent = t("hintTouch");
    else if (pointControl.enabled) hintEl.textContent = t("hintTouchPoint");
    else if (inputModel.useMouse) hintEl.textContent = t("hintMouse") || t("hint");
    else hintEl.textContent = t("hint");
  }
  if (lbTitleEl) lbTitleEl.textContent = t("leaderboard");
  if (playersTitleEl) playersTitleEl.textContent = t("players");

  if (lbColNameEl) lbColNameEl.textContent = t("labelNick");
  if (lbColScoreEl) lbColScoreEl.textContent = t("score");
  if (playersColNameEl) playersColNameEl.textContent = t("labelNick");
  if (playersColScoreEl) playersColScoreEl.textContent = t("score");

  if (infoTitleEl) infoTitleEl.textContent = t("gameInfo");
  if (infoLabelPingEl) infoLabelPingEl.textContent = t("labelPing");
  if (infoLabelFpsEl) infoLabelFpsEl.textContent = t("labelFps");
  if (infoLabelPlayersEl) infoLabelPlayersEl.textContent = t("labelPlayersCount");
  if (infoLabelPelletsEl) infoLabelPelletsEl.textContent = t("labelPellets");
  if (infoLabelYouEl) infoLabelYouEl.textContent = t("labelYou");

  if (btnLbToggle) {
    const collapsed = lbBoardEl?.classList?.contains("collapsed");
    btnLbToggle.textContent = collapsed ? t("show") : t("hide");
  }
  if (btnPlayersToggle) {
    const collapsed = playersBoardEl?.classList?.contains("collapsed");
    btnPlayersToggle.textContent = collapsed ? t("show") : t("hide");
  }

  if (btnInfoToggle) {
    const collapsed = infoBoardEl?.classList?.contains("collapsed");
    btnInfoToggle.textContent = collapsed ? t("show") : t("hide");
  }

  if (btnHudToggle) {
    btnHudToggle.textContent = hudPanelHidden ? t("hudShow") : t("hudHide");
  }

  if (minimapTitleEl) minimapTitleEl.textContent = t("minimap");
  if (btnMinimapToggle) {
    const enabled = minimapCfg().enabled;
    btnMinimapToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    btnMinimapToggle.textContent = enabled ? t("hide") : t("show");
  }

  if (statsTitleEl) statsTitleEl.textContent = t("stats");
  if (bestTitleEl) bestTitleEl.textContent = t("best");
  if (colDateEl) colDateEl.textContent = t("date");
  if (colScoreEl) colScoreEl.textContent = t("score");
  if (recentColDateEl) recentColDateEl.textContent = t("date");
  if (recentColScoreEl) recentColScoreEl.textContent = t("score");
  if (btnStatsToggle) {
    const collapsed = statsBodyEl?.classList?.contains("collapsed");
    btnStatsToggle.textContent = collapsed ? t("show") : t("hide");
  }

  if (recentTitleEl) recentTitleEl.textContent = t("recent");
  renderRoomLabel();
  renderStats();
  renderPlayersList(true);
}

if (btnMinimapToggle) {
  btnMinimapToggle.addEventListener("click", () => {
    const enabled = minimapCfg().enabled;
    applyConfig({ minimap: { enabled: !enabled } }, { persist: true });
  });
}

function setInfoCollapsed(collapsed) {
  if (!infoBoardEl || !btnInfoToggle) return;
  const c = Boolean(collapsed);
  infoBoardEl.classList.toggle("collapsed", c);
  btnInfoToggle.setAttribute("aria-pressed", c ? "true" : "false");
  btnInfoToggle.textContent = c ? t("show") : t("hide");
}

if (btnInfoToggle) {
  btnInfoToggle.addEventListener("click", () => {
    const collapsed = infoBoardEl?.classList?.contains("collapsed");
    setInfoCollapsed(!collapsed);
  });
}

function setLeaderboardCollapsed(collapsed) {
  if (!lbBoardEl || !btnLbToggle) return;
  const c = Boolean(collapsed);
  lbBoardEl.classList.toggle("collapsed", c);
  btnLbToggle.setAttribute("aria-pressed", c ? "true" : "false");
  btnLbToggle.textContent = c ? t("show") : t("hide");
}

if (btnLbToggle) {
  btnLbToggle.addEventListener("click", () => {
    const collapsed = lbBoardEl?.classList?.contains("collapsed");
    setLeaderboardCollapsed(!collapsed);
  });
}

function setStatsCollapsed(collapsed) {
  if (!statsBodyEl || !btnStatsToggle) return;
  const c = Boolean(collapsed);
  statsBodyEl.classList.toggle("collapsed", c);
  btnStatsToggle.setAttribute("aria-pressed", c ? "true" : "false");
  btnStatsToggle.textContent = c ? t("show") : t("hide");
}

if (btnStatsToggle) {
  btnStatsToggle.addEventListener("click", () => {
    const collapsed = statsBodyEl?.classList?.contains("collapsed");
    setStatsCollapsed(!collapsed);
  });
}

function setPlayersCollapsed(collapsed) {
  if (!playersBoardEl || !btnPlayersToggle) return;
  const c = Boolean(collapsed);
  playersBoardEl.classList.toggle("collapsed", c);
  btnPlayersToggle.setAttribute("aria-pressed", c ? "true" : "false");
  btnPlayersToggle.textContent = c ? t("show") : t("hide");
}

if (btnPlayersToggle) {
  btnPlayersToggle.addEventListener("click", () => {
    const collapsed = playersBoardEl?.classList?.contains("collapsed");
    setPlayersCollapsed(!collapsed);
  });
}

let lastPlayersRenderAt = 0;
function renderPlayersList(force) {
  if (!playersEl || !playersTitleEl) return;
  const now = Date.now();
  if (!force && now - lastPlayersRenderAt < 120) return;
  lastPlayersRenderAt = now;

  const list = Array.isArray(lastSnapshot?.players) ? lastSnapshot.players.slice() : [];
  list.sort((a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0));

  const baseTitle = t("players");
  playersTitleEl.textContent = `${baseTitle} (${list.length})`;

  playersEl.innerHTML = "";
  for (const p of list) {
    const li = document.createElement("li");
    const name = typeof p?.name === "string" && p.name.trim() ? p.name.trim() : String(p?.id || "").slice(0, 6);
    const score = Number.isFinite(p?.score) ? p.score : 0;
    const botTag = p?.isBot ? " [bot]" : "";
    const left = document.createElement("span");
    left.textContent = `${name}${botTag}`;
    const right = document.createElement("span");
    right.textContent = `score=${score}`;
    li.appendChild(left);
    li.appendChild(right);
    if (p?.id && myId && p.id === myId) li.classList.add("me");
    playersEl.appendChild(li);
  }
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

function getUrlConfigOverrides() {
  try {
    const q = new URLSearchParams(window.location.search || "");
    const botsRaw = q.get("bots");
    const botCountRaw = q.get("botCount") ?? q.get("botsCount") ?? q.get("bots_count");

    const out = {};

    if (botsRaw != null) {
      const v = String(botsRaw).toLowerCase();
      const enabled = v === "1" || v === "true" || v === "yes" || v === "on";
      out.bots = { ...(out.bots || {}), enabled };
    }

    if (botCountRaw != null) {
      const n = Number(botCountRaw);
      if (Number.isFinite(n)) {
        out.bots = { ...(out.bots || {}), count: Math.max(0, Math.min(30, Math.floor(n))) };
      }
    }

    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

// Apply defaults + local overrides immediately
applyConfig(null, { persist: false });

// Optional URL overrides for quick testing, e.g. /?bots=1&botCount=6
const urlOverrides = getUrlConfigOverrides();

// Load config.json (optional)
fetch("/config.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : null))
  .then((cfg) => {
    if (cfg) applyConfig(cfg, { persist: false });
  })
  .catch(() => {
    // ignore
  })
  .finally(() => {
    if (urlOverrides) applyConfig(urlOverrides, { persist: false });
  });

function renderStats() {
  const items = (profile.history || []).slice(0, 5);

  // Derive bestAt if missing (older profiles).
  let bestScore = Math.max(0, profile.bestScore | 0);
  let bestAt = Number.isFinite(profile.bestAt) ? profile.bestAt : 0;
  if (!bestAt && items.length) {
    const bestItem = items.slice().sort((a, b) => (b?.score || 0) - (a?.score || 0))[0];
    if (bestItem && (bestItem.score | 0) === (bestScore | 0)) bestAt = bestItem.ts || 0;
  }

  // Best row
  if (bestLineEl) {
    const dateText = bestAt ? new Date(bestAt).toLocaleString(lang) : "-";
    bestLineEl.innerHTML = "";
    const left = document.createElement("span");
    left.className = bestAt ? "" : "muted";
    left.textContent = dateText;
    const right = document.createElement("span");
    right.textContent = String(bestScore);
    bestLineEl.appendChild(left);
    bestLineEl.appendChild(right);
  }

  // Recent list
  if (!historyEl) return;
  historyEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.innerHTML = "<span class=\"muted\">-</span><span class=\"muted\">-</span>";
    historyEl.appendChild(li);
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    const date = new Date(it.ts || Date.now());
    const when = date.toLocaleString(lang);
    const l = document.createElement("span");
    l.textContent = when;
    const r = document.createElement("span");
    r.textContent = String(it.score | 0);
    li.appendChild(l);
    li.appendChild(r);
    historyEl.appendChild(li);
  }
}

function recordResult(score) {
  const s = Math.max(0, Number(score) | 0);
  const prevBest = profile.bestScore | 0;
  profile.bestScore = Math.max(prevBest, s);
  if (s > prevBest) profile.bestAt = Date.now();
  const entry = { ts: Date.now(), score: s };
  profile.history = [entry, ...(profile.history || [])].slice(0, 5);
  saveProfile();
  renderStats();
}

function showLogin(message = "") {
  loginEl.classList.remove("hidden");
  hudEl.classList.add("hidden");
  if (btnHudToggle) btnHudToggle.classList.add("hidden");
  setLoginMessage(message || "");
  btnLogin.disabled = false;
  nickInput.disabled = false;
  btnLeave.disabled = true;
  setRulesDisabled(false);
  joinInFlight = false;
  joinRequested = false;
}

function showGame() {
  loginEl.classList.add("hidden");
  // Show the floating toggle, then apply saved HUD visibility.
  if (btnHudToggle) btnHudToggle.classList.remove("hidden");
  setHudPanelHidden(Boolean(profile.hudPanelHidden));
}

function setRulesDisabled(disabled) {
  if (!rulesSel) return;
  // Never disable rules selection on the login screen.
  // This avoids Android Chrome oddities where the control can get stuck disabled when opened via URL params.
  const inGame = loginEl?.classList?.contains("hidden");
  rulesSel.disabled = Boolean(disabled) && Boolean(inGame);
  updateCustomDropdown("rules");
}

function getRulesIdFromUrl() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const v = qs.get("rules") || qs.get("rulesId") || "";
    const id = normalizeRulesId(v);
    if (id) return id;
  } catch {
    // ignore
  }
  return null;
}

function getRulesIdFromUrlRaw() {
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get("rules") || qs.get("rulesId") || null;
  } catch {
    return null;
  }
}

function getRulesIdSelected() {
  const fromSel = normalizeRulesId(rulesSel?.value);
  if (fromSel) return fromSel;
  const fromUrl = getRulesIdFromUrl();
  if (fromUrl) return fromUrl;
  const fromStore = normalizeRulesId(storageGet(STORAGE_RULES));
  if (fromStore) return fromStore;
  return "agar-lite";
}

function setRulesSelection(rulesId, { persist = true, updateUrl = true } = {}) {
  const normalized = normalizeRulesId(rulesId) || "agar-lite";
  if (rulesSel) rulesSel.value = normalized;
  updateCustomDropdown("rules");
  if (persist) storageSet(STORAGE_RULES, normalized);
  if (updateUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("rules", normalized);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }
}

function applyRulesOptions(rules) {
  if (!rulesSel) return;
  if (!Array.isArray(rules) || !rules.length) return;

  const keep = getRulesIdSelected();
  const opts = rules
    .map((r) => ({ id: normalizeRulesId(r?.id), label: typeof r?.label === "string" ? r.label : String(r?.id ?? "") }))
    .filter((r) => r.id);

  if (!opts.length) return;

  rulesSel.innerHTML = "";
  for (const r of opts) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.label || r.id;
    rulesSel.appendChild(opt);
  }
  // Restore selection after replacing options
  setRulesSelection(keep, { persist: true, updateUrl: true });
  rebuildCustomDropdown("rules");
}

async function hydrateRulesOptionsFromServer() {
  if (!rulesSel) return;
  try {
    const r = await fetch("/rules", { cache: "no-store" });
    const j = r.ok ? await r.json() : null;
    if (j?.rules) {
      serverRulesCatalog = j.rules;
      serverRulesCatalogAt = Date.now();
      applyRulesOptions(j.rules);
      renderDebugPanel(true);
    }
  } catch {
    // ignore
  }
}

// Initialize rules selector from URL/storage and keep it shareable.
if (rulesSel) {
  const fromUrlRaw = getRulesIdFromUrlRaw();
  const fromUrl = normalizeRulesId(fromUrlRaw);
  const fromStore = storageGet(STORAGE_RULES);
  setRulesSelection(fromUrl || fromStore || "agar-lite", { persist: true, updateUrl: Boolean(fromUrl) });
  if (!fromUrl) setRulesSelection(rulesSel.value, { persist: true, updateUrl: true });
  rulesSel.addEventListener("change", () => {
    const inGame = loginEl?.classList?.contains("hidden");
    if (inGame && (currentRoomId || joinInFlight)) return;
    setRulesSelection(rulesSel.value, { persist: true, updateUrl: true });
  });

  // Populate options from server registry
  hydrateRulesOptionsFromServer();
}

function tryJoinRequested() {
  if (!joinRequested) return;
  if (!socket?.connected) return;
  if (!nick) return;
  if (!profileConfirmed) return;
  if (currentRoomId) return;
  if (joinInFlight) return;

  joinRequested = false;
  joinInFlight = true;
  pendingRulesId = pendingRulesId || getRulesIdSelected();
  setRulesDisabled(true);
  socket.emit("mm:join", { mode: "play", rulesId: pendingRulesId, rulesConfig: rulesCfgFor(pendingRulesId) });
}

langSel.value = lang;
updateCustomDropdown("lang");
langSel.addEventListener("change", () => {
  const next = langSel.value;
  lang = I18N[next] ? next : "en";
  profile.lang = lang;
  saveProfile();
  applyLang();
});

nickInput.value = nick;
btnLogin.addEventListener("click", () => {
  if (!socket?.connected) {
    showLogin(t("notConnected"));
    return;
  }
  const v = sanitizeNick(nickInput.value);
  if (!v) {
    showLogin(t("needNick"));
    nickInput.focus();
    return;
  }
  nick = v;
  profile.nick = nick;
  saveProfile();
  meEl.textContent = `${t("labelNick")}: ${nick}`;
  profileConfirmed = false;
  joinInFlight = false;
  joinRequested = true;
  pendingRulesId = getRulesIdSelected();
  setLoginMessage(t("joining"));
  btnLogin.disabled = true;
  nickInput.disabled = true;
  socket.emit("profile:set", { nick });

  // Join will happen when the server confirms the nick (profile:ok/auth).
  // Keep the login overlay visible until we actually join a room.
  tryJoinRequested();

  // If the server doesn't confirm quickly, show a useful hint instead of "nothing".
  setTimeout(() => {
    if (loginEl?.classList?.contains("hidden")) return;
    if (profileConfirmed || currentRoomId || joinInFlight) return;
    if (btnLogin.disabled) setLoginMessage(t("loginWait"));
  }, 1200);
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

socket = io(backendUrl, {
  transports: ["polling", "websocket"],
  auth: { token },
});

function renderRoomLabel() {
  if (!currentRoomId) {
    roomEl.textContent = "";
    if (hudRulesEl) hudRulesEl.textContent = "";
    return;
  }
  roomEl.textContent = `${t("hudRoom")}: ${currentRoomId}`;
  if (hudRulesEl) hudRulesEl.textContent = `${t("hudRules")}: ${currentRulesId ?? "-"}`;
}

function updateGameInfoFromSnapshot(snap) {
  if (!snap) return;
  if (hudPlayersCountEl) hudPlayersCountEl.textContent = String(Array.isArray(snap.players) ? snap.players.length : 0);
  if (hudPelletsCountEl) hudPelletsCountEl.textContent = String(Array.isArray(snap.pellets) ? snap.pellets.length : 0);

  if (hudYouScoreEl) {
    let myScore = 0;
    if (Array.isArray(snap.players) && myId) {
      const me = snap.players.find((p) => p?.id === myId);
      myScore = Number.isFinite(me?.score) ? me.score : 0;
    }
    hudYouScoreEl.textContent = String(myScore);
  }
}

let pingMs = null;
function setPingText(ms) {
  if (!hudPingEl) return;
  if (!Number.isFinite(ms)) {
    hudPingEl.textContent = "-";
    return;
  }
  hudPingEl.textContent = `${Math.max(0, Math.round(ms))}ms`;
}

const keys = new Set();
window.addEventListener("keydown", (e) => {
  const k = typeof e?.key === "string" ? e.key : "";
  if (!k) return;
  keys.add(k.toLowerCase());
});
window.addEventListener("keyup", (e) => {
  const k = typeof e?.key === "string" ? e.key : "";
  if (!k) return;
  keys.delete(k.toLowerCase());
});

const activePointers = new Set();

let touchJoystickGestureActive = false;

function getCanvasCenterClient() {
  const r = canvas.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

function clientPointInCanvas(x, y) {
  const r = canvas.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// Unified pointer-based touch joystick
canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (!inputModel.useTouch) return;
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    activePointers.add(e.pointerId);

    // 3-finger gesture: activate on-screen joystick.
    if (activePointers.size >= 3 && !touchJoystickGestureActive) {
      touchJoystickGestureActive = true;
      joystick.active = true;
      joystick.pointerId = e.pointerId;
      joystick.startX = e.clientX;
      joystick.startY = e.clientY;
      joystick.x = e.clientX;
      joystick.y = e.clientY;
      // Take over input without forcing a new direction until the user drags.
      inputModel.setTouch(0, 0, touchBoostFromEvent(e), true);
      return;
    }

    // While gesture joystick is active, ignore point-steering starts.
    if (touchJoystickGestureActive) {
      const boost = touchBoostFromEvent(e);
      const cur = inputModel.touch;
      if (cur.active) inputModel.setTouch(cur.ax, cur.ay, boost, true);
      return;
    }

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

    if (touchJoystickGestureActive) {
      if (!joystick.active) return;
      if (e.pointerId !== joystick.pointerId) return;
      joystick.x = e.clientX;
      joystick.y = e.clientY;
      const dx = joystick.x - joystick.startX;
      const dy = joystick.y - joystick.startY;
      const v = normalizeStick(dx, dy);
      if (!v.ax && !v.ay) return inputModel.releaseTouch();
      inputModel.setTouch(v.ax, v.ay, touchBoostFromEvent(e), true);
      return;
    }

    if (pointControl.enabled) {
      if (!pointControl.active) return;
      if (e.pointerId !== pointControl.pointerId) return;
      pointControl.x = e.clientX;
      pointControl.y = e.clientY;
      const { cx, cy } = getCanvasCenterClient();
      const dx = pointControl.x - cx;
      const dy = pointControl.y - cy;
      const v = normalizeStick(dx, dy);
      if (!v.ax && !v.ay) return inputModel.releaseTouch();
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
    if (!v.ax && !v.ay) return inputModel.releaseTouch();
    inputModel.setTouch(v.ax, v.ay, touchBoostFromEvent(e), true);
  },
  { passive: true }
);

function endPointer(e) {
  if (!inputModel.useTouch) return;
  activePointers.delete(e.pointerId);

  if (touchJoystickGestureActive) {
    // End gesture joystick when we drop below 3 fingers, or if the controlling finger lifts.
    if (activePointers.size < 3 || e.pointerId === joystick.pointerId) {
      touchJoystickGestureActive = false;
      joystick.active = false;
      joystick.pointerId = null;
      pointControl.active = false;
      pointControl.pointerId = null;
      inputModel.releaseTouch();
    } else {
      const boost = touchBoostFromEvent(e);
      const tcur = inputModel.touch;
      if (tcur.active) inputModel.setTouch(tcur.ax, tcur.ay, boost, true);
    }
    return;
  }

  if (pointControl.enabled) {
    if (pointControl.active && e.pointerId === pointControl.pointerId) {
      pointControl.active = false;
      pointControl.pointerId = null;
      inputModel.releaseTouch();
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
    inputModel.releaseTouch();
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
  "dblclick",
  (e) => {
    if (!inputModel.useMouse) return;
    // Double click: quick set direction, then coast.
    stopMouseJoystick();
    const v = mouseVecFromEvent(e);
    inputModel.setMouse(v.ax, v.ay, false, true);
    inputModel.releaseMouse();
  },
  { passive: true }
);

canvas.addEventListener(
  "mouseleave",
  () => {
    stopMouseJoystick();
    inputModel.releaseMouse();
  },
  { passive: true }
);

canvas.addEventListener(
  "mousedown",
  (e) => {
    if (!inputModel.useMouse) return;
    if (e.button !== 0 && e.button !== 2) return;

    // Right mouse: keep existing behavior (boost / steer).
    if (e.button === 2) {
      updateMouseFromEvent(e);
      return;
    }

    // Left mouse: long-press to show joystick unless this is a double-click.
    if (e.detail >= 2) {
      cancelMouseJoystickPending();
      return;
    }

    startMouseJoystickLongPress(e);
  },
  { passive: true }
);

window.addEventListener(
  "mousemove",
  (e) => {
    if (!inputModel.useMouse) return;

    // Mouse joystick (long-press) takes priority.
    if (mouseJoystick.pending && !mouseJoystick.active) {
      const dx = e.clientX - mouseJoystick.startX;
      const dy = e.clientY - mouseJoystick.startY;
      if (Math.hypot(dx, dy) >= MOUSE_JOYSTICK_CANCEL_MOVE_PX) cancelMouseJoystickPending();
    }
    if (mouseJoystick.active) {
      updateMouseJoystickFromEvent(e);
      return;
    }

    // In point mode we always steer while cursor is over the canvas.
    if (mouseMode() === "point") {
      // While waiting for long-press joystick, don't steer.
      if (mouseJoystick.pending) return;
      if (!clientPointInCanvas(e.clientX, e.clientY)) {
        if (inputModel.mouse.active) inputModel.releaseMouse();
        return;
      }
      // Only steer while a mouse button is held; otherwise keep last direction.
      if ((e.buttons & 1) === 0 && (e.buttons & 2) === 0) return;
      return updateMouseFromEvent(e);
    }
    // In hold mode, only steer while mouse buttons are held.
    if (!inputModel.mouse.active) return;
    updateMouseFromEvent(e);
  },
  { passive: true }
);

window.addEventListener(
  "blur",
  () => {
    if (!inputModel.useMouse) return;
    stopMouseJoystick();
    inputModel.releaseMouse();
  },
  { passive: true }
);

window.addEventListener(
  "mouseleave",
  () => {
    if (!inputModel.useMouse) return;
    stopMouseJoystick();
    inputModel.releaseMouse();
  },
  { passive: true }
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (!inputModel.useMouse) return;
    if (document.hidden) {
      stopMouseJoystick();
      inputModel.releaseMouse();
    }
  },
  { passive: true }
);

window.addEventListener(
  "mouseup",
  (e) => {
    if (!inputModel.useMouse) return;

    // End mouse joystick / long-press tracking.
    if (e.button === 0) {
      if (mouseJoystick.active) {
        stopMouseJoystick();
        inputModel.releaseMouse();
        return;
      }
      cancelMouseJoystickPending();
      // In point mode, release on left mouseup to coast.
      if (mouseMode() === "point") inputModel.releaseMouse();
    }

    if (mouseMode() === "hold") {
      if (e.button === 0 || e.button === 2) inputModel.resetMouse();
      return;
    }
    // point mode: do not overwrite direction on mouseup (prevents snap to a fixed direction)
    return;
  },
  { passive: true }
);

socket.on("connect", () => {
  statusEl.textContent = `${t("connected")} (${backendUrl})`;
  if (!loginEl.classList.contains("hidden") && !profileConfirmed) {
    setLoginMessage("");
  }
});

socket.on("disconnect", () => {
  statusEl.textContent = t("disconnected");
  joinInFlight = false;
  currentRoomId = null;
  currentMode = null;
  currentRulesId = null;
  pendingRulesId = null;
  renderRoomLabel();
  btnLeave.disabled = true;
  setRulesDisabled(false);
  if (playersEl) playersEl.innerHTML = "";
  if (playersTitleEl) playersTitleEl.textContent = t("players");
  if (!loginEl.classList.contains("hidden")) {
    btnLogin.disabled = false;
    nickInput.disabled = false;
  }
  pingMs = null;
  setPingText(pingMs);
});

socket.on("connect_error", (err) => {
  const msg = err?.message || String(err);
  statusEl.textContent = `${t("connectError")} (${backendUrl}): ${msg}`;
  console.error("[socket] connect_error", err);
  joinInFlight = false;
  currentRoomId = null;
  currentMode = null;
  currentRulesId = null;
  pendingRulesId = null;
  renderRoomLabel();
  btnLeave.disabled = true;
  setRulesDisabled(false);
  if (playersEl) playersEl.innerHTML = "";
  if (playersTitleEl) playersTitleEl.textContent = t("players");

  // If user is on login screen, show the error there too.
  if (!loginEl.classList.contains("hidden")) {
    btnLogin.disabled = false;
    nickInput.disabled = false;
    setLoginMessage(`${t("connectError")}: ${msg}`);
  }
});

socket.on("auth", (payload) => {
  if (payload?.token && payload.token !== token) {
    token = payload.token;
    storageSet(STORAGE_TOKEN, token);
  }
  if (payload?.nick && !nick) {
    nick = sanitizeNick(payload.nick);
    profile.nick = nick;
    saveProfile();
  }
  if (payload?.nick) {
    profileConfirmed = true;
    tryJoinRequested();
  }
  if (payload?.playerId) {
    myId = payload.playerId;
  }
  if (nick) meEl.textContent = `${t("labelNick")}: ${nick}`;
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
    meEl.textContent = `${t("labelNick")}: ${nick}`;
    profileConfirmed = true;
    tryJoinRequested();
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

  const reason = String(payload.reason || "dead");
  const by = typeof payload.byName === "string" && payload.byName.trim() ? payload.byName.trim() : payload.by;

  const gameOverMsg = (() => {
    if (reason === "eaten") {
      return I18N[lang]?.gameOverEaten ? I18N[lang].gameOverEaten(score, by) : I18N.en.gameOverEaten(score, by);
    }
    if (reason === "border") {
      return I18N[lang]?.gameOverBorder ? I18N[lang].gameOverBorder(score) : I18N.en.gameOverBorder(score);
    }
    return I18N[lang]?.gameOver ? I18N[lang].gameOver(score) : I18N.en.gameOver(score);
  })();

  // reset in-room UI
  currentRoomId = null;
  currentMode = null;
  currentRulesId = null;
  pendingRulesId = null;
  renderRoomLabel();
  lbEl.innerHTML = "";
  if (playersEl) playersEl.innerHTML = "";
  if (playersTitleEl) playersTitleEl.textContent = t("players");
  btnLeave.disabled = true;
  setRulesDisabled(false);

  // go back to login page
  profileConfirmed = false;
  joinInFlight = false;
  showLogin(gameOverMsg);
});

socket.on("room:joined", ({ room, mode }) => {
  showGame();
  joinInFlight = false;
  currentRoomId = room?.id ?? null;
  currentMode = mode;
  currentRulesId = room?.rulesId || pendingRulesId || currentRulesId;
  pendingRulesId = null;
  renderRoomLabel();
  btnLeave.disabled = !currentRoomId;
  statusEl.textContent = t("inRoom");
  setRulesDisabled(true);

  // Apply bots config to this room (dynamic)
  syncBotsConfigToServer(true);

  // Apply rules tuning to this room (dynamic)
  syncRulesConfigToServer(true);
});

socket.on("rules:ok", (payload) => {
  lastRulesOkAt = Date.now();
  lastRulesOk = payload ?? null;
  renderDebugPanel(true);
  // eslint-disable-next-line no-console
  console.log("[rules:ok]", payload);
});

socket.on("bots:ok", (payload) => {
  // eslint-disable-next-line no-console
  console.log("[bots:ok]", payload);
});

socket.on("room:left", () => {
  joinInFlight = false;
  currentRoomId = null;
  currentMode = null;
  currentRulesId = null;
  pendingRulesId = null;
  renderRoomLabel();
  btnLeave.disabled = true;
  lbEl.innerHTML = "";
  if (playersEl) playersEl.innerHTML = "";
  if (playersTitleEl) playersTitleEl.textContent = t("players");
  statusEl.textContent = `${t("connected")} (${backendUrl})`;
  setRulesDisabled(false);

  // Clear meta cache when leaving a room.
  playersMeta.clear();
  playerPidById.clear();
  playerIdByPid.clear();
  playersStateByPid.clear();

  // Exit returns to login screen (user requested).
  showLogin("");
});

socket.on("players:meta", (payload = {}) => {
  if (payload?.roomId && currentRoomId && payload.roomId !== currentRoomId) return;
  const list = Array.isArray(payload?.players) ? payload.players : [];
  for (const p of list) {
    const pid = Number.isFinite(p?.pid) ? p.pid : null;
    const id = typeof p?.id === "string" ? p.id : null;
    if (pid == null || !id) continue;

    playerPidById.set(id, pid);
    playerIdByPid.set(pid, id);

    playersMeta.set(pid, {
      id,
      name: typeof p.name === "string" ? p.name : "",
      color: typeof p.color === "string" ? p.color : "",
      isBot: Boolean(p.isBot),
    });
  }
});

socket.on("state", (snap) => {
  if (snap?.roomId && currentRoomId && snap.roomId !== currentRoomId) return;
  if (snap?.rulesId && snap.rulesId !== currentRulesId) {
    currentRulesId = snap.rulesId;
    renderRoomLabel();
  }

  // Bandwidth optimization: server may omit `pellets` on some ticks.
  // Preserve the last known pellet list so rendering stays stable.
  if (snap && !Object.prototype.hasOwnProperty.call(snap, "pellets") && lastSnapshot?.pellets) {
    snap = { ...snap, pellets: lastSnapshot.pellets };
  }

  // Bandwidth optimization: server may send players as full or delta updates.
  // Keep a local map keyed by pid, then rehydrate to the legacy shape.
  if (snap) {
    if (Array.isArray(snap.players)) {
      playersStateByPid.clear();
      for (const p of snap.players) {
        if (!Number.isFinite(p?.pid)) continue;
        playersStateByPid.set(p.pid, {
          pid: p.pid,
          x: Number(p?.x) || 0,
          y: Number(p?.y) || 0,
          r10: Number(p?.r10) || 0,
          score: Number(p?.score) || 0,
        });
      }
    } else {
      const changed = Array.isArray(snap.playersD) ? snap.playersD : [];
      const gone = Array.isArray(snap.playersGone) ? snap.playersGone : [];
      for (const pid of gone) {
        if (!Number.isFinite(pid)) continue;
        playersStateByPid.delete(pid);
      }
      for (const p of changed) {
        if (!Number.isFinite(p?.pid)) continue;
        playersStateByPid.set(p.pid, {
          pid: p.pid,
          x: Number(p?.x) || 0,
          y: Number(p?.y) || 0,
          r10: Number(p?.r10) || 0,
          score: Number(p?.score) || 0,
        });
      }
    }

    // Rehydrate to legacy `players` array shape expected by renderers.
    const hydrated = [];
    for (const st of playersStateByPid.values()) {
      const meta = playersMeta.get(st.pid);
      const id = meta?.id || playerIdByPid.get(st.pid) || `p${st.pid}`;
      hydrated.push({
        id,
        pid: st.pid,
        x: st.x,
        y: st.y,
        r: st.r10 / 10,
        score: st.score,
        name: meta?.name ?? "",
        color: meta?.color ?? "",
        isBot: meta?.isBot ?? false,
      });
    }

    snap = { ...snap, players: hydrated };
  }

  // Prune meta/mappings for players no longer present.
  const livePids = new Set(playersStateByPid.keys());
  for (const pid of playersMeta.keys()) {
    if (!livePids.has(pid)) playersMeta.delete(pid);
  }
  for (const [id, pid] of playerPidById) {
    if (!livePids.has(pid)) playerPidById.delete(id);
  }
  for (const pid of playerIdByPid.keys()) {
    if (!livePids.has(pid)) playerIdByPid.delete(pid);
  }

  prevSnapshot = lastSnapshot;
  lastSnapshot = snap;
  renderDebugPanel(false);
  renderPlayersList(false);
  updateGameInfoFromSnapshot(snap);
});

socket.on("leaderboard", (payload) => {
  if (payload?.roomId && currentRoomId && payload.roomId !== currentRoomId) return;
  const top = payload?.top ?? [];
  lbEl.innerHTML = "";
  for (const entry of top) {
    const li = document.createElement("li");
    const label = entry.name ? entry.name : entry.id.slice(0, 6);
    const left = document.createElement("span");
    left.textContent = label;
    const right = document.createElement("span");
    right.textContent = `score=${entry.score}`;
    li.appendChild(left);
    li.appendChild(right);
    lbEl.appendChild(li);
  }
});

// Lightweight ping measurement (server supports ack on sys:ping)
setInterval(() => {
  if (!socket?.connected) return;
  const t0 = Date.now();
  try {
    socket.timeout(1500).emit("sys:ping", { t0 }, (err) => {
      if (err) return;
      pingMs = Date.now() - t0;
      setPingText(pingMs);
    });
  } catch {
    // ignore
  }
}, 2000);

// Input uplink: only send when changed (reduces upstream bandwidth).
const INPUT_SEND_HZ = 20;
// Low-frequency keepalive (send even if unchanged) to avoid stuck input if a packet is lost.
const INPUT_FORCE_EVERY_MS = 6000;
const INPUT_AXIS_QUANT = 127; // quantize [-1..1] to int steps to avoid jitter spam
let lastSentInput = null;
let lastSentInputAt = 0;

function quantizeAxisValue(v) {
  const n = Number.isFinite(v) ? clamp(v, -1, 1) : 0;
  // Convert to small integer then back to a stable float.
  const qi = Math.round(n * INPUT_AXIS_QUANT);
  return qi / INPUT_AXIS_QUANT;
}

function normalizeInputPayload(raw) {
  const ax = quantizeAxisValue(raw?.ax);
  const ay = quantizeAxisValue(raw?.ay);
  const boost = Boolean(raw?.boost);
  return { ax, ay, boost };
}

function inputsEqual(a, b) {
  if (!a || !b) return false;
  return a.ax === b.ax && a.ay === b.ay && a.boost === b.boost;
}

function sendInputIfNeeded({ force = false } = {}) {
  if (!socket?.connected) return;
  if (currentMode !== "play") return;
  if (!currentRoomId) return;

  const now = Date.now();
  const next = normalizeInputPayload(getAxis());
  const unchanged = inputsEqual(next, lastSentInput);
  const due = Number.isFinite(INPUT_FORCE_EVERY_MS) && now - lastSentInputAt >= INPUT_FORCE_EVERY_MS;

  if (force || !unchanged || due) {
    socket.emit("input", next);
    lastSentInput = next;
    lastSentInputAt = now;
  }
}

setInterval(() => {
  sendInputIfNeeded();
}, Math.floor(1000 / INPUT_SEND_HZ));

btnLeave.addEventListener("click", () => {
  socket.emit("room:leave");
  // immediate UX: return to login overlay while waiting for room:left
  showLogin("");
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
  if (((joystick.enabled || touchJoystickGestureActive) && (joystick.active || joystick.showGuide)) || (pointControl.enabled && (pointControl.active || joystick.showGuide))) {
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

  // Mouse joystick overlay (screen-space)
  if (mouseJoystick.active) {
    const cx = mouseJoystick.startX;
    const cy = mouseJoystick.startY;
    const dx = mouseJoystick.x - mouseJoystick.startX;
    const dy = mouseJoystick.y - mouseJoystick.startY;
    const len = Math.hypot(dx, dy);
    const r = mouseJoystick.maxR;
    const knobR = 18;

    let kx = cx;
    let ky = cy;
    if (len > 0.001) {
      const capped = Math.min(r, len);
      kx = cx + (dx / len) * capped;
      ky = cy + (dy / len) * capped;
    }

    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,193,7,0.60)";
    ctx.beginPath();
    ctx.arc(kx, ky, knobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
  ctx.fillStyle = "rgba(255,183,77,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 2;
  for (const pel of s1.pellets || []) {
    const x = Number(pel?.x);
    const y = Number(pel?.y);
    const r = Number.isFinite(pel?.r) ? Number(pel.r) : 4;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Debug: highlight pel0 so we can visually confirm pellets render.
  if (debugEnabled && Array.isArray(s1.pellets) && s1.pellets.length) {
    const p0 = s1.pellets[0];
    const x = Number(p0?.x);
    const y = Number(p0?.y);
    const r = Number.isFinite(p0?.r) ? Number(p0.r) : 4;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,0,0,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(12, r * 2.2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
      ctx.restore();
    }
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

  // Screen-space overlays
  drawMinimap(s1, camX, camY);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Initial UI
applyLang();
renderStats();
showLogin("");
nickInput.focus();

setDebugEnabled(debugEnabled);
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (isTextInputFocused()) return;
  if (e.key === "d" || e.key === "D") {
    setDebugEnabled(!debugEnabled);
    renderDebugPanel(true);
  }
});
