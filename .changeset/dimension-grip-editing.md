---
'@mlightcad/cad-simple-viewer': patch
---

Fix grip editing of dimensions. Dragging any grip of a linear, aligned, angular, arc length, radius, diameter or ordinate dimension now updates the dimension like AutoCAD: the live preview and the committed result regenerate the dimension block (new measurement, geometry and text), and undo restores the previous dimension.
