# @mlightcad/data-model

## 1.7.8

### Patch Changes

- fix: fix issue on reading dxf file caused by last release
- Updated dependencies
  - @mlightcad/common@1.4.8
  - @mlightcad/geometry-engine@3.2.8
  - @mlightcad/graphic-interface@3.3.8

## 1.7.7

### Patch Changes

- feat: add DXF export support
- Updated dependencies
  - @mlightcad/common@1.4.7
  - @mlightcad/geometry-engine@3.2.7
  - @mlightcad/graphic-interface@3.3.7

## 1.7.6

### Patch Changes

- feat: support changing foreground color
- Updated dependencies
  - @mlightcad/common@1.4.6
  - @mlightcad/geometry-engine@3.2.6
  - @mlightcad/graphic-interface@3.3.6

## 1.7.5

### Patch Changes

- chore: add system variables MEASUREMENTCOLOR, OSMODE, and TEXTCOLOR
- Updated dependencies
  - @mlightcad/common@1.4.5
  - @mlightcad/geometry-engine@3.2.5
  - @mlightcad/graphic-interface@3.3.5

## 1.7.4

### Patch Changes

- feat: add configurable parser worker timeout for drawing conversion and centralize database system variable names
- Updated dependencies
  - @mlightcad/common@1.4.4
  - @mlightcad/geometry-engine@3.2.4
  - @mlightcad/graphic-interface@3.3.4

## 1.7.3

### Patch Changes

- fix: fix issue 101
- Updated dependencies
  - @mlightcad/common@1.4.3
  - @mlightcad/geometry-engine@3.2.3
  - @mlightcad/graphic-interface@3.3.3

## 1.7.2

### Patch Changes

- feat(data-model): emit sysVarChanged only when sysvar value actually changes and add system variable 'LWDISPLAY'
- Updated dependencies
  - @mlightcad/common@1.4.2
  - @mlightcad/geometry-engine@3.2.2
  - @mlightcad/graphic-interface@3.3.2

## 1.7.1

### Patch Changes

- feat: set entity line weight and line type scale for newly created entity
- Updated dependencies
  - @mlightcad/common@1.4.1
  - @mlightcad/geometry-engine@3.2.1
  - @mlightcad/graphic-interface@3.3.1

## 1.7.0

### Patch Changes

- feat: support xdata and xrecord
- Updated dependencies
  - @mlightcad/common@1.3.8
  - @mlightcad/geometry-engine@3.1.11
  - @mlightcad/graphic-interface@3.2.8

## 1.6.10

### Patch Changes

- feat: respect value of system variables 'cecolor' and 'clayer' when creating one new entity
- Updated dependencies
  - @mlightcad/common@1.3.7
  - @mlightcad/geometry-engine@3.1.10
  - @mlightcad/graphic-interface@3.2.7

## 1.6.9

### Patch Changes

- feat: enhance polyline
- Updated dependencies
  - @mlightcad/common@1.3.6
  - @mlightcad/geometry-engine@3.1.9
  - @mlightcad/graphic-interface@3.2.6

## 1.6.8

### Patch Changes

- fix: fix issues 89 and 90 in cad-viewer repo
- Updated dependencies
  - @mlightcad/common@1.3.5
  - @mlightcad/geometry-engine@3.1.8
  - @mlightcad/graphic-interface@3.2.5

## 1.6.7

### Patch Changes

- feat: support ATTDEF ATTRIB entities when reading DXF file
- Updated dependencies
  - @mlightcad/common@1.3.4
  - @mlightcad/geometry-engine@3.1.7
  - @mlightcad/graphic-interface@3.2.4

## 1.6.6

### Patch Changes

- feat: support ATTDEF and ATTRIB entities
- Updated dependencies
  - @mlightcad/common@1.3.3
  - @mlightcad/geometry-engine@3.1.6
  - @mlightcad/graphic-interface@3.2.3

## 1.6.5

### Patch Changes

- Updated dependencies
  - @mlightcad/common@1.3.2
  - @mlightcad/geometry-engine@3.1.5
  - @mlightcad/graphic-interface@3.2.2

## 1.6.4

### Patch Changes

- feat: modify type of workerUrl to string | URL

