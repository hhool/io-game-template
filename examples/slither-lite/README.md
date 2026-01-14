# slither-lite (planned)

Goal: a Slither.io-like ruleset built on top of the same core.

Planned rules:
- continuous movement + turning rate (no instant direction changes)
- snake body segments + growth over time
- head-to-body collisions (hit another body = die)
- optional speed boost with mass loss

Suggested core reuse:
- keep rooms/sessions/reconnect exactly the same
- reuse input model, but clamp to a turn-rate (server authoritative)
- reuse minimap + bots (bots become "steer towards food" AI)

Status:
- TODO: implement rules module and rendering while reusing rooms/sessions/input.
