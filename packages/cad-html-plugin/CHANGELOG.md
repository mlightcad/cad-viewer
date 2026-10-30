# @mlightcad/cad-html-plugin

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.8-preview.4
  - @mlightcad/cad-simple-viewer@1.7.8-preview.4
  - @mlightcad/three-renderer@1.7.8-preview.4

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.8-preview.3
  - @mlightcad/cad-simple-viewer@1.7.8-preview.3
  - @mlightcad/three-renderer@1.7.8-preview.3

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies [8a2d140]
- Updated dependencies [07ef40e]
- Updated dependencies [07ef40e]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.2
  - @mlightcad/cad-html-core@1.7.8-preview.2
  - @mlightcad/three-renderer@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.8-preview.1
  - @mlightcad/cad-simple-viewer@1.7.8-preview.1
  - @mlightcad/three-renderer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.8-preview.0
  - @mlightcad/cad-simple-viewer@1.7.8-preview.0
  - @mlightcad/three-renderer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.7
  - @mlightcad/cad-simple-viewer@1.7.7
  - @mlightcad/three-renderer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.7-preview.1
  - @mlightcad/cad-simple-viewer@1.7.7-preview.1
  - @mlightcad/three-renderer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-html-core@1.7.7-preview.0
  - @mlightcad/cad-simple-viewer@1.7.7-preview.0
  - @mlightcad/three-renderer@1.7.7-preview.0

## 1.7.6

### Patch Changes

- feat: ships whole-drawing FIND with one-click navigation, Quick Select by entity handle, and paper-space fixes for osnap, properties, VPLAYER-frozen layers, and annotative MTEXT viewport scales. INSERT rendering shares block geometry, hatch islands and pattern lines stay correct, and HTML export adds base85 snapshots plus optional gzip chunks. Also fixes shared-geometry reading-mode tint, viewer teardown, and linear-time MTEXT parsing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6
  - @mlightcad/three-renderer@1.7.6

## 1.7.6-preview.0

### Patch Changes

- feat: ships whole-drawing FIND search across all layouts with one-click navigation and an explicit current-layout-only mode in both the Vue and simple-UI shells. Paper-space viewports now hide VPLAYER-frozen layers, INSERT rendering shares block geometry and defers spatial indexes for faster opens, and headless export skips duplicate converts on a headless GPU. Plus mobile-bridge and DWG/DXF foundations, hatch pattern transform and mtext \pxq fixes, and Changesets pre mode for npm preview prereleases
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6-preview.0
  - @mlightcad/three-renderer@1.7.6-preview.0

## 1.7.5

### Patch Changes

- feat: adds OneDrive and Google Drive data-source plugins, upgrades the data model, and falls back when the linetype shader is broken. Speeds headless HTML export open and package builds, fixes SVG INSERT cloning and finite-extents framing, and stops dual font parse plus worker-pool fan-out during open. Also hides landing-page viewer chrome, defaults MSAL redirect to the current path, isolates the file-open theme, and swallows missed-font worker rejections.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.5
  - @mlightcad/three-renderer@1.7.5

## 1.7.4

### Patch Changes

- feat: adds a radius measure tool and async smart extents with cache and busy overlay, and maps PDF optional content groups to CAD layers. Fixes cover wipeout paint order, drawable scene extents, stalled font open overlays, PDF MText colours and INSERT labels, inline ACI-7 MText, selection glow scaling, Fit-to-screen measure badges, multi-attribute edit, and a font CDN notice
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.4
  - @mlightcad/three-renderer@1.7.4

## 1.7.3

### Patch Changes

- feat: brings smart extents and AutoCAD saved-view zoom to live viewer toolbars, and cuts open-time stalls by speeding INSERT indexing and font regeneration. Fallback fonts preload before the first glyph bake so text no longer flashes with missing glyphs, and docs link the proprietary DWG converter install guide to the wiki
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.3
  - @mlightcad/three-renderer@1.7.3

## 1.7.2

### Patch Changes

- feat: draws complex TEXT and SHAPE linetypes as strokes and glyphs, renders closed wide polylines as offset rings, and adds HTML export smart extents plus AutoCAD saved-view zoom. The CLI gains a self-hosted base URL and open-view, no-plot, and circle-sides options. Dynamic blocks and arc-aligned text come with the data-model upgrade. Drawing open is faster with font preload and lighter line batches, and fixes cover raster and OLE textures, PDF PDMODE, and progressive open.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.2
  - @mlightcad/three-renderer@1.7.2

## 1.7.1

### Patch Changes

