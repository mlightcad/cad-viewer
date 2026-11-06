# @mlightcad/cad-script-core

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
