import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';

import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

import { RoomManager } from './src/rooms.js';
import { listRules, normalizeRulesId } from './src/rules/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 6868;
const PORT = Number.parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const REDIS_URL = process.env.REDIS_URL || '';
const PORT_FROM_ENV = process.env.PORT != null && process.env.PORT !== '';
const AUTO_PORT = (() => {
  const v = String(process.env.AUTO_PORT ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
})();

async function loadPublicConfig() {
  const configPath = path.join(__dirname, 'public', 'config.json');
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[config] failed to read public/config.json, using defaults:', e?.message || e);
    return {};
  }
}

function numberFromEnv(name) {
  const v = process.env[name];
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function resolveMovementConfig(publicConfig) {
  const baseSpeed = numberFromEnv('MOVE_BASE_SPEED') ?? (Number.isFinite(publicConfig?.movement?.baseSpeed) ? publicConfig.movement.baseSpeed : 192);
  const damping = numberFromEnv('MOVE_DAMPING') ?? (Number.isFinite(publicConfig?.movement?.damping) ? publicConfig.movement.damping : 0.2);
  const blendMax = numberFromEnv('MOVE_BLEND_MAX') ?? (Number.isFinite(publicConfig?.movement?.blendMax) ? publicConfig.movement.blendMax : 0.5);

  return {
    baseSpeed: Math.max(1, baseSpeed),
    damping: Math.max(0, damping),
    blendMax: Math.max(0, Math.min(1, blendMax))
  };
}

function pickLanIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (!ni) continue;
      if (ni.family !== 'IPv4') continue;
      if (ni.internal) continue;
      return ni.address;
    }
  }
  return null;
}

const app = express();
app.disable('x-powered-by');

// Static client
app.use('/', express.static(path.join(__dirname, 'public')));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/rules', (_req, res) => {
  res.json({ ok: true, rules: listRules() });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  // Avoid permessage-deflate edge cases that can surface as
  // "Invalid frame header" / "RSV1 must be clear" on some clients.
  perMessageDeflate: false,
  cors: {
    origin: '*'
  }
});

console.log('[io] perMessageDeflate =', io.engine?.opts?.perMessageDeflate);

io.engine.on('connection_error', (err) => {
  // Helps diagnose client-side `connect_error` (CORS, transport issues, bad handshake, etc.)
  console.log('[io:connection_error]', {
    code: err?.code,
    message: err?.message,
    context: err?.context
  });
});

// Optional Redis adapter for scaling Socket.IO across processes
if (REDIS_URL) {
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));
  console.log('[redis] adapter enabled:', REDIS_URL);
} else {
  console.log('[redis] adapter disabled (set REDIS_URL to enable)');
}

const publicConfig = await loadPublicConfig();
const movement = resolveMovementConfig(publicConfig);
console.log('[movement]', movement);

const rooms = new RoomManager({
  tickHz: 30,
  broadcastHz: 10,
  world: { width: 2800, height: 1800 },
  movement,
  emptyRoomTtlMs: 60_000,
  sessionTtlMs: 5 * 60_000
});

console.log('[startup]', { host: HOST, port: PORT, autoPort: AUTO_PORT });

function sanitizeNick(nick) {
  if (typeof nick !== 'string') return '';
  return nick.replace(/[\r\n\t]/g, ' ').trim().slice(0, 16);
}

// Maintenance loop
setInterval(() => rooms.tickMaintenance(), 5_000);

