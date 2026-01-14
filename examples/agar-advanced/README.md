# agar-advanced

English | [中文](README.zh.md)

Planned: a more complete Agar.io-like ruleset on top of the same core.

## Goal

- Add classic Agar mechanics (split/eject/viruses) while reusing the same networking/rooms/input/rendering core
- Keep a distinct `rulesId` so rooms and matchmaking don’t mix with `agar-lite`

## Run

```bash
cd ../../server
npm install
HOST=127.0.0.1 PORT=6868 node index.js
```

Open:
- `http://127.0.0.1:6868/?rules=agar-advanced`

## Status (today)

- `agar-advanced` is selectable as a `rulesId` and currently reuses the `agar-lite` simulation core.
- It already has a couple of server-side switches to create real behavior differences.

### Config switches (server env)

- `AGAR_ADV_BORDER_DEATH=0` (default) disables "touch border = die".
- `AGAR_ADV_PELLET_COUNT=320` (default) controls initial pellet count.
- `AGAR_ADV_PELLET_GROWTH_MUL=2.6` (default) controls pellet growth multiplier.

Additional knobs (via `server/public/config.json` -> `rules.agar-advanced.agar`):

- `speedMinMul` (default: `0.25`) lower = big cells get slower.
- `speedCurvePow` (default: `1.25`) higher = stronger slow-down curve as you grow.
- `boostEnabled` (default: `false`) disables boost for a more Agar-like feel.
- `deathMode` (default: `respawn`) when border death is enabled, choose `respawn` vs `kick`.

### Live tuning via `config.json` (no server restart)

Edit `server/public/config.json` under:
- `rules.agar-advanced.agar`

Then refresh the page (or call `window.gameControls.configure(...)`). The client will send the updated config to the server for the current room.

## Planned rules

### Entities
- pellets (food)
- players (circles with mass)
- viruses/hazards (optional)

### Core gameplay
- eat pellets -> gain mass
- eat smaller players when sufficiently larger (configurable threshold)
- size affects speed and camera zoom

### Abilities
- split: create multiple cells, inherit mass, temporary speed burst
- eject mass: shoot a small pellet forward (feed or create viruses)

### Balancing knobs (config)
- min eat ratio (e.g. 1.10x)
- split cooldown / merge cooldown
- eject mass amount + recoil
- max cell count

## Suggested implementation split

- Keep networking/rooms/sessions/bots/minimap in core
- Implement rules behind the Rules API (server authoritative)
- Define a shared snapshot schema for rendering (players can have multiple cells)
