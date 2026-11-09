---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

New `pdfdim` command turns exploded PDF dimensions back into dimension objects: linear (any angle, inside or outside arrows, architectural ticks, chained), radius and diameter. It infers the drawing scale from the dimension texts and creates a `PDF_DIM` style matching the PDF's text height and arrow size, with DIMLFAC set to that scale. A Recover Dims button joins the AI > PDF ribbon panel.
