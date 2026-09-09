---
title: Session Accessory
---

# Session Accessory

A **Session Accessory** is a small group of controls that gets dynamically mounted onto the UI to provide extra entry points at specific moments. Its defining trait is that it **appears only when needed and disappears automatically afterwards**.

Session accessories are primarily used in two situations:

- **On mobile**: Mobile devices do not have the Ribbon UI that desktops have, so many command options that live on the Ribbon have nowhere to go. Session accessories bring those options to the user during command execution or object selection.
- **In Ribbon-less runtimes**: Some embedded or lightweight runtimes do not ship the Ribbon component. Session accessories serve as supplemental UI in those environments as well.

There are two kinds of session accessory — **command session accessories** and **selection session accessories**.

## Command session accessory

A command session accessory is mounted **by a command while it is active** and provides extra UI controls specific to that command. Once the command finishes or is cancelled, the accessory is automatically hidden.

The canonical example is the **Draw-style Accessory** mounted by measurement and markup commands — while measuring or adding annotations, the first row of the session panel shows color and text-height buttons so the user can tweak appearance mid-command without having to go back to a Ribbon.

In the demo below, the area highlighted in red is the command session accessory:

<MobileSessionPanel highlightAccessory />

> ⚠️ Not every command mounts a command session accessory. Simple drawing commands like Line or Circle have no extra options to expose, so no accessory appears — the left side of the panel's first row shows the command prompt text directly instead.

## Selection session accessory

A selection session accessory appears **when one or more entities are selected**. It is attached to the left side of the **Shortcut Toolbar**, separated from the quick-action buttons on the right by a vertical divider. When the selection is cleared, the selection session accessory disappears.

The role of a selection session accessory is similar to its command counterpart — it provides context-aware controls for the selected objects. For example, selecting a markup text item can surface color and text-height controls in the accessory area.

In the demo below, the area highlighted in red is the selection session accessory; the divider and the circular button group to its right belong to the Shortcut Toolbar itself:

<ShortcutToolbar highlightAccessory />

## Comparison

| Feature | Command session accessory | Selection session accessory |
|---|---|---|
| **When it appears** | While a command is active | When one or more entities are selected |
| **Where it mounts** | Mobile: first row of the session panel<br/>Ribbon-less: command UI area | Left side of the Shortcut Toolbar |
| **When it disappears** | Command ends or is cancelled | Selection is cleared |
| **Typical controls** | Color, text height, other command-specific options | Color, text height, object property editors |
| **Always present?** | No — decided by the command | No — depends on the selected entity type |

## Relationship with the desktop Ribbon

On desktop, command-related options are typically grouped in Ribbon "contextual tabs" — the Ribbon automatically switches to a tab specific to the active command. A session accessory is essentially a **lightweight replacement for contextual tabs on mobile / Ribbon-less scenarios**:

| Desktop | Mobile / Ribbon-less |
|---|---|
| Ribbon contextual tab | Command session accessory (inside the session panel) |
| Object properties panel on a regular Ribbon tab | Selection session accessory (on the Shortcut Toolbar) |
