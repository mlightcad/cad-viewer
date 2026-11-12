---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

`pdftext` (Recover Text) now opens a review panel in the palette instead of asking for unread lines one by one on the command line. Per font kind (SHX line text / TrueType outline text) you choose an existing text style or create one, see which font and big font it uses and replace them, adjust the height scale and the width factor (auto-fit to the original width or manual), and fix or type the text of every line. The result is previewed in the drawing, which stays pannable and zoomable; Apply converts in one undo step, Cancel or closing the palette changes nothing.

Each line is detected as SHX or TrueType text from its strokes, and SHX text now stays SHX text by default (a `PDF_SHX` style with `txt` + `gbcbig`). Before, every recovered line used the current style, which in the default setup draws in `simsun`, so recovered SHX text changed look and its CJK characters grew noticeably.

New `AcApPaletteService` in `@mlightcad/cad-simple-viewer` lets commands show non-modal panels in the host palette: the tool palette in `cad-editor`, the dock panel in `cad-simple-ui-plugin`, or a built-in docked panel otherwise. `acapZoomToVisible` (frame a box in the canvas area a palette does not cover) is now exported too.

Characters recovered as separate lines can be merged into one MTEXT in the panel: select lines with Ctrl/Shift+click and **Merge into MText**, or **Merge adjacent** to merge everything that stands next to each other on one baseline. Lines on different baselines become paragraphs with the measured line spacing; width auto-fit applies per paragraph (`\W`). **Split** undoes a merge.
