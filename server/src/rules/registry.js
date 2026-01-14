import { createWorldState } from '../state.js';
import { createPaperLiteRules } from './paper-lite.js';

const DEFAULT_RULES_ID = 'agar-lite';

export const RULES_CATALOG = Object.freeze([
  { id: 'agar-lite', label: 'agar-lite' },
  { id: 'agar-advanced', label: 'agar-advanced' },
  { id: 'paper-lite', label: 'paper-lite' }
]);

export function listRules() {
  return RULES_CATALOG.slice();
}

/**
 * @param {any} rulesId
 */
export function normalizeRulesId(rulesId) {
  if (typeof rulesId !== 'string') return DEFAULT_RULES_ID;
  const id = rulesId.trim().toLowerCase();
  if (id === 'agar-lite') return 'agar-lite';
  if (id === 'agar-advanced') return 'agar-advanced';
  if (id === 'paper-lite') return 'paper-lite';
  return DEFAULT_RULES_ID;
}

/**
 * Returns a world-state object that matches the legacy `createWorldState()` API:
 * { addPlayer, setPlayerName, removePlayer, setPlayerInput, hasPlayer, step, drainEvents, getSnapshot, getWorldInfo }
 */
export function createWorldStateForRules({ rulesId, world, movement, rulesConfig }) {
  const normalized = normalizeRulesId(rulesId);

  if (normalized === 'paper-lite') {
    const rules = createPaperLiteRules({ movement });
    const w = rules.createWorld({ width: world.width, height: world.height });

    return {
      addPlayer: (id, meta) => rules.addPlayer(w, id, meta),
      setPlayerName: (id, name) => {
        const p = w.players?.get?.(id);
        if (!p) return;
        if (typeof name !== 'string') return;
        p.name = name.trim().slice(0, 16);
      },
      removePlayer: (id) => rules.removePlayer(w, id),
      setPlayerInput: (id, input) => rules.setInput(w, id, input),
      hasPlayer: (id) => Boolean(w.players?.has?.(id)),
      step: (dt) => rules.step(w, dt),
      drainEvents: () => [],
      getSnapshot: () => ({ rulesId: rules.id, ...rules.getSnapshot(w), pellets: [] }),
      getWorldInfo: () => ({ width: world.width, height: world.height, rulesId: rules.id })
    };
  }

  // Agar simulation: agar-advanced currently shares the same core logic as agar-lite,
  // but we allow a couple of config switches to introduce real differences.
  const rulesOut = normalized === 'agar-advanced' ? 'agar-advanced' : 'agar-lite';

  const parseBool = (v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return null;
    if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
    return null;
  };
  const parseIntOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : null;
  };

  const parseFloatOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const agarDefaults =
    rulesOut === 'agar-advanced'
      ? {
          borderDeath: false,
          pelletCount: 320,
          pelletGrowthMul: 2.6,
          speedMinMul: 0.25,
          speedCurvePow: 1.25,
          boostEnabled: false,
          boostMul: 1.15,
          deathMode: 'respawn'
        }
      : {
          borderDeath: true,
          pelletCount: 260,
          pelletGrowthMul: 2.2,
          speedMinMul: 0.35,
          speedCurvePow: 1.0,
          boostEnabled: true,
          boostMul: 1.15,
          deathMode: 'kick'
        };

  const envPrefix = rulesOut === 'agar-advanced' ? 'AGAR_ADV' : 'AGAR_LITE';
  const borderDeathEnv = parseBool(process.env[`${envPrefix}_BORDER_DEATH`]);
  const pelletCountEnv = parseIntOrNull(process.env[`${envPrefix}_PELLET_COUNT`]);
  const pelletGrowthMulEnv = parseFloatOrNull(process.env[`${envPrefix}_PELLET_GROWTH_MUL`]);

  const cfgAgar = rulesConfig && typeof rulesConfig === 'object' ? rulesConfig.agar : null;

  const agar = {
    borderDeath: typeof cfgAgar?.borderDeath === 'boolean' ? cfgAgar.borderDeath : borderDeathEnv ?? agarDefaults.borderDeath,
    pelletCount: Number.isFinite(cfgAgar?.pelletCount) ? cfgAgar.pelletCount : pelletCountEnv ?? agarDefaults.pelletCount,
    pelletGrowthMul: Number.isFinite(cfgAgar?.pelletGrowthMul) ? cfgAgar.pelletGrowthMul : pelletGrowthMulEnv ?? agarDefaults.pelletGrowthMul,

    speedMinMul: Number.isFinite(cfgAgar?.speedMinMul) ? cfgAgar.speedMinMul : agarDefaults.speedMinMul,
    speedCurvePow: Number.isFinite(cfgAgar?.speedCurvePow) ? cfgAgar.speedCurvePow : agarDefaults.speedCurvePow,
    boostEnabled: typeof cfgAgar?.boostEnabled === 'boolean' ? cfgAgar.boostEnabled : agarDefaults.boostEnabled,
    boostMul: Number.isFinite(cfgAgar?.boostMul) ? cfgAgar.boostMul : agarDefaults.boostMul,
    deathMode: cfgAgar?.deathMode === 'respawn' || cfgAgar?.deathMode === 'kick' ? cfgAgar.deathMode : agarDefaults.deathMode
  };

  const ws = createWorldState({ width: world.width, height: world.height }, { movement, agar });
  return {
    ...ws,
    setRulesConfig: (nextRulesConfig) => {
      const nextAgar = nextRulesConfig && typeof nextRulesConfig === 'object' ? nextRulesConfig.agar : null;
      if (!nextAgar || typeof nextAgar !== 'object') return;
      ws.setAgarConfig?.(nextAgar);
    },
    getSnapshot: () => ({ rulesId: rulesOut, ...ws.getSnapshot() }),
    getWorldInfo: () => ({ ...ws.getWorldInfo(), rulesId: rulesOut })
  };
}
