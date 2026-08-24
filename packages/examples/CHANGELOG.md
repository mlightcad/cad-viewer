# @mlightcad/cad-viewer-examples

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

- fix: fix issue 103 and update cad-simple-viewer-example to be able to verify it

## 1.4.8

### Patch Changes

- feat: support annotation

## 1.4.7

### Patch Changes

- fix: fix issues 89 and 90

## 1.2.8

### Patch Changes

- feat: support ATTDEF ATTRIB entities when reading DXF file

## 1.2.7

### Patch Changes

- fix: fix issues 79 andn 80

## 1.2.6

### Patch Changes

- fix: fix issues 64 and 73

## 1.2.5

### Patch Changes

- feat: fix some issues on rendering linetype and hatch

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

## 1.0.23

### Patch Changes

- feat: bump version to fix some bugs

## 1.0.22

### Patch Changes

- feat: upgrade dependencies version to fix some bugs

## 1.0.21

### Patch Changes

- fix: fix issue 74, 75, and 76

## 1.0.20

### Patch Changes

- feat: fix bug on zoomToFit

## 1.0.19

### Patch Changes

- feat: show warning message if found some unknown entities after parsed drawing

## 1.0.18

### Patch Changes

- fix: upgrade dependencies to fix issue on parsing entity color when its color is byBlock

## 1.0.17

### Patch Changes

- fix: add logic to load default font back due to some bugs on rendering texts in blocks

## 1.0.16

### Patch Changes

- fix: fix regression issue #60

## 1.0.15

### Patch Changes

- feat: render mtexts in web worker

## 1.0.14

### Patch Changes

- feat: support batch append for entities

## 1.0.13

### Patch Changes

- feat: add new property 'background' for component MlCadViewer

## 1.0.12

### Patch Changes

- feat: simplify usage of cad-simple-viewer and cad-viewer by using web worker

## 1.0.11

### Patch Changes

- feat: upgrade version of dependencies

## 1.0.10

### Patch Changes

- feat: use extents value from AcDbDatabase to zoom to extents

## 1.0.9

### Patch Changes

- fix: fix bug on getting tranlated entity name in order to show entity information when hovering on one entity

## 1.0.8

### Patch Changes

- fix: upgrade new version of dependencies to fix bugs on getting layer name and line type name

## 1.0.7

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts

## 1.0.6

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts

## 1.0.5

### Patch Changes

- feat: upgrade realdwg-web to version 1.1.8 to fix some bugs

## 1.0.4

### Patch Changes

- fix: fix dependencies of cad-simple-viewer

## 1.0.3

### Patch Changes

- feat: upgrade version of data-model package to fix issue on refreshing multiple times when opening one drawing

## 1.0.2

### Patch Changes

- feat: refine MlCadViewer component by adding properties 'url' and 'wait'

## 1.0.1

### Patch Changes

- feat: removing logic to create one example drawing when launching viewer
