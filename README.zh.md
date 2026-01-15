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

端口说明：
- 如果 `6868` 端口被占用，服务端会输出清晰错误并退出。
- 如需自动尝试后续端口（6868..6887），使用 `AUTO_PORT=1`（例如：`AUTO_PORT=1 npm run dev`）。

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
- `ws://localhost:6868/ws`（只读推送 state）

本项目默认使用 Socket.IO 作为控制通道（auth/join/leave/input 等），并支持把原生 WebSocket 作为**状态下行**正式通道（带宽更省）。

前端启用（浏览器 URL 参数）：
- `/?state=ws&wsFmt=array`（状态走 `/ws`，其它仍走 Socket.IO）
- `/?state=ws&wsFmt=bin`（状态走 `/ws` 的二进制下行，比 JSON/array 更省）
- `&wsDebug=1`（WS state 里带额外 debug 字段）

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

## 重生闭环（respawn）
默认情况下，玩家死亡后（被吞噬 / 越界）客户端会自动重生。

实现说明（P0 版本）：服务端触发 `game:over` 并把你从房间移除；客户端短暂等待后，会使用相同的 `rulesId` 通过 `mm:join` 自动重新加入，开始新一局。

在 `server/public/config.json` 的 `gameplay.respawn` 中配置：
- `gameplay.respawn.enabled`: `true | false`（默认：`true`）
- `gameplay.respawn.delayMs`: 数字（默认：`650`，范围：0..5000）

运行时覆盖示例：
```js
// 关闭自动重生
window.gameControls.configure({ gameplay: { respawn: { enabled: false } } })
```

## 规则选择（`rulesId`）
服务端支持在不同房间运行不同规则集（ruleset）。

当前支持：
- `agar-lite`（默认）— 当前可玩的原型玩法
- `agar-advanced` — 目前仍复用同一核心，但使用不同默认值/可调参数
- `paper-lite`（早期占位）— 简单移动 + 赛道数据（目前仍复用“圆形玩家”渲染）

通过 URL 参数选择规则：
- `/?rules=agar-lite`
- `/?rules=agar-advanced`
- `/?rules=paper-lite`

通过 UI 选择规则：
- 登录界面提供 **Rules** 下拉框。
- 选择会持久化到 localStorage，并同步到 URL 的 `?rules=...`，方便分享链接。
- 下拉框选项来自服务端接口 `GET /rules`。

说明：
- 快速匹配会按 `rulesId` 分组（只会加入同规则的房间）。
- `state` 快照里会带 `rulesId`，方便后续前端按规则分支渲染。

`agar-advanced` 可调参数（服务端环境变量）：
- `AGAR_ADV_BORDER_DEATH`, `AGAR_ADV_PELLET_COUNT`, `AGAR_ADV_PELLET_GROWTH_MUL`
- 详细见 `examples/agar-advanced/`。

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
- [x] 吞噬/成长规则（豆子 + 玩家）
- [x] 死亡与重生闭环
- [x] 基础 HUD（人数/延迟/FPS）

说明：
- 体积增长不会设计成无限大；达到一定阈值后，用其它方式表达“体积/吞噬能力”（例如档位/标签/特效等），不做视野缩放。

当前实现：
- 体积（半径）有上限：`rules.<agar-*>.agar.maxRadius`
- 达到上限后，继续通过“档位（tier）”表达吞噬能力（由 score 推导，不需要改协议格式）：
	- `powerScoreStart`, `powerScoreStep`, `powerMaxTier`
	- PVP 加成：`pvpTierEatRatioBonus`, `pvpTierBonusR`, `pvpEatRatioMin`
	- 前端在接近上限且 tier>0 时，会渲染一个轻微光环（halo）作为视觉提示。

### P1（Agar 向扩展）
- [ ] 分裂 + 合并冷却
- [ ] 喷射质量
- [ ] 刺球/危险物（virus 等）
- [ ] 皮肤 + 基础滥用防护（昵称过滤等）

### P1/P2（体验与交互）
- [ ] 设置面板（Bots/手感/输入）
- [x] 阈值后体积/吞噬能力表达（不做视野缩放）

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
- `mm:join { mode: 'play'|'spectate', rulesId?: string }`
	- `play`: 快速匹配到一个活跃房间（或创建新房间）
	- `spectate`: 创建/进入一个房间但以观战身份加入
