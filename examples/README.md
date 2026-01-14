# Examples

This folder contains example game variants built on top of the core framework.

- `agar-lite/`: current prototype (movement + pellets + bots)
- `snake-lite/`: placeholder (planned)
- `paper-lite/`: placeholder (planned)

## How examples work (current stage)

At the moment, examples primarily provide:
- documentation of the intended rules
- configuration overlays (e.g. `server/public/config.json`)
- URL parameters for quick testing

As each example becomes a true rule variant, it will own its own rules module while reusing the same networking/rooms/input/rendering core.
