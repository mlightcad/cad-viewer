---
title: Simulated Mouse (Mobile)
---

# Simulated Mouse (Mobile)

When drawing on a touch screen, the finger itself obscures the target position on the screen, making misclicks likely. The simulated mouse solves this problem: the input point is "lifted" from the finger touch point to above the finger, and a crosshair cursor replaces the finger for precise input.

<TouchPointAnimation />

## How It Works

- **Enabled by default**.
- When executing a drawing or similar command, **long-press** the screen with your finger; a crosshair-shaped simulated mouse cursor appears above the finger (about 52px above the finger).
- The finger touch input becomes **crosshair cursor point input**: the actual input position is determined by the crosshair, not the finger contact point, avoiding the offset caused by finger occlusion.

## Enable / Disable

- You can enable or disable the simulated mouse in **Settings**.
- The toggle can also be switched at any time during drawing.
