---
'@mlightcad/cad-simple-viewer': patch
---

Keep middle-button pan in pan mode

Switching the view to `AcEdViewMode.PAN` replaced the mouse mapping with left
button only, so dragging with the wheel stopped panning while the hand tool
was on. Pan mode now maps both left and middle buttons, matching selection
mode and AutoCAD, where the wheel always pans.
