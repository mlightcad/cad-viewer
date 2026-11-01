---
'@mlightcad/three-renderer': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

fix: keep explicit ACI-7 block colours on layer 0 instead of inheriting the INSERT layer

A block entity authored on layer `0` with an explicit ACI-7 (foreground) colour
was rebound to the INSERT layer's colour, so a title frame that AutoCAD draws
white rendered red on a red INSERT layer.

The two cases were indistinguishable: `AcGiSubEntityTraits.color` is stored
pre-resolved, so ByLayer content on an ACI-7 layer also arrives as an absolute
ACI 7. `data-model` now records the original provenance on the traits
(`isColorByLayer`), and `three-renderer` uses it to set `isByLayerColor`
truthfully. `AcTrInheritedLayerMaterialMapper` can then decide directly: a
ByLayer colour inherits the INSERT layer, an explicit colour does not.

Missing bindings (`isByLayerColor == null`, from conversion paths that drop the
flag) are still inferred from the remaining ByLayer markers, so the earlier
fixes for ByLayer legend headers (#602) and lost-flag DXF conversions keep
working.