io.on('connection', (socket) => {
  // Reconnect token from client
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const session = rooms.getOrCreateSession(token);
  rooms.attachSocketToSession(session, socket.id);

  // Tell client its token (first connect)
  socket.emit('auth', { token: session.token, playerId: session.playerId, nick: session.nick });

  socket.emit('hello', {
    playerId: session.playerId,
    nick: session.nick,
    serverTs: Date.now(),
    rooms: rooms.listRooms({ limit: 20 })
  });

  socket.on('profile:set', (payload = {}) => {
    const nick = sanitizeNick(payload.nick);
    rooms.setNick(session, nick);
    // keep the in-world name in sync if already playing
    if (session.roomId && session.mode === 'play') {
      const room = rooms.ensureRoom(session.roomId);
      room.game.setPlayerName?.(session.playerId, session.nick);
    }
    socket.emit('profile:ok', { nick: session.nick });
  });

  // Simple RTT measurement for HUD (client uses Socket.IO ack)
  socket.on('sys:ping', (_payload = {}, cb) => {
    if (typeof cb === 'function') cb({ ok: true, serverTs: Date.now() });
  });

  // If session had a room, re-join it (spectate or play)
  if (session.roomId) {
    socket.join(session.roomId);
    const room = rooms.ensureRoom(session.roomId);
    if (session.mode === 'play') {
      room.players.add(session.playerId);
      room.game.addPlayer(session.playerId, { name: session.nick });
    } else {
      room.spectators.add(session.playerId);
    }
    socket.emit('room:joined', { room: rooms.getRoomInfo(session.roomId), mode: session.mode });
  }

  socket.on('mm:join', (payload = {}) => {
    console.log('[mm:join]', { socketId: socket.id, playerId: session.playerId, payload });
    const mode = payload.mode === 'spectate' ? 'spectate' : 'play';
    const rulesId = normalizeRulesId(payload.rulesId);
    const rulesConfig = payload.rulesConfig && typeof payload.rulesConfig === 'object' ? payload.rulesConfig : undefined;

    if (mode === 'play' && !session.nick) {
      socket.emit('login:required', { message: 'nickname required' });
      return;
    }

    const room =
      mode === 'play'
        ? rooms.quickMatch(session, { rulesId, rulesConfig })
        : rooms.joinRoomAsSpectator(session, rooms.ensureRoom(null, { rulesId, rulesConfig }).id, { rulesId, rulesConfig });

    socket.rooms.forEach((r) => {
      if (r !== socket.id) socket.leave(r);
    });
    socket.join(room.id);
    console.log('[room:joined]', { socketId: socket.id, playerId: session.playerId, roomId: room.id, mode });
    socket.emit('room:joined', { room: rooms.getRoomInfo(room.id), mode });
  });

  socket.on('room:join', (payload = {}) => {
    const mode = payload.mode === 'spectate' ? 'spectate' : 'play';
    const targetRoomId = payload.roomId;
    const rulesId = normalizeRulesId(payload.rulesId);
    const rulesConfig = payload.rulesConfig && typeof payload.rulesConfig === 'object' ? payload.rulesConfig : undefined;
    if (!targetRoomId) {
      socket.emit('error', { message: 'roomId required' });
      return;
    }

    if (mode === 'play' && !session.nick) {
      socket.emit('login:required', { message: 'nickname required' });
      return;
    }

    const room =
      mode === 'play'
        ? rooms.joinRoomAsPlayer(session, targetRoomId, { rulesId, rulesConfig })
        : rooms.joinRoomAsSpectator(session, targetRoomId, { rulesId, rulesConfig });

    socket.rooms.forEach((r) => {
      if (r !== socket.id) socket.leave(r);
    });
    socket.join(room.id);
    socket.emit('room:joined', { room: rooms.getRoomInfo(room.id), mode });
  });

  socket.on('room:leave', () => {
    const oldRoomId = session.roomId;
    rooms.leaveCurrentRoom(session);
    if (oldRoomId) socket.leave(oldRoomId);
    socket.emit('room:left', { ok: true });
  });

  // Enable/disable bots for the current room (prototype feature)
  socket.on('bots:set', (payload = {}) => {
    if (!session.roomId) return;
    if (session.mode !== 'play') return;
    const enabled = Boolean(payload.enabled);
    const count = Number.isFinite(payload.count) ? payload.count : undefined;
    const cfg = rooms.setRoomBots(session.roomId, { enabled, count });
    if (cfg) socket.emit('bots:ok', { roomId: session.roomId, ...cfg });
  });

  // Update server-side rules config for the current room (prototype tuning feature)
  socket.on('rules:setConfig', (payload = {}) => {
    if (!session.roomId) return;
    if (session.mode !== 'play') return;
    const room = rooms.ensureRoom(session.roomId);
    if (!room) return;
    // Keep the room's rulesId authoritative.
    const rulesConfig = payload.rulesConfig && typeof payload.rulesConfig === 'object' ? payload.rulesConfig : null;
    if (!rulesConfig) return;
    rooms.setRoomRulesConfig(session.roomId, rulesConfig);
    socket.emit('rules:ok', { roomId: session.roomId });
  });

  socket.on('input', (input) => {
    rooms.setInput(session, input);
  });

  socket.on('rooms:list', () => {
    socket.emit('rooms:list', rooms.listRooms({ limit: 50 }));
  });

  socket.on('ping1', (clientTs) => {
    socket.emit('pong1', { clientTs, serverTs: Date.now() });
  });

  socket.on('disconnect', () => {
    rooms.detachSocketFromSession(session);
    // Keep player in room for TTL to allow reconnection.
  });
});

