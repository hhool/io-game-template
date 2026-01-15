# 部署（Docker + 域名）

本项目是一个 Node.js 服务端，同时提供：

- 静态客户端（HTTP）
- Socket.IO（WebSocket 升级）
- 可选原生 WebSocket `/ws`

推荐线上形态：**Docker Compose + Caddy（HTTPS 反代）**。

## 前置条件

- Linux VPS，已安装 Docker + Docker Compose v2
- 域名已解析到 VPS 公网 IP（A/AAAA 记录）
- 入站端口放通：`80/tcp`、`443/tcp`

## 相关文件

- `server/Dockerfile`
- `deploy/docker-compose.prod.yml`
- `deploy/Caddyfile`

## 一键启动（VPS 上）

在仓库根目录：

1）构建并启动

- `cd deploy`
- `DOMAIN=game.example.com docker compose -f docker-compose.prod.yml up -d --build`

2）冒烟验证

- `curl -fsS https://game.example.com/healthz`
- 浏览器打开 `https://game.example.com/`，确认能进入房间。

## 环境变量

- `DOMAIN`（HTTPS 必需）：例如 `game.example.com`
- `HOST`（默认 `0.0.0.0`）
- `PORT`（默认 `6868`）
- `REDIS_URL`（可选）：开启 Socket.IO Redis Adapter

## 备注

- Caddy 会自动处理 Socket.IO 所需的 WebSocket upgrade。
- 单机部署 Redis 不是必需，但保留可以方便后续扩容。
- 如果你已有统一反代，可去掉 `caddy` 服务并直接暴露 `game`（不建议直接公网暴露）。
