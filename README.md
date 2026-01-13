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
