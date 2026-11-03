---
'@mlightcad/cad-pdf-core': minor
'@mlightcad/cad-pdf-exporter': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/pdf-renderer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-simple-viewer-cli': minor
---

feat: headless PDF exporter and a monochrome PDF color mode

PDF export logic moved into the new `@mlightcad/cad-pdf-core` package (option
model, glyph provider, database → PDF pipeline), which does not depend on
`cad-simple-viewer` or the DOM. `@mlightcad/cad-pdf-plugin` now builds on it,
and the new `@mlightcad/cad-pdf-exporter` uses it to export DXF/DWG to PDF in
Node without a browser (`exportFileToPdf`, `convertDatabaseToPdf`), mirroring
`cad-html-core` / `cad-html-exporter`.

PDF export gains a `colorMode` option: `color` (default, unchanged output) or
`monochrome` — white paper with black linework and text, and solid/gradient
fills in grey by luminance so linework on top of them stays readable.
Wipeouts still mask in white. The option is available in the `cpdf` dialog,
as a new last `-cpdf` prompt (`Color` / `Monochrome`, default `Color`), in
`pdf-renderer` (`AcPdfExportOptions.colorMode`) and in the exporter
(`--color-mode`). The CLI ships `export-pdf-monochrome.scr` and
`batch-export-pdf.mjs`; existing `-cpdf` scripts should add a `Color` or empty
line after the text-mode answer.