// Native WebSocket endpoint that streams room state. Usage: ws://host/ws?room=<roomId>
// IMPORTANT: do not attach `ws` directly to the HTTP server, otherwise it may
// intercept upgrade requests meant for Engine.IO (Socket.IO) and cause
// client errors like "Invalid frame header" / "RSV1 must be clear".
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== '/ws') return; // let Engine.IO handle other upgrades

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } catch {
    // If URL parsing fails, just drop the connection
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const roomId = url.searchParams.get('room');

  // Optional compact format for WS: ?fmt=array
  // - default: object payloads (backward compatible)
  // - array: players as [pid,x,y,r10,score], pellets as [id,x,y,r10]
  const fmt = String(url.searchParams.get('fmt') || '').trim().toLowerCase();
  const useArrayFmt = fmt === 'array';

  // Optional debug extras: ?debug=1
  const debug = (() => {
    const v = String(url.searchParams.get('debug') || '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  })();

  const room = roomId ? rooms.ensureRoom(roomId) : rooms.ensureRoom();

  // Protocol version for ws state frames.
  const WS_PROTO = 1;

  ws.send(
    JSON.stringify({
      type: 'hello',
      proto: WS_PROTO,
      room: rooms.getRoomInfo(room.id),
      serverTs: Date.now(),
      formats: { default: 'object', supported: ['object', 'array'] },
      fmt: useArrayFmt ? 'array' : 'object',
      debug
    })
  );

  // Bandwidth control: align WS stream to the same policy as Socket.IO.
  const PELLETS_FULL_SEND_EVERY_MS = 4000;
  const PLAYERS_FULL_SEND_EVERY_MS = 2000;
  const PLAYERS_META_SEND_EVERY_MS = 2000;
  const LEADERBOARD_SEND_EVERY_MS = 1000;

  // Per-connection monotonic sequence (lets client detect gaps/out-of-order).
  let seq = 0;

  // Per-connection caches for delta.
  const playersStateCache = new Map(); // pid -> {pid,x,y,r10,score}
  const playersMetaCache = new Map(); // playerId -> {pid,id,name,color,isBot}
  const pelletsCache = new Map(); // pelId -> {id,x,y,r10}

  let lastPlayersFullSentAt = 0;
  let lastPlayersMetaSentAt = 0;
  let lastPelletsFullSentAt = 0;
  let lastLeaderboardSentAt = 0;

  let forceFullPlayers = false;
  let forceFullPellets = false;
  let forceMeta = false;

  ws.on('message', (buf) => {
    // Minimal control plane for resync.
    // Client can send: {"type":"resync"}
    try {
      const msg = JSON.parse(String(buf || ''));
      if (msg && msg.type === 'resync') {
        forceFullPlayers = true;
        forceFullPellets = true;
        forceMeta = true;
      }
    } catch {
      // ignore
    }
  });

  const interval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    const snap = rooms.getRoomSnapshot(room.id);
    if (!snap) return;

    const now = Date.now();

    // Keep the room's pid mapping stable across its lifetime.
    const pidById = room._pidById || (room._pidById = new Map());
    const idByPid = room._idByPid || (room._idByPid = new Map());
    if (!Number.isFinite(room._pidSeq)) room._pidSeq = 1;

    const payload = {
      type: 'state',
      proto: WS_PROTO,
      roomId: room.id,
      seq: ++seq,
      ts: snap.ts
    };

    // Leaderboard (1Hz)
    const includeLeaderboard = !lastLeaderboardSentAt || now - lastLeaderboardSentAt >= LEADERBOARD_SEND_EVERY_MS;
    if (includeLeaderboard) {
      payload.leaderboard = rooms.computeLeaderboard(room);
      lastLeaderboardSentAt = now;
    }

    // Players meta + pid mapping (low frequency + on change)
    const snapPlayers = Array.isArray(snap.players) ? snap.players : [];
    const currentIds = new Set();
    const allMeta = [];
    const metaChanged = [];

    for (const p of snapPlayers) {
      if (!p?.id) continue;
      currentIds.add(p.id);

      let pid = pidById.get(p.id);
      if (!pid) {
        pid = room._pidSeq++;
        pidById.set(p.id, pid);
        idByPid.set(pid, p.id);
      }

      const meta = { pid, id: p.id, name: p.name || '', color: p.color || '', isBot: Boolean(p.isBot) };
      allMeta.push(meta);

      const prev = playersMetaCache.get(p.id);
      if (!prev || prev.name !== meta.name || prev.color !== meta.color || prev.isBot !== meta.isBot) {
        playersMetaCache.set(p.id, meta);
        metaChanged.push(meta);
      }
    }

    // Prune meta cache + pid mappings for players that left.
    for (const id of playersMetaCache.keys()) {
      if (!currentIds.has(id)) playersMetaCache.delete(id);
    }
    for (const [id, pid] of pidById) {
      if (!currentIds.has(id)) {
        pidById.delete(id);
        idByPid.delete(pid);
        playersStateCache.delete(pid);
      }
    }

    const metaDue = forceMeta || !lastPlayersMetaSentAt || now - lastPlayersMetaSentAt >= PLAYERS_META_SEND_EVERY_MS;
    if (metaDue) {
      lastPlayersMetaSentAt = now;
      payload.playersMeta = allMeta;
      forceMeta = false;
    } else if (metaChanged.length) {
      payload.playersMeta = metaChanged;
    }

    // Players slim
    const slimPlayers = [];
    for (const p of snapPlayers) {
      if (!p?.id) continue;
      const pid = pidById.get(p.id);
      if (!pid) continue;
      slimPlayers.push({
        pid,
        x: Math.round(p.x),
        y: Math.round(p.y),
        r10: Math.round(Number(p.r) * 10),
        score: Math.round(Number(p.score) || 0)
      });
    }

    // Players delta
    const seenPids = new Set();
    const playersD = [];
    for (const p of slimPlayers) {
      seenPids.add(p.pid);
      const prev = playersStateCache.get(p.pid);
      if (!prev || prev.x !== p.x || prev.y !== p.y || prev.r10 !== p.r10 || prev.score !== p.score) {
        playersStateCache.set(p.pid, p);
        playersD.push(p);
      }
    }

    const playersGone = [];
    for (const pid of playersStateCache.keys()) {
      if (!seenPids.has(pid)) {
        playersGone.push(pid);
        playersStateCache.delete(pid);
      }
    }

    const sendFullPlayers = forceFullPlayers || !lastPlayersFullSentAt || now - lastPlayersFullSentAt >= PLAYERS_FULL_SEND_EVERY_MS;
    if (sendFullPlayers) {
      lastPlayersFullSentAt = now;
      forceFullPlayers = false;
      payload.fullPlayers = true;
      payload.players = useArrayFmt ? slimPlayers.map((pp) => [pp.pid, pp.x, pp.y, pp.r10, pp.score]) : slimPlayers;
    } else {
      payload.fullPlayers = false;
      if (playersD.length) payload.playersD = useArrayFmt ? playersD.map((pp) => [pp.pid, pp.x, pp.y, pp.r10, pp.score]) : playersD;
      if (playersGone.length) payload.playersGone = playersGone;
    }

    // Pellets delta (4s full)
    const snapPellets = Array.isArray(snap.pellets) ? snap.pellets : [];
    const sendFullPellets = forceFullPellets || !lastPelletsFullSentAt || now - lastPelletsFullSentAt >= PELLETS_FULL_SEND_EVERY_MS || pelletsCache.size === 0;

    if (sendFullPellets) {
      lastPelletsFullSentAt = now;
      forceFullPellets = false;
      payload.fullPellets = true;

      pelletsCache.clear();
      const full = [];
      for (const pel of snapPellets) {
        if (!pel?.id) continue;
        const q = {
          id: pel.id,
          x: Math.round(pel.x),
          y: Math.round(pel.y),
          r10: Math.round(Number(pel.r) * 10)
        };
        pelletsCache.set(q.id, q);
        full.push(q);
      }
      payload.pellets = useArrayFmt ? full.map((p) => [p.id, p.x, p.y, p.r10]) : full;
    } else {
      payload.fullPellets = false;
      const seen = new Set();
      const changed = [];

      for (const pel of snapPellets) {
        if (!pel?.id) continue;
        const q = {
          id: pel.id,
          x: Math.round(pel.x),
          y: Math.round(pel.y),
          r10: Math.round(Number(pel.r) * 10)
        };
        seen.add(q.id);
        const prev = pelletsCache.get(q.id);
        if (!prev || prev.x !== q.x || prev.y !== q.y || prev.r10 !== q.r10) {
          pelletsCache.set(q.id, q);
          changed.push(q);
        }
      }

      const gone = [];
      for (const id of pelletsCache.keys()) {
        if (!seen.has(id)) {
          gone.push(id);
          pelletsCache.delete(id);
        }
      }

      if (changed.length) payload.pelletsD = useArrayFmt ? changed.map((p) => [p.id, p.x, p.y, p.r10]) : changed;
      if (gone.length) payload.pelletsGone = gone;
    }

    if (debug) {
      payload.debug = {
        players: snapPlayers.length,
        pellets: snapPellets.length,
        cachePlayers: playersStateCache.size,
        cachePellets: pelletsCache.size,
        fmt: useArrayFmt ? 'array' : 'object'
      };
    }

    ws.send(JSON.stringify(payload));
  }, Math.floor(1000 / 10));

  ws.on('close', () => clearInterval(interval));
});

