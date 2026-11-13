---
'@mlightcad/cad-editor': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-html-core': patch
---

fix(ribbon): unify icon line weights

Ribbon and toolbar icons now share one line weight: 1/16 of the icon size
(1.25 in 20-unit and 1.5 in 24-unit viewBoxes), matching Element Plus icons —
about 1.6px on large ribbon buttons and 1px on small ones. Thin filled-outline
glyphs (draw, modify, layer, text) were thickened; heavy dimension, leader,
markup, and measure strokes were thinned. The attribute definition icon is now
an outline to match edit attribute, and the elliptical arc icon no longer draws
a doubled outline.
