# ACEX multi-file package format

Display-only render data for the offline HTML viewer, split so a shell page can
download geometry **progressively** (fetch one compressed chunk, decompress,
paint, repeat).

> **Export zip vs hosted files**  
> CAD export may download a single `.zip` that contains the package directory.
> That zip is for **distribution only**. Unzip before hosting. The offline
> viewer does **not** open a zip in place; it fetches `viewer.html`, then
> `*.acex.json`, then individual `chunks/*.acex.gz` files.
> For nginx/CDN setup, caching, and `.gz` Content-Encoding pitfalls, see
> [acex-web-hosting-guide.md](./acex-web-hosting-guide.md).

## Directory layout

```text
drawing/
  viewer.html                 # HTML/CSS/JS shell only
  drawing.acex.json           # package manifest (small metadata + indexes)
  chunks/
    L0-000.acex.gz            # gzip ACEC geometry (binary, not base64)
    L0-001.acex.gz
    L0-osnap-000.osnap.gz     # gzip ACEO OSNAP slice (measure mode)
    L0-osnap-001.osnap.gz
    L1-000.acex.gz
```

### Shell HTML

Contains `#mlcad-package` (JSON) instead of an embedded snapshot:

```html
<script id="mlcad-package" type="application/json">
{"manifestUrl":"./drawing.acex.json"}
</script>
```

`manifestUrl` may be relative to the HTML file or an absolute CDN URL.

## Versioning

| Field | Where | Meaning |
|-------|--------|---------|
| `packageVersion` | manifest | Package / protocol version. Current: **1**. |
| `snapshotVersion` | manifest + ACEC header | Batch schema version. Matches `ACEX_SNAPSHOT_VERSION` (currently **4**). |

Bump `packageVersion` for breaking manifest changes. Bump `snapshotVersion` for
breaking batch / ACEC changes. Decoders must reject unsupported versions.

OSNAP catalogs are **not** inlined in the JSON manifest. They ship as optional
`chunks/L{n}-osnap-{slice}.osnap.gz` binary sidecars so the manifest stays small
and first paint never waits on snap data.

## Manifest (`*.acex.json`)

MIME: `application/json`

```json
{
  "format": "acex-package",
  "packageVersion": 1,
  "snapshotVersion": 4,
  "meta": { "...": "same shape as AcExSnapshot.meta" },
  "layers": [{ "name": "0", "color": 16777215, "visible": true }],
  "activeLayoutBtrId": "...",
  "layouts": [
    {
      "btrId": "...",
      "name": "*Model_Space",
      "isModelSpace": true,
      "viewports": null,
      "chunkIds": ["L0-000", "L0-001"],
      "osnapChunkIds": ["L0-osnap-000", "L0-osnap-001"]
    }
  ],
  "chunks": [
    {
      "id": "L0-000",
      "href": "chunks/L0-000.acex.gz",
      "layoutBtrId": "...",
      "byteLength": 12345,
      "compressedByteLength": 4000,
      "lineBatchCount": 12,
      "meshBatchCount": 3
    }
  ],
  "osnapChunks": [
    {
      "id": "L0-osnap-000",
      "href": "chunks/L0-osnap-000.osnap.gz",
      "layoutBtrId": "...",
      "byteLength": 500000,
      "compressedByteLength": 120000,
      "primitiveCount": 12000
    }
  ]
}
```

Notes:

- Geometry and OSNAP catalogs are **not** inlined in the manifest.
- `chunks` is ordered with the active layout’s geometry first (first-paint hint).
- `osnapChunks` / `osnapChunkIds` are omitted for view-only exports.
- Optional `sha256` on chunk refs is reserved; loaders may ignore it.
- Unknown JSON fields must be ignored by readers (forward compatible).

## Geometry chunk (`*.acex.gz`)

Each file is **raw gzip** of one **ACEC** binary payload (not base64, not a
multi-entry zip archive). File magic after gunzip is `ACEC` (`0x43454341`).

### ACEC binary (little-endian)

| Offset / field | Type | Description |
|----------------|------|-------------|
| magic | `u32` | `0x43454341` (`ACEC`) |
| version | `u8` | `snapshotVersion` |
| reserved | `u8` × 3 | Must be `0`; ignore on read |
| layoutBtrId | length-prefixed UTF-8 | Owning layout |
| lineBatchCount | `u32` | |
| line batches | … | Same encoding as ACEX snapshot batches |
| meshBatchCount | `u32` | |
| mesh batches | … | Same encoding as ACEX snapshot batches |

Batch records reuse the ACEX feature-flag scheme (`F_LINE_*`, `F_MESH_*`):

- **Append-only flags** — never renumber existing bits.
- Readers **ignore unknown flag bits** only when those bits carry no payload; new payload-bearing flags require a `snapshotVersion` bump.
- Geometry buffers are length-prefixed `Float32` / `Uint32` arrays, 4-byte aligned.
- **v4** `F_MESH_TEXTURE` (128): after other mesh flag payloads, writes `uvs` (`Float32Array`), MIME string, then raw image bytes (length-prefixed). Used for raster IMAGE and OLE frames.

