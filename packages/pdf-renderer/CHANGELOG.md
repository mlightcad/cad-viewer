# @mlightcad/pdf-renderer

## 1.7.2

### Patch Changes

- feat: draws complex TEXT and SHAPE linetypes as strokes and glyphs, renders closed wide polylines as offset rings, and adds HTML export smart extents plus AutoCAD saved-view zoom. The CLI gains a self-hosted base URL and open-view, no-plot, and circle-sides options. Dynamic blocks and arc-aligned text come with the data-model upgrade. Drawing open is faster with font preload and lighter line batches, and fixes cover raster and OLE textures, PDF PDMODE, and progressive open.

## 1.7.1

### Patch Changes

- feat: adds a native AcGi PDF renderer with direct vector export and lower-memory text modes, plus HTML export that embeds progressive ACEX chunks, multi-file ZIP packages, and leaner multi-layout switching. Shared toolbar and notification engines land across viewers, with reading mode, mobile session accessories, and parallel package downloads. Fixes cover font sync, hatch shaders, mirrored INSERTs, OLE2Frame embeds, selection, and PDSIZE/highlight/dashed-line rendering

## 1.7.0

### Minor Changes

- feat: adds a native AcGi PDF renderer that exports CAD databases to vector PDF without an SVG intermediate
