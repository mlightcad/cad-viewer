---
"@mlightcad/cad-viewer": patch
"@mlightcad/cad-simple-viewer": patch
---

feat: rebuild Dimension Style Manager tabs after AutoCAD

Replace the plain field grids with AutoCAD-style layouts for Lines,
Symbols and Arrows, Text, Fit, Primary Units, Alternate Units, and
Tolerances. The Text tab adds text style ("..." opens Text Style),
text/fill color, height, fraction height scale, draw text frame,
position, view direction, and alignment. The live SVG preview now
honors text background fills (DIMTFILL/DIMTFILLCLR), the text frame
(negative DIMGAP), right-to-left text (DIMTXTDIRECTION), and outside
alignment (DIMTOH). Requires the new `@mlightcad/data-model` DIMSTYLE
fields (1.15.16+).
