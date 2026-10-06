---
title: Measurement Overview
---

# Measurement Overview

Measurement commands are used to make temporary measurements on a drawing. All measurement results are displayed as HTML overlays and **are not written to the DWG/DXF file**; they can be exported and shared independently.

## Creating a Measurement

After selecting a command, click the required points in order as prompted. A real-time preview (rubber band + measurement value badge) is shown while dragging.

## Editing a Measurement

- **Click** a measurement object to select it; grip points are shown
- **Drag a grip point** to adjust the measurement; the value updates in real time

## Undo / Redo

Measurement operations support undo and redo.

## Units and Precision

The display unit and precision of measurement values can be adjusted in Settings, supporting millimeters / centimeters / meters / feet / inches, etc. These settings do not affect the original DWG/DXF file, only the measurement display.

## Import / Export

Measurement data can be exported as a JSON sidecar file (`DrawingName.measurement.json`) for easy sharing across drawings and devices. On import, all measurement objects and their styles are automatically restored.
