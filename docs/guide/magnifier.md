---
title: Magnifier (Mobile)
---

# Magnifier (Mobile)

When precisely picking points on a touch screen, your finger obscures the target position. The magnifier provides a visual aid: a square magnifier HUD is displayed in the top-left corner of the screen, magnifying the content near the input point to help you precisely select small objects in dense drawings.

## How It Works

- When a command requires you to pick a point, **long-press** the screen for about 1 second, and a square magnifier HUD automatically appears in the top-left corner.
- The magnified area follows the current input point: the magnifier helps you see the exact position near the input point without being blocked by your finger.
- The magnifier only provides visual assistance and does not change the input position.

## Relationship with Simulated Mouse

The magnifier always appears after a long press; the simulated mouse toggle only affects **which position** the magnifier zooms into:

- **Simulated mouse on (default)**: the input point is offset to the crosshair position about 52px above the finger, and the magnifier zooms into the area around the crosshair.
- **Simulated mouse off**: the input point is the finger touch point, and the magnifier zooms into the area around the finger touch point.

The simulated mouse is a toggle button that can be switched in **Settings** or at any time during drawing.
