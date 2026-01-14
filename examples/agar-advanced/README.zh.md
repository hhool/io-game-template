````markdown
# agar-advanced

中文 | [English](README.md)

规划中：在相同的核心之上，做更完整的 Agar.io-like 规则集。

## 目标

- 在复用同一套 networking/rooms/input/rendering 核心的前提下，逐步补齐经典 Agar 机制（分裂/喷射/病毒等）
- 保持独立 `rulesId`，避免与 `agar-lite` 的房间/匹配混用

## 运行

```bash
cd ../../server
npm install
HOST=127.0.0.1 PORT=6868 node index.js
```

打开：
- `http://127.0.0.1:6868/?rules=agar-advanced`

## 当前状态

- `agar-advanced` 已可作为独立 `rulesId` 选择，目前复用 `agar-lite` 的模拟核心。
- 已有一些服务端开关，产生“真实的行为差异”。

### 配置开关（服务端环境变量）

- `AGAR_ADV_BORDER_DEATH=0`（默认）禁用“触碰边界=死亡”。
- `AGAR_ADV_PELLET_COUNT=320`（默认）初始食物豆数量。
- `AGAR_ADV_PELLET_GROWTH_MUL=2.6`（默认）食物豆增长倍率。

额外参数（通过 `server/public/config.json` -> `rules.agar-advanced.agar`）：

- `speedMinMul`（默认：`0.25`）越小 = 大细胞越慢。
- `speedCurvePow`（默认：`1.25`）越大 = 随体积增长的减速曲线更强。
- `boostEnabled`（默认：`false`）禁用加速，更接近 Agar 手感。
- `deathMode`（默认：`respawn`）当边界死亡启用时：选择 `respawn`（重生）或 `kick`（踢出）。

### 通过 `config.json` 实时调参（无需重启）

编辑 `server/public/config.json`：
- `rules.agar-advanced.agar`

然后刷新页面（或调用 `window.gameControls.configure(...)`）。客户端会把更新后的配置发给服务器并应用到当前房间。

## 规划中的规则

### 实体

- 食物豆（pellets）
- 玩家（带质量/体积的圆）
- 病毒/危险物（可选）

### 核心玩法

- 吃食物豆 -> 增重
- 吃更小的玩家（阈值可配置）
- 体积影响速度与镜头缩放

### 技能

- 分裂：拆成多团、继承质量、短暂速度爆发
- 喷射质量：向前吐出小质量（喂人/造病毒等）

### 平衡参数（config）

- 最小吞噬倍率（如 1.10x）
- 分裂冷却 / 合并冷却
- 喷射质量大小 + 反冲
- 最大细胞数

## 建议的实现拆分

- networking/rooms/sessions/bots/minimap 放在 core 复用
- 规则通过 Rules API 实现（服务端权威）
- 渲染用共享的 snapshot schema（玩家可有多个 cells）

````
