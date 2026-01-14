# Rules API (draft)

This doc defines a practical rules interface so the same networking/rooms/input stack can power multiple IO game variants (Agar/Snake/Slither/Paper/Pacer).

## Goals

- **Server authoritative** simulation.
- **Swap rules** without rewriting rooms/sessions/networking.
- **Stable snapshots** for clients to render.
- Support both:
  - continuous movement (Agar/Pacer/Slither)
  - discrete-ish movement (Snake)
  - territory simulation (Paper)

## Core concepts

### World
A world is the authoritative state for one room.

### Input
Client sends a compact input message. Rules decide how to interpret it.

Recommended baseline input shape:

```js
// normalized direction + optional actions
{ ax: -1..1, ay: -1..1, boost?: boolean }
```

Rules can extend input (e.g. `throttle`, `turn`, `split`, `eject`) but should keep it small.

### Snapshot
A snapshot is what the server broadcasts to clients.

Principles:
- snapshots are **plain JSON**
- stable keys
- include `ts` (server timestamp) and `roomId`
- include all entities required for rendering

## Interface

A rules module exports a factory:

```js
export function createRules(options) {
  return {
    id: 'agar-lite',

    // called once per room
    createWorld(worldInfo) { ... },

    // membership lifecycle
    addPlayer(world, playerId, meta) { ... },
    removePlayer(world, playerId) { ... },

    // input path (called by RoomManager)
    setInput(world, playerId, input) { ... },

    // authoritative simulation
    step(world, dt) { ... },

    // server -> client state
    getSnapshot(world) { ... },

    // optional events channel (kills, pickups, etc.)
    drainEvents?.(world) { ... }
  }
}
```

### `worldInfo`
Provided by the framework per room:

```js
{ width, height, tickHz, broadcastHz, roomId }
```

### `meta`
Per-player metadata:

```js
{ name?: string, isBot?: boolean }
```

## Integration points (in this repo)

Current core is in `server/src/*`.

Planned integration steps:
1. Add `rulesId` to room creation.
2. `createGame()` owns a rules instance + a world.
3. `RoomManager.setInput()` calls `game.setInput()`.
4. Broadcast uses `game.getSnapshot()`.

## Notes by game type

### Agar-like
- world entities: players, pellets, viruses
- snapshots: circles with radius + score
- rules config: speed scaling by mass, eat thresholds

### Snake-like
- world entities: snakes (arrays of segments), pellets
- input: desired heading; server enforces turn constraints
- snapshots: polylines or segment arrays

### Slither-like
- similar to snake, but continuous + smoothing; turning rate-limited

### Paper-like
- territory representation: grid (simpler) or polygon (harder)
- snapshots: territory ownership + trail

### Pacer-like
- track: waypoints + lap state
- input: steering + throttle; optionally drift/boost

## Backwards compatibility

Until the rules API is wired in, the existing prototype remains the default behavior.
This doc and `server/src/rules/*` are scaffolding for the next refactor.
