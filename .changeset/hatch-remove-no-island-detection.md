---
'@mlightcad/cad-editor': patch
---

Remove the redundant "No Island Detection" option from the hatch ribbon's island detection dropdown. It produced exactly the same hatch as "Ignore Island Detection" (fill through all islands, Ignore style stored on the entity). Drawings with `HPISLANDDETECTIONMODE` = 0 now show as "Ignore Island Detection".

The island detection menu now shows large AutoCAD-style preview icons (redrawn with 45° hatching) so each style's effect is visible before picking it.
