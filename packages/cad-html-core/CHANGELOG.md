# @mlightcad/cad-html-core

## 1.8.0-preview.1

### Patch Changes

- 7399150: fix: HTML export keeps IMAGE/OLE on their real layer, and offline viewers can turn initially-off layers back on after CPU geometry release
- fix: skip in-batch selection overlays in HTML export

  Mark shared INSERT and mesh-glyph highlight overlays with
  `transientHighlight` so HTML export does not bake the cyan selection
  tint into the offline scene.

- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [7399150]
- Updated dependencies
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.1

## 1.8.0-preview.0

### Minor Changes

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

## 1.7.8

### Patch Changes

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.
- Updated dependencies [05fdcf3]
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8

## 1.7.8-preview.6

### Patch Changes

- 4e7ed11: fix: keep the coordinate bubble anchored to its point while zooming in offline HTML

  In the exported HTML viewer, measuring a point and then zooming moved the X/Y
  bubble away from the picked point. The coordinate capsule is lifted above its
  anchor with `translate(-50%, calc(-50% - 16px))`, but the badge also scales with
  the camera (`scale(zoom / baseZoom)`). The lift stayed 16 CSS px while the
  capsule grew, so the bubble drifted into the point when zooming in and floated
  far above it when zooming out:

  | zoom | gap: point → bubble bottom  |
  | ---- | --------------------------- |
  | 1x   | +3.75px                     |
  | 3.4x | -25.95px (covers the point) |
  | 40x  | -476px                      |

  `acexOverlayTransformPrefix` now carries the lift in `em` and multiplies it by
  the same view scale that is appended to the transform, so the gap stays a
  constant 1.231em (16px at the 13px reference font) at every zoom level and
  tracks the capsule when the user changes the text height. Every other capsule
  dimension (padding, radius, border) is already `em`-based, which is why the
  lift is too: a px lift would reintroduce the same drift at a different font
  size.

  `ACEX_COORDINATE_BADGE_LIFT_EM` lives in `cad-html-core` and is consumed by
  both the `AcExHtmlShell` stylesheet (first paint) and the runtime transform, so
  the two can no longer disagree.

  `cad-viewer` and `cad-simple-viewer` are unaffected: their badges are anchored
  by `CSS2DObject.center` (a percentage) rather than a fixed pixel offset.

- 9220b20: fix: frame every layout with its export-time extents in offline HTML

  Opening an exported HTML viewer whose initially active layout was paper space
  produced two framing bugs when the export option "Initial View" was "Extents":
  - The first paint was slightly smaller than the toolbar **Zoom → Extents**
    result. Progressive packages mount the paper layout before its geometry
    chunks arrive, so the initial fit saw viewport frames only, while the toolbar
    action saw the fully painted layout.
  - Model space did not frame its own entities on first visit. Its only fallback
    was `meta.viewExtents`, which describes the active export layout (paper
    space) — so switching to model space zoomed to the sheet's area instead of
    the model geometry, and it kept that wrong box even after the chunks painted.

  Both come from the same gap: the runtime derived zoom-to-fit bounds at open
  time, when only part of the drawing is resident and only one layout's bounds
  are persisted. The snapshot now stores the fit box each layout computed at
  export time (`AcExLayoutSnapshot.fitExtents`, written to `meta.fitExtents` by
  the binary codec and to the manifest for multi-file packages), and
  `resolveLayoutViewExtents` prefers it, falling back to live geometry for
  snapshots written before this change.

  `fitExtents` is additive and backwards compatible: the layout JSON slot keeps
  its v4 wire shape, and older runtimes ignore the extra meta key.

  The initial framing and **Extents** now also stay identical for layouts loaded
  from a package, and user zoom/pan is still preserved per layout — a fit only
  happens while the layout has no stored view state of its own.

- fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.
- Updated dependencies [42351f3]
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.6

## 1.7.8-preview.5

### Patch Changes

- 1020d4d: fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.
- Updated dependencies [1020d4d]
  - @mlightcad/three-renderer@1.7.8-preview.5

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.4

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.3

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/three-renderer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/three-renderer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/three-renderer@1.7.7-preview.0
