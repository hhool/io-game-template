# paper-advanced (planned)

Goal: a more complete Paper.io-like ruleset on top of the same core.

## Planned rules

### Entities
- players with a home territory
- trail (when outside territory)
- territory grid/polygon representation

### Core gameplay
- leaving territory creates a trail
- returning to territory closes the loop and captures the enclosed area
- collision rules:
  - hit any trail (yours or others) -> die
  - optional: head-to-head resolution rules

### Scoring
- territory area
- kill count (optional)

### Balancing knobs (config)
- movement speed / turn speed
- territory resolution (grid size)
- respawn protection time

## Suggested implementation split
- keep rooms/sessions/reconnect/input in core
- implement a `rules/paper` module that owns territory/trail simulation
- rendering: territory fill + trail + players + minimap

Status:
- TODO: extract a rules interface and implement paper rules module.
