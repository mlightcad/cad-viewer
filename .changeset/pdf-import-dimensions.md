---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': patch
---

feat(cad-pdf-plugin): recognize dimensions on PDF import

`PDFIMPORT` in recover mode now turns exploded AutoCAD dimensions back into
dimension entities on the `PDF_DIM` style. A new **Recognize dimensions**
option in the Import PDF dialog controls it (`recognizeDimensions` in
`AcApPdfImportOptions`; on by default in recover mode, off in visual mode).

- Recognition is evidence-scored: terminators (closed / open arrows, ticks,
  dots), dimension and extension lines, value text, and agreement with the
  drawing scale. Conflicting hypotheses are resolved best-first in two rounds;
  the second uses the scale and sizes the confident ones agree on. Import uses
  a strict profile, `pdfdim` keeps the lenient review profile.
- New kinds: aligned, arc length and ordinate dimensions, diameters with both
  arrows, and radius callouts placed outside the circle.
- SHX stroke text is read beside each dimension line in that line's direction,
  which is fast on whole sheets and reads rotated values. Rounded (romans /
  isocp) digits, prefixes such as `Ø`, decimal points, and digits printed as
  filled outlines are read too.
- Candidates carry `score` and `evidence`; the import stage is available as
  `acapPdfRecognizeImportDimensions`.
