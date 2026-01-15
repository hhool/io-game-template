# 部署（Docker + 域名）

## 最后确认（dev_deploy）

- 云服务最终选用：Render（Web Service）。
- 已移除历史云部署相关配置/记录。


本项目是一个 Node.js 服务端，同时提供：

- 静态客户端（HTTP）
- Socket.IO（WebSocket 升级）
- 可选原生 WebSocket `/ws`

推荐线上形态：**Docker Compose + Caddy（HTTPS 反代）**。

## 部署（Render）

Render 最简单的方式是创建一个 **Web Service**（它支持 WebSocket，适配 Socket.IO）。

重要提示：
- 必须选择 **Web Service**（不要用 Static Site）。Socket.IO 需要 Node 服务端进程。
- 如果将来要横向扩容到多实例，建议启用 Redis adapter（配置 `REDIS_URL`），并预期需要粘性会话/一致路由，否则连接可能在实例间漂移。
- Render 免费档可能会休眠；这会导致 WebSocket 游戏断线、冷启动，线上稳定体验建议使用不会休眠的规格。

### Render 点点点部署清单（推荐）

在 Render Dashboard：

1）创建服务

- New → **Web Service**
- 连接你的 Git 仓库
- Branch：`dev`
- Auto Deploy：建议开启

2）健康检查

- Health Check Path：`/healthz`

3）部署后验证

- 访问：`https://<你的render域名>/healthz`，应返回 `{ ok: true, ... }`
- 浏览器打开：`https://<你的render域名>/`，确认能进入房间并正常连接
- 确认 Socket.IO +（可选）`/ws` WebSocket 通道可用

下面给两种方案：

### 方案 1：Render Web Service（非 Docker / 原生 Node）

1）创建服务

- Render Dashboard → New → **Web Service**
- 连接你的 Git 仓库（包含本项目）

2）配置构建与启动命令（关键）

- Build Command：`cd server && npm ci --omit=dev`
- Start Command：`cd server && npm run start`

3）环境变量

- `HOST=0.0.0.0`
- `PORT`：Render 会自动注入（通常无需手动设置；服务端会读取 `process.env.PORT`）
- `REDIS_URL`（可选）：需要多实例横向扩容时再配（单实例不需要）

建议（可选）：
- Health Check Path：`/healthz`

说明：
- `HOST=0.0.0.0` 很关键，保证监听到 Render 的网络接口。
- 默认假设仓库根目录就是服务根目录；如果你的仓库是 monorepo，请在 Render 的 Root Directory 里指定正确目录（或调整 `cd server` 命令）。

4）验证

- 部署完成后，访问：`https://<你的render域名>/healthz`
- 浏览器打开：`https://<你的render域名>/`，确认能进入房间并正常连接。

备注：免费档/休眠会影响长连接游戏体验；用于演示可以，线上建议用不会休眠的实例规格。

### 方案 2：Render Web Service（Docker）

适合你希望严格按 `server/Dockerfile` 构建运行的情况。

1）创建服务

- Render Dashboard → New → **Web Service**
- 选择 Environment/Runtime 为 **Docker**

2）Dockerfile 路径

- 指定 Dockerfile：`server/Dockerfile`

3）端口与环境变量（关键）

- Render 的 Docker Web Service 需要你指定容器监听端口。
- 本项目 Dockerfile 默认 `PORT=6868` 且 `EXPOSE 6868`，因此建议：
	- Render “Port” 填 `6868`
	- 或者在环境变量里设置 `PORT=<你在Render里填写的Port>`（两者保持一致）
- 同时设置：`HOST=0.0.0.0`

建议（可选）：
- Health Check Path：`/healthz`

4）验证

- `https://<你的render域名>/healthz`
- `https://<你的render域名>/`

## 冒烟测试清单（本地 / LAN / Render）

### 本地（Mac）

- 启动：`cd server && ./scripts/dev_local.sh start`
- 健康检查：`curl -fsS http://127.0.0.1:6868/healthz`
- 浏览器：`http://127.0.0.1:6868/`

### LAN（手机）

- 启动：`cd server && ./scripts/dev_lan.sh start`
- 用手机打开脚本输出的 LAN 地址
- 打不开时：先检查 macOS 防火墙是否拦截

### Render

- 健康检查：`https://<你的render域名>/healthz`
- 首页：`https://<你的render域名>/`
- 玩家无法连接时：先看 Render Logs，重点关注 WebSocket/Socket.IO 相关报错

### 可选脚本

- `cd server && ./scripts/smoke_check.sh http://127.0.0.1:6868`
- `cd server && ./scripts/smoke_check.sh https://<你的render域名>`
- 或者：`cd server && npm run smoke`（默认检查 `http://127.0.0.1:6868`）


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
