---
'@mlightcad/cad-pdf-plugin': patch
---

fix(cad-pdf-plugin): stop PDF import from losing text and dark linework

- PDF import now passes CMap and standard-font locations to PDF.js. Before,
  text in CID fonts (Chinese, Japanese, Korean, …) imported as empty runs and
  disappeared. They default to the jsDelivr copy of the bundled `pdfjs-dist`
  version; hosts can serve their own copies with
  `acapPdfSetImportResourceUrls()`.
- `Td` / `TD` / `T*` text moves are now scaled by the text matrix, so lines of
  a paragraph no longer collapse onto each other.
- "Rich black" ink such as `#2c2e35` is mapped to ACI 7 like pure black, so
  it no longer renders almost invisible on a dark canvas.
