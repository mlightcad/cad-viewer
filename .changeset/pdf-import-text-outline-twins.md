---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-simple-viewer': patch
---

fix(cad-pdf-plugin): size imported TrueType text to capital-A height and drop outline twins

- PDF `fontSize` is the em square; CAD TrueType height is capital-A. Import now
  divides mesh text height by the face scale factor before fitting width, and
  recovered CJK outline text uses the same conversion so ideographs no longer
  draw ~15–40% too tall.
- Many PDFs keep searchable text plus stroked/filled glyph paths. After native
  TEXT is created, import removes closed glyph-like outlines (and non-arrow
  hatches) whose mass sits in each text's baseline band — not open leaders or
  3–4 vertex arrowheads, so dimension recognition beside labels is preserved.
  Fill+stroke companion outlines are still dropped when a hatch becomes text.
