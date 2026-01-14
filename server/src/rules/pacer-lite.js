import './types.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function createPacerLiteRules({ movement } = {}) {
  const cfg = {
    // placeholder defaults
    maxSpeed: Number.isFinite(movement?.maxSpeed) ? Math.max(1, movement.maxSpeed) : 520,
    accel: Number.isFinite(movement?.accel) ? Math.max(0, movement.accel) : 1400,
    friction: Number.isFinite(movement?.friction) ? Math.max(0, movement.friction) : 6,
    turnRate: Number.isFinite(movement?.turnRate) ? Math.max(0, movement.turnRate) : 3.2
  };

  return {
    id: 'pacer-lite',

    createWorld(worldInfo) {
      return {
        worldInfo,
        cfg,
        players: new Map(),
        inputs: new Map(),
        // v1: a simple loop of waypoints
        track: {
          waypoints: [
            { x: worldInfo.width * 0.2, y: worldInfo.height * 0.2 },
            { x: worldInfo.width * 0.8, y: worldInfo.height * 0.2 },
            { x: worldInfo.width * 0.8, y: worldInfo.height * 0.8 },
            { x: worldInfo.width * 0.2, y: worldInfo.height * 0.8 }
          ]
        },
        ts: Date.now()
      };
    },

    addPlayer(world, playerId, meta = {}) {
      world.players.set(playerId, {
        id: playerId,
        name: typeof meta.name === 'string' ? meta.name.slice(0, 16) : '',
        isBot: Boolean(meta.isBot),
        x: world.worldInfo.width * 0.5,
        y: world.worldInfo.height * 0.5,
        vx: 0,
        vy: 0,
        heading: 0,
        lap: 0,
        nextWp: 0
      });
      world.inputs.set(playerId, { ax: 0, ay: 0, boost: false });
    },

    removePlayer(world, playerId) {
      world.players.delete(playerId);
      world.inputs.delete(playerId);
    },

    setInput(world, playerId, input) {
      if (!world.inputs.has(playerId)) return;
      const ax = Number.isFinite(input?.ax) ? clamp(input.ax, -1, 1) : 0;
      const ay = Number.isFinite(input?.ay) ? clamp(input.ay, -1, 1) : 0;
      const boost = Boolean(input?.boost);
      world.inputs.set(playerId, { ax, ay, boost });
    },

    step(world, dt) {
      // placeholder: treat (ax, ay) as desired direction, convert to velocity.
      // Proper pacer-lite should be turn-rate limited using `heading`.
      for (const [id, p] of world.players) {
        const input = world.inputs.get(id) || { ax: 0, ay: 0, boost: false };
        const len = Math.hypot(input.ax, input.ay);
        const nx = len > 0.0001 ? input.ax / len : 0;
        const ny = len > 0.0001 ? input.ay / len : 0;

        const targetVx = nx * cfg.maxSpeed;
        const targetVy = ny * cfg.maxSpeed;

        const blend = clamp(dt * 6, 0, 1);
        p.vx = p.vx + (targetVx - p.vx) * blend;
        p.vy = p.vy + (targetVy - p.vy) * blend;

        p.x = clamp(p.x + p.vx * dt, 0, world.worldInfo.width);
        p.y = clamp(p.y + p.vy * dt, 0, world.worldInfo.height);
      }
      world.ts = Date.now();
    },

    getSnapshot(world) {
      return {
        ts: world.ts,
        world: { width: world.worldInfo.width, height: world.worldInfo.height },
        players: Array.from(world.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          x: p.x,
          y: p.y,
          vx: p.vx,
          vy: p.vy,
          lap: p.lap,
          nextWp: p.nextWp
        })),
        track: world.track
      };
    }
  };
}
