---
'@mlightcad/cad-pdf-plugin': patch
---

`ipdf` now keeps filled PDF areas filled: coloured panels, filled logos and text outlines import as solid hatches in their fill colour and paint order (`fillHatches` now defaults to `true`). Small filled circles and closed two-vertex rounded shapes are filled too.
