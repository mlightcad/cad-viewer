---
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-agent-plugin': patch
'@mlightcad/cad-script-plugin': patch
---

fix(agent): avoid script_timeout on large drawing queries

Add per-block `entityCount` / `typeCounts` on `cad.blocks`, plus
`cad.entities.count` / `inBlock(id, pred?)`. `where`/`count`/`inBox` scan
layout spaces only (not block defs). Cap snapshot queries (`too_many_matches`),
raise script budget to 5s and per-turn steps to 50/80, and steer agents off
full-DB `extents` scans (use `inBox`; type is `BlockReference`).
