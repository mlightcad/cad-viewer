---
'@mlightcad/cad-pdf-plugin': patch
---

Import PDF keeps geometry nested inside a hidden optional-content group on that hidden layer. A frozen INSERT exported to PDF (for example a block on a frozen layer whose children sit on other layers) no longer reappears on the children's visible layers after import.
