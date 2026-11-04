---
'@mlightcad/three-renderer': patch
---

fix: keep wipeouts and MTEXT canvas masks fused with the paper background when their layer refreshes to ACI 7

Background fills were still eligible for ByLayer colour sync, so a layer-table
update that supplied ACI 7 (black on light paper) overwrote MODELBKCOLOR /
PAPERBKCOLOR tracking. Materials marked `isBackgroundFill` now skip layer
colour refresh and are not stored as ByLayer-colour. Bumps `@mlightcad/data-model`
to 1.15.22 and `@mlightcad/libredwg-converter` to 3.15.22 for the matching
MTEXT mask / wipeout trait flags.
