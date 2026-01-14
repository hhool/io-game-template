````markdown
# agar-lite

中文 | [English](README.md)

当前可玩的原型规则集。

## 目标

- 最小可用的 Agar-like 循环（移动 + 食物豆 + 基础成长）
- 作为 `agar-advanced` 迭代的稳定基线

## 运行

```bash
cd ../../server
npm install
HOST=127.0.0.1 PORT=6868 node index.js
```

打开：
- `http://127.0.0.1:6868/`

## 选择规则

- 登录页下拉框，或 URL：`/?rules=agar-lite`

## 快速机器人测试

- `/?bots=1&botCount=6`

## 本示例演示内容

- 服务器权威移动 + 客户端平滑
- 食物豆（pellets）+ 简单成长
- 每房间 Bots
- 小地图叠加层
- 更稳健的输入模型（鼠标/触控/键盘）

### 配置开关（服务端环境变量）

- `AGAR_LITE_BORDER_DEATH=1`（默认）启用“触碰边界=死亡”。
- `AGAR_LITE_PELLET_COUNT=260`（默认）初始食物豆数量。
- `AGAR_LITE_PELLET_GROWTH_MUL=2.2`（默认）食物豆增长倍率。

额外参数（通过 `server/public/config.json` -> `rules.agar-lite.agar`）：

- `speedMinMul`（默认：`0.35`）越小 = 大细胞越慢。
- `speedCurvePow`（默认：`1.0`）越大 = 随体积增长的减速曲线更强。
- `boostEnabled`（默认：`true`）启用/禁用加速。
- `boostMul`（默认：`1.15`）加速倍率（仅当 `boostEnabled=true` 生效）。
- `deathMode`（默认：`kick`）当边界死亡启用时：选择 `respawn`（重生）或 `kick`（踢出）。

### 通过 `config.json` 实时调参（无需重启）

编辑 `server/public/config.json`：
- `rules.agar-lite.agar`

然后刷新页面（或调用 `window.gameControls.configure(...)`）。

````
