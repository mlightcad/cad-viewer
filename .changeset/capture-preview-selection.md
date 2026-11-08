---
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-agent-core': minor
---

Add selection preview mode to `cad.view.capturePreview`.

- `CadSession.capturePreview` now takes `{ longSide?, selection? }` instead of a bare pixel number (a bare number is still accepted as `longSide` for compatibility).
- Pass `selection: true` to render only the current selection via `AcApEntityPreviewConvertor` (batch geometry + scene bounds; not database `geometricExtents`).
- Empty selection returns `reason: 'no-selection'`. Extents mode behavior is unchanged.
