---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
---

feat(cad-pdf-plugin): fit imported text to its PDF width and import images

- `ipdf` now stretches or squeezes each text to the width it had in the PDF.
  The viewer rarely has the PDF's font, and substitutes used to run long
  and overlap neighbouring content. Option `fitTextWidth` (default `true`).
- PDF images (photos, logos, QR codes) are imported as `AcDbRasterImage`
  entities named `PDF_IMAGE_n.png`, with rotation and mirroring baked in.
  Black-on-transparent images such as QR codes are placed on white so they
  stay readable on a dark canvas. Option `images` (default `true`).
- `AcApFontUtil.prepareTextMeasurement` / `measureTextWidth` and
  `acapMeasureTextWidth` measure single-line text the way the TEXT renderer
  lays it out.
