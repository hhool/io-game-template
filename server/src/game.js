import { createWorldState } from './state.js';

export function createGame({ tickHz, broadcastHz, world }) {
  const worldState = createWorldState(world);

  let tickTimer = null;
  let broadcastTimer = null;

  const tickIntervalMs = Math.max(5, Math.floor(1000 / tickHz));
  const broadcastIntervalMs = Math.max(10, Math.floor(1000 / broadcastHz));

  function start(broadcastFn) {
    if (tickTimer || broadcastTimer) return;

    tickTimer = setInterval(() => {
      worldState.step(tickIntervalMs / 1000);
    }, tickIntervalMs);

    broadcastTimer = setInterval(() => {
      broadcastFn();
    }, broadcastIntervalMs);

    console.log(`[game] started tick=${tickHz}Hz broadcast=${broadcastHz}Hz`);
  }

  function stop() {
    if (tickTimer) clearInterval(tickTimer);
    if (broadcastTimer) clearInterval(broadcastTimer);
    tickTimer = null;
    broadcastTimer = null;
  }

  return {
    start,
    stop,
    addPlayer: worldState.addPlayer,
    setPlayerName: worldState.setPlayerName,
    removePlayer: worldState.removePlayer,
    setPlayerInput: worldState.setPlayerInput,
    hasPlayer: worldState.hasPlayer,
    drainEvents: worldState.drainEvents,
    getSnapshot: worldState.getSnapshot,
    getWorldInfo: () => ({ ...worldState.getWorldInfo(), tickHz, broadcastHz })
  };
}
