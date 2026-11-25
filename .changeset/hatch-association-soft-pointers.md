---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': patch
---

Associative hatches now store per-path boundary soft-pointers (DXF 71/97/330), rebuild when linked boundaries change, and expand with those boundaries when `PICKSTYLE` is 2 or 3.
