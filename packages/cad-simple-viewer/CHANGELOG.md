# @mlightcad/cad-simple-viewer

## 1.2.1

### Patch Changes

- fix: fix bug on baseUrl

## 1.2.0

### Minor Changes

- feat: support dxf file with gbk encoding

## 1.1.12

### Patch Changes

- feat: bump version to fix some bugs

## 1.1.11

### Patch Changes

- feat: upgrade dependencies version to fix some bugs

## 1.1.10

### Patch Changes

- fix: fix issue 74, 75, and 76

## 1.1.9

### Patch Changes

- fix: fix UI bugs on layer manager

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

## 1.1.4

### Patch Changes

- feat: enable progressive rendering again

## 1.1.3

### Patch Changes

- fix: add logic to load default font back due to some bugs on rendering texts in blocks

## 1.1.2

### Patch Changes

- fix: fix regression issue #60

## 1.1.1

### Patch Changes

- feat: upgrade dependencies to fix bug on rendering shx fonts

## 1.1.0

### Patch Changes

- feat: simplify styles of cad-viewer component

## 1.0.23

### Patch Changes

- feat: remove property 'canvasId' and add property 'localFile' for cad-viewer component

## 1.0.22

### Patch Changes

- feat: move some logic to repo cad-simple-viewer-example

## 1.0.21

### Patch Changes

- feat: refine logic to addEntity in viewer to reduce memory cost

## 1.0.20

### Patch Changes

- fix: fix issue on loading mtext-renderer-worker.js in prod mode

## 1.0.19

### Patch Changes

- feat: render mtexts in web worker

## 1.0.18

### Patch Changes

- feat: support batch append for entities

## 1.0.17

### Patch Changes

- fix: fix issue on opening one empty dxf/dwg file

## 1.0.16

### Patch Changes

- feat: add new property 'background' for component MlCadViewer

## 1.0.15

### Patch Changes

- feat: simplify usage of cad-simple-viewer and cad-viewer by using web worker

## 1.0.14

### Patch Changes

- feat: upgrade version of dependencies

## 1.0.13

### Patch Changes

- feat: use extents value from AcDbDatabase to zoom to extents

## 1.0.12

### Patch Changes

- fix: fix bug on getting tranlated entity name in order to show entity information when hovering on one entity

## 1.0.11

### Patch Changes

- fix: upgrade new version of dependencies to fix bugs on getting layer name and line type name

## 1.0.10

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts

## 1.0.9

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts

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
- Updated dependencies
  - @mlightcad/three-renderer@1.0.4
  - @mlightcad/svg-renderer@0.0.5

## 1.0.3

### Patch Changes

- feat: upgrade version of data-model package to fix issue on refreshing multiple times when opening one drawing
- Updated dependencies
  - @mlightcad/three-renderer@1.0.3
  - @mlightcad/svg-renderer@0.0.4

## 1.0.2

### Patch Changes

- feat: refine MlCadViewer component by adding properties 'url' and 'wait'
- Updated dependencies
  - @mlightcad/svg-renderer@0.0.3
  - @mlightcad/three-renderer@1.0.2

## 1.0.1

### Patch Changes

- feat: removing logic to create one example drawing when launching viewer
- Updated dependencies
  - @mlightcad/three-renderer@1.0.1
  - @mlightcad/svg-renderer@0.0.2
