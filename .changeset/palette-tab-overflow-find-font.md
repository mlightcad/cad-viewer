---
'@mlightcad/cad-editor': patch
'@mlightcad/cad-simple-viewer': patch
---

fix(ui): open the palette tab chosen from the overflow menu

Choosing a palette tab from the overflow menu now makes that tab active and keeps it visible, including when it was already the active tab. The Find field uses the same 12px type as the other palette inputs.
