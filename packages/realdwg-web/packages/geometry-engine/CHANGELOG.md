# @mlightcad/geometry-engine

## 3.2.8

### Patch Changes

- fix: fix issue on reading dxf file caused by last release
- Updated dependencies
  - @mlightcad/common@1.4.8

## 3.2.7

### Patch Changes

- feat: add DXF export support
- Updated dependencies
  - @mlightcad/common@1.4.7

## 3.2.6

### Patch Changes

- feat: support changing foreground color
- Updated dependencies
  - @mlightcad/common@1.4.6

## 3.2.5

### Patch Changes

- chore: add system variables MEASUREMENTCOLOR, OSMODE, and TEXTCOLOR
- Updated dependencies
  - @mlightcad/common@1.4.5

## 3.2.4

### Patch Changes

- feat: add configurable parser worker timeout for drawing conversion and centralize database system variable names
- Updated dependencies
  - @mlightcad/common@1.4.4

## 3.2.3

### Patch Changes

- fix: fix issue 101
- Updated dependencies
  - @mlightcad/common@1.4.3

## 3.2.2

### Patch Changes

- feat(data-model): emit sysVarChanged only when sysvar value actually changes and add system variable 'LWDISPLAY'
- Updated dependencies
  - @mlightcad/common@1.4.2

## 3.2.1

### Patch Changes

- feat: set entity line weight and line type scale for newly created entity
- Updated dependencies
  - @mlightcad/common@1.4.1

## 3.2.0

### Patch Changes

- feat: support xdata and xrecord
- Updated dependencies
  - @mlightcad/common@1.3.8

## 3.1.10

### Patch Changes

- feat: respect value of system variables 'cecolor' and 'clayer' when creating one new entity
- Updated dependencies
  - @mlightcad/common@1.3.7

## 3.1.9

### Patch Changes

- feat: enhance polyline
- Updated dependencies
  - @mlightcad/common@1.3.6

## 3.1.8

### Patch Changes

- fix: fix issues 89 and 90 in cad-viewer repo
- Updated dependencies
  - @mlightcad/common@1.3.5

## 3.1.7

### Patch Changes

- feat: support ATTDEF ATTRIB entities when reading DXF file
- Updated dependencies
  - @mlightcad/common@1.3.4

## 3.1.6

### Patch Changes

- feat: support ATTDEF and ATTRIB entities
- Updated dependencies
  - @mlightcad/common@1.3.3

## 3.1.5

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.3.2

## 3.1.4

### Patch Changes

- feat: update file type handling to support custom converter types
- Updated dependencies
  - @mlightcad/common@1.3.1

## 3.1.3

### Patch Changes

- feat: add property 'properties' for entities AcDb2dPolyline, AcDb3dPolyline, and AcDbPolyline

## 3.1.2

### Patch Changes

- fix: fix issue 38 in repo cad-viewer

## 3.1.1

### Patch Changes

- feat: refine entity osnap and properties

## 3.1.0

### Patch Changes

- feat: modify common, geometry-engine, and graphic-interface as dependencies of package data-model
- Updated dependencies
  - @mlightcad/common@1.2.8

## 3.0.9

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.2.7

## 3.0.8

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.2.6

## 3.0.7

### Patch Changes

- feat: refine snap related api

## 3.0.6

### Patch Changes

- feat: refine logic to convert POLYLINE entity in dxf/dwg
- Updated dependencies
  - @mlightcad/common@1.2.5

## 3.0.5

### Patch Changes

- fix: bump version again because the wrong package was published in npm registry
- Updated dependencies
  - @mlightcad/common@1.2.4

## 3.0.4

### Patch Changes

- feat: support interruptting the entire workflow if one task throw one exception
- Updated dependencies
  - @mlightcad/common@1.2.3

## 3.0.3

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.2.2

## 3.0.2

### Patch Changes

- fix: fix bug on parsing color
- Updated dependencies
  - @mlightcad/common@1.2.1

## 3.0.1

### Patch Changes

- feat: correct the angle system behavior of class AcGeCircArc2d

## 3.0.0

### Minor Changes

- fix: upgrade libredwg-web to fix bugs on getting layer name and line type name again

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.2.0

## 2.0.7

### Patch Changes

- fix: normalizes the name of a block table record and use verb-nurbs-web to implement spline

## 2.0.6

### Patch Changes

- feat: add parameter 'degree' for classes AcDbSpline and AcGeSpline3d

## 2.0.5

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.1.4

## 2.0.4

### Patch Changes

- feat: add 'FETCH_FILE' stage in AcDbDatabase.events.openProgress event
- Updated dependencies
  - @mlightcad/common@1.1.3

## 2.0.3

### Patch Changes

- refine methods to open database and refine typedocs of packages 'common' and 'data-model'
- Updated dependencies
  - @mlightcad/common@1.1.2

## 2.0.2

### Patch Changes

- add repo url in package.json
- Updated dependencies
  - @mlightcad/common@1.1.1

## 2.0.1

### Patch Changes

- Use CatmullRomCurve3 in three.js to create one closed spline

## 2.0.0

### Minor Changes

- refine constructor of spline related class to add one new parameter 'closed'

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.1.0

## 1.0.5

### Patch Changes

- fix: support 'closed' property in class AcGeSpline3d

## 1.0.4

### Patch Changes

- Fix bug on AcGeSpline3d.getPoints to calcuate the last point

## 1.0.3

### Patch Changes

- bundle common, geometry-engine, and graphic-interface into data-model and remove dependency on lodash-es
- Updated dependencies
  - @mlightcad/common@1.0.3

## 1.0.2

### Patch Changes

- add readme for all of packages and remove dependencies on verb-nurbs-web
- Updated dependencies
  - @mlightcad/common@1.0.2
