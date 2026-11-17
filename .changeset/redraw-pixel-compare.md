---
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-script-plugin': patch
---

feat(redraw): pixel-level comparison with the reference image

Add `cad.redraw.compare(spec, options?)`. It renders the drawing over the
reference image's CAD footprint, registers it into the image frame through the
spec calibration (similarity, affine, or homography), thins both to 1-pixel
centerlines, and measures them with distance transforms. The tool result's
`redrawCompare` reports a verdict (`aligned` / `offset` / `incomplete` /
`cluttered` / `mismatch`), coverage, precision, F1, mean and p95 distances in
pixels and CAD units, a suggested move for systematic offsets, and hotspot
regions, with an overlay and a difference image attached for the model.

The pure algorithms (`acexExtractInk`, `acexThinInk`, `acexDistanceTransform`,
`acexCompareInk`, overlay / difference rendering) live in
`@mlightcad/cad-script-core`; viewer sessions supply decoding, WebGL rendering,
and PNG encoding through the new `CadSession.redrawRaster` host
(`createViewerRedrawRasterHost`). The CAD agent registers the conversation's
attached images as references and iterates draw → inspect → compare.
