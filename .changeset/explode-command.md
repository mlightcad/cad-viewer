---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

Add the EXPLODE command (alias `X`, Home > Modify > Explode). It breaks compound objects into their component objects like AutoCAD EXPLODE, using the new ObjectARX-style `AcDbEntity.explode()` from `@mlightcad/data-model`. Polylines become lines and arcs, block references explode one level, dimensions, leaders, multileaders, tables and tolerances become their graphics, multiline text becomes single-line text, pattern hatches become lines, and meshes become 3D faces. MINSERT blocks and other objects that cannot be exploded are reported and left unchanged. Each EXPLODE is one undo step.
