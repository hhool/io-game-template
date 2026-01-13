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
let firstBotPos = null;
let moved = false;
let phase = 'joining';
let movementPhaseStartTs = 0;

function countBots(statePayload) {
  const players = statePayload?.players;
  if (!Array.isArray(players)) return { total: 0, botIds: [] };
  const botIds = players.filter((p) => p?.isBot).map((p) => p.id);
  return { total: botIds.length, botIds };
}

function findBotPos(statePayload) {
  const players = statePayload?.players;
  if (!Array.isArray(players)) return null;
  const bot = players.find((p) => p?.isBot);
  if (!bot) return null;
  const x = Number(bot.x);
  const y = Number(bot.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { id: bot.id, x, y };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

const timer = setTimeout(() => {
  console.error(`[FAIL] Timeout after ${timeoutMs}ms (phase=${phase}, roomId=${roomId})`);
  socket.close();
  process.exit(1);
}, timeoutMs);

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

socket.on('state', (payload) => {
  if (payload?.roomId !== roomId) return;
  const now = Date.now();

  const { total } = countBots(payload);

  if (phase === 'enabling') {
    if (total >= botCount) {
      phase = 'movement-check';
      movementPhaseStartTs = now;
      firstBotPos = findBotPos(payload);
      // If there are no pellets / no movement yet, give it a few ticks.
      return;
    }
  }

  if (phase === 'movement-check') {
    const p = findBotPos(payload);
    if (firstBotPos && p && p.id === firstBotPos.id) {
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
      console.log(`[OK] bots spawned (${botCount}), movement=${moved}, then removed (roomId=${roomId})`);
      socket.close();
      process.exit(0);
    }
  }
});

socket.on('disconnect', (reason) => {
  if (phase === 'disabling') return;
  console.error('[FAIL] disconnected early:', reason);
  clearTimeout(timer);
  process.exit(1);
});
