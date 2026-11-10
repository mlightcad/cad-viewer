---
'@mlightcad/pdf-renderer': patch
---

Fix dashed hatch patterns (e.g. hexagon/HONEY) exported to PDF: dashes are now anchored to the pattern base point instead of to where each line enters the boundary, and zero-length dots no longer stretch the dash period.
