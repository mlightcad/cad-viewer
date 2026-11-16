# @mlightcad/cad-script-plugin

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies [ac569e8]
- Updated dependencies [aad8aed]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.5
  - @mlightcad/cad-agent-core@1.8.0-preview.5
  - @mlightcad/cad-script-core@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.

### Patch Changes

- 228004a: Add layer preview mode to `cad.view.capturePreview`.
  - `cad.view.capturePreview({ layers: ['A', 'B'] })` renders only model-space geometry on those layers (INSERTs contribute just their fragments on those layers) and frames the PNG to the combined extents of the layers, so the image has no large empty margins. Names are case-insensitive; unknown names throw; `layers` cannot be combined with `selection`.
  - `CaptureDrawingPreviewFailure` adds `'no-layers'`; `normalizeCadCapturePreviewOptions` returns `NormalizedCadCapturePreviewOptions`.
  - New `AcApEntityPreviewConvertor.captureLayers`, `AcTrLayout.findLayers` / `computeLayerPreviewBoundsBox` / `createLayerPreviewRoot`, `AcTrLayer.getEntityIds` / `computeContentBoundingBox`, and `AcTrBatchedGroup.getEntityIds`.

- c3dcfa2: Complete the UI translations for every supported language. Japanese and Korean were mostly English (ribbon, menus, dialogs, properties, command prompts, plugins, and the exported HTML viewer); Turkish, Czech and Arabic were missing the dimension/multileader style dialogs, view and UCS managers, and many command prompts. All of these now show in the selected language instead of falling back to English.
- b8fbeac: feat(agent): queue follow-ups, edit/resend messages, and relative timestamps

  Add Cursor-style follow-up queueing while the agent is busy, inline edit/resend
  for prior user turns, message copy, and relative timestamps. Also document
  common `tx.draw*` argument names and allow object property keys named like
  banned globals (`{ window: n }`) while still blocking free identifiers.

- 75c44d2: Show `cad.view.capturePreview` images in the script console result panel, with download and clipboard-copy actions beside each preview.
- Updated dependencies [c987f64]
- Updated dependencies [9c6be36]
- Updated dependencies [2632f9e]
- Updated dependencies [03ff81b]
- Updated dependencies [279f460]
- Updated dependencies [228004a]
- Updated dependencies [75c44d2]
- Updated dependencies [aa2a7f7]
- Updated dependencies [1477693]
- Updated dependencies [2632f9e]
- Updated dependencies [c3dcfa2]
- Updated dependencies [76a6673]
- Updated dependencies [b340dd6]
- Updated dependencies [f599e38]
- Updated dependencies [2a75363]
- Updated dependencies [0b7c923]
- Updated dependencies [0acd637]
- Updated dependencies [cafbb8f]
- Updated dependencies [4252a9d]
- Updated dependencies [2741958]
- Updated dependencies [a1a707b]
- Updated dependencies [1784dd4]
- Updated dependencies [1cf426f]
- Updated dependencies [c2cc263]
- Updated dependencies [17e4920]
- Updated dependencies [b340dd6]
- Updated dependencies [b340dd6]
- Updated dependencies [eb0f5e8]
- Updated dependencies [47c83c2]
- Updated dependencies [529b935]
- Updated dependencies [529b935]
- Updated dependencies [510b0dc]
- Updated dependencies [e4b1046]
- Updated dependencies [ec6b73d]
- Updated dependencies [3fefca4]
- Updated dependencies [242c8db]
- Updated dependencies [1795cc0]
- Updated dependencies [7f15f66]
- Updated dependencies [f80a8c1]
- Updated dependencies [833c202]
- Updated dependencies [84f82ff]
- Updated dependencies [05b2041]
- Updated dependencies [ed40d25]
- Updated dependencies
- Updated dependencies [ee7d5da]
- Updated dependencies [17e4920]
- Updated dependencies [b340dd6]
- Updated dependencies [b8fbeac]
- Updated dependencies [68d4365]
- Updated dependencies [f6048ff]
- Updated dependencies [6d80103]
- Updated dependencies [ac1f322]
- Updated dependencies [69825da]
  - @mlightcad/cad-simple-viewer@1.8.0-preview.4
  - @mlightcad/cad-script-core@1.8.0-preview.4
  - @mlightcad/cad-agent-core@1.8.0-preview.4

## 1.8.0-preview.3

### Patch Changes

- 9667011: fix(agent): avoid script_timeout on large drawing queries

  Add per-block `entityCount` / `typeCounts` on `cad.blocks`, plus
  `cad.entities.count` / `inBlock(id, pred?)`. `where`/`count`/`inBox` scan
  layout spaces only (not block defs). Cap snapshot queries (`too_many_matches`),
  raise script budget to 5s and per-turn steps to 50/80, and steer agents off
  full-DB `extents` scans (use `inBox`; type is `BlockReference`).

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies [9667011]
- Updated dependencies [5926492]
- Updated dependencies
- Updated dependencies [ab2447c]
  - @mlightcad/cad-script-core@1.8.0-preview.3
  - @mlightcad/cad-simple-viewer@1.8.0-preview.3
  - @mlightcad/cad-agent-core@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies
  - @mlightcad/cad-agent-core@1.8.0-preview.2
  - @mlightcad/cad-script-core@1.8.0-preview.2
  - @mlightcad/cad-simple-viewer@1.8.0-preview.2

## 1.8.0-preview.1

### Patch Changes

- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [a6b5042]
- Updated dependencies
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.1
  - @mlightcad/cad-agent-core@1.8.0-preview.1
  - @mlightcad/cad-script-core@1.8.0-preview.1

## 1.8.0-preview.0

### Minor Changes

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

## 1.7.8

### Patch Changes

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.
- Updated dependencies [d2f9e04]
- Updated dependencies
- Updated dependencies [d2f9e04]
  - @mlightcad/cad-script-core@1.7.8
  - @mlightcad/cad-agent-core@1.7.8
  - @mlightcad/cad-simple-viewer@1.7.8

## 1.7.8-preview.6

### Patch Changes

- fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.
- Updated dependencies [42351f3]
- Updated dependencies [57c330c]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.6
  - @mlightcad/cad-agent-core@1.7.8-preview.6

## 1.7.8-preview.5

### Patch Changes

- 1020d4d: fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.
- Updated dependencies [1020d4d]
  - @mlightcad/cad-agent-core@1.7.8-preview.5
  - @mlightcad/cad-simple-viewer@1.7.8-preview.5

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.4
  - @mlightcad/cad-simple-viewer@1.7.8-preview.4

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.3
  - @mlightcad/cad-simple-viewer@1.7.8-preview.3

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies [8a2d140]
- Updated dependencies [07ef40e]
- Updated dependencies [07ef40e]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.2
  - @mlightcad/cad-agent-core@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.1
  - @mlightcad/cad-simple-viewer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.0
  - @mlightcad/cad-simple-viewer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7
  - @mlightcad/cad-simple-viewer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7-preview.1
  - @mlightcad/cad-simple-viewer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7-preview.0
  - @mlightcad/cad-simple-viewer@1.7.7-preview.0
