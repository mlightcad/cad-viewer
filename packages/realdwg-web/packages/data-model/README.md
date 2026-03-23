# @mlightcad/data-model

The data-model package provides the core classes for interacting with AutoCAD's database and entities. This package mimics AutoCAD ObjectARX's AcDb (Database) classes and implements the drawing database structure that AutoCAD developers are familiar with.

## Overview

This package contains the core classes for defining and manipulating AutoCAD entities (e.g., lines, circles, blocks), handling entity attributes and geometric data, and storing and retrieving data from the drawing database. It uses the same drawing database structure as AutoCAD ObjectARX, making it easier for AutoCAD developers to build applications based on this SDK.

## Key Features

- **Database Management**: Complete AutoCAD database structure with tables and records
- **Entity Support**: All major AutoCAD entity types (lines, circles, polylines, blocks, etc.)
- **File Conversion**: Support for reading DXF and DWG files with extensible converter system
- **Symbol Tables**: Layer, linetype, text style, and dimension style management
- **Block Management**: Block table and block reference handling
- **Dimension Support**: Comprehensive dimension entity types
- **Layout Management**: Paper space and model space layout handling

## Installation

```bash
npm install @mlightcad/data-model
```

## Key Classes

### Database and Base Classes
- **AcDbDatabase**: Main database class that contains all drawing data
- **AcDbObject**: Base class for all database-resident objects
- **AcDbHostApplicationServices**: Services provided by the host application

### Symbol Tables
- **AcDbSymbolTable**: Base class for symbol tables
- **AcDbSymbolTableRecord**: Base class for symbol table records
- **AcDbLayerTable, AcDbLayerTableRecord**: Layer management
- **AcDbLinetypeTable, AcDbLinetypeTableRecord**: Linetype management
- **AcDbTextStyleTable, AcDbTextStyleTableRecord**: Text style management
- **AcDbDimStyleTable, AcDbDimStyleTableRecord**: Dimension style management
- **AcDbBlockTable, AcDbBlockTableRecord**: Block management
- **AcDbViewportTable, AcDbViewportTableRecord**: Viewport management

### Entities
- **AcDbEntity**: Base class for all drawable objects
- **AcDbLine**: Line entity
- **AcDbCircle**: Circle entity
- **AcDbArc**: Arc entity
- **AcDbPolyline**: Polyline entity
- **AcDbText, AcDbMText**: Text and multiline text entities
- **AcDbBlockReference**: Block reference entity
- **AcDbPoint**: Point entity
- **AcDbEllipse**: Ellipse entity
- **AcDbSpline**: Spline curve entity
- **AcDbHatch**: Hatch pattern entity
- **AcDbTable**: Table entity
- **AcDbRasterImage**: Raster image entity
- **AcDbLeader**: Leader entity
- **AcDbRay, AcDbXline**: Construction line entities
- **AcDbTrace, AcDbWipeout**: Filled area entities

### Dimension Entities
- **AcDbDimension**: Base class for dimension entities
- **AcDbAlignedDimension**: Aligned dimension
- **AcDbRadialDimension**: Radial dimension
- **AcDbDiametricDimension**: Diametric dimension
- **AcDb3PointAngularDimension**: 3-point angular dimension
- **AcDbArcDimension**: Arc dimension
- **AcDbOrdinateDimension**: Ordinate dimension

### Objects and Layouts
- **AcDbDictionary**: Dictionary object for storing key-value pairs
- **AcDbRasterImageDef**: Raster image definition
- **AcDbLayout**: Layout object for paper space
- **AcDbLayoutDictionary**: Layout dictionary management
- **AcDbLayoutManager**: Layout manager for switching between layouts

### File Conversion
- **AcDbDatabaseConverter**: Base class for file format converters
- **AcDbDatabaseConverterManager**: Manages registered file converters
- **AcDbDxfConverter**: DXF file converter
- **AcDbBatchProcessing**: Batch processing utilities
- **AcDbObjectConverter**: Object conversion utilities

