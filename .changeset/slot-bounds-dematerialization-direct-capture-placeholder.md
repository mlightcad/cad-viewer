---
'@mlightcad/three-renderer': patch
---

Per-slot Box3 dematerialization and shared direct-capture placeholder entity

- Line and Line2 batches no longer materialize a cached `Box3` per slot. A new `computeBoundingBoxAt` hook scans the packed vertex buffers directly (packed position/index for `AcTrBatchedLine`, interleaved `instanceStart`/`instanceEnd` for `AcTrBatchedLine2`), so aggregate queries (`unionActiveVisibleBoundingBoxInto`, layout extents / fit, raycast prep including Line2 `bboxIntersectionCheck` / `getObjectAt`) no longer allocate one box per geometry slot. `computeBoundingBox` now takes a `getBoundsAt` callback and `applyGeometryAt` accepts an optional `previousBounds` so the equal-extents rewrite path can retain a cached slot box without requiring one. Mesh and point batches keep the caching default: they have far fewer slots, each with many more vertices, so a cached `Box3` is cheaper than a packed-buffer rescan. Line/Line2 override the aggregate sphere with a single packed-array min/max pass (5.6× faster dirty sync).
- Direct-batch capture sessions now hand out one shared dispose-immune placeholder entity (`createDirectCapturePlaceholder()`) instead of allocating a throw-away `AcTrEntity` per captured entity (~1.9s saved on 434k entities). The placeholder overrides `dispose()` and `removeFromParent()` as no-ops so capture-result release cannot tear the shared instance down; all capture-branch draw methods (`group`/`point`/`lineSegments`/`area`/`mtext`/`shape`/`image`/`linePoints`) return it.
