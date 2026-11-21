---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/three-renderer': patch
---

Fix PDF import of labels drawn over white panels.

- PDF import honours the clip around an image: a full picture clipped down to a detail (e.g. a QR code) now imports as that detail only, instead of the whole picture.
- Overlapping solid hatches now draw in creation order, so a later fill covers an earlier one (a coloured drop on a white label panel) while every hatch stays under linework.
- Black PDF text and linework painted on a white fill keep a fixed black colour instead of ACI 7, so they stay readable on a dark canvas.
- Coloured fills that a different-coloured digit sits on (water-efficiency drops) are no longer removed as outlines of that digit.
