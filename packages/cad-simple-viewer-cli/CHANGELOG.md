# @mlightcad/cad-simple-viewer-cli

## 1.6.3

### Patch Changes

- feat: ships a CAD diff viewer with MDI document sessions, COMPARE sysvar support, revision-cloud grouping, and polished compare display with shared toolbar icons and a locale picker. Design Review gains callouts attached to shape markups and a reordered review toolbar. HTML export can require expiry and a password. Arabic locale is complete, UI-component locales sync with the CAD viewer, and toolbar SVGs are consolidated with a unified clear icon
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.6.3
  - @mlightcad/cad-pdf-plugin@1.6.3
  - @mlightcad/cad-simple-viewer@1.6.3
  - @mlightcad/cad-svg-plugin@1.6.3

## 1.6.2

### Patch Changes

- feat: adds an in-browser DWG/DXF to offline HTML converter, HTML export of paper-space viewports with layout switching, and a drawing layout switcher in the simple-ui toolbar. Object snap gains AutoCAD-style center ticks and intersection snaps. Overlay toolbars keep style controls while markup or measure is selected, restore named ACI colors, and restore undo for deleted entities. Arc-length measure locks onto circles, and hatch fills stay below linework in HTML export.
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.6.2
  - @mlightcad/cad-pdf-plugin@1.6.2
  - @mlightcad/cad-simple-viewer@1.6.2
  - @mlightcad/cad-svg-plugin@1.6.2

## 1.6.1

### Patch Changes

- feat: extends Design Review markup and measurement to the HTML viewer with sidecar persistence, aligned review icons, and HTML-only measure overlays that avoid forcing WebGL redraws. Also preserves absolute hatch colours when only lineweight is ByLayer, and documents GitMCP servers in the README and Cursor config
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.6.1
  - @mlightcad/cad-pdf-plugin@1.6.1
  - @mlightcad/cad-simple-viewer@1.6.1
  - @mlightcad/cad-svg-plugin@1.6.1

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-html-plugin@1.6.0
  - @mlightcad/cad-pdf-plugin@1.6.0
  - @mlightcad/cad-simple-viewer@1.6.0
  - @mlightcad/cad-svg-plugin@1.6.0

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.11
  - @mlightcad/cad-pdf-plugin@1.5.11
  - @mlightcad/cad-simple-viewer@1.5.11
  - @mlightcad/cad-svg-plugin@1.5.11
