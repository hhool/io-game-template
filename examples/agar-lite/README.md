# agar-lite

English | [中文](README.zh.md)

The current playable prototype ruleset.

## Goal

- A minimal Agar-like loop (movement + pellets + basic growth)
- Stable baseline for iterating on `agar-advanced`

## Run

```bash
cd ../../server
npm install
HOST=127.0.0.1 PORT=6868 node index.js
```

Open:
- `http://127.0.0.1:6868/`

## Select rules

- UI dropdown on the login screen, or URL: `/?rules=agar-lite`

## Quick bot test

- `/?bots=1&botCount=6`

## What this example demonstrates

- Server-authoritative movement + smoothing
- Pellets (food) + simple growth
- Bots (per-room)
- Minimap overlay
- Robust input model (mouse/touch/keyboard)

### Config switches (server env)

- `AGAR_LITE_BORDER_DEATH=1` (default) enables "touch border = die".
- `AGAR_LITE_PELLET_COUNT=260` (default) controls initial pellet count.
- `AGAR_LITE_PELLET_GROWTH_MUL=2.2` (default) controls pellet growth multiplier.

Additional knobs (via `server/public/config.json` -> `rules.agar-lite.agar`):

- `speedMinMul` (default: `0.35`) lower = big cells get slower.
- `speedCurvePow` (default: `1.0`) higher = stronger slow-down curve as you grow.
- `boostEnabled` (default: `true`) enable/disable boost.
- `boostMul` (default: `1.15`) boost multiplier (only when `boostEnabled=true`).
- `deathMode` (default: `kick`) when border death is enabled, choose `respawn` vs `kick`.

### Live tuning via `config.json` (no server restart)

Edit `server/public/config.json` under:
- `rules.agar-lite.agar`

Then refresh the page (or call `window.gameControls.configure(...)`).
