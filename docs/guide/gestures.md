---
title: Gestures
---

# Gestures

## Desktop (Mouse)

| Action | Effect |
|---|---|
| Left-click | Pick a point / select an entity |
| Left-drag | Box-select / drag an entity |
| Scroll wheel | Zoom the view |
| Middle-button or Shift + Middle-button drag | Pan the view |
| Right-click | Outside a command: show the context menu; inside a command: acts as Enter to confirm |
| Esc | Cancel the current command |
| Enter / Space | Confirm the current step or repeat the last command |
| Ctrl + Z | Undo |
| Ctrl + Y | Redo |

## Mobile (Touch)

### Browse Mode

The following gestures are supported when viewing a drawing:

| Gesture | Effect |
|---|---|
| One-finger pan | Touch the drawing area with one finger and move to change the drawing position |
| Two-finger pan | Touch the drawing area with two fingers, keeping the distance between them constant, and move to change the drawing position |
| Pinch | Change the distance between two fingers to zoom in or out |

### Edit Mode

In drawing and editing states, the following are supported in addition to the browse gestures:

| Gesture | Effect |
|---|---|
| One-finger tap | While drawing, tap to create a point; with no active command, tap an object to select it |
| One-finger long-press + slide | Window / crossing box-select |
| One-finger tap + slide | When creating an entity, tap to mark a point then slide to re-adjust that point's position; when editing an object, tap a selected grip and drag to perform a grip stretch or scale |
| Tap point input | Tap the screen with one finger—no displacement, quick lift (less than 0.5 seconds)—to input a point |
| Drag point input | Long-press the screen with one finger for more than 0.5 seconds to enter drag selection mode, move to the target position and lift to complete the input |

### Box-Select Direction

As in AutoCAD, the direction of the box-select determines the selection mode:

- **Left to right**: Window selection—only entities entirely within the rectangle are selected
- **Right to left**: Crossing selection—entities intersecting the rectangle are selected