### Geometry chunking rules

1. Split primarily **by layout**.
2. If a layout’s estimated uncompressed size exceeds
   `ACEX_DEFAULT_CHUNK_MAX_BYTES` (~2 MiB), split further by batch groups into
   `L{layoutIndex}-{slice:000}`. Gzip typically compresses a 2 MiB slice to well
   under 200 KiB; smaller slices add inflate round-trips and slow first open.
3. Scene collection packs geometry **by layer** (and material). A single busy
   layer can therefore be tens of megabytes in one line/mesh batch. Before
   grouping into chunks, any batch larger than `ACEX_MAX_GEOMETRY_BATCH_BYTES`
   (~2 MiB, same default as the chunk budget) is split into smaller batches of
   the same layer and style. Hosts can then fetch, inflate, and paint those
   pieces independently instead of waiting on the whole layer.
4. Textured IMAGE/OLE mesh batches are **not** split (the bitmap cannot be
   painted in fragments without duplicating the texture in every chunk).
5. Empty layouts still emit one empty chunk so the layout remains addressable.

## OSNAP chunk (`*-osnap-*.osnap.gz`)

Each file is **raw gzip** of one **ACEO** binary payload (measure-mode exports).
Coordinates are IEEE-754 **float64**; layer names are dictionary-compressed.

**Straight drawing `line` primitives are not stored in ACEO.** They duplicate
display `lineBatches` already downloaded for rendering. After geometry loads (and
before CPU batch buffers are released), the viewer extracts snap segments from
those batches and indexes them together with analytic ACEO curves (circle / arc /
ellipse / spline / point, including polyline bulge arcs) **and compact `path`
records** for mesh-drawn fill/frame boundaries (hatch loops, TRACE/SOLID,
IMAGE/WIPEOUT clip polygons, OLE frames) and **wide LWPOLYLINE centerlines**
(start/end width; drawn as `area` meshes, not `lineBatches`).

Kind `7` (`path`) is part of ACEO **version 1**. The schema has not had a formal
release, so adding this kind does not bump the version byte.

Large curve catalogs are still split (~512 KiB estimated uncompressed per file)
so hosts can fetch snap slices after the drawing is already visible.

### ACEO binary (little-endian)

| Field | Type | Description |
|-------|------|-------------|
| magic | `u32` | `0x4F454341` (`ACEO`) |
| version | `u8` | Currently **1** (includes kind `7` `path`) |
| reserved | `u8` × 3 | Must be `0` |
| layerCount | `u32` | |
| layers | strings | Length-prefixed UTF-8 dictionary |
| primitiveCount | `u32` | |
| primitives | … | kind `u8` + layer index `u32` + kind-specific f64 fields |

Kind codes: `1` line (legacy / unused on export), `2` circle, `3` arc, `4` ellipse, `5` spline, `6` point, `7` path (`closed` `u8` + `f64` vertex pack `[x,y,bulge,…]`).

### OSNAP chunking rules

1. Split by layout, then by estimated ACEO size into `L{layoutIndex}-osnap-{slice:000}`.
2. Each slice is a self-contained ACEO catalog (own layer dictionary).
3. Loaders concatenate primitives in `osnapChunkIds` order.
4. Empty curve catalogs omit `osnapChunks` / `osnapChunkIds`; line snap still works from geometry.

## Loading sequence

1. Open `viewer.html`.
2. Read `#mlcad-package` → `GET` manifest (small JSON).
3. Initialize viewer chrome from `meta` / `layers` (extents, layer panel).
4. For the active layout (and model space when paper viewports need it):
   `GET` each geometry `href` → gunzip → decode ACEC → append batches → paint → yield.
5. Drawing is usable for pan/zoom. **Then** (measure mode):
   - `GET` ACEO curve chunks (small when lines are omitted) → decode → concatenate.
   - Build hybrid snap index: **line segments from resident `lineBatches`** + analytic ACEO primitives (yielded / bulk `RBush.load`).
6. Release CPU geometry buffers after the hybrid index is ready.
7. Load remaining layouts lazily when the user switches layout (geometry first, OSNAP last).

## Relationship to single-file HTML

Self-contained HTML embeds one gzip+base64 **ACEX** snapshot
(`magic 0x58454341`). The **same** snapshot builder is used as for multi-file
packages: measure-mode OSNAP catalogs omit straight `line` primitives and keep
only analytic curves/points/paths. The offline runtime rebuilds line snap from the
embedded `lineBatches` before releasing CPU buffers, so single-file HTML is
smaller for line-heavy drawings without losing endpoint/midpoint snap.

Multi-file packages additionally split geometry into ACEC chunks and OSNAP into
ACEO sidecars; the catalog content rules are identical.

Password / expiry protection applies to **single-file** export only in the
current product UI.
