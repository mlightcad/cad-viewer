# @mlightcad/three-renderer

## 1.8.0-preview.1

### Patch Changes

- 7399150: fix: HTML export keeps IMAGE/OLE on their real layer, and offline viewers can turn initially-off layers back on after CPU geometry release
- fix: skip in-batch selection overlays in HTML export

  Mark shared INSERT and mesh-glyph highlight overlays with
  `transientHighlight` so HTML export does not bake the cyan selection
  tint into the offline scene.

- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene

## 1.8.0-preview.0

### Minor Changes

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

### Patch Changes

- 6551be6: fix: keep wipeouts and MTEXT canvas masks fused with the paper background when their layer refreshes to ACI 7

  Background fills were still eligible for ByLayer colour sync, so a layer-table
  update that supplied ACI 7 (black on light paper) overwrote MODELBKCOLOR /
  PAPERBKCOLOR tracking. Materials marked `isBackgroundFill` now skip layer
  colour refresh and are not stored as ByLayer-colour. Bumps `@mlightcad/data-model`
  to 1.15.22 and `@mlightcad/libredwg-converter` to 3.15.22 for the matching
  MTEXT mask / wipeout trait flags.

- f5b6152: fix(three-renderer): repair hatch loops that draw an edge twice

  `resolveSelfIntersectingHatchLoop` now runs the PolyBool segments through a
  union selection before rebuilding rings, so edges without fill on either side
  are dropped. A spike drawn out and back no longer makes the repair fail (and
  leak fill outside the boundary), and a notch reached along a doubled edge is no
  longer filled in.

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

- 05fdcf3: fix: rebase mesh-glyph instance matrices around a bucket origin

  Scene-level TrueType glyph InstancedMesh batching baked absolute world
  coordinates into float32 instance matrices, so on large-coordinate
  (georeferenced, e.g. CGCS2000) drawings glyph vertices quantized to
  0.25–2 drawing units and text rendered mangled; hover/selection
  overlays were unaffected, which hid the cause. Instance matrices now
  bake in float64 and are rebased at flush around each bucket's first
  placement, with the origin carried on the InstancedMesh position where
  the CPU's float64 model-view math absorbs it. Highlight overlays parent
  under the InstancedMesh so they inherit the same origin.

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.

## 1.7.8-preview.6

### Patch Changes

