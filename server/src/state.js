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

function normalizeAgarConfig(agar) {
  const pelletCount = Number.isFinite(agar?.pelletCount) ? clamp(Math.floor(agar.pelletCount), 0, 2000) : 260;
  const borderDeath = typeof agar?.borderDeath === 'boolean' ? agar.borderDeath : true;
  const pelletGrowthMul = Number.isFinite(agar?.pelletGrowthMul) ? clamp(agar.pelletGrowthMul, 0, 12) : 2.2;
  const speedMinMul = Number.isFinite(agar?.speedMinMul) ? clamp(agar.speedMinMul, 0.05, 1) : 0.35;
  const speedCurvePow = Number.isFinite(agar?.speedCurvePow) ? clamp(agar.speedCurvePow, 0.1, 4) : 1.0;
  const boostEnabled = typeof agar?.boostEnabled === 'boolean' ? agar.boostEnabled : true;
  const boostMul = Number.isFinite(agar?.boostMul) ? clamp(agar.boostMul, 1.0, 2.0) : 1.15;
  const deathMode = agar?.deathMode === 'respawn' || agar?.deathMode === 'kick' ? agar.deathMode : 'kick';

  // Growth cap: physical radius will not exceed this.
  // After reaching this cap, "吞噬能力" can still progress via power tiers derived from score.
  const maxRadius = Number.isFinite(agar?.maxRadius) ? clamp(agar.maxRadius, 18, 260) : 92;

  // Power tiers derived from score (no protocol changes needed: score is already in snapshots).
  const powerScoreStart = Number.isFinite(agar?.powerScoreStart) ? clamp(Math.floor(agar.powerScoreStart), 0, 1_000_000) : 140;
  const powerScoreStep = Number.isFinite(agar?.powerScoreStep) ? clamp(Math.floor(agar.powerScoreStep), 1, 1_000_000) : 80;
  const powerMaxTier = Number.isFinite(agar?.powerMaxTier) ? clamp(Math.floor(agar.powerMaxTier), 0, 50) : 10;

  // PVP (player eats player)
  const pvpEnabled = typeof agar?.pvpEnabled === 'boolean' ? agar.pvpEnabled : false;
  // Size ratio required to eat: predator.r >= victim.r * pvpEatRatio
  const pvpEatRatio = Number.isFinite(agar?.pvpEatRatio) ? clamp(agar.pvpEatRatio, 1.01, 3.0) : 1.15;
  // Minimum possible ratio after tier bonuses.
  const pvpEatRatioMin = Number.isFinite(agar?.pvpEatRatioMin) ? clamp(agar.pvpEatRatioMin, 1.001, pvpEatRatio) : 1.03;
  // How deep the victim must be inside the predator to count as eaten.
  // We compute: eatDist = predator.r - victim.r * pvpEatOffsetMul
  const pvpEatOffsetMul = Number.isFinite(agar?.pvpEatOffsetMul) ? clamp(agar.pvpEatOffsetMul, 0.0, 1.25) : 0.25;
  // How much of the victim's area converts into predator growth.
  const pvpGrowthMul = Number.isFinite(agar?.pvpGrowthMul) ? clamp(agar.pvpGrowthMul, 0.0, 2.0) : 1.0;

  // Tier bonuses (predatorTier - victimTier):
  // - Reduces required size ratio by pvpTierEatRatioBonus per tier advantage.
  // - Adds effective reach/size bonus (in radius units) via pvpTierBonusR.
  const pvpTierEatRatioBonus = Number.isFinite(agar?.pvpTierEatRatioBonus) ? clamp(agar.pvpTierEatRatioBonus, 0.0, 0.25) : 0.03;
  const pvpTierBonusR = Number.isFinite(agar?.pvpTierBonusR) ? clamp(agar.pvpTierBonusR, 0.0, 40.0) : 3.0;

  return {
    pelletCount,
    borderDeath,
    pelletGrowthMul,
    speedMinMul,
    speedCurvePow,
    boostEnabled,
    boostMul,
    deathMode,
    maxRadius,
    powerScoreStart,
    powerScoreStep,
    powerMaxTier,
    pvpEnabled,
    pvpEatRatio,
    pvpEatRatioMin,
    pvpEatOffsetMul,
    pvpGrowthMul,
    pvpTierEatRatioBonus,
    pvpTierBonusR
  };
}

