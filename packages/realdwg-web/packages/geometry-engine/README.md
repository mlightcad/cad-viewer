# @mlightcad/geometry-engine

The geometry-engine package provides comprehensive geometric entities, mathematical operations, and transformations for 2D and 3D space. This package mimics AutoCAD ObjectARX's AcGe (Geometry) classes and provides the mathematical foundation for CAD operations.

## Overview

This package consists of two main categories of classes:

- **Math Classes**: Focus on mathematical operations that underpin geometric calculations, including vectors, matrices, transformations, and linear algebra operations
- **Geometry Classes**: Focus on complex geometric entities and their operations, including lines, curves, surfaces, and intersections

Most math classes are adapted from [THREE.js](https://threejs.org/docs/index.html) with modified class names to match AutoCAD ObjectARX conventions.

## Key Features

- **2D and 3D Geometry**: Support for both 2D and 3D geometric operations
- **Mathematical Foundation**: Comprehensive vector and matrix operations
- **Curve and Surface Support**: Advanced geometric entities including splines and NURBS
- **Transformation Utilities**: Matrix-based transformations for 2D and 3D space
- **Intersection Calculations**: Tools for computing geometric intersections
- **Performance Optimized**: Efficient mathematical operations for real-time CAD applications

## Installation

```bash
npm install @mlightcad/geometry-engine
```

## Key Classes

### Math Classes (2D and 3D)

#### Points and Vectors
- **AcGePoint2d, AcGePoint3d**: Represent 2D and 3D points in space
- **AcGeVector2d, AcGeVector3d**: Represent 2D and 3D vectors with magnitude and direction

#### Transformations
- **AcGeMatrix2d, AcGeMatrix3d**: 2D and 3D transformation matrices
- **AcGeQuaternion**: Quaternion-based 3D rotations
- **AcGeEuler**: Euler angle representations for 3D rotations

#### Mathematical Utilities
- **AcGeBox2d, AcGeBox3d**: Bounding boxes in 2D and 3D space
- **AcGePlane**: 3D plane representations
- **AcGeTol**: Tolerance settings for geometric comparisons

### Geometry Classes

#### Basic Geometric Entities
- **AcGeLine2d, AcGeLine3d**: Lines in 2D and 3D space
- **AcGeCurve2d, AcGeCurve3d**: Abstract base classes for curves
- **AcGeCircArc2d, AcGeCircArc3d**: Circular arcs in 2D and 3D
- **AcGeEllipseArc2d, AcGeEllipseArc3d**: Elliptical arcs

#### Complex Geometric Entities
- **AcGePolyline2d**: 2D polyline with multiple segments
- **AcGeSpline3d**: 3D spline curves
- **AcGeShape2d, AcGeShape3d**: Complex geometric shapes
- **AcGeArea2d**: 2D area calculations
- **AcGeLoop2d**: 2D loop representations

#### Utility Classes
- **AcGeGeometryUtil**: Utility functions for geometric operations
- **AcGeMathUtil**: Mathematical utility functions
- **AcGeConstants**: Geometric constants and settings

## Usage Examples

### Basic Point and Vector Operations
```typescript
import { AcGePoint3d, AcGeVector3d, AcGeMatrix3d } from '@mlightcad/geometry-engine';

// Create points and vectors
const point1 = new AcGePoint3d(0, 0, 0);
const point2 = new AcGePoint3d(10, 10, 10);
const vector = new AcGeVector3d(1, 0, 0);

// Calculate distance between points
const distance = point1.distanceTo(point2);

// Transform a point
const matrix = AcGeMatrix3d.translation(5, 5, 5);
const transformedPoint = point1.transformBy(matrix);
```

### Line and Curve Operations
```typescript
import { AcGeLine3d, AcGeCircArc3d, AcGePoint3d } from '@mlightcad/geometry-engine';

// Create a line
const startPoint = new AcGePoint3d(0, 0, 0);
const endPoint = new AcGePoint3d(10, 0, 0);
const line = new AcGeLine3d(startPoint, endPoint);

// Create a circular arc
const center = new AcGePoint3d(0, 0, 0);
const radius = 5;
const startAngle = 0;
const endAngle = Math.PI / 2;
const arc = new AcGeCircArc3d(center, radius, startAngle, endAngle);

// Get points along the curve
const param = 0.5;
const pointOnLine = line.evalPoint(param);
const pointOnArc = arc.evalPoint(param);
```

### Matrix Transformations
```typescript
import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/geometry-engine';

// Create transformation matrices
const translation = AcGeMatrix3d.translation(10, 20, 30);
const rotation = AcGeMatrix3d.rotation(Math.PI / 4, AcGeVector3d.kZAxis);
const scale = AcGeMatrix3d.scaling(2, 2, 2);

// Combine transformations
const combined = translation.multiply(rotation).multiply(scale);

// Apply transformation to a point
const point = new AcGePoint3d(1, 1, 1);
const transformed = point.transformBy(combined);
```

### Polyline Operations
```typescript
import { AcGePolyline2d, AcGePoint2d } from '@mlightcad/geometry-engine';

// Create a polyline
const polyline = new AcGePolyline2d();
polyline.addVertexAt(0, new AcGePoint2d(0, 0));
polyline.addVertexAt(1, new AcGePoint2d(10, 0));
polyline.addVertexAt(2, new AcGePoint2d(10, 10));
polyline.addVertexAt(3, new AcGePoint2d(0, 10));

// Close the polyline
polyline.setClosed(true);

// Get polyline properties
const length = polyline.length();
const area = polyline.area();
const isClosed = polyline.isClosed();
```

### Geometric Utilities
```typescript
import { AcGeGeometryUtil, AcGePoint3d, AcGeVector3d } from '@mlightcad/geometry-engine';

// Calculate intersection between lines
const line1 = new AcGeLine3d(new AcGePoint3d(0, 0, 0), new AcGeVector3d(1, 0, 0));
const line2 = new AcGeLine3d(new AcGePoint3d(0, 0, 0), new AcGeVector3d(0, 1, 0));

const intersection = AcGeGeometryUtil.intersect(line1, line2);

// Check if points are collinear
const points = [
  new AcGePoint3d(0, 0, 0),
  new AcGePoint3d(1, 1, 1),
  new AcGePoint3d(2, 2, 2)
];

const areCollinear = AcGeGeometryUtil.areCollinear(points);
```

## Dependencies

- **@mlightcad/common**: For common utilities (peer dependency)

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines.