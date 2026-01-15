#!/usr/bin/env node

import { io } from 'socket.io-client';

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  return v ?? fallback;
}

const url = process.env.URL || argValue('--url', 'http://127.0.0.1:6868');
const nick = process.env.NICK || argValue('--nick', 'bot-test');
const botCount = Number(process.env.BOT_COUNT || argValue('--count', '4'));
const timeoutMs = Number(process.env.TIMEOUT_MS || argValue('--timeout', '12000'));

if (!Number.isFinite(botCount) || botCount < 0) {
  console.error('Invalid bot count:', botCount);
  process.exit(2);
}

const socket = io(url, {
  transports: ['websocket'],
  timeout: Math.min(5000, timeoutMs),
  reconnection: false
});

let roomId = null;
let playerId = null;
let firstBotPos = null;
let moved = false;
let phase = 'joining';
let movementPhaseStartTs = 0;

let exiting = false;

// Socket.IO `state` payload is delta-compressed and strips meta fields (name/color/isBot).
// We must join `players:meta` (pid -> {id,isBot}) with `state` (pid -> position).
const metaByPid = new Map(); // pid -> { id, isBot }
const stateByPid = new Map(); // pid -> { x, y }

function applyPlayersMeta(metaPayload) {
  const list = metaPayload?.players;
  if (!Array.isArray(list)) return;
  for (const m of list) {
    const pid = Number(m?.pid);
    if (!Number.isFinite(pid)) continue;
    const id = typeof m?.id === 'string' ? m.id : null;
    if (!id) continue;
    metaByPid.set(pid, { id, isBot: Boolean(m?.isBot) });
  }
}

function applyStatePayload(statePayload) {
  if (!statePayload || typeof statePayload !== 'object') return;

  if (Array.isArray(statePayload.players)) {
    stateByPid.clear();
    for (const p of statePayload.players) {
      const pid = Number(p?.pid);
      if (!Number.isFinite(pid)) continue;
      const x = Number(p?.x);
      const y = Number(p?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      stateByPid.set(pid, { x, y });
    }
    return;
  }

  if (Array.isArray(statePayload.playersD)) {
    for (const p of statePayload.playersD) {
      const pid = Number(p?.pid);
      if (!Number.isFinite(pid)) continue;
      const x = Number(p?.x);
      const y = Number(p?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      stateByPid.set(pid, { x, y });
    }
  }

  if (Array.isArray(statePayload.playersGone)) {
    for (const pidRaw of statePayload.playersGone) {
      const pid = Number(pidRaw);
      if (!Number.isFinite(pid)) continue;
      stateByPid.delete(pid);
    }
  }
}

function countBotsInWorld() {
  let total = 0;
  const botPids = [];
  for (const pid of stateByPid.keys()) {
    const meta = metaByPid.get(pid);
    if (meta?.isBot) {
      total += 1;
      botPids.push(pid);
    }
  }
  return { total, botPids };
}

function findBotPosByPid(pid) {
  const pos = stateByPid.get(pid);
  if (!pos) return null;
  return { pid, x: pos.x, y: pos.y };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

const timer = setTimeout(() => {
  exiting = true;
  console.error(`[FAIL] Timeout after ${timeoutMs}ms (phase=${phase}, roomId=${roomId})`);
  socket.close();
  process.exit(1);
}, timeoutMs);

socket.on('auth', (payload) => {
  playerId = payload?.playerId || playerId;
});

socket.on('connect', () => {
  // Set a nick, then quick-match into play
  socket.emit('profile:set', { nick });
  socket.emit('mm:join', { mode: 'play' });
});

socket.on('connect_error', (err) => {
  console.error('[FAIL] connect_error', err?.message || err);
  clearTimeout(timer);
  process.exit(1);
});

socket.on('login:required', (payload) => {
  console.error('[FAIL] login:required', payload);
  clearTimeout(timer);
  socket.close();
  process.exit(1);
});

socket.on('room:joined', (payload) => {
  roomId = payload?.room?.id;
  phase = 'enabling';
  socket.emit('bots:set', { enabled: true, count: botCount });
});

socket.on('bots:ok', (payload) => {
  if (payload?.roomId !== roomId) return;
  // Wait for state updates.
});

socket.on('players:meta', (payload) => {
  if (payload?.roomId !== roomId) return;
  applyPlayersMeta(payload);
});

socket.on('state', (payload) => {
  if (payload?.roomId !== roomId) return;
  const now = Date.now();

  applyStatePayload(payload);

  const { total, botPids } = countBotsInWorld();

  if (phase === 'enabling') {
    if (total >= botCount) {
      phase = 'movement-check';
      movementPhaseStartTs = now;
      const firstPid = botPids[0];
      firstBotPos = Number.isFinite(firstPid) ? findBotPosByPid(firstPid) : null;
      // If there are no pellets / no movement yet, give it a few ticks.
      return;
    }
  }

  if (phase === 'movement-check') {
    const p = firstBotPos ? findBotPosByPid(firstBotPos.pid) : null;
    if (firstBotPos && p && p.pid === firstBotPos.pid) {
      if (dist(firstBotPos, p) > 0.5) {
        moved = true;
      }
    }
    // After we have at least one bot and saw a movement (or waited a bit), disable.
    if (total >= botCount && (moved || now - movementPhaseStartTs > 1500)) {
      phase = 'disabling';
      socket.emit('bots:set', { enabled: false });
      return;
    }
  }

  if (phase === 'disabling') {
    if (total === 0) {
      clearTimeout(timer);
      exiting = true;
      console.log(`[OK] bots spawned (${botCount}), movement=${moved}, then removed (roomId=${roomId})`);
      socket.close();
      process.exit(0);
    }
  }
});

socket.on('disconnect', (reason) => {
  if (exiting) return;
  if (phase === 'disabling') return;
  console.error('[FAIL] disconnected early:', reason);
  clearTimeout(timer);
  process.exit(1);
});
