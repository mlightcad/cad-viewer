---
'@mlightcad/pdf-renderer': patch
'@mlightcad/three-renderer': patch
---

fix: PDF export of drawings with wipeouts and many viewports no longer hangs

Wipeouts are now always painted as a solid mask. `AcDbWipeout` does not set
a fill type, so the PDF renderer tessellated the pattern of the last hatch
drawn across each wipeout (hundreds of thousands of paper-white strokes per
wipeout) and the on-screen renderer drew it with the hatch shader instead of
masking.

Paper-space viewports now skip model-space entities outside the region they
show instead of painting all of model space and clipping it. Content streams
are compressed at zlib level 6 instead of 9, which cut main-thread
compression time about 5× for a 2% larger file.

On a drawing with 30 layout viewports, export went from never finishing to
about 1.5 minutes, with a 19 MB PDF.
