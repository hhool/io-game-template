# Examples

[English](README.md) | 中文

本目录包含基于核心框架实现/规划的不同玩法变体（ruleset）的示例说明。

- `agar-lite/`：当前可玩的原型（移动 + 豆子 + bots）
	- 中文：[`agar-lite/README.zh.md`](agar-lite/README.zh.md)
	- English：[`agar-lite/README.md`](agar-lite/README.md)
- `agar-advanced/`：Agar 规则的渐进增强版（可用 `rules=agar-advanced` 选择）
	- 中文：[`agar-advanced/README.zh.md`](agar-advanced/README.zh.md)
	- English：[`agar-advanced/README.md`](agar-advanced/README.md)
- `snake-lite/`：占位（planned）
	- 中文：[`snake-lite/README.zh.md`](snake-lite/README.zh.md)
	- English：[`snake-lite/README.md`](snake-lite/README.md)
- `slither-lite/`：占位（planned）
	- 中文：[`slither-lite/README.zh.md`](slither-lite/README.zh.md)
	- English：[`slither-lite/README.md`](slither-lite/README.md)
- `paper-lite/`：占位（planned）
	- 中文：[`paper-lite/README.zh.md`](paper-lite/README.zh.md)
	- English：[`paper-lite/README.md`](paper-lite/README.md)
- `paper-advanced/`：占位（planned）
	- 中文：[`paper-advanced/README.zh.md`](paper-advanced/README.zh.md)
	- English：[`paper-advanced/README.md`](paper-advanced/README.md)

## 示例的工作方式（当前阶段）

目前 examples 主要提供：
- 对目标规则/玩法的文档说明
- 配置覆盖（例如 `server/public/config.json`）
- 用于快速测试的 URL 参数

当某个 example 演进成真正的“规则变体”后，它会拥有自己的 rules 模块，同时复用同一套 networking/rooms/input/rendering 的通用核心。