### Utilities
- **AcDbConstants**: Database constants
- **AcDbObjectIterator**: Iterator for database objects
- **AcDbAngleUnits**: Angle unit utilities
- **AcDbUnitsValue**: Unit value handling
- **AcDbOsnapMode**: Object snap modes
- **AcDbRenderingCache**: Rendering cache management

## Usage Examples

### Database Operations
```typescript
import { AcDbDatabase } from '@mlightcad/data-model';

// Create a new database
const database = new AcDbDatabase();

// Get symbol tables
const layerTable = database.getLayerTable();
const blockTable = database.getBlockTable();
const linetypeTable = database.getLinetypeTable();
```

### Entity Creation
```typescript
import { AcDbLine, AcDbCircle, AcGePoint3d } from '@mlightcad/data-model';

// Create a line entity
const startPoint = new AcGePoint3d(0, 0, 0);
const endPoint = new AcGePoint3d(10, 10, 0);
const line = new AcDbLine(startPoint, endPoint);

// Create a circle entity
const center = new AcGePoint3d(0, 0, 0);
const radius = 5;
const circle = new AcDbCircle(center, radius);

// Set entity properties
line.setColor(1); // Red
line.setLayer('0');
circle.setLinetype('CONTINUOUS');
```

### Layer Management
```typescript
import { AcDbLayerTableRecord } from '@mlightcad/data-model';

// Create a new layer
const layerRecord = new AcDbLayerTableRecord();
layerRecord.setName('MyLayer');
layerRecord.setColor(2); // Yellow
layerRecord.setLinetype('DASHED');

// Add layer to database
const layerTable = database.getLayerTable();
layerTable.add(layerRecord);
```

### Block Operations
```typescript
import { AcDbBlockReference, AcGePoint3d } from '@mlightcad/data-model';

// Create a block reference
const insertionPoint = new AcGePoint3d(0, 0, 0);
const blockRef = new AcDbBlockReference(insertionPoint, 'MyBlock');

// Set block properties
blockRef.setScale(2.0);
blockRef.setRotation(Math.PI / 4);

// Add to model space
const modelSpace = database.getModelSpace();
modelSpace.appendEntity(blockRef);
```

### File Conversion
```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model';

// Get the DXF converter
const converter = AcDbDatabaseConverterManager.instance.get(AcDbFileType.DXF);

// Read a DXF file
const database = await converter.read('drawing.dxf');

// Register a custom converter
class MyDwgConverter extends AcDbDatabaseConverter {
  async read(filePath: string): Promise<AcDbDatabase> {
    // Custom DWG reading logic
  }
}

AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, new MyDwgConverter());
```

### Dimension Creation
```typescript
import { AcDbAlignedDimension, AcGePoint3d } from '@mlightcad/data-model';

// Create an aligned dimension
const defPoint1 = new AcGePoint3d(0, 0, 0);
const defPoint2 = new AcGePoint3d(10, 0, 0);
const textPosition = new AcGePoint3d(5, 5, 0);

const dimension = new AcDbAlignedDimension(defPoint1, defPoint2, textPosition);
dimension.setDimensionText('10.0');
dimension.setDimensionStyle('Standard');
```

### Layout Management
```typescript
import { AcDbLayoutManager } from '@mlightcad/data-model';

// Get layout manager
const layoutManager = database.getLayoutManager();

// Get current layout
const currentLayout = layoutManager.getCurrentLayout();

// Switch to model space
layoutManager.setCurrentLayout('Model');

// Create a new layout
const newLayout = layoutManager.createLayout('MyLayout');
newLayout.setPlotType('Extents');
newLayout.setPlotCentered(true);
```

## Dependencies

- **@mlightcad/dxf-json**: For DXF file parsing
- **@mlightcad/common**: For common utilities (peer dependency)
- **@mlightcad/geometry-engine**: For geometric operations (peer dependency)
- **@mlightcad/graphic-interface**: For graphics interface (peer dependency)
- **uid**: For unique ID generation

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 