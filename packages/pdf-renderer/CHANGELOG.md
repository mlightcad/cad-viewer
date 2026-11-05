# @mlightcad/pdf-renderer

## 1.8.0-preview.1

### Patch Changes

- 66328f6: fix: PDF export now omits entities on Off/Frozen layers (INSERT-on-Off still plots nested geometry on other layers), matching AutoCAD plot and the canvas viewer
- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene

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

- c525fa8: fix: PDF export of drawings with wipeouts and many viewports no longer hangs

  Wipeouts are now always painted as a solid mask. `AcDbWipeout` does not set
  a fill type, so the PDF renderer tessellated the pattern of the last hatch
  drawn across each wipeout (hundreds of thousands of paper-white strokes per
  wipeout) and the on-screen renderer drew it with the hatch shader instead of
  masking.

  Paper-space viewports now skip model-space entities outside the region they
  show instead of painting all of model space and clipping it. Content streams
  are compressed at zlib level 6 instead of 9, which cut main-thread
  compression time about 5× for a 2% larger file.

  On a drawing with 30 layout viewports, export went from never finishing to
  about 1.5 minutes, with a 19 MB PDF.

## 1.7.8

### Patch Changes

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.

## 1.7.8-preview.6

### Patch Changes

- fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.

## 1.7.8-preview.5

### Patch Changes

- 1020d4d: fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps

## 1.7.6

### Patch Changes

- feat: ships whole-drawing FIND with one-click navigation, Quick Select by entity handle, and paper-space fixes for osnap, properties, VPLAYER-frozen layers, and annotative MTEXT viewport scales. INSERT rendering shares block geometry, hatch islands and pattern lines stay correct, and HTML export adds base85 snapshots plus optional gzip chunks. Also fixes shared-geometry reading-mode tint, viewer teardown, and linear-time MTEXT parsing

## 1.7.6-preview.0

### Patch Changes

- feat: ships whole-drawing FIND search across all layouts with one-click navigation and an explicit current-layout-only mode in both the Vue and simple-UI shells. Paper-space viewports now hide VPLAYER-frozen layers, INSERT rendering shares block geometry and defers spatial indexes for faster opens, and headless export skips duplicate converts on a headless GPU. Plus mobile-bridge and DWG/DXF foundations, hatch pattern transform and mtext \pxq fixes, and Changesets pre mode for npm preview prereleases

## 1.7.5

### Patch Changes

- feat: adds OneDrive and Google Drive data-source plugins, upgrades the data model, and falls back when the linetype shader is broken. Speeds headless HTML export open and package builds, fixes SVG INSERT cloning and finite-extents framing, and stops dual font parse plus worker-pool fan-out during open. Also hides landing-page viewer chrome, defaults MSAL redirect to the current path, isolates the file-open theme, and swallows missed-font worker rejections.

## 1.7.4

### Patch Changes

- feat: adds a radius measure tool and async smart extents with cache and busy overlay, and maps PDF optional content groups to CAD layers. Fixes cover wipeout paint order, drawable scene extents, stalled font open overlays, PDF MText colours and INSERT labels, inline ACI-7 MText, selection glow scaling, Fit-to-screen measure badges, multi-attribute edit, and a font CDN notice

## 1.7.3

### Patch Changes

- feat: brings smart extents and AutoCAD saved-view zoom to live viewer toolbars, and cuts open-time stalls by speeding INSERT indexing and font regeneration. Fallback fonts preload before the first glyph bake so text no longer flashes with missing glyphs, and docs link the proprietary DWG converter install guide to the wiki

## 1.7.2

### Patch Changes

- feat: draws complex TEXT and SHAPE linetypes as strokes and glyphs, renders closed wide polylines as offset rings, and adds HTML export smart extents plus AutoCAD saved-view zoom. The CLI gains a self-hosted base URL and open-view, no-plot, and circle-sides options. Dynamic blocks and arc-aligned text come with the data-model upgrade. Drawing open is faster with font preload and lighter line batches, and fixes cover raster and OLE textures, PDF PDMODE, and progressive open.

## 1.7.1

### Patch Changes

- feat: adds a native AcGi PDF renderer with direct vector export and lower-memory text modes, plus HTML export that embeds progressive ACEX chunks, multi-file ZIP packages, and leaner multi-layout switching. Shared toolbar and notification engines land across viewers, with reading mode, mobile session accessories, and parallel package downloads. Fixes cover font sync, hatch shaders, mirrored INSERTs, OLE2Frame embeds, selection, and PDSIZE/highlight/dashed-line rendering

## 1.7.0

### Minor Changes

- feat: adds a native AcGi PDF renderer that exports CAD databases to vector PDF without an SVG intermediate
