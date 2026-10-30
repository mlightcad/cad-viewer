# @mlightcad/cad-mcp-server

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
