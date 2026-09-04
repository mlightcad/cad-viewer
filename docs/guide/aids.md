---
title: Drawing Aids
---

# Drawing Aids

Drawing aids help you more precisely locate points, directions, and objects.

## Object Snap (OSNAP)

Object snap automatically snaps to snappable positions when the cursor is near them, and displays a snap marker.

Supported snap modes:

| Mode | Marker | Description |
|---|---|---|
| EndPoint | Square | Line segment endpoint |
| MidPoint | Triangle | Line segment midpoint |
| Center | Circle | Center of a circle/arc/ellipse |
| Quadrant | Diamond | The four quadrant points of a circle |
| Nearest | Cross | The point nearest to the cursor |
| Intersection | × | Intersection of two lines |

OSNAP can be quickly toggled on the status bar; click it to open the detailed configuration panel and select which snap modes to enable.

## Orthogonal Mode (ORTHO)

When enabled, the next line is restricted to horizontal or vertical direction only. Useful for drawing axis-aligned rectangles, equilateral triangles, etc.

- Shortcut: `F8` (if supported)
- Toggle on the status bar

## Polar Tracking (POLAR)

When enabled, the cursor automatically aligns along the configured angle increment. The default angle increment is 90°; you can choose 5°, 10°, 15°, 18°, 22.5°, 30°, 45°, or 90°.

Polar and orthogonal are mutually exclusive: turning on Ortho automatically turns off Polar, and vice versa.

## Dynamic Input (DYN)

Displays a floating input box near the cursor. During command execution, you can type values (distances, angles, etc.) directly in the input box without operating the command line.

## Rubber Band Preview

Almost all drawing commands show a real-time temporary preview line segment ("rubber band") from "the previous point" to "the current cursor" as you move the cursor, helping you judge direction and length.
