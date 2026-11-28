---
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-plugin': patch
---

Fix HTML export of elevated geometry, large-coordinate TrueType text, and missing title characters when `initialView` is `current`. The offline viewer grows its orthographic depth band to the batch Z extent, float64-bakes and spatially clusters instanced mesh glyphs before float32 rebase, and disables frustum culling on playback meshes so the post-load GPU-upload pass still uploads off-screen title-block geometry before CPU arrays are released.
