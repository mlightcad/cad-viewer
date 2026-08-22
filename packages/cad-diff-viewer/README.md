# @mlightcad/cad-diff-viewer

Reusable side-by-side / overlay CAD comparison widget. It depends on
[`@mlightcad/cad-simple-viewer`](../cad-simple-viewer) and creates both WebGL
canvases internally — the host only supplies a parent container.

## How it works

`AcApDiffViewer` does not reimplement CAD conversion. It creates one
`AcApDocManager` with two canvases (left = old, right = new), opens each file
into its own document session, then:

1. Runs [`acapCompareDrawings`](./src/compare/acapCompareDrawings.ts) on the two
   model-space databases.
2. Turns the result into per-entity **compare roles**.
3. Paints those roles with **compare display mode** — a GPU tint that replaces
   the drawing’s own ACI / TrueColor.

### Compare display (why everything looks one color)

Normal viewing keeps each entity’s CAD color. Compare display does the opposite:
when it is enabled, **every batched fragment is first forced to a single base
color** (default gray `#9ca3af`). Only entities with a role override then pick
up deleted / added / modified colors.

That tint is applied in the batch highlight shader, not by rewriting entity
materials on the CPU:

| Mask channel | Meaning |
| --- | --- |
| R | selection (wins over compare) |
| G | hover (wins over compare) |
| B | compare role: none / deleted / added / modified |

While `u_compareEnabled` is on, the fragment shader:

1. Sets the color to `u_compareBaseColor`.
2. Reads the B channel of the per-slot mask texture and swaps in
   deleted / added / modified if a role is set.
3. Still lets selection and hover replace that color.

Unbatched drawables (for example fat lines) get the same roles via cloned
materials. Overlay/XREF layouts are colored separately through
`setOverlayCompareDisplay`.

**Side-by-side:** each canvas tints its own drawing. Unchanged geometry stays
gray. The left canvas marks deletions (and modified-left hits); the right
canvas marks additions (and modified-right hits).

**Overlay:** the right database is registered as a read-only overlay on the left
canvas (geometry is converted again; scenes are not moved between renderers).
The left drawing uses the deleted color for deleted *and* modified-left
entities; the overlay uses the added color for added *and* modified-right
entities. Unchanged geometry from both files sits on the gray base so you can
see what moved.

Default role colors (overridable via `compareColors`):

- unchanged: `#9ca3af`
- deleted (left / old): `#e11d48`
- added (right / new): `#22c55e`
- modified: same as deleted in side-by-side; folded into red/green in overlay

### Diff algorithm

`acapCompareDrawings(leftDb, rightDb)` compares **model-space, top-level
entities only** (no paper space, no INSERT expansion). Left is the old drawing;
right is the new drawing.

**Tolerance.** A first pass collects extents and picks an absolute grid of about
`max(drawingSize × 1e-6, 1e-6)`, unless you pass `tolerance`. Coordinates and
angles are quantized onto that grid so near-identical geometry still matches.

Each entity then gets two strings:

- **Fingerprint** — DXF type plus quantized geometry (line endpoints, center /
  radius / angles, position, rotation, height, block name, scale, TEXT /
  MTEXT contents). If those fields are missing, axis-aligned extents are used.
  Line endpoints are stored in a direction-independent order.
- **Property key** — layer, color, linetype, lineweight, visibility.

**Matching (in order):**

1. Same DWG/DXF handle (`objectId`). Typical when the file was edited in place.
2. Among leftovers, same `dxfType` + layer **and** the same fingerprint. Typical
   when handles were regenerated but the entity was only restyled.

**Classification:**

| Fingerprint | Property key | Result |
| --- | --- | --- |
| equal | equal | unchanged (omitted unless `includeUnchanged`) |
| equal | different | modified (attribute-only change) |
| different | — (handle match) | modified |
| no match | — | deleted (left only) or added (right only) |

Modified pairs emit **two** hits (one per side) with `pairedId` pointing at the
other entity. The results panel navigates `deleted → modified (left) → added`.

## Usage

```ts
import { AcApDiffViewer } from '@mlightcad/cad-diff-viewer'

const viewer = new AcApDiffViewer({
  container: document.getElementById('diff-host')!,
  compareColors: {
    unchanged: 0x9ca3af,
    deleted: 0xe11d48, // left / old
    added: 0x22c55e, // right / new
    modified: 0xe11d48
  },
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})

await viewer.openDocument('left', file.name, await file.arrayBuffer())
```

### Features

- Side-by-side or overlay view modes
- Drop a DWG/DXF onto a pane, or click the pane / open-file icon
- Compare results panel (by change kind or entity type) with prev/next navigation
- Markup tools (cloud, callout, text, rect, circle, arrow, stamp, …)
- Compare display mode: gray base, deleted red, added green (configurable)
- Strings go through `AcApI18n` (`diffViewer.*`)

`AcApDocManager` is a process singleton. Mount `AcApDiffViewer` on a page that
does not already host another CAD viewer.

DWG parsing is not bundled. Register a converter in the host (see the
[`cad-diff-viewer-example`](../cad-diff-viewer-example) demo).