## 1.6.3

### Patch Changes

- fix: fix bug on converting entities in paper space

## 1.6.2

### Patch Changes

- feat: set ltscale and celtscale value in AcDbDatabase when parsing dwg/dxf file

## 1.6.1

### Patch Changes

- feat: update file type handling to support custom converter types
- Updated dependencies
  - @mlightcad/common@1.3.1
  - @mlightcad/geometry-engine@3.1.4
  - @mlightcad/graphic-interface@3.2.1

## 1.6.0

### Minor Changes

- fix: fix regression bug on handling normal in insert and dimension entities resulted by commit d5a9966

### Patch Changes

- Updated dependencies
  - @mlightcad/graphic-interface@3.2.0

## 1.5.5

### Patch Changes

- feat: add some utility methods for AcDbOsnapMode

## 1.5.4

### Patch Changes

- feat: refiine osnap logic of insert entity

## 1.5.3

### Patch Changes

- feat: add property 'properties' for entities AcDb2dPolyline, AcDb3dPolyline, and AcDbPolyline
- Updated dependencies
  - @mlightcad/geometry-engine@3.1.3
  - @mlightcad/graphic-interface@3.1.4

## 1.5.2

### Patch Changes

- feat: support erasing entities

## 1.5.1

### Patch Changes

- fix: fix issue 38 in repo cad-viewer
- Updated dependencies
  - @mlightcad/geometry-engine@3.1.2
  - @mlightcad/graphic-interface@3.1.3

## 1.5.0

### Minor Changes

- feat: rename mehtod 'draw' to 'subWorldDraw' to keep consistent with AutoCAD ObjectARX API

## 1.4.2

### Patch Changes

- feat: refine entity osnap and properties
- Updated dependencies
  - @mlightcad/geometry-engine@3.1.1
  - @mlightcad/graphic-interface@3.1.2

## 1.4.1

### Patch Changes

- feat: refine class related to line weight
- Updated dependencies
  - @mlightcad/graphic-interface@3.1.1

## 1.4.0

### Patch Changes

- feat: modify common, geometry-engine, and graphic-interface as dependencies of package data-model
- Updated dependencies
  - @mlightcad/common@1.2.8
  - @mlightcad/geometry-engine@3.0.10
  - @mlightcad/graphic-interface@3.0.13

## 1.3.18

### Patch Changes

- feat: add class AcCmTransparency

## 1.3.17

### Patch Changes

- feat: support changing layer color

## 1.3.16

### Patch Changes

- feat: add system variable manager

## 1.3.15

### Patch Changes

- feat: refine snap related api

## 1.3.14

### Patch Changes

- feat: refine logic to convert layout again

## 1.3.13

### Patch Changes

- feat: refine logic to convert layout

## 1.3.12

### Patch Changes

- feat: add basePoint for renderer and renderable entity

## 1.3.11

### Patch Changes

- feat: add method 'properties' for more entities

## 1.3.10

### Patch Changes

- fix: fix bug on getting file extension from url when it contains query parameters

## 1.3.9

### Patch Changes

- feat: add approach to show properties of one entity

## 1.3.8

### Patch Changes

- feat: remove using enum DwgSmoothType in order to not bundle libredwg-web in libredwg-converter

## 1.3.7

### Patch Changes

- feat: upgrade libredwg-web to fix bug on converting polyline2d and polyline3d entities

## 1.3.6

### Patch Changes

- feat: add missed property dimBlockPosition for class AcDbDimension

## 1.3.5

### Patch Changes

- feat: refine logic to convert POLYLINE entity in dxf/dwg

## 1.3.4

### Patch Changes

- fix: bump version again because the wrong package was published in npm registry

## 1.3.3

### Patch Changes

- feat: support interruptting the entire workflow if one task throw one exception

## 1.3.2

### Patch Changes

- fix: fix one error on dwg version name

## 1.3.1

### Patch Changes

- feat: add api to support redrawing the database

## 1.3.0

### Minor Changes

- feat: support parsing dxf file with gbk encoding

## 1.2.25

### Patch Changes

- feat: change font type values in AcDbFontInfo

## 1.2.24

### Patch Changes

