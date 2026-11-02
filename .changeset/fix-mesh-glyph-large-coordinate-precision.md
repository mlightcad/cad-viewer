---
"@mlightcad/three-renderer": patch
---

fix: rebase mesh-glyph instance matrices around a bucket origin

Scene-level TrueType glyph InstancedMesh batching baked absolute world
coordinates into float32 instance matrices, so on large-coordinate
(georeferenced, e.g. CGCS2000) drawings glyph vertices quantized to
0.25–2 drawing units and text rendered mangled; hover/selection
overlays were unaffected, which hid the cause. Instance matrices now
bake in float64 and are rebased at flush around each bucket's first
placement, with the origin carried on the InstancedMesh position where
the CPU's float64 model-view math absorbs it. Highlight overlays parent
under the InstancedMesh so they inherit the same origin.
