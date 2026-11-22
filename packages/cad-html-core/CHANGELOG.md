# @mlightcad/cad-html-core

## 1.8.0-preview.6

### Minor Changes

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

- 67b0897: fix(html): include the drawing thumbnail as `preview.jpg` in multi-file package zips exported from the browser (Export to HTML dialog), matching `cad-html-exporter`
- Updated dependencies [206a3d2]
- Updated dependencies [e4d1399]
- Updated dependencies [9a09628]
- Updated dependencies [43c3a93]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.6

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.

### Patch Changes

- c3dcfa2: Complete the UI translations for every supported language. Japanese and Korean were mostly English (ribbon, menus, dialogs, properties, command prompts, plugins, and the exported HTML viewer); Turkish, Czech and Arabic were missing the dimension/multileader style dialogs, view and UCS managers, and many command prompts. All of these now show in the selected language instead of falling back to English.
- cafbb8f: fix: keep frozen INSERT geometry exportable and toggleable like AutoCAD

  Freeze still hides the whole reference, but HTML/PDF export now converts and
  reparents nested fragments so frozen layers can start invisible and be toggled
  back on. Off INSERT layers keep converting nested on-layer geometry. Layer
  manager freeze/lock icons use AutoCAD-like blue/yellow colors.

- 17e4920: feat(icons): redesign measure tool icons

  The distance, continuous distance, area, arc length, radius, angle, and
  coordinate measure icons were redrawn in a new style over one shared notched
  ruler. The continuous distance icon is the distance icon with a letter "n"
  above the dimension line. Measure tool and measurement panel icons are now
  monochrome (`currentColor`) and follow the light/dark theme like the other
  toolbar icons instead of using the blue accent color.

- b340dd6: Make multileaders behave like AutoCAD.
  - MLEADER applies the current multileader style: text height, text style, arrow size and landing follow the style (including its overall scale, or the annotation scale for annotative styles). The text is attached by its left or right side depending on the leader direction, one landing gap from the landing, so leaders drawn to the left no longer put the text on top of the landing. The in-place text editor uses the style's text height and text style. Leader type and landing set in the Options branch now take effect.
  - MLEADEREDIT Add leader joins a leader on the same side of the text to the existing landing, and puts a leader on the other side on a new landing past the far edge of the text. The preview shows the multileader with its real text and style.
  - Dragging multileader grips now works like AutoCAD (requires the matching `@mlightcad/data-model` release): the arrowhead grip stretches the leader, the landing and text grips move the text with its landing and flip the landing to the other side when needed, and the landing-end grip lengthens the landing.
  - HTML export snaps to the full leader line of multileaders with intermediate vertices.
  - `acapBuildMLeaderGeometry` no longer repeats the landing point as the last leader-line vertex (AutoCAD stores it as the branch's last leader point), and new helpers `acapCreateMLeader`, `acapLayoutMLeader`, `acapResolveMLeaderPlacement` and `acapAnnotationScaleFactor` are exported.

- 17e4920: fix(ribbon): unify icon line weights

  Ribbon and toolbar icons now share one line weight: 1/16 of the icon size
  (1.25 in 20-unit and 1.5 in 24-unit viewBoxes), matching Element Plus icons —
  about 1.6px on large ribbon buttons and 1px on small ones. Thin filled-outline
  glyphs (draw, modify, layer, text) were thickened; heavy dimension, leader,
  markup, and measure strokes were thinned. The attribute definition icon is now
  an outline to match edit attribute, and the elliptical arc icon no longer draws
  a doubled outline.

- Updated dependencies [2632f9e]
- Updated dependencies [2018b40]
- Updated dependencies [228004a]
- Updated dependencies [cafbb8f]
- Updated dependencies [1cf426f]
- Updated dependencies [84f82ff]
- Updated dependencies [05b2041]
- Updated dependencies
- Updated dependencies [b4306a7]
  - @mlightcad/three-renderer@1.8.0-preview.4

## 1.8.0-preview.3

### Patch Changes

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies [aeaed4c]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.2

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
