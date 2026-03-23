# @mlightcad/graphic-interface

The graphic-interface package provides the graphics interface for controlling how AutoCAD entities are displayed on screen. This package offers a simplified API compared to AutoCAD ObjectARX's AcGi classes, making it more developer-friendly while maintaining the core functionality needed for rendering CAD entities.

## Overview

This package provides the graphics interface layer that bridges the gap between the data model and the rendering system. It handles the conversion of AutoCAD entities into drawable objects and provides customization options for how objects are displayed, including colors, layers, visibility, and various rendering styles.

## Key Features

- **Entity Rendering**: Convert AutoCAD entities to drawable objects
- **Style Customization**: Control colors, line styles, text styles, and point styles
- **View Management**: Handle different views and viewports
- **Arrow and Hatch Support**: Custom arrow types and hatch pattern rendering
- **Image Rendering**: Support for raster image display
- **Flexible Rendering**: Extensible rendering system for different output formats

## Installation

```bash
npm install @mlightcad/graphic-interface
```

## Key Classes

### Core Rendering Classes
- **AcGiRenderer**: Main interface for rendering entities to drawable objects
- **AcGiEntity**: Base class for drawable objects that can be rendered
- **AcGiView**: Represents a view with camera and projection settings
- **AcGiViewport**: Manages viewport settings and clipping

### Style Classes
- **AcGiArrowType**: Defines different arrow types for dimensions and leaders
- **AcGiHatchStyle**: Controls hatch pattern rendering and appearance
- **AcGiImageStyle**: Manages raster image display properties
- **AcGiLineStyle**: Defines line styles including dash patterns and widths
- **AcGiPointStyle**: Controls point entity display appearance
- **AcGiTextStyle**: Manages text rendering properties and formatting

## Usage Examples

### Basic Entity Rendering
```typescript
import { AcGiRenderer, AcGiEntity } from '@mlightcad/graphic-interface';
import { AcDbLine, AcGePoint3d } from '@mlightcad/data-model';

// Create a renderer
const renderer = new AcGiRenderer();

// Create an entity
const startPoint = new AcGePoint3d(0, 0, 0);
const endPoint = new AcGePoint3d(10, 10, 0);
const line = new AcDbLine(startPoint, endPoint);

// Render the entity
const drawableEntity = renderer.renderEntity(line);
```

### Style Configuration
```typescript
import { 
  AcGiLineStyle, 
  AcGiTextStyle, 
  AcGiPointStyle,
  AcGiArrowType 
} from '@mlightcad/graphic-interface';

// Configure line style
const lineStyle = new AcGiLineStyle();
lineStyle.setColor(1); // Red
lineStyle.setWidth(2.0);
lineStyle.setDashPattern([10, 5, 5, 5]); // Dashed line

// Configure text style
const textStyle = new AcGiTextStyle();
textStyle.setFont('Arial');
textStyle.setHeight(12);
textStyle.setColor(2); // Yellow
textStyle.setBold(true);

// Configure point style
const pointStyle = new AcGiPointStyle();
pointStyle.setSize(5);
pointStyle.setShape('Circle');
pointStyle.setColor(3); // Green

// Configure arrow style
const arrowStyle = new AcGiArrowType();
arrowStyle.setType('ClosedFilled');
arrowStyle.setSize(3);
arrowStyle.setColor(1); // Red
```

### View and Viewport Management
```typescript
import { AcGiView, AcGiViewport, AcGePoint3d } from '@mlightcad/graphic-interface';

// Create a view
const view = new AcGiView();
view.setEyePoint(new AcGePoint3d(0, 0, 100));
view.setTargetPoint(new AcGePoint3d(0, 0, 0));
view.setUpVector(new AcGeVector3d(0, 1, 0));

// Create a viewport
const viewport = new AcGiViewport();
viewport.setView(view);
viewport.setWidth(800);
viewport.setHeight(600);
viewport.setZoom(1.0);

// Set viewport properties
viewport.setClippingEnabled(true);
viewport.setClippingBounds(0, 0, 100, 100);
```

### Hatch Pattern Rendering
```typescript
import { AcGiHatchStyle } from '@mlightcad/graphic-interface';

// Configure hatch style
const hatchStyle = new AcGiHatchStyle();
hatchStyle.setPattern('ANSI31'); // Standard AutoCAD pattern
hatchStyle.setScale(1.0);
hatchStyle.setAngle(0);
hatchStyle.setColor(4); // Cyan
hatchStyle.setTransparency(0.5);

// Apply hatch to an entity
const hatchedEntity = renderer.renderEntityWithHatch(entity, hatchStyle);
```

### Image Rendering
```typescript
import { AcGiImageStyle } from '@mlightcad/graphic-interface';

// Configure image style
const imageStyle = new AcGiImageStyle();
imageStyle.setBrightness(1.0);
imageStyle.setContrast(1.0);
imageStyle.setFade(0.0);
imageStyle.setTransparency(0.0);
imageStyle.setClippingEnabled(false);

// Render image with style
const imageEntity = renderer.renderImage(imagePath, imageStyle);
```

### Custom Rendering Pipeline
```typescript
import { AcGiRenderer, AcGiEntity } from '@mlightcad/graphic-interface';

// Create a custom renderer
class CustomRenderer extends AcGiRenderer {
  renderEntity(entity: AcDbEntity): AcGiEntity {
    // Custom rendering logic
    const drawable = super.renderEntity(entity);
    
    // Apply custom styling
    if (entity.getLayer() === 'HIGHLIGHT') {
      drawable.setHighlighted(true);
    }
    
    return drawable;
  }
  
  renderToCanvas(canvas: HTMLCanvasElement, entities: AcGiEntity[]) {
    const ctx = canvas.getContext('2d');
    
    entities.forEach(entity => {
      // Custom canvas rendering
      this.renderEntityToCanvas(ctx, entity);
    });
  }
}

// Use custom renderer
const customRenderer = new CustomRenderer();
const drawableEntities = entities.map(entity => customRenderer.renderEntity(entity));
customRenderer.renderToCanvas(canvas, drawableEntities);
```

### Batch Rendering
```typescript
import { AcGiRenderer } from '@mlightcad/graphic-interface';

// Batch render multiple entities
const renderer = new AcGiRenderer();
const entities = [line1, circle1, polyline1, text1];

// Render all entities with consistent styling
const drawableEntities = renderer.renderEntities(entities, {
  defaultColor: 7, // White
  defaultLayer: '0',
  defaultLinetype: 'CONTINUOUS'
});

// Apply viewport transformations
viewport.applyTransformations(drawableEntities);
```

## Dependencies

- **@mlightcad/geometry-engine**: For geometric operations (peer dependency)

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 