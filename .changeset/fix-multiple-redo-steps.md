---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

fix: allow multiple consecutive redo steps

`AcDbUndoStack` re-pushed the redone record through `push()`, which also
clears the redo stack. As a result the second redo step was lost: after
creating two shapes, undoing twice and redoing once, the redo button
became disabled and the second shape could not be restored.

Redo now re-pushes through a dedicated `pushUndo()` that keeps the
remaining redo entries, while `push()` still drops them when a new edit
is made. Requires `@mlightcad/data-model` 1.15.17+.