- fix: fix bug that failed to convert one entity will result in the whole conversion interruptted

## 1.2.23

### Patch Changes

- feat: support displaying 3dface entity in dwg file

## 1.2.22

### Patch Changes

- feat: support 3dface entity

## 1.2.21

### Patch Changes

- feat: refine logic to set the extents of drawing database

## 1.2.20

### Patch Changes

- feat: add method createDefaultData in class AcDbDatabase

## 1.2.19

### Patch Changes

- feat: support returning statistics of parsing task

## 1.2.18

### Patch Changes

- fix: fix bug on parsing color

## 1.2.17

### Patch Changes

- feat: upgrade package dxf-json

## 1.2.16

### Patch Changes

- feat: upgrade version of lbredwg-web to fix type of clipping boundary path of wipeout entity

## 1.2.15

### Patch Changes

- feat: adjust dependencies of libreddwg-converter

## 1.2.14

### Patch Changes

- feat: upgrade version of libredwg-web to support wipeout entity

## 1.2.13

### Patch Changes

- feat: attach entity info after created one 'group' grpahic interface entity

## 1.2.12

### Patch Changes

- feat: add one flag to delay creating one rendered entity in function AcDbEntity.draw

## 1.2.11

### Patch Changes

- feat: attach entity info (such as objectId, layerName and etc.) in rendering cache entities

## 1.2.8

### Patch Changes

- feat: destory parser web worker once parsing finished

## 1.2.7

### Patch Changes

- feat: support batch append for entities

## 1.2.6

### Patch Changes

- feat: add property layoutId for class AcDbBlockTableRecord and set property blockTableRecordId value of AcDbLayout correctly when converting DXF/DWG

## 1.2.5

### Patch Changes

- feat: enable web worker for libredwg-converter

## 1.2.4

### Patch Changes

- feat: enable web worker for dxf parser

## 1.2.3

### Patch Changes

- feat: pass error in AcDbConversionProgressCallback if one error occurs when opening one file

## 1.2.2

### Patch Changes

- feat: add properties 'extmin' and 'extmax' for class AcDbDatabase

## 1.2.1

### Patch Changes

- feat: use static string to define entity type because constructor name will be changed by building tool

## 1.2.0

### Minor Changes

- fix: upgrade libredwg-web to fix bugs on getting layer name and line type name again

## 1.1.8

### Patch Changes

- fix: normalizes the name of a block table record and use verb-nurbs-web to implement spline

## 1.1.7

### Patch Changes

- feat: regularize block space name and paper space name

## 1.1.6

### Patch Changes

- feat: add parameter 'degree' for classes AcDbSpline and AcGeSpline3d

## 1.1.5

### Patch Changes

- fix: fix issue that AcDbBatchProcessing.processChunk doesn't wait for all chunks processed and then return

## 1.1.4

### Patch Changes

- feat: add 'FETCH_FILE' stage in AcDbDatabase.events.openProgress event

## 1.1.3

### Patch Changes

- refine methods to open database and refine typedocs of packages 'common' and 'data-model'

## 1.1.2

### Patch Changes

- add repo url in package.json

## 1.1.1

### Patch Changes

- Use CatmullRomCurve3 in three.js to create one closed spline

## 1.1.0

### Minor Changes

- refine constructor of spline related class to add one new parameter 'closed'

## 1.0.7

### Patch Changes

- fix: support 'closed' property in class AcGeSpline3d

## 1.0.6

### Patch Changes

- Updated dependencies
  - @mlightcad/geometry-engine@1.0.4
  - @mlightcad/graphic-interface@1.0.4

## 1.0.5

### Patch Changes

- bundle common, geometry-engine, and graphic-interface into data-model and remove dependency on lodash-es
- Updated dependencies
  - @mlightcad/geometry-engine@1.0.3
  - @mlightcad/common@1.0.3
  - @mlightcad/graphic-interface@1.0.3

## 1.0.4

### Patch Changes

- add readme for all of packages and remove dependencies on verb-nurbs-web
- Updated dependencies
  - @mlightcad/geometry-engine@1.0.2
  - @mlightcad/common@1.0.2
  - @mlightcad/graphic-interface@1.0.2
