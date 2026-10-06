---
title: Review Mode
---

# Review Mode

Review mode adds full markup capabilities on top of read-only mode. The DWG/DXF background remains read-only; all markups are drawn as HTML overlays and independently saved/shared via sidecar JSON files.

Upon entering review mode, the interface automatically displays markup-related tools and panels.

## Desktop

### Overall Layout

Same as read-only mode: no Ribbon and no status bar. The interface is canvas-centric, with commands accessed through the right-side toolbar and docked panels. The difference is that the right-side toolbar gains a markup tool group, and the docked panels gain a review panel.

<ReviewModeLayout mode="review" />


### Right-Side Toolbar

In addition to the read-only mode tools, there is a **Markup Tool Group** popup panel containing: arrow, text, cloud, rectangle, circle, callout, stamp, and other markup commands.

### Docked Panels

In addition to the read-only mode panels, there is a **Review (Markup) Panel**:

| Panel | Description |
|---|---|
| Review (Markup) | Lists all markups, showing icon, creator, time, and summary by type. Supports click-to-locate, edit metadata (Comment / Status), and clear |

All other panels (Layers, Measurements, Entity Info, Statistics, Missing Resources) are the same as in read-only mode.

## Tablet (Pad)

Same tablet layout as read-only mode, but:

- The right-side toolbar gains a markup tool group popup button
- The docked panel list gains a "Review" panel entry

## Mobile

The **Review button** in the mobile bottom tab bar is active and available in this mode.

### Bottom Tab Bar

| Button | Status |
|---|---|
| Zoom | Available |
| Measure | Available |
| Review | **Available** — click to open the markup tool panel |
| Layers | Available |
| Layout | Available |
| Setting | Available |

<MobileBottomTabBar mode="review" />


### Review Button

Tapping the Review button pops up a markup tool panel from the bottom, listing: arrow, text, cloud, rectangle, circle, callout, stamp, etc. Selecting one directly enters the markup command, with real-time preview on the canvas and interactive creation.

### Markup List

At the bottom of the Review panel or in a secondary view, you can see all markups on the current drawing. Clicking a list item allows you to:

- Zoom the canvas to the markup's location
- Toggle markup visibility
- Open markup metadata editing (Comment / Status)

### Import / Export Markup

The top of the Review panel provides export and import buttons. Sidecar JSON files can be shared across drawings and devices.

## Differences from Read-Only Mode

| Component | Read-Only | Review |
|---|---|---|
| Right-side toolbar · Markup tool group | ✗ | ✓ |
| Docked panel · Review (Markup) | ✗ | ✓ |
| Mobile · Review bottom button | Disabled (grayed) | Available |
| Markup create / edit | ✗ | ✓ |
| Markup import / export | ✗ | ✓ |
