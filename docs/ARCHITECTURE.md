# Architecture

This repository is an IO-game foundation/framework.

## Core (current implementation)

Core lives in:
- `server/` — Node.js server + game loop + rooms/sessions + static hosting for the client
- `server/public/` — HTML/Canvas client (input, HUD, minimap, config)

### Server modules
- `server/index.js`: HTTP + Express + Socket.IO server, LAN helpers, `/healthz`, optional Redis adapter.
- `server/src/rooms.js`: sessions, rooms, matchmaking, bot lifecycle.
- `server/src/game.js`: per-room tick/broadcast loop wrapper.
- `server/src/state.js`: authoritative world simulation (movement, pellets, bots AI).

### Client modules
- `server/public/client.js`: input model (mouse/touch/keyboard), rendering, minimap, bots toggle, config merge (defaults + config.json + runtime overrides + URL overrides).

## Examples

Examples live under `examples/*` and are intended to reuse the same core.

Current approach: examples are documentation + configuration overlays first.
As features diverge (Agar/Snake/Paper rules), move the game rules behind a "rules" interface and keep networking/input/rendering in core.

## Rules API (next refactor)

See [RULES_API.md](RULES_API.md) for the draft interface that will allow swapping game rules (Agar/Snake/Slither/Paper/Pacer) on top of the same core.
