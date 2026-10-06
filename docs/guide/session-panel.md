---
title: Session Panel (Mobile)
---

# Session Panel (Mobile)

On desktop, the **Dynamic Input (DYN)** floating frame near the cursor lets users type distance/angle values directly and press **Enter** to confirm or **Esc** to cancel. On mobile — where there is no physical keyboard — this interaction needs a different carrier.

The **Session Panel** is the mobile equivalent of Dynamic Input + keyboard. It docks at the bottom of the screen, pops up automatically while a command is active, shows the current prompt and live metric values, and provides on-screen **Confirm** (✓) and **Cancel** (×) buttons — the mobile counterparts of **Enter** and **Esc**.

## Preview

Below is the actual Session Panel as rendered in the documentation:

<MobileSessionPanel />

## Panel structure

In expanded mode the panel is divided, top to bottom, into the following regions:

### Accessory / Title Row

The left side of the first row shows the **Session Accessory** mounted by the active command. Different commands mount different accessories — measurement and markup commands mount the **Draw-style Session Accessory** (color + text-height), while other commands (PLine, Text, etc.) may mount their own dedicated accessory controls. If the active command **mounts no session accessory at all**, the left side of the first row shows the command prompt text directly (and the prompt row described below does not appear).

The demo below shows the measurement / markup scenario, where a draw-style accessory is mounted:

| Control | Icon | Purpose |
|---|---|---|
| Color button | <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#1a8cff;border:1px solid #555;"></span> | Opens the ACI color palette / dialog to set the active draw color |
| Text-height button | <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle"><text x="2" y="18" font-family="Georgia, Times New Roman, serif" font-size="16" font-weight="600" fill="#e8eaed">A</text><g stroke="#2dd4bf" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M18 4v16"/><path d="M15.5 6.5 18 4l2.5 2.5"/><path d="M15.5 17.5 18 20l2.5-2.5"/></g></svg> | Opens the text-height dialog to configure text size |

On the right side of the row there are two circular icon buttons:

| Button | Icon | Purpose |
|---|---|---|
| Help | ? | Opens the full-screen help panel |
| Collapse / Expand | ▼ / ▲ | Toggles compact and expanded mode |

### Prompt Row

The second row appears **only when the active command has mounted a session accessory**. It shows the command **prompt text** (e.g. "Specify first point") and, if the command exposes optional arguments, the corresponding **keyword chips** (e.g. `[Undo(U)/Continue(C)]`). The prompt is left-aligned and localised automatically.

If the active command mounts no session accessory, the prompt text goes straight to the left side of the first row (taking the accessory's place) and no separate second row is shown.

Tapping a keyword chip is the mobile equivalent of typing the keyword at the desktop command line.

### Metrics

The panel updates in real time as the user drags their finger. The values shown depend on the command state:

| State | Displayed values | Meaning |
|---|---|---|
| Before the first point is picked | **X** / **Y** | Absolute coordinates of the current cursor position |
| After the first point (relative mode) | **Length** / **Angle** | Distance and angle from the first point to the current position |
| After the first point (relative mode) | **ΔX** / **ΔY** | X and Y deltas from the first point to the current position |

Phone and pad layouts differ: on a phone each metric value gets its own row with the Cancel/Confirm button embedded on the right; on a pad metric values sit side-by-side and the Cancel/Confirm buttons are grouped in a shared area on the far right.

### Confirm / Cancel Buttons

| Button | Icon | Desktop equivalent | Purpose |
|---|---|---|---|
| **Confirm** | ✓ (blue circle) | `Enter` / blank return | Accept current input or use the default value |
| **Cancel** | × (gray circle) | `Esc` | Abort the current command |

When the command does not accept a blank return (the user must supply a value), the **Confirm** button is disabled (dimmed).

## Compact Mode

Tap the ▼ button on the title row to switch to **Compact Mode**. The panel collapses from multiple rows to a single row; the prompt row, metrics, and keyword chips are all hidden. Only the following remain visible:

- The **session accessory** (if one is mounted)
- An **Expand** button (▲, arrow direction reversed)
- **Cancel** (×) / **Confirm** (✓) buttons

Compact mode keeps the canvas as visible as possible during command execution while preserving the essential operations. Tap the **Expand** button to return to expanded mode.

Below is the compact state with a session accessory mounted:

<MobileSessionPanel initialCompact />

## Phone vs Pad

The session panel adapts automatically to the viewport width:

| Feature | Phone (≤ 600px) | Pad (> 600px) |
|---|---|---|
| Panel width | Full screen width | Centered, fixed 480px with rounded corners and shadow |
| Metric layout | Vertically stacked, one row per metric | Side-by-side, two metric groups in parallel |
| Button placement | Cancel / Confirm embedded in different metric rows | Cancel / Confirm grouped in a shared right-hand area |
| Compact style | Full-width single row | Fixed-width single row, centered |

## Desktop counterpart

| Desktop action | Mobile session panel equivalent |
|---|---|
| Dynamic Input (DYN) showing distance / angle | Live metrics showing Length, Angle, ΔX, ΔY |
| Typing keyword options at the command line | Tapping keyword chips |
| `Enter` / blank return to accept default | **Confirm** (✓) button |
| `Esc` to cancel the command | **Cancel** (×) button |
| Command line prompt `Specify first point:` | Prompt row showing the same text |
