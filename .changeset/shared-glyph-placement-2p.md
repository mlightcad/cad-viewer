---
'@mlightcad/three-renderer': patch
---

fix: stop shared complex-linetype / repeated glyphs from landing at 2P after flatten

After `AcTrGroup` flatten, empty glyph shells keep `matrixAutoUpdate = false`
with placement already in `matrix`. Shared draw reset `position`/`rotation`
alone and left that stale matrix, so `collapseInverseParentTransformIntoPlacement`
baked P into children and placement was applied again. Recompose `matrix` from
TRS after each reset/restore. Also bump `@mlightcad/data-model` to 1.15.23,
`@mlightcad/libredwg-converter` to 3.15.23, `@mlightcad/mtext-renderer` to
0.13.9, and `@mlightcad/mtext-input-box` to 0.3.9.
