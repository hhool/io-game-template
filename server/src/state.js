function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomColor() {
  const palette = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#64b5f6'];
  return palette[(Math.random() * palette.length) | 0];
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function normalizeMovementConfig(movement) {
  const baseSpeed = Number.isFinite(movement?.baseSpeed) ? Math.max(1, movement.baseSpeed) : 192;
  const damping = Number.isFinite(movement?.damping) ? Math.max(0, movement.damping) : 0.2;
  const blendMax = Number.isFinite(movement?.blendMax) ? clamp(movement.blendMax, 0, 1) : 0.5;
  return { baseSpeed, damping, blendMax };
}

export function createWorldState({ width, height }, { movement } = {}) {
  const players = new Map();
  const inputs = new Map();

  const movementCfg = normalizeMovementConfig(movement);

  const botIds = new Set();
  const botBrain = new Map();

  const events = [];

  const pellets = [];
  const pelletCount = 260;
  for (let i = 0; i < pelletCount; i++) {
    pellets.push({
      id: `p${i}`,
      x: rand(40, width - 40),
      y: rand(40, height - 40),
      r: rand(3.5, 6.5)
    });
  }

  function addPlayer(id, { name, isBot } = {}) {
    if (players.has(id)) {
      const existing = players.get(id);
      if (typeof name === 'string' && name.trim()) existing.name = name.trim();
      return { id: existing.id, x: existing.x, y: existing.y, r: existing.r, color: existing.color };
    }
    const player = {
      id,
      name: typeof name === 'string' && name.trim() ? name.trim() : '',
      isBot: Boolean(isBot),
      x: rand(100, width - 100),
      y: rand(100, height - 100),
      vx: 0,
      vy: 0,
      r: 18,
      color: randomColor(),
      score: 0,
      ts: Date.now()
    };
    players.set(id, player);
    inputs.set(id, { ax: 0, ay: 0, boost: false });

    if (player.isBot) {
      botIds.add(id);
      botBrain.set(id, {
        targetX: rand(80, width - 80),
        targetY: rand(80, height - 80),
        nextThinkAt: 0
      });
    }

    return { id: player.id, x: player.x, y: player.y, r: player.r, color: player.color };
  }

  function setPlayerName(id, name) {
    const p = players.get(id);
    if (!p) return;
    if (typeof name !== 'string') return;
    p.name = name.trim().slice(0, 16);
  }

  function removePlayer(id) {
    players.delete(id);
    inputs.delete(id);
    botIds.delete(id);
    botBrain.delete(id);
  }

  function setPlayerInput(id, input) {
    if (!inputs.has(id)) return;
    const ax = Number.isFinite(input?.ax) ? clamp(input.ax, -1, 1) : 0;
    const ay = Number.isFinite(input?.ay) ? clamp(input.ay, -1, 1) : 0;
    const boost = Boolean(input?.boost);
    inputs.set(id, { ax, ay, boost });
  }

  function hasPlayer(id) {
    return players.has(id);
  }

  function botThinkAndSetInput(p) {
    const brain = botBrain.get(p.id);
    if (!brain) return;

    const t = Date.now();
    const safe = 90;

    // Avoid borders
    if (p.x < safe || p.x > width - safe || p.y < safe || p.y > height - safe) {
      brain.targetX = width / 2;
      brain.targetY = height / 2;
      brain.nextThinkAt = t + 250;
    }

    // Periodically pick a new target: nearest pellet
    if (t >= brain.nextThinkAt) {
      let best = null;
      let bestD2 = Infinity;
      for (let i = 0; i < pellets.length; i++) {
        const pel = pellets[i];
        const d2 = dist2(p.x, p.y, pel.x, pel.y);
        if (d2 < bestD2) {
          bestD2 = d2;
          best = pel;
        }
      }
      if (best) {
        brain.targetX = best.x;
        brain.targetY = best.y;
      } else {
        brain.targetX = rand(80, width - 80);
        brain.targetY = rand(80, height - 80);
      }
      brain.nextThinkAt = t + rand(220, 520);
    }

    const dx = brain.targetX - p.x;
    const dy = brain.targetY - p.y;
    const len = Math.hypot(dx, dy);
    const ax = len > 0.0001 ? dx / len : 0;
    const ay = len > 0.0001 ? dy / len : 0;
    const boost = len > 420;
    inputs.set(p.id, { ax: clamp(ax, -1, 1), ay: clamp(ay, -1, 1), boost });
  }

  function step(dt) {
    // movement constants
    const died = [];

    // AI: update bot inputs first
    if (botIds.size) {
      for (const id of botIds) {
        const p = players.get(id);
        if (!p) continue;
        botThinkAndSetInput(p);
      }
    }

    for (const [id, p] of players) {
      const input = inputs.get(id) ?? { ax: 0, ay: 0, boost: false };

      // Agar-style: bigger => slower
      const baseSpeed = movementCfg.baseSpeed;
      const sizePenalty = clamp(18 / p.r, 0.35, 1.0);
      const boostMul = input.boost ? 1.15 : 1.0;
      const speed = baseSpeed * sizePenalty * boostMul;

      const len = Math.hypot(input.ax, input.ay);
      const nx = len > 0.0001 ? input.ax / len : 0;
      const ny = len > 0.0001 ? input.ay / len : 0;

      // smooth velocity
      const targetVx = nx * speed;
      const targetVy = ny * speed;
      // Lower blend -> slower acceleration/deceleration (less snappy)
      const blend = clamp(dt * movementCfg.damping, 0, movementCfg.blendMax);
      p.vx = p.vx + (targetVx - p.vx) * blend;
      p.vy = p.vy + (targetVy - p.vy) * blend;

      p.x = clamp(p.x + p.vx * dt, p.r, width - p.r);
      p.y = clamp(p.y + p.vy * dt, p.r, height - p.r);
      p.ts = Date.now();

      // Simple fail condition: touching the world boundary => game over.
      // This gives us a deterministic "lose" signal for the prototype.
      const onBorder =
        p.x <= p.r + 0.001 ||
        p.x >= width - p.r - 0.001 ||
        p.y <= p.r + 0.001 ||
        p.y >= height - p.r - 0.001;
      if (onBorder) {
        died.push({ id, score: p.score });
        continue;
      }

      // pellet collection
      const eatR = p.r + 6;
      const eatR2 = eatR * eatR;
      for (let i = 0; i < pellets.length; i++) {
        const pel = pellets[i];
        if (dist2(p.x, p.y, pel.x, pel.y) <= eatR2) {
          p.score += 1;
          // area-based growth, capped
          const area = Math.PI * p.r * p.r + Math.PI * pel.r * pel.r * 2.2;
          p.r = clamp(Math.sqrt(area / Math.PI), 12, 120);
          // respawn pellet
          pel.x = rand(30, width - 30);
          pel.y = rand(30, height - 30);
          pel.r = rand(3.5, 6.5);
        }
      }
    }

    if (died.length) {
      for (const d of died) {
        events.push({ type: 'dead', id: d.id, score: d.score, reason: 'border' });
        removePlayer(d.id);
      }
    }
  }

  function drainEvents() {
    return events.splice(0, events.length);
  }

  function getSnapshot() {
    return {
      ts: Date.now(),
      players: Array.from(players.values(), (p) => ({
        id: p.id,
        name: p.name || '',
        isBot: Boolean(p.isBot),
        x: p.x,
        y: p.y,
        r: p.r,
        color: p.color,
        score: p.score
      })),
      pellets
    };
  }

  function getWorldInfo() {
    return { width, height };
  }

  return {
    addPlayer,
    setPlayerName,
    removePlayer,
    setPlayerInput,
    hasPlayer,
    step,
    drainEvents,
    getSnapshot,
    getWorldInfo
  };
}
