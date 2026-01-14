import { io } from 'socket.io-client';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms, label) {
  let t = null;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms${label ? `: ${label}` : ''}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function waitForEvent(socket, eventName, { timeoutMs = 3000, predicate } = {}) {
  return withTimeout(
    new Promise((resolve) => {
      const handler = (...args) => {
        try {
          if (predicate && !predicate(...args)) return;
        } catch {
          return;
        }
        socket.off(eventName, handler);
        resolve(args);
      };
      socket.on(eventName, handler);
    }),
    timeoutMs,
    `event ${eventName}`
  );
}

async function waitForState(socket, { timeoutMs = 4000, predicate } = {}) {
  return withTimeout(
    new Promise((resolve) => {
      const handler = (snap) => {
        try {
          if (predicate && !predicate(snap)) return;
        } catch {
          return;
        }
        socket.off('state', handler);
        resolve(snap);
      };
      socket.on('state', handler);
    }),
    timeoutMs,
    'state'
  );
}

async function setNick(socket, nick) {
  socket.emit('profile:set', { nick });
  const [payload] = await waitForEvent(socket, 'profile:ok', { timeoutMs: 3000 });
  if (!payload?.nick) throw new Error('profile:ok missing nick');
  return payload.nick;
}

async function waitForAuth(socket) {
  const [payload] = await waitForEvent(socket, 'auth', { timeoutMs: 3000 });
  if (!payload?.playerId) throw new Error('auth missing playerId');
  return payload;
}

async function connectAndAuth(socket, { timeoutMs = 4000 } = {}) {
  const authP = waitForAuth(socket);
  await waitForEvent(socket, 'connect', { timeoutMs });
  return await authP;
}

async function joinPlay(socket, { rulesId, rulesConfig }) {
  // Use an explicit room id so the demo is deterministic and doesn't reuse an existing quick-match room.
  const roomId = `demo-${rulesId}-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e6).toString(16)}`;
  socket.emit('room:join', { roomId, mode: 'play', rulesId, rulesConfig });
  const [{ room, mode }] = await waitForEvent(socket, 'room:joined', { timeoutMs: 5000 });
  if (!room?.id) throw new Error('room:joined missing room.id');
  const worldWidth = Number.isFinite(room?.world?.width) ? room.world.width : null;
  const worldHeight = Number.isFinite(room?.world?.height) ? room.world.height : null;
  return { roomId: room.id, mode, room };
}

async function setRulesConfig(socket, { rulesConfig }) {
  socket.emit('rules:setConfig', { rulesConfig });
  await waitForEvent(socket, 'rules:ok', { timeoutMs: 3000 });
}

async function driveToRightBorder(socket, { durationMs = 2200, tickMs = 60 } = {}) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    socket.emit('input', { ax: 1, ay: 0, boost: true });
    await sleep(tickMs);
  }
  socket.emit('input', { ax: 0, ay: 0, boost: false });
}

async function waitUntilAtRightBorder(socket, { roomId, playerId, worldWidth, timeoutMs = 15000 } = {}) {
  if (!Number.isFinite(worldWidth)) throw new Error('waitUntilAtRightBorder requires worldWidth');
  return await waitForState(socket, {
    timeoutMs,
    predicate: (s) => {
      if (s?.roomId !== roomId) return false;
      const me = Array.isArray(s?.players) ? s.players.find((p) => p?.id === playerId) : null;
      if (!me) return false;
      const r = Number.isFinite(me?.r) ? me.r : 18;
      return Number.isFinite(me?.x) && me.x >= worldWidth - r - 0.75;
    }
  });
}

async function waitForRespawnJump(socket, { roomId, playerId, worldWidth, timeoutMs = 15000 } = {}) {
  if (!Number.isFinite(worldWidth)) throw new Error('waitForRespawnJump requires worldWidth');
  let lastX = null;
  return await waitForState(socket, {
    timeoutMs,
    predicate: (s) => {
      if (s?.roomId !== roomId) return false;
      const me = Array.isArray(s?.players) ? s.players.find((p) => p?.id === playerId) : null;
      if (!me) return false;
      if (!Number.isFinite(me?.x)) return false;

      const x = me.x;
      const ok =
        Number.isFinite(lastX) &&
        lastX > worldWidth - 220 &&
        x < lastX - 200; // big jump backwards implies respawn

      lastX = x;
      return ok;
    }
  });
}

