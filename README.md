# io-game-framework

English | [中文](README.zh.md)

An open, reusable IO-game foundation/framework (Agar/Snake/Slither/Paper-style):
- Backend: Express + Socket.IO + native WebSocket (`ws`)
- Optional: Redis (Socket.IO Redis adapter for multi-instance scaling)
- Frontend: plain HTML + JavaScript (Canvas2D)

License: MIT (see [LICENSE](LICENSE)).

## Layout
- Core:
  - `server/` Node.js server (also serves the static client)
  - `docker-compose.yml` Redis
- Examples:
  - `examples/` (variants and planned rulesets)
- Docs:
  - `docs/` (architecture notes)

## Run (no Redis)
```bash
cd server
npm install
npm run dev
```
Open:
- http://localhost:6868/

Port notes:
- If `6868` is already in use, the server exits with a clear error.
- To auto-try the next ports (6868..6887), run with `AUTO_PORT=1` (example: `AUTO_PORT=1 npm run dev`).

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
- `ws://localhost:6868/ws` (read-only state stream)

This project uses Socket.IO for control-plane (auth/join/leave/input) and can optionally use native WebSocket as the **state downlink** channel.

Client opt-in (browser URL params):
- `/?state=ws&wsFmt=array` (use `/ws` for state, keep Socket.IO for everything else)
- `/?state=ws&wsFmt=bin` (use `/ws` state downlink in binary; smaller than JSON/array)
- `&wsDebug=1` (include extra debug fields in WS frames)

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

## Respawn loop
By default, the client auto-respawns after death (eaten / out-of-bounds).

Implementation note (P0 version): the server emits `game:over` and removes you from the room; the client waits briefly and then re-joins via `mm:join` using the same `rulesId`.

Configure it in `server/public/config.json` under `gameplay.respawn`:
- `gameplay.respawn.enabled`: `true | false` (default: `true`)
- `gameplay.respawn.delayMs`: number (default: `650`, range: 0..5000)

Runtime override example:
```js
// Disable auto-respawn
window.gameControls.configure({ gameplay: { respawn: { enabled: false } } })
```

## Rules selection (`rulesId`)
The server can run different game rulesets per-room.

Currently supported:
- `agar-lite` (default) — current playable prototype
- `agar-advanced` — same core today, but with different defaults/tuning knobs
- `paper-lite` (early placeholder) — simple movement + track data (still rendered as circles for now)

Select rules via URL param:
- `/?rules=agar-lite`
- `/?rules=agar-advanced`
- `/?rules=paper-lite`

Select rules via UI:
- The login screen includes a **Rules** dropdown.
- The selection is persisted in localStorage and mirrored into the URL as `?rules=...`.
- The dropdown options are populated from the server endpoint `GET /rules`.

Notes:
- Matchmaking groups rooms by `rulesId` (quick match only joins rooms with the same rules).
- Snapshots include a `rulesId` field so clients can branch rendering later.

`agar-advanced` tuning (server env):
- `AGAR_ADV_BORDER_DEATH`, `AGAR_ADV_PELLET_COUNT`, `AGAR_ADV_PELLET_GROWTH_MUL`
- See `examples/agar-advanced/` for details.

## Roadmap
Maintain this list by checking items off as you ship.

### P0 (Playable loop)
- [x] Eat / mass growth rules (pellets + players)
- [x] Death + respawn loop
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
- `mm:join { mode: 'play'|'spectate', rulesId?: string }`
  - `play`: quick match an active room (or create a new one)
  - `spectate`: create/join a room as spectator
- `room:join { roomId, mode, rulesId?: string }`
- `room:leave`
- Server events:
  - `room:joined { room, mode }`
  - `room:left`

### State & leaderboard

State is bandwidth-optimized:
- `state { roomId, rulesId, ts, seq, ... }`
  - `seq`: monotonic sequence id per room (helps client detect missing deltas)
  - Eating / growth is server-authoritative and reflected by:
    - Eaten pellets disappearing via `pelletsGone` (or missing from the next full `pellets`)
    - Eaten players disappearing via `playersGone` (and death events on the control plane)
    - The eater's `r10` and `score` increasing in subsequent `players`/`playersD`
  - Players are **pid-mapped** and delta-compressed:
    - Meta: `players:meta { roomId, players: [{ pid, id, name, color, isBot }] }` (low-frequency)
    - State payload: either `players` (full, periodic) or `playersD/playersGone` (delta)
    - Player fields are quantized: `{ pid, x, y, r10, score }` where `r10 = round(r*10)`
  - Pellets are delta-compressed:
    - Either `pellets` (full, periodic) or `pelletsD/pelletsGone` (delta)
    - Pellet fields are quantized: `{ id, x, y, r10 }`

Leaderboard is streamed at a lower rate:
- `leaderboard { roomId, top: [{id, score, color, r}] }` (throttled ~1Hz)

### Native WebSocket details

Endpoint:
- `ws://localhost:6868/ws?room=<roomId>`

Optional params:
- `fmt=array` (compact arrays instead of objects)
- `fmt=bin` (binary state frames; `hello/players:meta/leaderboard` stay JSON)
- `debug=1` (include a `debug` field in state frames)

Messages:
- `hello { proto, room, serverTs, formats, fmt, debug }`
- `state { proto, roomId, ts, seq, fullPlayers, fullPellets, playersMeta?, players|playersD|playersGone, pellets|pelletsD|pelletsGone, leaderboard? }`

Client <-> server control (optional):
- Send `{"type":"resync"}` to force a full snapshot on the next tick.

Array format layouts:
- `players`: `[pid, x, y, r10, score]`
- `pellets`: `[idNum, x, y, r10]` (where `id = "p" + idNum`)
- `pelletsGone`: `[idNum, ...]`

Binary format (`fmt=bin`):
- `hello`, `players:meta`, and `leaderboard` are still JSON messages.
- The state frame itself is a **binary WebSocket message** (little-endian), with the same semantics as the JSON/array `state` payload:
  - `seq` is still used for gap detection; client can send `{"type":"resync"}` to force a full snapshot.

Binary frame layout (v1):
- Header:
  - `u32 magic` = `0x474c5731` (ASCII-ish "1WLG")
  - `u8 proto` = `1`
  - `u8 flags`: bit0=`fullPlayers`, bit1=`fullPellets`
  - `u16 reserved`
  - `u32 seq`
  - `f64 ts`
  - `u8 rulesIdCode` (0=`agar-lite`, 1=`agar-advanced`, 2=`paper-lite`, 255=unknown)
  - `u8[3] reserved2`
- Players section:
  - `u16 playersCount`
  - Repeated `playersCount` times: `u16 pid, i32 x, i32 y, u16 r10, u32 score`
  - `u16 playersGoneCount`
  - Repeated `playersGoneCount` times: `u16 pid`
- Pellets section:
  - `u16 pelletsCount`
  - Repeated `pelletsCount` times: `u32 idNum, i32 x, i32 y, u16 r10, u16 pad`
  - `u16 pelletsGoneCount`
  - Repeated `pelletsGoneCount` times: `u32 idNum`

Notes:
- On the wire, pellet ids are encoded as `idNum` and client reconstructs `id` as `"p" + idNum`.

## Donate / Support
If this project helps you, consider supporting it:
- Buy Me a Coffee: https://www.buymeacoffee.com/<your_id>
- Donation link: <your_donation_url>
