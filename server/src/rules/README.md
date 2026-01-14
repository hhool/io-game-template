# server/src/rules

This folder contains rules modules and the draft Rules API.

- `types.js`: JSDoc typedefs for the rules interface.
- `paper-lite.js`: initial rules module (wired into runtime via the registry).
- `registry.js`: rules selection + adapter layer (maps `rulesId` -> world-state implementation).

See [docs/RULES_API.md](../../docs/RULES_API.md) for the draft interface and integration plan.
