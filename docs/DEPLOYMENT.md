# Deployment

## Final decision (dev_deploy)

- Cloud provider: Render (Web Service).
- Legacy cloud-provider config/scripts have been removed.

## Deploy on Render

Render supports WebSocket and works well with Socket.IO.

Important:
- Use a **Web Service** (not a Static Site). Socket.IO needs a running Node server.
- If you run more than 1 instance, enable the Redis adapter (`REDIS_URL`) and expect to need sticky sessions / consistent routing.
- Render free tiers may sleep; this breaks real-time WebSocket gameplay (disconnects, cold starts). For stable gameplay, use a plan that does not sleep.

### Render click-by-click checklist

In Render Dashboard:

1) Create service

- New → **Web Service**
- Connect your Git repo
- Branch: `dev`
- Auto Deploy: On (recommended)

2) Health check

- Health Check Path: `/healthz`

3) Verify after deploy

- `https://<your-service>/healthz` returns JSON like `{ ok: true, ... }`
- Open `https://<your-service>/` and join a room
- Confirm WebSocket transport works (Socket.IO + optional `/ws`)

### Option A: Render Web Service (Native Node, no Docker)

1) Create service

- Render Dashboard → New → **Web Service**
- Connect your Git repo

2) Configure commands

- Build Command: `cd server && npm ci --omit=dev`
- Start Command: `cd server && npm run start`

3) Environment

- `HOST=0.0.0.0`
- `PORT` is injected by Render (the server should read `process.env.PORT`)
- `REDIS_URL` (optional)

Notes:
- Keep `HOST=0.0.0.0` so the server listens on Render's network interface.
- The repo root is assumed to be the service root. If you are deploying from a monorepo, set Render “Root Directory” accordingly (or adjust the `cd server` commands).

4) Health check

- Health Check Path: `/healthz`

### Option B: Render Web Service (Docker)

1) Create service

- Render Dashboard → New → **Web Service**
- Choose **Docker** runtime

2) Dockerfile

- Dockerfile path: `server/Dockerfile`

3) Port & env

- Set Render “Port” to `6868` (or keep it consistent with `PORT` if you override)
- Set `HOST=0.0.0.0`

Notes:
- For Docker services, Render needs to know which port the container listens on.
- Keep `PORT` consistent between Render settings and your container runtime.

## Smoke test checklist (local / LAN / Render)

### Local (Mac)

- Start: `cd server && ./scripts/dev_local.sh start`
- Check: `curl -fsS http://127.0.0.1:6868/healthz`
- Browser: `http://127.0.0.1:6868/`

### LAN (phone)

- Start: `cd server && ./scripts/dev_lan.sh start`
- Open the printed LAN URL from your phone
- If it fails, check macOS firewall prompts

### Render

- Check health: `https://<your-service>/healthz`
- Open: `https://<your-service>/`
- If players cannot connect, check Render logs for WebSocket/Socke.IO errors

### Optional script

- `cd server && ./scripts/smoke_check.sh http://127.0.0.1:6868`
- `cd server && ./scripts/smoke_check.sh https://<your-service>`
- Or: `cd server && npm run smoke` (defaults to `http://127.0.0.1:6868`)

4) Health check

- Health Check Path: `/healthz`

## Self-host (Docker + domain)

This project runs as a single Node.js server that serves:

- Static client files (HTTP)
- Socket.IO transport (WebSocket upgrade)
- Optional native WebSocket `/ws`

Recommended production setup: **Docker Compose + Caddy (HTTPS reverse proxy)**.

## Prerequisites

- Linux VPS with Docker + Docker Compose v2
- Domain name pointing to the VPS public IP (A/AAAA records)
- Open inbound ports: `80/tcp` and `443/tcp`

## Files

- `server/Dockerfile`
- `deploy/docker-compose.prod.yml`
- `deploy/Caddyfile`

## Quick start (on the VPS)

From the repo root:

1) Build and start

- `cd deploy`
- `DOMAIN=game.example.com docker compose -f docker-compose.prod.yml up -d --build`

2) Smoke check

- `curl -fsS https://game.example.com/healthz`
- Open `https://game.example.com/` and join a room.

## Environment variables

- `DOMAIN` (required for HTTPS): e.g. `game.example.com`
- `HOST` (default `0.0.0.0`)
- `PORT` (default `6868`)
- `REDIS_URL` (optional): enables the Socket.IO Redis adapter

## Notes

- Caddy automatically handles WebSocket upgrades for Socket.IO.
- Redis is not required for a single instance but is included for future scaling.
- If you already have an existing reverse proxy, you can skip the `caddy` service and expose `game` directly (not recommended for public traffic).
