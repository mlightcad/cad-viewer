---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

fix: restore entities after undo then redo

`AcTrView2d.batchConvert` claims an object id before committing its geometry
and keeps that claim for as long as the entity stays in the scene. Undo erases
the entity from the database, which calls `AcTrView2d.removeEntity`; that
dropped the scene drawable but left the convert claim behind. The redo pass then
hit the "already scheduled" skip in `batchConvert`, so a redone line or circle
never reappeared in the view even though the database and the undo/redo stack
were correct.

`removeEntity` now releases the claim and bumps the per-id convert generation,
so the redone entity converts again while an in-flight convert or deferred glyph
commit for the erased id can no longer re-add geometry.
