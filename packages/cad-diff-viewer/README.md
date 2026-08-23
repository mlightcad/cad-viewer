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

`acapCompareDrawings(leftDb, rightDb, options)` compares the two model-space
databases. Left is the old drawing; right is the new drawing. Options follow
AutoCAD COMPARE system variables from `@mlightcad/data-model`:

| Sysvar | Default | Effect |
| --- | --- | --- |
| **COMPAREPROPS** | `0` | Bitcode for object property diffs: Color `1`, Layer `2`, Linetype `4`, Linetype scale `8`, Lineweight `16`, Transparency `32`, Thickness `64`. `0` ignores property-only changes (geometry still compared). |
| **COMPAREHATCH** | `0` | `0` excludes hatch objects; `1` includes them. |
| **COMPARETEXT** | `1` | `0` excludes TEXT/MTEXT/ATTRIB/ATTDEF; `1` includes them. |
| **COMPARETOLERANCE** | `6` | Decimal places of geometric precision (`6` → `1e-6`). |
| **COMPARERCMARGIN** | `5` | `1–25`. Scales change-set clustering and revision-cloud padding. |

**Tolerance.** Coordinates and angles are quantized onto
`10 ** -COMPARETOLERANCE`, unless you pass an explicit `tolerance`.

Each entity then gets two strings:

- **Fingerprint** — DXF type plus quantized geometry (line endpoints, center /
  radius / angles, position, rotation, height, block name, scale, TEXT /
  MTEXT contents). If those fields are missing, axis-aligned extents are used.
  Line endpoints are stored in a direction-independent order.
- **Property key** — only the COMPAREPROPS bits that are enabled (empty when
  COMPAREPROPS is `0`).

**Matching (in order):**

1. Same DWG/DXF handle (`objectId`) **and** the same DXF type. Typical when
   the file was edited in place.
2. Among leftovers, same `dxfType` (and layer, when COMPAREPROPS includes
   Layer) **and** the same fingerprint.

**Classification:**

| Fingerprint | Property key | Result |
| --- | --- | --- |
| equal | equal | unchanged (omitted unless `includeUnchanged`) |
| equal | different | modified (attribute-only change; COMPAREPROPS ≠ 0) |
| different | — (handle match) | modified |
| no match | — | deleted (left only) or added (right only) |

Modified pairs emit **two** hits (one per side) with `pairedId` pointing at the
other entity. Nearby differences are grouped into **change sets**. The markup
toolbar can create built-in cloud markups around those sets. A cloud uses the
Settings color for its single change kind (added, deleted, or modified);
mixed-kind sets use the modified color. The results panel navigates
`deleted → modified (left) → added`.

The Settings dialog (Colors / Objects / Geometry tabs) edits compare colors
and these sysvars (live preview; Cancel restores the previous values).
COMPAREPROPS is registry-saved. The other four are read from the first
opened drawing, then written onto both open drawings so the panes stay in
sync.

## Limitations

Several of these match AutoCAD COMPARE. Others are current-scope gaps in
this viewer.

**Scope**

- Only **model-space, top-level** entities are compared. Paper space, other
  layouts, and entities nested inside an INSERT / block definition are not.
- An INSERT is one object (block name, insertion point, rotation, scale, and
  the INSERT’s own properties). Edits inside the block definition are ignored.
  Compare coloring keys off the INSERT handle, so nested primitives share one
  role color instead of being tinted individually.
- Hatches are omitted unless COMPAREHATCH is `1`. TEXT / MTEXT / ATTRIB /
  ATTDEF are omitted when COMPARETEXT is `0`.

**Properties vs appearance**

- The algorithm compares **stored entity values**, not the final rendered
  look. ByLayer / ByBlock color and linetype are not resolved against the
  layer table or a parent block.
- Changing a layer’s color or linetype in the layer table does **not** mark
  entities on that layer as modified. COMPAREPROPS Layer only means the
  entity moved to a different layer name.
- COMPAREPROPS defaults to `0`, so color, layer name, linetype, linetype
  scale, lineweight, transparency, and thickness are ignored until the
  matching bit is enabled in Settings.

**Matching**

- Same-handle pairing also requires the same DXF type. Unrelated files often
  reuse handles; a LINE and a CIRCLE that share a handle are not treated as
  one entity.
- Fingerprints cover common geometry (line endpoints, circle/arc, text,
  INSERT transform, and similar). Types without those fields fall back to
  axis-aligned extents, so some edits can be missed or over-matched.

**Display**

- Compare display replaces each drawing’s ACI / TrueColor with role tints
  (gray / red / green). It is not a true-color overlay of the originals.
- Overlay mode does not keep a distinct modified color: modified-left is
  painted as deleted, modified-right as added.
- Overlay mode converts the right drawing again as a read-only overlay; GPU
  scenes are not moved between the two canvases.

**Hosting**

- `AcApDocManager` is a process singleton. Do not mount `AcApDiffViewer` on a
  page that already hosts another CAD viewer from this stack.
- DWG parsing is not bundled. Register a converter in the host (see
  [`cad-diff-viewer-example`](../cad-diff-viewer-example)).

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
- Show / hide markups, and clear markups on both drawings
- Generate cloud markups from compare change sets
- Compare display mode: gray base, deleted red, added green (configurable)
- Strings go through `AcApI18n` (`diffViewer.*`)
