# Deployment

## Final decision (dev_deploy)

- Cloud provider: Render (Web Service).
- Legacy cloud-provider config/scripts have been removed.

## Deploy on Render

Render supports WebSocket and works well with Socket.IO.

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
