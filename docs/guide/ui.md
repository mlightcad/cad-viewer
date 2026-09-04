---
title: User Interface
---

# User Interface

MLightCAD Viewer uses a classic AutoCAD-style three-section layout: a top ribbon, a central canvas area, and a bottom status bar.

## Overall Layout

```
┌───────────────────────────────────────────────┐
│  Top Ribbon                                   │
├───────────────────────────────────────────────┤
│                                               │
│           Canvas + Overlays                   │
│    ┌─────┐                                    │
│    │Right│  Docking Panels (Layers, Properties)│
│    │Tool │                                    │
│    │Bar  │                                    │
│    └─────┘                                    │
│                                               │
├───────────────────────────────────────────────┤
│  Status Bar                                    │
└───────────────────────────────────────────────┘
```

## Top Ribbon

The ribbon organizes command buttons by tabs (Tab) and groups (Group).

### File

| Button | Description |
|---|---|
| Open | Open a DWG / DXF file |
| Export DXF | Export the current drawing to DXF format |
| Export PNG | Export the canvas as a PNG image |

### Draw

Contains drawing commands such as Line, Circle, Arc, Rect, Polyline, and Hatch. These commands are not available in Review Mode.

### Layers

Layer operations such as on/off, freeze/thaw, lock, and isolate.

### Modify

Modification commands such as Move, Copy, and Offset.

### Measure

Distance, Angle, Area, Arc Length, Continuous Measure, and Coordinates. See [Measurement Overview](/guide/measure/overview).

### Markup

Arrow, Cloud, Rectangle, Circle, Text, Callout, Highlight, Stamp, etc. See [Markup Overview](/guide/markup/overview).

## Right Tool Bar

A vertical toolbar floating on the right side of the canvas, providing quick access to common tools:

- **Select**: Select and move entities
- **Pan**: Drag to pan the view
- **Zoom to Extents**: Center all graphics in the view
- **Window Zoom**: Box-select an area to zoom into
- **Layer Manager**: Open the Layers panel
- **Toggle Background**: Switch between light/dark background
- **Reading Mode**: Enter a full-screen focus reading mode
- **Measure Tool Group**: Pop out the measure tool panel
- **Markup Tool Group**: Pop out the markup tool panel (shown in Review Mode)

## Docking Panels

Panels can be docked on the right side of the canvas or dragged out as floating windows. Common panels:

| Panel | Description |
|---|---|
| Layers | Lists all layers; supports on/off, lock, freeze, isolate, etc. |
| Properties | Shows the properties of the selected entity |
| Measurement List | Lists all measurements in the current drawing; click to locate the corresponding measurement |
| Review (Markup) | Lists all markups; supports editing markup metadata, clearing, etc. |
| Statistics | Statistics on block usage in the drawing |
| Missing Resources | Reports missing fonts or external references in the drawing |

## Status Bar

The status bar is located at the bottom of the interface, from left to right:

| Area | Description |
|---|---|
| Layout Tabs | Model space / layout switching |
| Coordinates | Shows the current cursor position coordinates (desktop only) |
| OSNAP | Object snap mode toggle and configuration |
| ORTHO | Orthogonal mode toggle |
| POLAR | Polar tracking toggle and angle increment |
| Line weight | Controls whether line weight is displayed |
| Dynamic Input | Dynamic input toggle |
| Theme Switch | Light/dark theme |
| Full Screen | Full-screen mode |

## Review Mode

When a markup command is executed, the viewer automatically enters **Review Mode**. At this point the DWG/DXF background becomes read-only, and all markups and measurements are displayed as overlays. After exiting a markup command, it remains in Review Mode until manually switched back to Edit Mode.

In Review Mode, markup commands are automatically available; in Edit Mode, markup tools must be activated manually.
