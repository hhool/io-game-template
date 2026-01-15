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
