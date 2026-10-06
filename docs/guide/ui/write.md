---
title: Write Mode
---

# Write Mode

Write mode is the most feature-complete mode. In addition to all the capabilities of review mode, it supports directly creating, editing, and deleting entities on the DWG/DXF — enabling the web product to handle real drafting work, not just read-only preview.

Write mode is used by default when opening a file, unless read-only or review mode is explicitly specified.

## Desktop

### Overall Layout

<WriteModeLayout />

### Top Ribbon

The Ribbon fully displays all AutoCAD-style tabs:

| Tab | Commands |
|---|---|
| File | Open, Export DXF, Export PNG, Export Self-contained HTML |
| Draw | Line, Circle, Arc, Rect, Polyline, Hatch, Text, MText, Block Insert, etc. |
| Modify | Move, Copy, Offset, Trim, Extend, Rotate, Scale, Mirror, Array, etc. |
| Layers | Layer management (on/off, freeze/thaw, lock, isolate, new, delete) |
| Properties | Color, linetype, lineweight, layer selector |
| Measure | All measurement commands |
| Markup | All markup commands |

### Command Line

A command line window at the bottom of the canvas allows typing command names directly (e.g., `L` + Enter to draw a line, `C` + Enter to draw a circle). Supports:
- Displaying command prompts and history
- Entering numeric values and coordinates
- Using up/down arrows to browse command history

### Right-Side Toolbar

In addition to the review mode tools, there is a **Select / Edit tool group**:

- Select
- Pan
- Zoom to Extents
- Window Zoom
- Layer Management
- Measure tool group
- Markup tool group
- Reading Mode
- Toggle Light/Dark Background

### Docked Panels

| Panel | Description |
|---|---|
| Layers | Full layer management |
| Properties | Selected entity properties (type, coordinates, layer, color, linetype, lineweight, etc.), editable |
| Measurements | Measurement result management |
| Review (Markup) | Markup management |
| Statistics | Block usage statistics |
| Missing Resources | Font / external reference alerts |

### Status Bar

A full CAD status bar, from left to right:

| Area | Description |
|---|---|
| Layout tabs | Model space / layout switch |
| Command prompt | Prompt text for the currently active command (e.g., "Specify start point:") |
| Coordinates | Real-time cursor coordinates |
| OSNAP | Object snap toggle and configuration |
| ORTHO | Orthogonal mode |
| POLAR | Polar tracking |
| Object Snap Tracking (OTRACK) | |
| Lineweight display | |
| Dynamic Input | Floating input box toggle |
| Isometric | |
| Theme | |
| Fullscreen | |

## Tablet (Pad)

The tablet layout is between desktop and mobile, but write mode retains the full components needed for editing:

- Ribbon retains full tabs, but command buttons collapse to icons
- Right-side toolbar is retained
- Command line is collapsed to a small bar by default; click to expand
- Docked panels can be expanded as side drawers
- Status bar shows core buttons in a simplified form

## Mobile

In write mode on mobile, the command line and full draw/modify capabilities are implemented via a **Mobile Command Overlay**, replacing the bottom tab bar.

### Command Overlay

When executing a draw or modify command, a command operation bar appears at the bottom of the screen, containing:
- Current command prompt
- ✓ Confirm / ✗ Cancel buttons
- Dynamic Input (DYN) popup panel

### Input Methods

Mobile drawing uses the following input methods:
- **Tap point input**: tap the screen (<0.5s) to create a point
- **Drag point input**: long press the screen (>0.5s), enter drag-select mode and release
- **Simulated Mouse**: enabled by default; long press and a crosshair appears above the finger; the actual input position is based on the crosshair
- **Magnifier**: toggle in settings; a circular magnifier HUD enlarges the finger area

### Auto Return

During command execution, the status bar is temporarily hidden (the command overlay takes over input). After the command ends, the status bar is restored.
