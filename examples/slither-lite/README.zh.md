```markdown
# slither-lite（规划中）

中文 | [English](README.md)

目标：做一个 Slither.io-like 规则集，基于同一套核心。

规划规则：
- 连续移动 + 转向速率限制（不能瞬间变向）
- 蛇身节段 + 随时间增长
- 头撞到别人的身体 = 死亡
- 可选：加速但会损失质量

建议的 core 复用：
- rooms/sessions/reconnect 完全复用
- 输入模型复用，但服务端权威限制 turn-rate
- 小地图 + bots（bots 变成“朝食物转向”的 AI）

状态：
- TODO：实现 rules 模块与渲染，同时复用现有 core。

```