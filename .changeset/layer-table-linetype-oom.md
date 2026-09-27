---
'@mlightcad/cad-viewer': patch
---

Avoid OOM on drawings with huge layer/linetype tables by mounting at most one layer-table property editor and skipping per-option SVG previews in the linetype dropdown.