- feat: adds a native AcGi PDF renderer with direct vector export and lower-memory text modes, plus HTML export that embeds progressive ACEX chunks, multi-file ZIP packages, and leaner multi-layout switching. Shared toolbar and notification engines land across viewers, with reading mode, mobile session accessories, and parallel package downloads. Fixes cover font sync, hatch shaders, mirrored INSERTs, OLE2Frame embeds, selection, and PDSIZE/highlight/dashed-line rendering
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.1
  - @mlightcad/three-renderer@1.7.1

## 1.7.0

### Minor Changes

- feat: expands mobile and touch review with responsive phone/pad toolbars, a long-press snap loupe, confirmed pick marks, and a command session panel with live metrics. Measurement gains continuous distance, a results list palette, endpoint grips with osnap, unit conversion, and zoom-scaled hairline overlays. HTML export adds multi-file ACEX packages, paper-space background choice, and lazy font catalogs, plus reading mode and a VitePress multi-language docs site

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.0
  - @mlightcad/three-renderer@1.7.0

## 1.6.3

### Patch Changes

- feat: ships a CAD diff viewer with MDI document sessions, COMPARE sysvar support, revision-cloud grouping, and polished compare display with shared toolbar icons and a locale picker. Design Review gains callouts attached to shape markups and a reordered review toolbar. HTML export can require expiry and a password. Arabic locale is complete, UI-component locales sync with the CAD viewer, and toolbar SVGs are consolidated with a unified clear icon
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.3
  - @mlightcad/three-renderer@1.6.3

## 1.6.2

### Patch Changes

- feat: adds an in-browser DWG/DXF to offline HTML converter, HTML export of paper-space viewports with layout switching, and a drawing layout switcher in the simple-ui toolbar. Object snap gains AutoCAD-style center ticks and intersection snaps. Overlay toolbars keep style controls while markup or measure is selected, restore named ACI colors, and restore undo for deleted entities. Arc-length measure locks onto circles, and hatch fills stay below linework in HTML export.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.2
  - @mlightcad/three-renderer@1.6.2

## 1.6.1

### Patch Changes

- feat: extends Design Review markup and measurement to the HTML viewer with sidecar persistence, aligned review icons, and HTML-only measure overlays that avoid forcing WebGL redraws. Also preserves absolute hatch colours when only lineweight is ByLayer, and documents GitMCP servers in the README and Cursor config
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.1
  - @mlightcad/three-renderer@1.6.1

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.0
  - @mlightcad/three-renderer@1.6.0

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.11
  - @mlightcad/three-renderer@1.5.11

## 1.5.10

### Patch Changes

- feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.10
  - @mlightcad/three-renderer@1.5.10

## 1.5.9

### Patch Changes

- feat: this release adds Czech localization, an Attribute Definition dialog, and an About dialog; improves XREF overlays, XATTACH defaults, and INSERT Off/Freeze layer behavior; ships a faster DXF pipeline with compacted block templates; expands offline HTML locales (Czech, Turkish); and documents the proprietary DWG converter plus Read the Docs API publishing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.9
  - @mlightcad/three-renderer@1.5.9

## 1.5.8

### Patch Changes

- feat: expanded the CAD Viewer with Blocks, Layer Manager, Attribute Editor, Count, Memory, and Missing Resources palettes, plus -INSERT support, Xref overlays, overlay drawing support, and numerous rendering, interaction, and workflow improvements
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.8
  - @mlightcad/three-renderer@1.5.8

## 1.5.7

### Patch Changes

- feat: added file open dialog, web worker readiness, collapsible toolbar UI, layer/entity refactors, undo/redo, GPU batch previews, and synchronization fixes
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.7
  - @mlightcad/three-renderer@1.5.7

## 1.5.6

### Patch Changes

- feat: major update featuring grip point editing, proxy entity support, enhanced HTML export, AutoCAD-style command input, improved large-drawing rendering, SHAPE and dimension support, mobile usability enhancements, and extensive performance, rendering, and stability improvements
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.6
  - @mlightcad/three-renderer@1.5.6

## 1.5.5

### Patch Changes

- chore: add version sync check and update deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.5
  - @mlightcad/three-renderer@1.5.5

## 1.5.4

### Patch Changes

- feat: Text Style dialog, SHAPE rendering, batch visibility/HIDEOBJECTS, and font fallback/CDN; fix zoom-fit bounds, PNG export frustum, paper-space viewport detection, and dev startup deps; add demo links to README
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.4
  - @mlightcad/three-renderer@1.5.4

## 1.5.3

### Patch Changes

- chore(deps): reclassify package dependencies and pin lodash-es via pnpm overrides
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.3
  - @mlightcad/three-renderer@1.5.3

## 1.5.2

### Patch Changes

- feat: HTML/SVG export plugins, offline viewer enhancements, and ortho/polar tracking
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.2
  - @mlightcad/three-renderer@1.5.2
