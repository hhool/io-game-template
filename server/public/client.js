const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const meEl = document.getElementById("me");
const roomEl = document.getElementById("room");
const fpsEl = document.getElementById("fps");
const lbEl = document.getElementById("lb");

const btnQuick = document.getElementById("btnQuick");
const btnSpectate = document.getElementById("btnSpectate");
const btnLeave = document.getElementById("btnLeave");

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const STORAGE_KEY = "1wlgame_token";
let token = localStorage.getItem(STORAGE_KEY);

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
  statusEl.textContent = `connected (${backendUrl})`;
});

socket.on("disconnect", () => {
  statusEl.textContent = "disconnected";
});

socket.on("connect_error", (err) => {
  const msg = err?.message || String(err);
  statusEl.textContent = `connect_error (${backendUrl}): ${msg}`;
  console.error("[socket] connect_error", err);
});

socket.on("auth", (payload) => {
  if (payload?.token && payload.token !== token) {
    token = payload.token;
    localStorage.setItem(STORAGE_KEY, token);
  }
  if (payload?.playerId) {
    myId = payload.playerId;
    meEl.textContent = `id: ${myId.slice(0, 6)}`;
  }
});

socket.on("hello", (payload) => {
  if (payload?.playerId && !myId) {
    myId = payload.playerId;
    meEl.textContent = `id: ${myId.slice(0, 6)}`;
  }
});

socket.on("room:joined", ({ room, mode }) => {
  currentRoomId = room?.id ?? null;
  currentMode = mode;
  roomEl.textContent = currentRoomId ? `room: ${currentRoomId} (${mode})` : "";
  btnLeave.disabled = !currentRoomId;
  statusEl.textContent = "in-room";
});

socket.on("room:left", () => {
  currentRoomId = null;
  currentMode = null;
  roomEl.textContent = "";
  btnLeave.disabled = true;
  lbEl.innerHTML = "";
  statusEl.textContent = "connected";
});

socket.on("state", (snap) => {
  if (snap?.roomId && currentRoomId && snap.roomId !== currentRoomId) return;
  prevSnapshot = lastSnapshot;
  lastSnapshot = snap;
});

socket.on("leaderboard", (payload) => {
  if (payload?.roomId && currentRoomId && payload.roomId !== currentRoomId)
    return;
  const top = payload?.top ?? [];
  lbEl.innerHTML = "";
  for (const entry of top) {
    const li = document.createElement("li");
    li.textContent = `${entry.id.slice(0, 6)}  score=${entry.score}`;
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
  if (!socket.connected) {
    statusEl.textContent = `not connected (${backendUrl})`;
    return;
  }
  socket.emit("mm:join", { mode: "play" });
});

btnSpectate.addEventListener("click", () => {
  if (!socket.connected) {
    statusEl.textContent = `not connected (${backendUrl})`;
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

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${p1.score}`, x, y + 4);
  }

  ctx.restore();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