// Broadcast loop per room at broadcastHz (use a simple global timer)
setInterval(() => {
  // Bandwidth control: pellets are heavy. Prefer delta updates.
  const PELLETS_FULL_SEND_EVERY_MS = 4000;

  // Bandwidth control: leaderboard is also heavy. Broadcast it at a lower rate than player state.
  const LEADERBOARD_SEND_EVERY_MS = 1000;

  // Bandwidth control: player meta (name/color/isBot) changes rarely; broadcast it periodically and on change.
  const PLAYERS_META_SEND_EVERY_MS = 2000;

  // Bandwidth control: player positions update frequently.
  // Send full player state periodically for resync; otherwise send deltas.
  const PLAYERS_FULL_SEND_EVERY_MS = 2000;

  for (const room of rooms.rooms.values()) {
    if (room.players.size === 0 && room.spectators.size === 0) continue;

    // Monotonic sequence id for Socket.IO state packets (helps clients detect missing deltas).
    room._stateSeq = Number.isFinite(room._stateSeq) ? room._stateSeq + 1 : 1;

    // Per-room numeric player id mapping (stable while the room lives).
    // Allows `state` to send compact integer ids.
    const pidById = room._pidById || (room._pidById = new Map());
    const idByPid = room._idByPid || (room._idByPid = new Map());
    if (!Number.isFinite(room._pidSeq)) room._pidSeq = 1;

    // Keep bots in sync with room settings
    rooms.ensureBots(room);

    // Handle game events (e.g., player death)
    const events = room.game.drainEvents?.() || [];
    for (const ev of events) {
      if (ev?.type !== 'dead' || !ev.id) continue;
      const session = rooms.getSessionByPlayerId(ev.id);
      if (!session) continue;

      const killerId = ev.by || null;
      const killerSession = killerId ? rooms.getSessionByPlayerId(killerId) : null;
      const killerName = killerSession?.nick || '';

      // Remove membership and clear room on the session
      const oldRoomId = session.roomId;
      rooms.leaveCurrentRoom(session);

      // Notify the owning socket if still connected
      const sid = session.connectedSocketId;
      if (sid) {
        const s = io.sockets.sockets.get(sid);
        try {
          if (oldRoomId) s?.leave(oldRoomId);
          s?.emit('game:over', {
            score: ev.score ?? 0,
            reason: ev.reason || 'dead',
            by: killerId,
            byName: killerName
          });
          s?.emit('room:left', { ok: true });
        } catch {
          // ignore
        }
      }
    }

    const snap = rooms.getRoomSnapshot(room.id);
    if (!snap) continue;

    const now = Date.now();

    // Emit players meta (rarely changes)
    const metaCache = room._playersMetaCache || (room._playersMetaCache = new Map());
    const currentIds = new Set();
    const allMeta = [];
    const metaChanged = [];
    for (const p of Array.isArray(snap.players) ? snap.players : []) {
      if (!p?.id) continue;
      currentIds.add(p.id);

      // Allocate numeric pid for this player id.
      let pid = pidById.get(p.id);
      if (!pid) {
        pid = room._pidSeq++;
        pidById.set(p.id, pid);
        idByPid.set(pid, p.id);
      }

      const meta = { pid, id: p.id, name: p.name || '', color: p.color || '', isBot: Boolean(p.isBot) };
      allMeta.push(meta);
      const prev = metaCache.get(p.id);
      if (!prev || prev.name !== meta.name || prev.color !== meta.color || prev.isBot !== meta.isBot) {
        metaCache.set(p.id, meta);
        metaChanged.push(meta);
      }
    }
    // Prune cache entries for players that left.
    for (const id of metaCache.keys()) {
      if (!currentIds.has(id)) metaCache.delete(id);
    }
    for (const [id, pid] of pidById) {
      if (!currentIds.has(id)) {
        pidById.delete(id);
        idByPid.delete(pid);
      }
    }
    const lastMetaSentAt = room._playersMetaSentAt || 0;
    const metaDue = !lastMetaSentAt || now - lastMetaSentAt >= PLAYERS_META_SEND_EVERY_MS;
    if (metaDue) {
      room._playersMetaSentAt = now;
      io.to(room.id).emit('players:meta', { roomId: room.id, players: allMeta });
    } else if (metaChanged.length) {
      io.to(room.id).emit('players:meta', { roomId: room.id, players: metaChanged });
    }

    // Emit leaderboard (1Hz)
    const lastLeaderboardSentAt = room._leaderboardSentAt || 0;
    const leaderboardDue = !lastLeaderboardSentAt || now - lastLeaderboardSentAt >= LEADERBOARD_SEND_EVERY_MS;
    const leaderboard = leaderboardDue ? rooms.computeLeaderboard(room) : null;
    if (leaderboardDue) room._leaderboardSentAt = now;

    // Pellets delta
    const pelletsCache = room._pelletsCache || (room._pelletsCache = new Map());
    const lastPelletsFullSentAt = room._pelletsFullSentAt || 0;
    const sendFullPellets = !lastPelletsFullSentAt || now - lastPelletsFullSentAt >= PELLETS_FULL_SEND_EVERY_MS || pelletsCache.size === 0;

    // Slim down players payload: omit meta fields (name/color/isBot) from `state`.
    const slimPlayers = Array.isArray(snap.players)
      ? snap.players
          .map((p) => {
            if (!p?.id) return null;
            const pid = pidById.get(p.id);
            if (!pid) return null;
            return {
              pid,
              x: Math.round(p.x),
              y: Math.round(p.y),
              r10: Math.round(p.r * 10),
              score: Math.round(Number(p.score) || 0)
            };
          })
          .filter(Boolean)
      : [];

    // Delta-compress players list.
    const playersStateCache = room._playersStateCache || (room._playersStateCache = new Map());
    const seenPids = new Set();
    const playersD = [];
    for (const p of slimPlayers) {
      seenPids.add(p.pid);
      const prev = playersStateCache.get(p.pid);
      if (!prev || prev.x !== p.x || prev.y !== p.y || prev.r10 !== p.r10 || prev.score !== p.score) {
        playersD.push(p);
        playersStateCache.set(p.pid, p);
      }
    }

    const playersGone = [];
    for (const pid of playersStateCache.keys()) {
      if (!seenPids.has(pid)) {
        playersGone.push(pid);
        playersStateCache.delete(pid);
      }
    }

    const lastPlayersFullSentAt = room._playersFullSentAt || 0;
    const sendFullPlayers = !lastPlayersFullSentAt || now - lastPlayersFullSentAt >= PLAYERS_FULL_SEND_EVERY_MS;
    if (sendFullPlayers) room._playersFullSentAt = now;

    const payload = { roomId: room.id, seq: room._stateSeq, ...snap };
    if (sendFullPlayers) {
      payload.players = slimPlayers;
    } else {
      payload.playersD = playersD;
      payload.playersGone = playersGone;
      // Omit full list when sending delta.
      delete payload.players;
    }

    if (Array.isArray(snap.pellets)) {
      if (sendFullPellets) {
        room._pelletsFullSentAt = now;
        pelletsCache.clear();
        const full = [];
        for (const pel of snap.pellets) {
          if (!pel?.id) continue;
          const q = {
            id: pel.id,
            x: Math.round(pel.x),
            y: Math.round(pel.y),
            r10: Math.round(Number(pel.r) * 10)
          };
          pelletsCache.set(q.id, q);
          full.push(q);
        }
        payload.pellets = full;
      } else {
        const seen = new Set();
        const changed = [];
        for (const pel of snap.pellets) {
          if (!pel?.id) continue;
          const q = {
            id: pel.id,
            x: Math.round(pel.x),
            y: Math.round(pel.y),
            r10: Math.round(Number(pel.r) * 10)
          };
          seen.add(q.id);
          const prev = pelletsCache.get(q.id);
          if (!prev || prev.x !== q.x || prev.y !== q.y || prev.r10 !== q.r10) {
            pelletsCache.set(q.id, q);
            changed.push(q);
          }
        }
        const gone = [];
        for (const id of pelletsCache.keys()) {
          if (!seen.has(id)) {
            gone.push(id);
            pelletsCache.delete(id);
          }
        }
        if (changed.length) payload.pelletsD = changed;
        if (gone.length) payload.pelletsGone = gone;
        delete payload.pellets;
      }
    }

    io.to(room.id).emit('state', payload);
    if (leaderboardDue) io.to(room.id).emit('leaderboard', { roomId: room.id, top: leaderboard });
  }
}, Math.floor(1000 / 10));

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onListening = () => {
      cleanup();
      resolve(port);
    };
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, HOST);
  });
}

