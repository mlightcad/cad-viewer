---
'@mlightcad/cad-simple-viewer': patch
---

fix: frame the first Model visit by converted geometry

When a document opens into a paper layout, the first switch to Model framed
the Model layout's stored EXTMIN/EXTMAX ahead of the converted entity box.
Those extents are often stale, so Model looked empty and ZOOM Original kept
returning to the same blank area. Model now frames the converted geometry,
like opening straight into Model does; EXTMIN/EXTMAX remains the fallback
before anything is converted. Paper layouts are unchanged.
