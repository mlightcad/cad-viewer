---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

Add the AutoCAD-style `SCALE` command (alias `SC`). The Home ribbon tab's Modify panel shows a Scale button where the Copy button used to be; Copy remains available from the Clipboard panel.

- Select objects, specify a base point, then type or drag the scale factor (dragging uses the cursor distance from the base point).
- `Copy` keeps the originals and scales copies; `Reference` derives the factor from a reference length (typed or two points) and a new length (typed, dragged, or `Points`).
- The last scale factor, reference length and new length are offered as defaults, like AutoCAD.
- `AcApEntityService.scaleEntities()` scales entities uniformly around a base point.
