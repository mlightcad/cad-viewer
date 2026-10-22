---
title: "Color System"
---

# Color System

The `cad-viewer` color system follows the behavior of AutoCAD ObjectARX while ensuring predictable rendering in a browser environment.

It supports both **AutoCAD Color Index (ACI)** and **True Color**, unified through the `AcCmColor` abstraction.

## Overview

In AutoCAD-compatible systems, colors are represented in two primary ways:

### ACI (AutoCAD Color Index)

- Integer-based color system (`0–256`)
- Uses a predefined palette
- Includes **logical colors** that depend on context rather than fixed RGB values

### True Color

- 24-bit RGB color (`R, G, B`)
- Each channel ranges from `0–255`
- Provides full color flexibility independent of ACI

## `AcCmColor`

All colors in `cad-viewer` are represented using the `AcCmColor` class.

It supports:

- ACI index
- True color (RGB)
- Logical color modes (ByLayer / ByBlock)

Reference implementation:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/common/src/AcCmColor.ts>

This abstraction mirrors ObjectARX, where a color object may represent either an indexed color or an explicit RGB value.

## Special ACI Values

Unlike standard ACI values (`1–255`), the following values represent **logical colors**:

### ACI = 0 → ByBlock

- Color is determined by the block reference
- Behavior:
  - Before insertion: uses default foreground color
  - After insertion: inherits from the block context

This is not a fixed color but a dynamic reference.

### ACI = 256 → ByLayer

- Color is inherited from the entity’s layer
- Most commonly used mode in CAD workflows

Behavior:

- Changing the layer color updates all entities using ByLayer
- Enables centralized color management

### ACI = 7 → Adaptive Foreground Color

- Represents the **default foreground color**
- Displays as:
  - **White on dark backgrounds**
  - **Black on light backgrounds**

This makes it a **context-dependent color**, not a fixed RGB value.

In AutoCAD workflows:

- When a new layer is created, its default color is typically **ACI 7**
- This ensures that newly created geometry is always visible regardless of background theme

## Color Resolution in `AcDbEntity`

Each entity resolves its final display color through the `resolvedColor` property.

Reference implementation:  
<https://github.com/mlightcad/realdwg-web/blob/main/packages/data-model/src/entity/AcDbEntity.ts>


The `resolvedColor` property determines the final RGB color used for rendering. The resolution follows a priority-based process:

- True Color (Highest Priority): If the entity explicitly defines a true color, used it directly
- ByLayer Resolution: If the color is ByLayer (ACI = 256), delegates to the layer’s resolved color
- ByBlock Resolution: If the color is ByBlock (ACI = 0), depends on the block insertion context and falls back to a default color if no context is available
- ACI Color Resolution: For standard ACI values (`1–255`), uses a predefined lookup table


## Handling of ACI 7 in `cad-viewer`

`cad-viewer` treats ACI 7 as a semantic color, not a fixed RGB value. It automatically flips to maintain contrast when the background changes. How does it work? In principle,

- **Background change triggers a foreground update**: When the view’s background color changes, the renderer is explicitly told to update the “foreground” rendering color. The rule is simple:

  - If the background is black, use white for ACI 7.
  - If the background is white, use black for ACI 7.

- **Materials remember whether they are “foreground”**: When materials are created, they are tagged with metadata indicating whether they represent a foreground (ACI 7) entity. This allows the system to find *all cached materials* that should flip when the foreground changes.

- **Centralized foreground update**: The renderer’s style manager routes a single “change foreground” request to all material managers (lines, points, fills). Each manager walks its cached materials and updates only those tagged as foreground.

## Summary

| Type        | Representation | Resolution Strategy |
| ----------- | -------------- | ------------------- |
| True Color  | RGB            | Direct              |
| ACI (1–255) | Index          | Palette lookup      |
| ByLayer     | 256            | Layer delegation    |
| ByBlock     | 0              | Context-dependent   |
| ACI 7       | 7              | Adaptive contrast   |

## Design Goals

The `cad-viewer` color system is designed to:

- Align with ObjectARX semantics
- Preserve logical color behaviors (ByLayer / ByBlock)
- Ensure consistent rendering in browsers
- Provide correct handling of adaptive foreground color (ACI 7)

