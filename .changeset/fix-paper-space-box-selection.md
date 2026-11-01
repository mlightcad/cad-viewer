---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

fix: box-select model entities through paper-space viewports

A drag rectangle in a paper-space layout queried only that layout's spatial
index, so model-space content rendered inside a viewport could be clicked
(pick drills through the viewport) but was never box-selected — reported for
LEADER handles 72834 / 72832 / 72CCB in `布局1` where clicking worked and
dragging did not.

`AcEdBaseView.collectSelectionIdsByBox` now merges a drill-through pass from
`collectViewportDrillThroughSelectionIds`, implemented by `AcTrView2d` and
exported as the pure helper `acedCollectViewportBoxSelectionIds`. Each
viewport maps the visible part of the pick rectangle into model WCS, queries
the model-space layout, and maps hits back to paper space so window still
requires full containment and crossing still requires a real geometric hit.
Hit testing respects the viewport border (clipped content is never selected),
VPLAYER-frozen layers, block-reference child boxes, and overlapping viewports.

Two refinements keep the new pass exact:

- The selection mode is forwarded to the model-space spatial query. Only the
  index knows the full child set of a block reference — the hits it returns
  list just the children that intersect the query box — so deriving window
  containment from those children alone would select a partially overlapping
  INSERT. Block hits are now also tested child by child instead of as one
  union box, because the union of two distant children covers the empty gap
  between them.
- Crossing hits are geometry-tested in paper space. For a viewport with a
  non-zero `viewTwistAngle` the paper pick rectangle is rotated relative to
  model WCS, so the model-space query box is a superset of the real region and
  a leader crossing only its corner would be wrongly selected.
