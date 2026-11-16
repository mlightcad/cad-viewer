# @mlightcad/cad-pdf-core

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies
  - @mlightcad/pdf-renderer@1.8.0-preview.5
  - @mlightcad/three-renderer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.

### Patch Changes

- Updated dependencies [2632f9e]
- Updated dependencies [2018b40]
- Updated dependencies [228004a]
- Updated dependencies [f599e38]
- Updated dependencies [8bfe54b]
- Updated dependencies [cafbb8f]
- Updated dependencies [1cf426f]
- Updated dependencies [47c83c2]
- Updated dependencies [d7787ad]
- Updated dependencies [84f82ff]
- Updated dependencies [05b2041]
- Updated dependencies
- Updated dependencies [b4306a7]
  - @mlightcad/three-renderer@1.8.0-preview.4
  - @mlightcad/pdf-renderer@1.8.0-preview.4

## 1.8.0-preview.3

### Patch Changes

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies
  - @mlightcad/pdf-renderer@1.8.0-preview.3
  - @mlightcad/three-renderer@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies [aeaed4c]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.2
  - @mlightcad/pdf-renderer@1.8.0-preview.2

## 1.8.0-preview.1

### Patch Changes

- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [7399150]
- Updated dependencies
- Updated dependencies [66328f6]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.1
  - @mlightcad/pdf-renderer@1.8.0-preview.1

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
  - @mlightcad/pdf-renderer@2.0.0-preview.0
