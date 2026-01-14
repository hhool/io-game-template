# io-game-framework

[English](README.md) | 中文

开源、可复用的 IO 游戏基础 framework（可用于 Agar/Snake/Slither/Paper 等玩法）：
- 后端：Express + Socket.IO + 原生 WebSocket（ws）
- 可选：Redis（Socket.IO Redis adapter，用于多实例扩展）
- 前端：纯 HTML + JavaScript（Canvas2D）

License：MIT（见 [LICENSE](LICENSE)）。

## 目录
- Core：
	- `server/` Node.js 服务端（同时托管静态前端）
	- `docker-compose.yml` Redis
- Examples：
	- `examples/`（不同玩法变体/规则集，逐步补齐）
- Docs：
	- `docs/`（架构说明）

## 运行（无 Redis）
```bash
cd server
npm install
npm run dev
```
浏览器打开：
- http://localhost:6868/

## 手机端浏览器测试（局域网 LAN）
只要手机和 Mac 在同一个 Wi‑Fi 下，就可以用手机浏览器直接打开进行测试。

启动 LAN 监听（绑定到 0.0.0.0）：
```bash
cd server
./scripts/dev_lan.sh start
```

然后用手机打开脚本输出的 LAN 地址（示例）：
- http://192.168.x.x:6868/

快速排查：
```bash
curl -fsS http://127.0.0.1:6868/healthz
curl -fsS http://<LAN_IP>:6868/healthz
./scripts/dev_lan.sh logs
./scripts/dev_lan.sh status
```

停止：
```bash
./scripts/dev_lan.sh stop
```

注意：
- 手机打不开时，检查 macOS 防火墙是否拦截，以及两台设备是否在同一网段。
- 脚本会把 pid/log 写到 `/tmp/1wlgame6868.pid` 和 `/tmp/1wlgame6868.log`。

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

## 控制配置（输入方式开关/模式）
前端输入方式支持通过以下两种方式配置：
- 静态配置文件：`server/public/config.json`
- 运行时覆盖（会持久化到 localStorage）：`window.gameControls.configure(...)`

### `config.json`
参考 `server/public/config.json`：
- `controls.enableKeyboard`（默认：`true`）
- `controls.enableMouse`（默认：`true`）
- `controls.mouseMode`: `"point" | "hold"`
	- `point`：鼠标在画布上移动即可控制方向
	- `hold`：按住鼠标按键时才控制方向
- `controls.enableTouch`（默认：触摸设备为 `true`）
- `controls.touchMode`: `"joystick" | "point" | "off"`
	- `joystick`：摇杆拖动
	- `point`：按住屏幕某点朝该点控制
- `controls.prefer`: `"touch" | "mouse" | "keyboard"`（输入优先级）

### 运行时覆盖
打开浏览器 DevTools 控制台：
```js
// 桌面端禁用触摸输入
window.gameControls.configure({ controls: { enableTouch: false, prefer: "mouse" } })

// 手机端切换为 point 模式
window.gameControls.configure({ controls: { touchMode: "point", prefer: "touch" } })

// 鼠标切换为按住才控制
window.gameControls.configure({ controls: { mouseMode: "hold" } })
```

## 小地图（minimap）
前端会渲染实时小地图（玩家/豆子 + 当前视野矩形）。

在 `server/public/config.json` 里的 `minimap` 配置：
- `minimap.enabled`: `true | false`（启用/禁用）
- `minimap.position`: `"top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"`（四角/自定义）
- `minimap.size`: 数字（正方形像素大小），或使用 `minimap.width` / `minimap.height`
- `minimap.margin`: 四角模式下的边距（像素）
- `minimap.opacity`: 0..1

自定义位置（从锚点角落往里偏移）：
- `minimap.anchor`: `"top-left" | "top-right" | "bottom-left" | "bottom-right"`
- `minimap.x`, `minimap.y`: 相对锚点的偏移像素

运行时示例：
```js
// 移动到左下角
window.gameControls.configure({ minimap: { position: "bottom-left" } })

// 自定义：距离右下角 20px，并放大
window.gameControls.configure({ minimap: { position: "custom", anchor: "bottom-right", x: 20, y: 20, size: 220 } })
```

## 机器人（Bots）
支持“服务端权威”的机器人（AI）玩家，可按房间动态开启/关闭，并会自动追逐豆子。

在 `server/public/config.json` 的 `bots` 里配置默认值：
- `bots.enabled`: `true | false`
- `bots.count`: 机器人数量（仅当房间里至少有 1 个真人玩家时才会维持机器人；否则会自动清空，避免房间被机器人“占住”）

运行时动态开关示例：
```js
// 在当前房间启用 6 个机器人
window.gameControls.configure({ bots: { enabled: true, count: 6 } })

// 关闭机器人
window.gameControls.configure({ bots: { enabled: false } })
```

URL 传参快速测试（不持久化）：
- `/?bots=1&botCount=6`

支持的机器人 URL 参数：
- `bots=1|true|yes|on`（开启），`bots=0|false|no|off`（关闭）
- `botCount=<0-30>`（也兼容 `botsCount` / `bots_count`）

## 手感（速度/阻尼）配置
服务端移动手感可通过 `server/public/config.json` 的 `movement` 配置（默认值就是当前代码数值）：
- `movement.baseSpeed`: 数字（默认 `192`）
- `movement.damping`: 数字（默认 `0.2`），计算方式：`blend = clamp(dt * damping, 0, blendMax)`
- `movement.blendMax`: 0..1（默认 `0.5`）

也支持环境变量覆盖：
- `MOVE_BASE_SPEED`, `MOVE_DAMPING`, `MOVE_BLEND_MAX`

## 后续计划（Roadmap）
按进展维护：完成一项就把对应的 `- [ ]` 改成 `- [x]`。

### P0（可玩性闭环）
- [ ] 吞噬/成长规则（豆子 + 玩家）
- [ ] 死亡与重生闭环
- [ ] 视野缩放（随体型变化）+ 小地图同步
- [ ] 基础 HUD（人数/延迟/FPS）+ 设置面板（小地图/Bots/手感）

### P1（Agar 向扩展）
- [ ] 分裂 + 合并冷却
- [ ] 喷射质量
- [ ] 刺球/危险物（virus 等）
- [ ] 皮肤 + 基础滥用防护（昵称过滤等）

### P1（PaperIO 向扩展）
- [ ] 领地填充 + 计分
- [ ] 尾迹碰撞 + 重连保护
- [ ] 边界规则 / 防刷边策略

### P2（联机体验与工程化）
- [ ] 匹配改进（容量/选房策略）
- [ ] 排行榜持久化（可选 Redis）
- [ ] 反作弊（输入限速、异常检测）
- [ ] 压测脚本（bots）+ 稳定性测试（重连、弱网）
- [ ] 部署打包（Docker + 反代/HTTPS 说明）

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
