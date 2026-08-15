# @mlightcad/cad-simple-ui-plugin

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.0

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.11

## 1.5.10

### Patch Changes

- feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.10

## 1.5.9

### Patch Changes

- feat: this release adds Czech localization, an Attribute Definition dialog, and an About dialog; improves XREF overlays, XATTACH defaults, and INSERT Off/Freeze layer behavior; ships a faster DXF pipeline with compacted block templates; expands offline HTML locales (Czech, Turkish); and documents the proprietary DWG converter plus Read the Docs API publishing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.9

## 1.5.8

### Patch Changes

- feat: expanded the CAD Viewer with Blocks, Layer Manager, Attribute Editor, Count, Memory, and Missing Resources palettes, plus -INSERT support, Xref overlays, overlay drawing support, and numerous rendering, interaction, and workflow improvements
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.8

## 1.5.7

### Patch Changes

- feat: added file open dialog, web worker readiness, collapsible toolbar UI, layer/entity refactors, undo/redo, GPU batch previews, and synchronization fixes
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.7
