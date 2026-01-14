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
  broadcastHz: 15,
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

  const room = roomId ? rooms.ensureRoom(roomId) : rooms.ensureRoom();

  ws.send(JSON.stringify({ type: 'hello', room: rooms.getRoomInfo(room.id), serverTs: Date.now() }));

  const interval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    const snap = rooms.getRoomSnapshot(room.id);
    if (!snap) return;
    const leaderboard = rooms.computeLeaderboard(room);
    ws.send(JSON.stringify({ type: 'state', roomId: room.id, ...snap, leaderboard }));
  }, Math.floor(1000 / 10));

  ws.on('close', () => clearInterval(interval));
});

// Broadcast loop per room at broadcastHz (use a simple global timer)
setInterval(() => {
  for (const room of rooms.rooms.values()) {
    if (room.players.size === 0 && room.spectators.size === 0) continue;

    // Keep bots in sync with room settings
    rooms.ensureBots(room);

    // Handle game events (e.g., player death)
    const events = room.game.drainEvents?.() || [];
    for (const ev of events) {
      if (ev?.type !== 'dead' || !ev.id) continue;
      const session = rooms.getSessionByPlayerId(ev.id);
      if (!session) continue;

      // Remove membership and clear room on the session
      const oldRoomId = session.roomId;
      rooms.leaveCurrentRoom(session);

      // Notify the owning socket if still connected
      const sid = session.connectedSocketId;
      if (sid) {
        const s = io.sockets.sockets.get(sid);
        try {
          if (oldRoomId) s?.leave(oldRoomId);
          s?.emit('game:over', { score: ev.score ?? 0, reason: ev.reason || 'dead' });
          s?.emit('room:left', { ok: true });
        } catch {
          // ignore
        }
      }
    }

    const snap = rooms.getRoomSnapshot(room.id);
    if (!snap) continue;
    const leaderboard = rooms.computeLeaderboard(room);
    io.to(room.id).emit('state', { roomId: room.id, ...snap });
    io.to(room.id).emit('leaderboard', { roomId: room.id, top: leaderboard });
  }
}, Math.floor(1000 / 15));

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
