---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
---

feat(cad-pdf-plugin): add Recover / Visual import modes to `ipdf`

`ipdf` now asks for a `Mode` instead of `Curves`:

- **Recover** (default) rebuilds the source drawing as before: curves,
  duplicate removal, merged text runs, form blocks and text styles.
- **Visual** keeps the PDF exactly as painted: every path becomes a line or a
  flattened polyline and every text run its own text, like `ipdf` did before
  curve recovery was added.

The API gains `AcApPdfImportOptions.mode` (`'recover' | 'visual'`); it sets
the defaults of the reconstruction options, and explicit options still win.
