---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

fix: keep explicit ACI-7 block colours on layer 0 instead of inheriting the INSERT layer

A block entity authored on layer `0` with an explicit ACI-7 (foreground) colour
was treated as if its colour were ByLayer whenever any other trait was ByLayer.
`AcTrInheritedLayerMaterialMapper` then promoted it to `isByLayerColor: true` and
rebound it to the INSERT's layer material.

In the reported drawing, block `ASD96` holds its title frame on layer `0` as an
explicit ACI-7 polyline with ByLayer lineweight and transparency, and the three
INSERTs (`6F748`, `70AE5`, `71201`) sit on layer `1` (red). The left, top and
bottom frame edges therefore rendered red instead of white; AutoCAD keeps an
explicit ACI-7 colour white regardless of the INSERT's layer.

Only a _missing_ binding (`isByLayerColor == null`, produced by conversion paths
that drop the flag) is still inferred from the remaining ByLayer markers. That
keeps the earlier fixes intact for ByLayer legend headers (PR #602) and DXF
conversions that lose the flag.
