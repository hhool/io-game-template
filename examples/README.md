# Examples

English | [中文](README.zh.md)

This folder contains example game variants built on top of the core framework.

- `agar-lite/`: current prototype (movement + pellets + bots)
	- English: [`agar-lite/README.md`](agar-lite/README.md)
	- 中文: [`agar-lite/README.zh.md`](agar-lite/README.zh.md)
- `agar-advanced/`: planned incremental Agar ruleset (selectable via `rules=agar-advanced`)
	- English: [`agar-advanced/README.md`](agar-advanced/README.md)
	- 中文: [`agar-advanced/README.zh.md`](agar-advanced/README.zh.md)
- `snake-lite/`: placeholder (planned)
	- English: [`snake-lite/README.md`](snake-lite/README.md)
	- 中文: [`snake-lite/README.zh.md`](snake-lite/README.zh.md)
- `slither-lite/`: placeholder (planned)
	- English: [`slither-lite/README.md`](slither-lite/README.md)
	- 中文: [`slither-lite/README.zh.md`](slither-lite/README.zh.md)
- `paper-lite/`: placeholder (planned)
	- English: [`paper-lite/README.md`](paper-lite/README.md)
	- 中文: [`paper-lite/README.zh.md`](paper-lite/README.zh.md)
- `paper-advanced/`: placeholder (planned)
	- English: [`paper-advanced/README.md`](paper-advanced/README.md)
	- 中文: [`paper-advanced/README.zh.md`](paper-advanced/README.zh.md)

## How examples work (current stage)

At the moment, examples primarily provide:
- documentation of the intended rules
- configuration overlays (e.g. `server/public/config.json`)
- URL parameters for quick testing

As each example becomes a true rule variant, it will own its own rules module while reusing the same networking/rooms/input/rendering core.