async function demoLivePelletTuning({ baseUrl, rulesId }) {
  console.log(`\n[demo] live tuning pelletCount via rules:setConfig (${rulesId})`);
  const socket = io(baseUrl, { transports: ['websocket'] });
  try {
    await connectAndAuth(socket, { timeoutMs: 4000 });
    await setNick(socket, 'demo');

    const initial = { agar: { pelletCount: 40 } };
    const { roomId } = await joinPlay(socket, { rulesId, rulesConfig: initial });

    const first = await waitForState(socket, {
      timeoutMs: 5000,
      predicate: (s) => s?.roomId === roomId && Array.isArray(s?.pellets) && s.pellets.length === 40
    });
    console.log(`[demo] joined room=${roomId} rulesId=${first?.rulesId} pellets=${first.pellets.length}`);

    const updated = { agar: { pelletCount: 15 } };
    await setRulesConfig(socket, { rulesConfig: updated });

    const after = await waitForState(socket, {
      timeoutMs: 5000,
      predicate: (s) => s?.roomId === roomId && Array.isArray(s?.pellets) && s.pellets.length === 15
    });
    console.log(`[demo] updated rulesConfig -> pellets=${after.pellets.length} (expected 15)`);
  } finally {
    socket.disconnect();
  }
}

async function demoBorderDeathDifference({ baseUrl }) {
  console.log(`\n[demo] borderDeath behavior difference (agar-lite vs agar-advanced)`);

  // Case A: agar-lite default: borderDeath=true + deathMode=kick => should emit game:over when driven to border.
  {
    const socket = io(baseUrl, { transports: ['websocket'] });
    try {
      const { playerId } = await connectAndAuth(socket, { timeoutMs: 4000 });
      await setNick(socket, 'borderA');
      const { roomId } = await joinPlay(socket, {
        rulesId: 'agar-lite',
        rulesConfig: { agar: { borderDeath: true, deathMode: 'kick', boostEnabled: true, boostMul: 2.0 } }
      });

      console.log(`[demo] agar-lite room=${roomId} driving to border...`);
      const overP = waitForEvent(socket, 'game:over', { timeoutMs: 16000 });
      await driveToRightBorder(socket, { durationMs: 12000 });
      const [payload] = await overP;
      console.log(`[demo] agar-lite -> game:over reason=${payload?.reason || 'unknown'} score=${payload?.score ?? 0}`);
    } finally {
      socket.disconnect();
    }
  }

  // Case B: agar-advanced default: borderDeath=false => should NOT emit game:over when driven to border.
  {
    const socket = io(baseUrl, { transports: ['websocket'] });
    try {
      const { playerId } = await connectAndAuth(socket, { timeoutMs: 4000 });
      await setNick(socket, 'borderB');
      const { roomId, room } = await joinPlay(socket, {
        rulesId: 'agar-advanced',
        rulesConfig: { agar: { borderDeath: false, boostEnabled: true, boostMul: 2.0 } }
      });

      console.log(`[demo] agar-advanced room=${roomId} driving to border...`);
      let gotOver = false;
      socket.on('game:over', () => {
        gotOver = true;
      });

      await driveToRightBorder(socket, { durationMs: 12000 });
      const snapAtBorder = await waitUntilAtRightBorder(socket, {
        roomId,
        playerId,
        worldWidth: room?.world?.width,
        timeoutMs: 12000
      });
      if (gotOver) throw new Error('Unexpected game:over for agar-advanced with borderDeath=false');
      console.log(`[demo] agar-advanced -> reached border at x≈${Math.round(snapAtBorder.players.find((p) => p.id === playerId).x)}; no game:over (expected)`);
    } finally {
      socket.disconnect();
    }
  }

  // Case C: agar-lite with borderDeath=true but deathMode=respawn => should NOT emit game:over.
  {
    const socket = io(baseUrl, { transports: ['websocket'] });
    try {
      const { playerId } = await connectAndAuth(socket, { timeoutMs: 4000 });
      await setNick(socket, 'borderC');
      const { roomId, room } = await joinPlay(socket, {
        rulesId: 'agar-lite',
        rulesConfig: { agar: { borderDeath: true, deathMode: 'respawn', boostEnabled: true, boostMul: 2.0 } }
      });

      console.log(`[demo] agar-lite(respawn) room=${roomId} driving to border...`);
      let gotOver = false;
      socket.on('game:over', () => {
        gotOver = true;
      });

      const respawnP = waitForRespawnJump(socket, {
        roomId,
        playerId,
        worldWidth: room?.world?.width,
        timeoutMs: 18000
      });

      await driveToRightBorder(socket, { durationMs: 14000 });
      const afterRespawn = await respawnP;

      if (gotOver) throw new Error('Unexpected game:over for agar-lite with deathMode=respawn');
      const me = afterRespawn.players.find((p) => p.id === playerId);
      console.log(`[demo] agar-lite(respawn) -> no game:over; observed respawn jump (now x≈${Math.round(me?.x ?? 0)})`);
    } finally {
      socket.disconnect();
    }
  }
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:6868';
  console.log('[demo] baseUrl =', baseUrl);

  await demoLivePelletTuning({ baseUrl, rulesId: 'agar-lite' });
  await demoLivePelletTuning({ baseUrl, rulesId: 'agar-advanced' });
  await demoBorderDeathDifference({ baseUrl });

  console.log('\n[demo] done');
}

main().catch((err) => {
  console.error('[demo] failed:', err);
  process.exit(1);
});
