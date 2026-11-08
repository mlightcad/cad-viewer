---
'@mlightcad/cad-simple-viewer': patch
---

fix: create the active layout view when Model layout BTR ids are stale

Some DWGs leave the Model layout pointing at a handle that is no longer
`*Model_Space` while entities use the real model-space id. Opening those
drawings activated `currentSpaceId` with no matching layout view, so
`zoomTo` / pick crashed and the canvas stayed blank. Heal the Model layout
link on open and always ensure a layout view exists for the active space.

Also keep every locale `main.ts` catalog in the file-open-panel Rollup
chunk so ja/ko no longer form a circular edge with the fat viewer chunk
(runtime TDZ on init).
