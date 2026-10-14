---
'@mlightcad/cad-simple-viewer': patch
---

fix: restore throttled WebGL paints during interactive non-progressive open so the canvas still refreshes under "Rendering drawing ...", while headless export (`cooperativeYield: false`) continues to skip mid-open paints
