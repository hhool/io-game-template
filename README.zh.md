# 1wlgame

[English](README.md) | 中文

通用 IO Game 骨架：
- 后端：Express + Socket.IO + 原生 WebSocket（ws）
- 可选：Redis（Socket.IO Redis adapter，用于多实例扩展）
- 前端：纯 HTML + JavaScript（Canvas2D）

## 目录
- `server/` Node.js 服务端（同时托管静态前端）
- `docker-compose.yml` Redis

## 运行（无 Redis）
```bash
cd server
npm install
npm run dev
```
浏览器打开：
- http://localhost:6868/

## 运行（带 Redis adapter）
```bash
cd ..
docker compose up -d redis
cd server
export REDIS_URL="redis://127.0.0.1:6379"
npm install
npm run dev
```

## 原生 WebSocket
- `ws://localhost:6868/ws`（只读推送 state 示例）

## 下一步扩展方向
- PaperIO：加入“领地填充 + 尾迹碰撞 + 回到领地闭合”
- Agar：加入“玩家吞噬 + 质量分裂/喷射 + 视野缩放”
- 观战/房间/匹配：namespace + room + matchmaking
- 反作弊：输入限速、服务器权威、重放检测

## 通用层协议（当前已实现）

### 身份与断线重连
- 客户端本地保存 `token`（localStorage：`1wlgame_token`），Socket.IO 连接时通过 `auth.token` 发送。
- 服务端通过 `auth` 事件回传 `{ token, playerId }`。
- 断线后服务端保留 session 一段时间（默认 5 分钟），重连会恢复到原房间与模式（play/spectate）。

### 房间/匹配/观战
- `mm:join { mode: 'play'|'spectate' }`
	- `play`: 快速匹配到一个活跃房间（或创建新房间）
	- `spectate`: 创建/进入一个房间但以观战身份加入
- `room:join { roomId, mode }`: 指定加入房间
- `room:leave`: 离开当前房间
- 服务器事件：
	- `room:joined { room, mode }`
	- `room:left`

### 状态与排行榜
- `state { roomId, ts, players, pellets }`: 房间状态快照
- `leaderboard { roomId, top: [{id, score, color, r}] }`: 房间 Top10

### 原生 WebSocket
- `ws://localhost:6868/ws?room=<roomId>`
	- `hello { room, serverTs }`
	- `state { roomId, ts, players, pellets, leaderboard }`

## 捐赠 / 支持
如果这个项目对你有帮助，欢迎支持：
- Buy Me a Coffee: https://www.buymeacoffee.com/<your_id>
- 捐赠链接（自定义）：<your_donation_url>