export function createWorldState({ width, height }, { movement, agar } = {}) {
  const players = new Map();
  const inputs = new Map();

  const movementCfg = normalizeMovementConfig(movement);
  let agarCfg = normalizeAgarConfig(agar);

  const botIds = new Set();
  const botBrain = new Map();

  const events = [];

  const pellets = [];
  let pelletSeq = 0;

  function powerTierFromScore(score) {
    const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    if (agarCfg.powerMaxTier <= 0) return 0;
    if (s < agarCfg.powerScoreStart) return 0;
    const tier = 1 + Math.floor((s - agarCfg.powerScoreStart) / agarCfg.powerScoreStep);
    return clamp(tier, 0, agarCfg.powerMaxTier);
  }
  function addPellet() {
    pellets.push({
      id: `p${pelletSeq++}`,
      x: rand(40, width - 40),
      y: rand(40, height - 40),
      r: rand(3.5, 6.5)
    });
  }
  function reconcilePelletCount(targetCount) {
    const target = clamp(Math.floor(targetCount), 0, 2000);
    while (pellets.length < target) addPellet();
    if (pellets.length > target) pellets.length = target;
  }
  reconcilePelletCount(agarCfg.pelletCount);

  function setAgarConfig(next) {
    const merged = { ...agarCfg, ...(next && typeof next === 'object' ? next : {}) };
    agarCfg = normalizeAgarConfig(merged);
    reconcilePelletCount(agarCfg.pelletCount);
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
      const sizePenalty = clamp(Math.pow(18 / p.r, agarCfg.speedCurvePow), agarCfg.speedMinMul, 1.0);
      const boostMul = input.boost && agarCfg.boostEnabled ? agarCfg.boostMul : 1.0;
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

      if (agarCfg.borderDeath) {
        // Simple fail condition: touching the world boundary => game over.
        // This gives us a deterministic "lose" signal for the prototype.
        const onBorder =
          p.x <= p.r + 0.001 ||
          p.x >= width - p.r - 0.001 ||
          p.y <= p.r + 0.001 ||
          p.y >= height - p.r - 0.001;
        if (onBorder) {
          if (agarCfg.deathMode === 'respawn') {
            events.push({ type: 'respawn', id, score: p.score, reason: 'border' });
            p.x = rand(100, width - 100);
            p.y = rand(100, height - 100);
            p.vx = 0;
            p.vy = 0;
            p.r = 18;
            p.score = 0;
          } else {
            died.push({ id, score: p.score, reason: 'border' });
          }
          continue;
        }
      }

      // pellet collection
      const eatR = p.r + 6;
      const eatR2 = eatR * eatR;
      for (let i = 0; i < pellets.length; i++) {
        const pel = pellets[i];
        if (dist2(p.x, p.y, pel.x, pel.y) <= eatR2) {
          p.score += 1;
          // area-based growth, capped
          const area = Math.PI * p.r * p.r + Math.PI * pel.r * pel.r * agarCfg.pelletGrowthMul;
          p.r = clamp(Math.sqrt(area / Math.PI), 12, agarCfg.maxRadius);
          // respawn pellet
          pel.x = rand(30, width - 30);
          pel.y = rand(30, height - 30);
          pel.r = rand(3.5, 6.5);
        }
      }
    }

    // PVP: player eats player
    if (agarCfg.pvpEnabled && players.size >= 2) {
      // Deterministic processing: larger first, stable tie-break by id.
      const arr = Array.from(players.values());
      arr.sort((a, b) => {
        const aTier = powerTierFromScore(a?.score);
        const bTier = powerTierFromScore(b?.score);
        const aEff = (a?.r || 0) + aTier * agarCfg.pvpTierBonusR;
        const bEff = (b?.r || 0) + bTier * agarCfg.pvpTierBonusR;
        return (bEff - aEff) || String(a.id).localeCompare(String(b.id));
      });

      const eatenThisStep = new Set();

      for (let i = 0; i < arr.length; i++) {
        const predator = arr[i];
        if (!predator) continue;
        if (eatenThisStep.has(predator.id)) continue;
        if (!players.has(predator.id)) continue;

        for (let j = arr.length - 1; j >= 0; j--) {
          const victim = arr[j];
          if (!victim) continue;
          if (victim.id === predator.id) continue;
          if (eatenThisStep.has(victim.id)) continue;
          if (!players.has(victim.id)) continue;

          const predatorTier = powerTierFromScore(predator.score);
          const victimTier = powerTierFromScore(victim.score);
          const tierAdv = Math.max(0, predatorTier - victimTier);

          const requiredRatio = clamp(
            agarCfg.pvpEatRatio - tierAdv * agarCfg.pvpTierEatRatioBonus,
            agarCfg.pvpEatRatioMin,
            agarCfg.pvpEatRatio
          );

          const predatorEffR = predator.r + tierAdv * agarCfg.pvpTierBonusR;

          // Must be sufficiently larger.
          if (!(predatorEffR >= victim.r * requiredRatio)) continue;

          const dx = predator.x - victim.x;
          const dy = predator.y - victim.y;
          const d2 = dx * dx + dy * dy;

          const eatDist = predatorEffR - victim.r * agarCfg.pvpEatOffsetMul;
          if (eatDist <= 0) continue;
          if (d2 > eatDist * eatDist) continue;

          // Eat!
          const victimScore = victim.score ?? 0;

          // Growth: add (victim area * pvpGrowthMul) to predator.
          const predArea = Math.PI * predator.r * predator.r;
          const vicArea = Math.PI * victim.r * victim.r;
          const nextArea = predArea + vicArea * agarCfg.pvpGrowthMul;
          predator.r = clamp(Math.sqrt(nextArea / Math.PI), 12, agarCfg.maxRadius);

          // Score bump for kills (keep it meaningful vs pellets).
          predator.score = (predator.score ?? 0) + Math.max(10, Math.round(victim.r));

          if (agarCfg.deathMode === 'respawn') {
            // Respawn victim immediately (no game over), reset to base size.
            events.push({ type: 'respawn', id: victim.id, score: victimScore, reason: 'eaten', by: predator.id });
            victim.x = rand(100, width - 100);
            victim.y = rand(100, height - 100);
            victim.vx = 0;
            victim.vy = 0;
            victim.r = 18;
            victim.score = 0;
          } else {
            died.push({ id: victim.id, score: victimScore, reason: 'eaten', by: predator.id });
            eatenThisStep.add(victim.id);
          }
        }
      }
    }

    if (died.length) {
      for (const d of died) {
        events.push({ type: 'dead', id: d.id, score: d.score, reason: d.reason || 'dead', by: d.by });
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
    setAgarConfig,
    step,
    drainEvents,
    getSnapshot,
    getWorldInfo
  };
}
