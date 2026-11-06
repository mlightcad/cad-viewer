# @mlightcad/cad-pdf-exporter

## 1.8.0-preview.3

### Patch Changes

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies
  - @mlightcad/cad-pdf-core@1.8.0-preview.3
  - @mlightcad/pdf-renderer@1.8.0-preview.3
  - @mlightcad/three-renderer@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies [aeaed4c]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.2
  - @mlightcad/cad-pdf-core@1.8.0-preview.2
  - @mlightcad/pdf-renderer@1.8.0-preview.2

## 1.8.0-preview.1

### Patch Changes

- 66328f6: fix: headless PDF/HTML export now omits non-plottable layers by default (matching cad-editor), so no-plot markup like `不打印` / `仪表确认层` no longer appears as misplaced geometry
- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [7399150]
- Updated dependencies
- Updated dependencies [66328f6]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.1
  - @mlightcad/pdf-renderer@1.8.0-preview.1
  - @mlightcad/cad-pdf-core@1.8.0-preview.1

## 1.8.0-preview.0

### Minor Changes

- c525fa8: feat: headless PDF exporter and a monochrome PDF color mode

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

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

### Patch Changes

- Updated dependencies [6551be6]
- Updated dependencies [f5b6152]
- Updated dependencies [c525fa8]
- Updated dependencies [c525fa8]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.0
  - @mlightcad/cad-pdf-core@1.8.0-preview.0
  - @mlightcad/pdf-renderer@1.8.0-preview.0

## 2.0.0-preview.0

### Minor Changes

- c525fa8: feat: headless PDF exporter and a monochrome PDF color mode

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

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

### Patch Changes

- Updated dependencies [6551be6]
- Updated dependencies [f5b6152]
- Updated dependencies [c525fa8]
- Updated dependencies [c525fa8]
- Updated dependencies
  - @mlightcad/three-renderer@2.0.0-preview.0
  - @mlightcad/cad-pdf-core@2.0.0-preview.0
  - @mlightcad/pdf-renderer@2.0.0-preview.0
