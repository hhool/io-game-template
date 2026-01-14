# Rules API (draft → partially implemented)

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

Status (as of 2026-01-14): `rulesId` is wired end-to-end.

Implemented integration steps:
1. ✅ Add `rulesId` to room creation / matchmaking.
2. ✅ `createGame()` selects a ruleset and owns a world-state.
3. ✅ Input path goes through the per-room game/world.
4. ✅ Broadcast uses `game.getSnapshot()` (snapshots include `rulesId`).

Where in code:
- Rules selection/adapter: `server/src/rules/registry.js`
- Game wrapper: `server/src/game.js`
- Room + matchmaking: `server/src/rooms.js`
- Join payload: `server/index.js` (`mm:join` / `room:join` accept `rulesId`)

## Selecting a ruleset

### URL param (current client)
The default client reads `rules` / `rulesId` from the URL and forwards it on join:

- `/?rules=agar-lite` (default)
- `/?rules=paper-lite`

### Join payload (Socket.IO)
You can also specify it directly:

```js
socket.emit('mm:join', { mode: 'play', rulesId: 'paper-lite' })
```

Notes:
- Quick match groups rooms by `rulesId` (it won’t mix different rulesets).
- For now, the framework keeps backward compatibility by adapting rules modules to the existing world-state API.

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

The existing Agar-like prototype remains the default behavior (`agar-lite`).

Current implementation uses an adapter layer so existing core code can keep calling:
`addPlayer/removePlayer/setPlayerInput/step/getSnapshot`.

As more rulesets land, the plan is to converge on the pure rules interface defined above
(and let `createGame()` directly wrap rules/world without the legacy adapter shape).
