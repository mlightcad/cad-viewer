---
title: Markup Overview
---

# Markup Overview

Markup commands are used to add review marks to a drawing. When a markup command is executed, the viewer automatically enters **Review Mode** (DWG/DXF background becomes read-only).

All markups are drawn as HTML overlays and **do not modify the original DWG/DXF file**. They are saved and shared independently via a JSON sidecar file (`DrawingName.markup.json`).

## Creating Markups

Most markup commands use CAD-style step-by-step point selection interaction:

1. Select a command (Ribbon → Markup group, or the markup pop-out panel on the right toolbar)
2. Click the required points in order according to the command prompts
3. A real-time preview (Jig) is shown while dragging
4. After completion, the markup is immediately displayed on the canvas

## Editing Markups

- **Click** a markup to select it; grip edit points are shown
- **Drag a grip point** to adjust the shape, endpoints, etc.
- **Double-click** a text-bearing markup (Text, Callout, a shape with an attached Callout) to enter inline text editing
- Press **Delete** while selected to delete it

## Undo / Redo

Markup operations support undo and redo. Undo reverts not only creation, but also grip edits, deletions, and other modifications.

## Import / Export

- **Export**: Export all current markups as a JSON file download
- **Import**: Load a previously exported JSON file to restore all markups

The sidecar JSON file can be shared across drawings and devices.
