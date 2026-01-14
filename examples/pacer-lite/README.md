# pacer-lite (planned)

Goal: a simple “pacer / racing / arena runner” IO ruleset built on top of the same core.

This is meant to validate that the framework can support IO games beyond Agar/Snake/Paper.

## Gameplay concept (v1)

- Top-down 2D arena with a looped track (or a set of checkpoints).
- Players move with acceleration + steering (turn-rate limited).
- Objective options (pick one for the first version):
  1) **Time attack**: fastest lap / best time
  2) **Survival**: stay alive longest while avoiding hazards
  3) **Score chase**: collect pickups and bank score at checkpoints

## Planned rules

### Movement
- server authoritative
- speed cap, acceleration, friction
- turn rate limit (no instant direction changes)

### Track
- a polyline/waypoints representation for a loop
- checkpoints (A -> B -> C ... -> A)
- lap counter

### Collisions
- world boundaries / walls (bounce or stop)
- optional player-player bumping

### Items / hazards (optional)
- boost pads
- slow zones
- mines / traps

## What core should reuse
- rooms/sessions/reconnect/matchmaking
- input model (convert to “desired steering + throttle”)
- minimap + bots (bots follow next waypoint)

Status:
- TODO: implement a `rules/pacer` module once the Rules API is integrated.
