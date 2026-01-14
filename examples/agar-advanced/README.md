# agar-advanced (planned)

Goal: a more complete Agar.io-like ruleset on top of the same core.

## Planned rules

### Entities
- pellets (food)
- players (circles with mass)
- optional viruses/hazards

### Core gameplay
- eat pellets -> gain mass
- eat smaller players when sufficiently larger (configurable threshold)
- size affects speed and camera zoom

### Abilities
- split: create multiple cells, inherit mass, temporary speed burst
- eject mass: shoot a small pellet forward (used to feed or to create viruses)

### Balancing knobs (config)
- min eat ratio (e.g. 1.10x)
- split cooldown / merge cooldown
- eject mass amount + recoil
- max cell count

## Suggested implementation split
- keep networking/rooms/sessions/bots/minimap in core
- move the rules into a `rules/agar` module (server authoritative)
- define a shared snapshot schema for rendering (players can have multiple cells)

Status:
- TODO: extract a rules interface and implement agar rules module.
