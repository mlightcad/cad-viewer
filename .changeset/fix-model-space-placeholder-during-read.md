---
'@mlightcad/cad-simple-viewer': patch
---

Fix DWG files that opened blank and threw "block table record id ... doesn't exist" when switching back to the Model tab. The UCS icon's per-frame model-space check lazily created a placeholder `*Model_Space` while the file was still being read; the converter then reused it by name, so the Model layout pointed at an id the database rejected.
