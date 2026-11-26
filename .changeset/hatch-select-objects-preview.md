---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

HATCH prompts now match AutoCAD: `Pick internal point or [Select objects/Undo]` (also when started from the ribbon) and `Select objects or [picK internal point/Undo]`. Each pick reports `N found, M total`, and a live hatch preview of the selected boundaries is shown while selecting (honours `HPQUICKPREVIEW` / `HPQUICKPREVTIMEOUT`). In select objects, Enter creates the hatch and ends the command, `picK` switches back to internal-point picking, and `Undo` drops the last pick. The live preview now rebuilds immediately when a Hatch Creation ribbon option (island detection style, pattern, scale, angle, colours, …) changes.