async function start() {
  // Port-hopping is opt-in via AUTO_PORT=1.
  const maxAttempts = AUTO_PORT ? 20 : 1;
  let lastErr = null;
  for (let i = 0; i < maxAttempts; i++) {
    const p = PORT + i;
    try {
      const boundPort = await listenOnce(p);
      const lan = pickLanIPv4();
      console.log('Express and Socket.IO are listening on', `${HOST}:${boundPort}`);
      console.log('Local:', `http://127.0.0.1:${boundPort}/`);
      if (lan) console.log('LAN (phone):', `http://${lan}:${boundPort}/`);
      console.log('WS endpoint:', `ws://127.0.0.1:${boundPort}/ws`);
      if (AUTO_PORT && boundPort !== PORT) {
        console.warn(`[warn] Port ${PORT} was busy; using ${boundPort} instead. Set PORT to force a specific port, or disable AUTO_PORT.`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (err?.code === 'EADDRINUSE' && AUTO_PORT) {
        console.warn(`[warn] Port ${p} is in use; trying ${p + 1}...`);
        continue;
      }

      if (err?.code === 'EADDRINUSE') {
        console.error(`[fatal] Port ${p} is already in use.`);
        console.error('Hint: run `lsof -nP -iTCP:%s -sTCP:LISTEN` to find the process, or set PORT to a different value.', p);
        console.error('Optional: set AUTO_PORT=1 to auto-try subsequent ports.');
      }
      throw err;
    }
  }

  const msg = lastErr?.message ? String(lastErr.message) : String(lastErr || 'unknown error');
  throw new Error(`Failed to bind a port starting at ${PORT}: ${msg}`);
}

start().catch((err) => {
  console.error('[fatal] Failed to start server:', err);
  process.exit(1);
});
