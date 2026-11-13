---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

Show a busy overlay during clipboard copy, cut and paste so large selections do not freeze the UI without feedback. `AcApClipboard.set` now awaits system-clipboard DXF serialization so the overlay stays up for the whole blocking write. Also use the custom undo/redo SVG icons in the ribbon header instead of Element Plus refresh icons.
