---
title: Read-Only Mode
---

# Read-Only Mode

Read-only mode is for purely viewing and measuring drawings. The DWG/DXF background is completely non-editable; markup, drawing, and modification commands are all unavailable.

Upon entering read-only mode, the interface automatically adapts its layout based on the device type.

## Desktop

### Overall Layout

Read-only mode has no Ribbon and no status bar. The interface is canvas-centric, with all commands accessed through the right-side toolbar and docked panels:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                                                      │
│                  Canvas + Overlays                   │
│                                                      │
│    ┌────┐                                            │
│    │ R  │   Docked Panels (Layers, Measurements,     │
│    │ T  │   Entity Info, etc.)                       │
│    │ B  │                                            │
│    └────┘                                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Right-Side Toolbar

A vertical toolbar floating on the right side of the canvas — the primary command entry point in read-only mode:

- Select / Deselect
- Pan (hand)
- Zoom to Extents
- Window Zoom
- Layer Management (opens panel)
- Measure Tool Group (pops out measure panel)
- Reading Mode (enter fullscreen focus mode)
- Toggle Light/Dark Background

### Docked Panels

| Panel | Description |
|---|---|
| Layers | Lists all layers; supports on/off, lock, freeze, isolate |
| Measurements | Lists all measurements in the current drawing; click to locate |
| Entity Info | Shows type, coordinates, layer, properties of selected entity |
| Statistics | Block usage statistics |
| Missing Resources | Alerts for missing fonts or external references |

## Tablet (Pad)

The tablet layout is a compact design between desktop and mobile:

- Right-side toolbar is retained, but button spacing is increased for touch
- Docked panels are collapsed into an icon bar by default; click to expand as a side drawer

## Mobile

Mobile uses a **bottom tab bar + drawer panel** design, concentrating all interaction at the bottom of the screen and leaving the top for the canvas.

### Bottom Tab Bar

Six icon buttons are displayed at the bottom of the screen:

```
┌──────┬─────────┬────────┬────────┬────────┬─────────┐
│ Zoom │ Measure │ Review │ Layers │ Layout │ Setting │
└──────┴─────────┴────────┴────────┴────────┴─────────┘
```

| Button | Function |
|---|---|
| Zoom | Zoom tool group: zoom in, zoom out, zoom to extents, window zoom |
| Measure | Measure tool group: distance, continuous distance, area, coordinates, arc length, angle |
| Review | Markup entry (disabled in read-only mode, grayed out) |
| Layers | Opens layer panel drawer |
| Layout | Switch layout |
| Setting | Settings menu: theme, simulated mouse, OSNAP, etc. |

### Drawer Panel

Tapping the Layers button pops up a layer panel from the bottom, showing each layer's name, visibility (On/Off), color, etc. Tapping the canvas or area outside the panel closes the drawer.

### Canvas Area

The canvas fills the upper portion of the screen. When a measurement is selected, a measurement badge is displayed on the canvas.

### Differences from Desktop

Mobile does not display the right-side toolbar or docked panels; their functions are replaced by the bottom tab bar + drawer panels.
