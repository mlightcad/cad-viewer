# @mlightcad/cad-onedrive-plugin

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies [8a2d140]
- Updated dependencies [07ef40e]
- Updated dependencies [07ef40e]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7-preview.0

## 1.7.6

### Patch Changes

- feat: ships whole-drawing FIND with one-click navigation, Quick Select by entity handle, and paper-space fixes for osnap, properties, VPLAYER-frozen layers, and annotative MTEXT viewport scales. INSERT rendering shares block geometry, hatch islands and pattern lines stay correct, and HTML export adds base85 snapshots plus optional gzip chunks. Also fixes shared-geometry reading-mode tint, viewer teardown, and linear-time MTEXT parsing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6

## 1.7.6-preview.0

### Patch Changes

- feat: ships whole-drawing FIND search across all layouts with one-click navigation and an explicit current-layout-only mode in both the Vue and simple-UI shells. Paper-space viewports now hide VPLAYER-frozen layers, INSERT rendering shares block geometry and defers spatial indexes for faster opens, and headless export skips duplicate converts on a headless GPU. Plus mobile-bridge and DWG/DXF foundations, hatch pattern transform and mtext \pxq fixes, and Changesets pre mode for npm preview prereleases
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6-preview.0

## 1.7.5

### Patch Changes

- feat: adds OneDrive and Google Drive data-source plugins, upgrades the data model, and falls back when the linetype shader is broken. Speeds headless HTML export open and package builds, fixes SVG INSERT cloning and finite-extents framing, and stops dual font parse plus worker-pool fan-out during open. Also hides landing-page viewer chrome, defaults MSAL redirect to the current path, isolates the file-open theme, and swallows missed-font worker rejections.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.5
