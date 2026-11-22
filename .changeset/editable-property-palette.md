---
'@mlightcad/cad-editor': minor
'@mlightcad/cad-simple-viewer': minor
---

The Properties palette now edits entities in Write mode. Each value can be changed in place and the change is applied as one undoable "Properties" edit. Editing works for one entity, for one entity picked from a multi-selection, and for the properties shared by the whole selection. Layer, linetype, lineweight, transparency and color use dropdowns. Array items such as polyline vertices are edited one at a time, and the palette refreshes after undo, redo and commands. Entities on locked layers stay read-only. Adds `AcApEntityService.setEntityProperty`.
