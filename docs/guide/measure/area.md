---
title: Area
---

# Area

Measure the area of a polygon enclosed by several points.

## Interaction Steps

1. Click the first point
2. Click subsequent vertices in order—a real-time preview of the semi-transparent fill + dashed outline is shown
3. Press **Enter** or **Esc** to finish, or click near the first vertex to auto-close

## Closing Conditions (Auto-close)

- Click within about 14px of the start point
- Click very close to the current last vertex
- The new segment crosses an existing segment (auto-closes when a self-intersection is formed)

## Area Calculation

Uses the Shoelace Formula.

## Display

The area badge is placed at the centroid of the polygon.

## After Creation

All vertices have grip points; drag any vertex and the area is recalculated in real time.
