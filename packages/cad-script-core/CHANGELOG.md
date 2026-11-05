# @mlightcad/cad-script-core

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
