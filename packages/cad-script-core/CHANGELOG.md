# @mlightcad/cad-script-core

## 1.8.0-preview.6

### Minor Changes

- 8279755: feat(agent): evidence-tracked image redraw with `cad.redraw`

  Port the image-to-CAD redraw workflow into the script runtime. Scripts build a
  semantic spec (profile, units, per-view calibration, evidence levels,
  constraints, entities, checks); `cad.redraw.validate` checks it,
  `cad.redraw.draw` draws it in one undo group on standard layers (OBJECT,
  HIDDEN, CENTER, DIM, TEXT, TABLE, BORDER, CONSTRUCTION, ASSUMPTION) with real
  dimensions, leaders, text, and line-drawn tables, and `cad.redraw.inspect`
  compares readable dimension values with the drawn geometry. Results carry a
  `pass` / `pass_with_warnings` / `needs_review` / `blocked` / `fail` status.
  Image pixel coordinates can be mapped through dimension-anchor, similarity,
  affine, or homography calibrations. Drawing sets `INSUNITS` from the spec
  units, uses a CJK-capable `REDRAW_TEXT` style for text and dimension text, and
  falls back to lines + text (or a leader) when a dimension cannot be created.

  Also add `tx.drawLeader` (LEADER with an associated MTEXT annotation),
  `rotationDeg` / `width` on `tx.drawText`, and fix two drawing bugs: `drawText`
  set an MTEXT height property that does not exist (text drew with height 0), and
  `drawArc` passed degrees where radians are expected. The agent prompt gains an
  IMAGE REDRAW section and a "Redraw image as editable CAD" suggested task, and
  the MCP `execute_cad_script` description includes the spec reference.

- 0617037: feat(redraw): pixel-level comparison with the reference image

  Add `cad.redraw.compare(spec, options?)`. It renders the drawing over the
  reference image's CAD footprint, registers it into the image frame through the
  spec calibration (similarity, affine, or homography), thins both to 1-pixel
  centerlines, and measures them with distance transforms. The tool result's
  `redrawCompare` reports a verdict (`aligned` / `offset` / `incomplete` /
  `cluttered` / `mismatch`), coverage, precision, F1, mean and p95 distances in
  pixels and CAD units, a suggested move for systematic offsets, and hotspot
  regions, with an overlay and a difference image attached for the model.

  The pure algorithms (`acexExtractInk`, `acexThinInk`, `acexDistanceTransform`,
  `acexCompareInk`, overlay / difference rendering) live in
  `@mlightcad/cad-script-core`; viewer sessions supply decoding, WebGL rendering,
  and PNG encoding through the new `CadSession.redrawRaster` host
  (`createViewerRedrawRasterHost`). The CAD agent registers the conversation's
  attached images as references and iterates draw → inspect → compare.

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

- Updated dependencies [206a3d2]
- Updated dependencies [e4d1399]
- Updated dependencies [9a09628]
- Updated dependencies [43c3a93]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.6
  - @mlightcad/cad-pdf-core@1.8.0-preview.6
  - @mlightcad/pdf-renderer@1.8.0-preview.6

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-pdf-core@1.8.0-preview.5
  - @mlightcad/pdf-renderer@1.8.0-preview.5
  - @mlightcad/three-renderer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- 228004a: Add layer preview mode to `cad.view.capturePreview`.
  - `cad.view.capturePreview({ layers: ['A', 'B'] })` renders only model-space geometry on those layers (INSERTs contribute just their fragments on those layers) and frames the PNG to the combined extents of the layers, so the image has no large empty margins. Names are case-insensitive; unknown names throw; `layers` cannot be combined with `selection`.
  - `CaptureDrawingPreviewFailure` adds `'no-layers'`; `normalizeCadCapturePreviewOptions` returns `NormalizedCadCapturePreviewOptions`.
  - New `AcApEntityPreviewConvertor.captureLayers`, `AcTrLayout.findLayers` / `computeLayerPreviewBoundsBox` / `createLayerPreviewRoot`, `AcTrLayer.getEntityIds` / `computeContentBoundingBox`, and `AcTrBatchedGroup.getEntityIds`.