- `room:join { roomId, mode, rulesId?: string }`: 指定加入房间
- `room:leave`: 离开当前房间
- 服务器事件：
	- `room:joined { room, mode }`
	- `room:left`

### 状态与排行榜

状态同步已做带宽优化：
- `state { roomId, rulesId, ts, seq, ... }`: 房间状态快照
	- `seq`：房间内单调递增序号（用于检测丢包/缺 delta）
	- 吞噬/成长为服务端权威，表现为：
		- 被吃掉的豆子会通过 `pelletsGone` 消失（或在下一次全量 `pellets` 中缺失）
		- 被吞噬的玩家会通过 `playersGone` 消失（死亡事件仍走控制面通道）
		- 吞噬者后续的 `players`/`playersD` 中 `r10` 与 `score` 会增长
	- 玩家同步使用 **pid 映射 + delta**：
		- Meta：`players:meta { roomId, players: [{ pid, id, name, color, isBot }] }`（低频）
		- State：定期全量 `players`，其它 tick 发 `playersD/playersGone`
		- 字段量化：`{ pid, x, y, r10, score }`，其中 `r10 = round(r*10)`
	- 豆子同步使用 delta：
		- 定期全量 `pellets`，其它 tick 发 `pelletsD/pelletsGone`
		- 字段量化：`{ id, x, y, r10 }`

排行榜会降频推送：
- `leaderboard { roomId, top: [{id, score, color, r}] }`（约 1Hz）

### 原生 WebSocket

地址：
- `ws://localhost:6868/ws?room=<roomId>`

可选参数：
- `fmt=array`（用数组格式发送，更紧凑）
- `fmt=bin`（state 使用二进制帧；`hello/players:meta/leaderboard` 仍用 JSON）
- `debug=1`（state 里带 `debug` 字段）

消息：
- `hello { proto, room, serverTs, formats, fmt, debug }`
- `state { proto, roomId, ts, seq, fullPlayers, fullPellets, playersMeta?, players|playersD|playersGone, pellets|pelletsD|pelletsGone, leaderboard? }`

客户端 <-> 服务端控制（可选）：
- 发送 `{"type":"resync"}`，下一帧强制下发一次全量快照。

数组格式约定：
- `players`: `[pid, x, y, r10, score]`
- `pellets`: `[idNum, x, y, r10]`（其中 `id = "p" + idNum`）
- `pelletsGone`: `[idNum, ...]`

二进制格式（`fmt=bin`）：
- `hello`、`players:meta`、`leaderboard` 仍然是 JSON 消息。
- `state` 本体会通过 WebSocket 发送 **二进制帧**（little-endian），语义与 JSON/array 的 `state` 一致：

  - 仍然使用 `seq` 做丢包/跳包检测；客户端可发送 `{"type":"resync"}` 强制下一帧全量。

二进制帧布局（v1）：
- Header：

  - `u32 magic` = `0x474c5731`（近似 ASCII "1WLG"）
  - `u8 proto` = `1`
  - `u8 flags`：bit0=`fullPlayers`，bit1=`fullPellets`
  - `u16 reserved`
  - `u32 seq`
  - `f64 ts`
  - `u8 rulesIdCode`（0=`agar-lite`，1=`agar-advanced`，2=`paper-lite`，255=unknown）
  - `u8[3] reserved2`
- Players 段：

  - `u16 playersCount`
  - 重复 `playersCount` 次：`u16 pid, i32 x, i32 y, u16 r10, u32 score`
  - `u16 playersGoneCount`
  - 重复 `playersGoneCount` 次：`u16 pid`
- Pellets 段：

  - `u16 pelletsCount`
  - 重复 `pelletsCount` 次：`u32 idNum, i32 x, i32 y, u16 r10, u16 pad`
  - `u16 pelletsGoneCount`
  - 重复 `pelletsGoneCount` 次：`u32 idNum`

说明：
- pellet 的 `id` 在线上会编码为 `idNum`，客户端会按 `"p" + idNum` 还原。

## 捐赠 / 支持
如果这个项目对你有帮助，欢迎支持：
- Buy Me a Coffee: https://www.buymeacoffee.com/<your_id>
- 捐赠链接（自定义）：<your_donation_url>
