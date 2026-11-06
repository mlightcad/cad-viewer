---
'@mlightcad/three-renderer': patch
---

fix: keep MTEXT background masks under their glyphs after INSERT compact

`AcTrGroupCompactor` now rebuilds compacted block children in the original
relative order instead of appending non-mergeable wrappers (empty `AcTrMText`
shells) before singleton meshes. That restores the mask-then-glyphs packing
order so draw-order Z no longer lets a canvas-coloured MTEXT mask hide its
own text inside title-block INSERTs.