- 42351f3: fix: keep explicit ACI-7 block colours on layer 0 instead of inheriting the INSERT layer

  A block entity authored on layer `0` with an explicit ACI-7 (foreground) colour
  was rebound to the INSERT layer's colour, so a title frame that AutoCAD draws
  white rendered red on a red INSERT layer.

  The two cases were indistinguishable: `AcGiSubEntityTraits.color` is stored
  pre-resolved, so ByLayer content on an ACI-7 layer also arrives as an absolute
  ACI 7. `data-model` now records the original provenance on the traits
  (`isColorByLayer`), and `three-renderer` uses it to set `isByLayerColor`
  truthfully. `AcTrInheritedLayerMaterialMapper` can then decide directly: a
  ByLayer colour inherits the INSERT layer, an explicit colour does not.

  Missing bindings (`isByLayerColor == null`, from conversion paths that drop the
  flag) are still inferred from the remaining ByLayer markers, so the earlier
  fixes for ByLayer legend headers (#602) and lost-flag DXF conversions keep
  working.

  The material cache key now includes that provenance. A ByLayer colour on an
  ACI-7 layer and an explicit ACI-7 resolve to the same symbolic colour, so they
  previously shared one cache entry and the first creator's `isByLayerColor`
  leaked to every later user. Which one won depended on draw order, so the same
  title frame could inherit the INSERT colour, and inherited ByLayer content could
  fall back to black on model-space (dark) backgrounds. Traits without provenance
  keep the historical key.

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

- feat: expands mobile and touch review with responsive phone/pad toolbars, a long-press snap loupe, confirmed pick marks, and a command session panel with live metrics. Measurement gains continuous distance, a results list palette, endpoint grips with osnap, unit conversion, and zoom-scaled hairline overlays. HTML export adds multi-file ACEX packages, paper-space background choice, and lazy font catalogs, plus reading mode and a VitePress multi-language docs site

## 1.6.3

### Patch Changes

- feat: ships a CAD diff viewer with MDI document sessions, COMPARE sysvar support, revision-cloud grouping, and polished compare display with shared toolbar icons and a locale picker. Design Review gains callouts attached to shape markups and a reordered review toolbar. HTML export can require expiry and a password. Arabic locale is complete, UI-component locales sync with the CAD viewer, and toolbar SVGs are consolidated with a unified clear icon

## 1.6.2

### Patch Changes

- feat: adds an in-browser DWG/DXF to offline HTML converter, HTML export of paper-space viewports with layout switching, and a drawing layout switcher in the simple-ui toolbar. Object snap gains AutoCAD-style center ticks and intersection snaps. Overlay toolbars keep style controls while markup or measure is selected, restore named ACI colors, and restore undo for deleted entities. Arc-length measure locks onto circles, and hatch fills stay below linework in HTML export.

## 1.6.1

### Patch Changes

- feat: extends Design Review markup and measurement to the HTML viewer with sidecar persistence, aligned review icons, and HTML-only measure overlays that avoid forcing WebGL redraws. Also preserves absolute hatch colours when only lineweight is ByLayer, and documents GitMCP servers in the README and Cursor config

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.

## 1.5.10

### Patch Changes

- feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable

## 1.5.9

### Patch Changes

- feat: this release adds Czech localization, an Attribute Definition dialog, and an About dialog; improves XREF overlays, XATTACH defaults, and INSERT Off/Freeze layer behavior; ships a faster DXF pipeline with compacted block templates; expands offline HTML locales (Czech, Turkish); and documents the proprietary DWG converter plus Read the Docs API publishing

## 1.5.8

### Patch Changes

- feat: expanded the CAD Viewer with Blocks, Layer Manager, Attribute Editor, Count, Memory, and Missing Resources palettes, plus -INSERT support, Xref overlays, overlay drawing support, and numerous rendering, interaction, and workflow improvements

## 1.5.7

### Patch Changes

- feat: added file open dialog, web worker readiness, collapsible toolbar UI, layer/entity refactors, undo/redo, GPU batch previews, and synchronization fixes

## 1.5.6

### Patch Changes

- feat: major update featuring grip point editing, proxy entity support, enhanced HTML export, AutoCAD-style command input, improved large-drawing rendering, SHAPE and dimension support, mobile usability enhancements, and extensive performance, rendering, and stability improvements

## 1.5.5

### Patch Changes

- chore: add version sync check and update deps

## 1.5.4

### Patch Changes

- feat: Text Style dialog, SHAPE rendering, batch visibility/HIDEOBJECTS, and font fallback/CDN; fix zoom-fit bounds, PNG export frustum, paper-space viewport detection, and dev startup deps; add demo links to README

## 1.5.3

### Patch Changes

- chore(deps): reclassify package dependencies and pin lodash-es via pnpm overrides

## 1.5.2

### Patch Changes

- feat: HTML/SVG export plugins, offline viewer enhancements, and ortho/polar tracking

## 1.5.1

### Patch Changes

- feat: adds offline HTML export (self-contained viewer, Playwright CLI, measurement, object snap, OrbitControls), MTEXT editing with ribbon integration and positioning fixes, the OFFSET command, and a Drawing Units (UNITS) dialog with LUNITS/AUNITS formatting. It improves paper-space layout switching, viewport picking, hatch rendering, and DXF/DWG load UX. Infrastructure updates include Node.js 24, pnpm 10, dependency upgrades, and production build/tree-shaking fixes

## 1.5.0

### Minor Changes

- fix: upgrade dependencies to fix some position issues on rendering texts

## 1.4.13

### Patch Changes

- feat: add commands polygon, ellipse, hatch, layer, move, qselect, and pngout

## 1.4.12

### Patch Changes

- fix: fix lots of bugs

## 1.4.11

### Patch Changes

- feat: add measurement feature

## 1.4.10

### Patch Changes

- feat: add line weight supports

## 1.4.9

### Patch Changes

- fix: fix issue 103 and update cad-simple-viewer-demo to be able to verify it

## 1.4.8

### Patch Changes

- feat: support annotation

## 1.4.7

### Patch Changes

- fix: fix issues 89 and 90

## 1.4.6

### Patch Changes

- feat: support ATTDEF ATTRIB entities when reading DXF file

## 1.4.5

### Patch Changes

- fix: fix issues 79 andn 80

## 1.4.4

### Patch Changes

- fix: fix issues 64 and 73

## 1.4.2

### Patch Changes

- feat: supports setting webworker javascript bundle urls in AcApDocManagerOptions

## 1.4.1

### Patch Changes

- feat: fix some issues on rendering linetype and hatch

## 1.4.0

### Minor Changes

- feat: support osnap for insert entity

## 1.3.4

### Patch Changes

- fix: fix issues on rendering times.shx font characters and block with non-zero base point

## 1.3.2

### Patch Changes

- fix: fix regression isssue on rendering block with wrong color

## 1.3.1

### Patch Changes

- feat: upgrade dependencies to fix issue on reading color from dwg file

## 1.3.0

### Minor Changes

- feat: support changing layer color

## 1.2.5

### Patch Changes

- feat: refine input mangager and jig system

## 1.2.4

### Patch Changes

- fix: fix bundle size issue in lastest version of cad-simple-viewer

## 1.2.3

### Patch Changes

- fix: fix bugs on rendering polyline2d and polyline3d

## 1.2.2

### Patch Changes

- fix: fix bugs on rendering polyline2d, polyline3d, and linear dimension

## 1.2.1

### Patch Changes

- fix: fix bug on baseUrl

## 1.2.0

### Minor Changes

- feat: support dxf file with gbk encoding

## 1.1.11

### Patch Changes

- feat: bump version to fix some bugs

## 1.1.10

### Patch Changes

- feat: upgrade dependencies version to fix some bugs

## 1.1.9

### Patch Changes

- fix: fix issue 74, 75, and 76

## 1.1.8

### Patch Changes

- feat: fix bug on zoomToFit

## 1.1.7

### Patch Changes

- feat: show warning message if found some unknown entities after parsed drawing

## 1.1.6

### Patch Changes

- fix: upgrade dependencies to fix issue on parsing entity color when its color is byBlock

## 1.1.5

### Patch Changes

- feat: fix bugs on rendering insert (block reference) entity which contains entities in different layers

## 1.0.20

### Patch Changes

- feat: enable progressive rendering again

## 1.0.19

### Patch Changes

- fix: fix regression issue #60

## 1.0.18

### Patch Changes

- feat: upgrade dependencies to fix bug on rendering shx fonts

## 1.0.17

### Patch Changes

- feat: render mtexts in web worker

## 1.0.16

### Patch Changes

- feat: support batch append for entities

## 1.0.15

### Patch Changes

- fix: fix issue on opening one empty dxf/dwg file

## 1.0.14

### Patch Changes

- feat: add new property 'background' for component MlCadViewer

## 1.0.13

### Patch Changes

- feat: simplify usage of cad-simple-viewer and cad-viewer by using web worker

## 1.0.12

### Patch Changes

- feat: upgrade version of dependencies

## 1.0.11

### Patch Changes

- feat: use extents value from AcDbDatabase to zoom to extents

## 1.0.10

### Patch Changes

- fix: fix bug on getting tranlated entity name in order to show entity information when hovering on one entity

## 1.0.9

### Patch Changes

- fix: upgrade new version of dependencies to fix bugs on getting layer name and line type name

## 1.0.8

### Patch Changes

- fix: catch errors to continue rendering drawing if bigfont characters are found

## 1.0.7

### Patch Changes

- feat: upgrade realdwg-web to version 1.1.8 to fix some bugs

## 1.0.6

### Patch Changes

- feat: upgrade version of realdwg-web to fix some bugs

## 1.0.5

### Patch Changes

- fix: fix dependencies of cad-simple-viewer

## 1.0.4

### Patch Changes

- feat: add property 'canvasId' for MlCadViewer component and update its example and readme

## 1.0.3

### Patch Changes

- feat: upgrade version of data-model package to fix issue on refreshing multiple times when opening one drawing

## 1.0.2

### Patch Changes

- feat: refine MlCadViewer component by adding properties 'url' and 'wait'

## 1.0.1

### Patch Changes

- feat: removing logic to create one example drawing when launching viewer
