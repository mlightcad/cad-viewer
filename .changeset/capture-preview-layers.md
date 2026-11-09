---
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/three-renderer': minor
'@mlightcad/cad-script-plugin': patch
'@mlightcad/cad-agent-plugin': patch
---

Add layer preview mode to `cad.view.capturePreview`.

- `cad.view.capturePreview({ layers: ['A', 'B'] })` renders only model-space geometry on those layers (INSERTs contribute just their fragments on those layers) and frames the PNG to the combined extents of the layers, so the image has no large empty margins. Names are case-insensitive; unknown names throw; `layers` cannot be combined with `selection`.
- `CaptureDrawingPreviewFailure` adds `'no-layers'`; `normalizeCadCapturePreviewOptions` returns `NormalizedCadCapturePreviewOptions`.
- New `AcApEntityPreviewConvertor.captureLayers`, `AcTrLayout.findLayers` / `computeLayerPreviewBoundsBox` / `createLayerPreviewRoot`, `AcTrLayer.getEntityIds` / `computeContentBoundingBox`, and `AcTrBatchedGroup.getEntityIds`.
