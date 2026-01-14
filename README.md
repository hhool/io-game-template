# 1wlgame

English | [中文](README.zh.md)

A minimal, reusable IO-game skeleton:
- Backend: Express + Socket.IO + native WebSocket (`ws`)
- Optional: Redis (Socket.IO Redis adapter for multi-instance scaling)
- Frontend: plain HTML + JavaScript (Canvas2D)

## Layout
- `server/` Node.js server (also serves the static client)
- `docker-compose.yml` Redis

## Run (no Redis)
```bash
cd server
npm install
npm run dev
```
Open:
- http://localhost:6868/

## Test on phone (LAN)
If your phone and Mac are on the same Wi‑Fi, you can test the game from the phone browser.

Start a LAN-bound dev server:
```bash
cd server
./scripts/dev_lan.sh start
```

Then open the printed URL on your phone (example):
- http://192.168.x.x:6868/

Quick diagnostics:
```bash
curl -fsS http://127.0.0.1:6868/healthz
curl -fsS http://<LAN_IP>:6868/healthz
./scripts/dev_lan.sh logs
./scripts/dev_lan.sh status
```

Stop it:
```bash
./scripts/dev_lan.sh stop
```

Notes:
- If the phone cannot open the page, check macOS firewall prompts and ensure both devices are on the same network.
- The LAN helper writes pid/log to `/tmp/1wlgame6868.pid` and `/tmp/1wlgame6868.log`.

## Run (with Redis adapter)
```bash
cd ..
docker compose up -d redis
cd server
export REDIS_URL="redis://127.0.0.1:6379"
npm install
npm run dev
```

## Native WebSocket
- `ws://localhost:6868/ws` (read-only state stream example)

## Controls configuration
Client controls can be enabled/disabled and mode-selected via:
- Static config file: `server/public/config.json`
- Runtime overrides (persisted to localStorage): `window.gameControls.configure(...)`

### `config.json`
See `server/public/config.json`:
- `controls.enableKeyboard` (default: `true`)
- `controls.enableMouse` (default: `true`)
- `controls.mouseMode`: `"point" | "hold"`
  - `point`: move mouse over the canvas to steer
  - `hold`: steer only while holding a mouse button
- `controls.enableTouch` (default: `true` on touch devices)
- `controls.touchMode`: `"joystick" | "point" | "off"`
  - `joystick`: drag joystick
  - `point`: touch-and-hold towards a point
- `controls.prefer`: `"touch" | "mouse" | "keyboard"` (input priority)

### Runtime overrides
Open DevTools console:
```js
// Disable touch on desktop
window.gameControls.configure({ controls: { enableTouch: false, prefer: "mouse" } })

// Switch mobile to point-to-steer mode
window.gameControls.configure({ controls: { touchMode: "point", prefer: "touch" } })

// Use hold-to-steer mouse mode
window.gameControls.configure({ controls: { mouseMode: "hold" } })
```

## Minimap
The client renders a realtime minimap overlay (players/pellets + viewport rectangle).

Configure it in `server/public/config.json` under `minimap`:
- `minimap.enabled`: `true | false`
- `minimap.position`: `"top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"`
- `minimap.size`: number (square size in px). Or set `minimap.width` / `minimap.height`.
- `minimap.margin`: corner preset margin in px
- `minimap.opacity`: 0..1

Custom position (offsets from an anchor corner):
- `minimap.anchor`: `"top-left" | "top-right" | "bottom-left" | "bottom-right"`
- `minimap.x`, `minimap.y`: offset in px from the chosen anchor

Runtime example:
```js
// Move minimap to bottom-left
window.gameControls.configure({ minimap: { position: "bottom-left" } })

// Custom: 20px from bottom-right, larger minimap
window.gameControls.configure({ minimap: { position: "custom", anchor: "bottom-right", x: 20, y: 20, size: 220 } })
```

## Bots
Server-authoritative bots can be enabled per-room and will chase pellets.

Configure defaults in `server/public/config.json` under `bots`:
- `bots.enabled`: `true | false`
- `bots.count`: number of bots to maintain (only while there is at least 1 human player in the room)

Runtime toggle example:
```js
// Enable 6 bots in your current room
window.gameControls.configure({ bots: { enabled: true, count: 6 } })

// Disable bots
window.gameControls.configure({ bots: { enabled: false } })
```

URL param quick test (no persistence):
- `/?bots=1&botCount=6`

Supported bot URL params:
- `bots=1|true|yes|on` (enable), `bots=0|false|no|off` (disable)
- `botCount=<0-30>` (also accepts `botsCount` / `bots_count`)

## Roadmap
Maintain this list by checking items off as you ship.

### P0 (Playable loop)
- [ ] Eat / mass growth rules (pellets + players)
- [ ] Death + respawn loop
- [ ] Camera zoom that scales with player size (and minimap sync)
- [ ] Basic in-game HUD (players, ping, FPS) + settings panel for minimap/bots/movement

### P1 (Agar-style features)
- [ ] Split + merge cooldown
- [ ] Eject mass
- [ ] Virus / hazards
- [ ] Skins + basic abuse protection (nick filtering)

### P1 (PaperIO-style features)
- [ ] Territory fill + scoring
- [ ] Trail collision + safe reconnect behavior
- [ ] Border rules / anti-border camping

### P2 (Multiplayer + engineering)
- [ ] Better matchmaking (capacity, room selection rules)
- [ ] Leaderboard persistence (optional Redis)
- [ ] Anti-cheat (input rate limit, anomaly detection)
- [ ] Stress test scripts (bots) + stability tests (reconnect, lag)
- [ ] Deployment packaging (Docker + reverse-proxy/HTTPS notes)

## Movement tuning
Server-side movement feel can be tuned via `server/public/config.json` under `movement` (defaults are the current code values):
- `movement.baseSpeed`: number (default `192`)
- `movement.damping`: number (default `0.2`) — used as `blend = clamp(dt * damping, 0, blendMax)`
- `movement.blendMax`: 0..1 (default `0.5`)

Optional env overrides:
- `MOVE_BASE_SPEED`, `MOVE_DAMPING`, `MOVE_BLEND_MAX`

## Protocol (implemented)

### Identity & reconnect
- Client stores a `token` in localStorage (`1wlgame_token`) and sends it via Socket.IO `auth.token`.
- Server replies with `auth { token, playerId }`.
- Server keeps sessions for a while (default: 5 minutes). Reconnect restores room + mode (play/spectate).

### Rooms / matchmaking / spectate
- `mm:join { mode: 'play'|'spectate' }`
  - `play`: quick match an active room (or create a new one)
  - `spectate`: create/join a room as spectator
- `room:join { roomId, mode }`
- `room:leave`
- Server events:
  - `room:joined { room, mode }`
  - `room:left`

### State & leaderboard
- `state { roomId, ts, players, pellets }`
- `leaderboard { roomId, top: [{id, score, color, r}] }`

### Native WebSocket details
- `ws://localhost:6868/ws?room=<roomId>`
  - `hello { room, serverTs }`
  - `state { roomId, ts, players, pellets, leaderboard }`

## Donate / Support
If this project helps you, consider supporting it:
- Buy Me a Coffee: https://www.buymeacoffee.com/<your_id>
- Donation link: <your_donation_url>
