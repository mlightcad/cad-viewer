---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

Hatch island detection now behaves like AutoCAD. Pick internal point keeps every nested island loop (not only the first tier) and lets the hatch's island style decide what is filled, so Normal, Outer and Ignore produce different fills. Changing the island style in the Hatch Creation ribbon updates the hatch being created right away, and on a selected hatch it changes only that hatch's island style (pattern, scale and colours stay as they are). Other Hatch Creation ribbon edits (pattern, scale, origin, …) also redraw the session hatch immediately instead of when HATCH ends. Requires `@mlightcad/data-model` with island-style rendering.