- 75c44d2: Add selection preview mode to `cad.view.capturePreview`.
  - `CadSession.capturePreview` now takes `{ longSide?, selection? }` instead of a bare pixel number (a bare number is still accepted as `longSide` for compatibility).
  - Pass `selection: true` to render only the current selection via `AcApEntityPreviewConvertor` (batch geometry + scene bounds; not database `geometricExtents`).
  - Empty selection returns `reason: 'no-selection'`. Extents mode behavior is unchanged.

- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.

### Patch Changes

- b8fbeac: feat(agent): queue follow-ups, edit/resend messages, and relative timestamps

  Add Cursor-style follow-up queueing while the agent is busy, inline edit/resend
  for prior user turns, message copy, and relative timestamps. Also document
  common `tx.draw*` argument names and allow object property keys named like
  banned globals (`{ window: n }`) while still blocking free identifiers.

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
  - @mlightcad/cad-pdf-core@1.8.0-preview.4
  - @mlightcad/pdf-renderer@1.8.0-preview.4

## 1.8.0-preview.3

### Minor Changes

- 9667011: fix(agent): avoid script_timeout on large drawing queries

  Add per-block `entityCount` / `typeCounts` on `cad.blocks`, plus
  `cad.entities.count` / `inBlock(id, pred?)`. `where`/`count`/`inBox` scan
  layout spaces only (not block defs). Cap snapshot queries (`too_many_matches`),
  raise script budget to 5s and per-turn steps to 50/80, and steer agents off
  full-DB `extents` scans (use `inBox`; type is `BlockReference`).

- ab2447c: Add `tx.drawDim*` helpers so agent scripts can create real dimension entities instead of faking them with lines and text.
  - New transaction methods: `drawDimAligned`, `drawDimLinear`, `drawDimDiameter`, `drawDimRadius`, `drawDimAngular`, `drawDimArc`, and `drawDimOrdinate`.
  - Diameter and radius accept either chord points or `center` + `radius` (optional `angleDeg` / `leaderLength`) so circle snapshots can feed them directly.
  - Omitting `rotationDeg` on linear dims picks horizontal/vertical from dim-line placement; omitting `styleName` uses the drawing `$DIMSTYLE`.

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

- b7a838f: Enrich entity snapshots so scripts can read, filter, and measure real drawings without private API access.
  - Every snapshot now carries the `AcDbEntity` display properties: `color`, `resolvedColor`, `lineType`, `lineWeight`, `linetypeScale`, `visibility`, `transparency`, plus `thickness` / `normal` when the type has them. ByLayer / ByBlock colors keep their flags instead of being dropped.
  - `cad.entities.where(...)` still reads these lazily: only the fields a predicate touches are resolved, and only matching entities are converted into full snapshots.
  - Per-type `geometry` now includes derived values: line length / midPoint / direction, arc length and endpoints, circle and ellipse area, polyline vertices with bulge and widths, spline control points / knots / weights / degree / length, text alignment and formatting, MTEXT `plainText` with control codes stripped, block attributes and dynamic-block names, table cell text, hatch boundary loops and gradient fields, and a computed dimension `measurement`.
  - New `cad.measure.area(id)`; `cad.measure.length(id)` now prefers the entity's own length.

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

### Patch Changes

- Updated dependencies [c525fa8]
- Updated dependencies
  - @mlightcad/cad-pdf-core@1.8.0-preview.0

## 1.7.8

### Patch Changes

- d2f9e04: fix: send CAD tool results to the agent model again. `toModelOutput` destructured `{ output }`, but AI SDK v5 passes the raw tool result, so every `execute_cad_script` result reached the model as `null`. `CadToolDefinition.execute` now returns `Promise<ToolResult>` instead of `unknown`, and the plugin pins the `tool()` output type so a wrong signature is a type error.
- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.
- d2f9e04: refactor: move the CAD script runtime into the new `@mlightcad/cad-script-core` package, which depends only on `@mlightcad/data-model`. It adds `createDatabaseSession(db)` for running scripts without a viewer. `CadSession` gains optional `runEdit` and `capturePreview` hooks, so viewer behavior is injected instead of imported. `@mlightcad/cad-agent-core` is now the viewer binding: it re-exports the runtime and keeps its existing API and defaults. The MCP server's Node side imports `@mlightcad/cad-script-core/script-api`.
