---
'@mlightcad/cad-simple-viewer': patch
---

Crossing selection (right-to-left box) now selects a block reference only when the box touches the real geometry of one of its sub-entities, matching AutoCAD. A crossing box drawn in the empty interior of a drawing-frame block no longer selects the frame, in model space and through paper-space viewports. A crossing box inside a filled area (hatch, 2D solid/trace, image/wipeout) still selects it.
