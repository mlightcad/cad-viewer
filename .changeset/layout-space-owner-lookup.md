---
'@mlightcad/cad-simple-viewer': patch
---

fix: keep drawings with nonstandard Model_Space ownership visible on open

Some DWGs parent `*Model_Space` under an intermediate object instead of the
BlockTable. The scene filter used `blockTable.getIdAt`, which rejects those
BTRs, so every model entity was dropped and the canvas stayed blank. Layout
space is now resolved with `database.getObjectById` plus model/paper checks.
