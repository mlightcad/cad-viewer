---
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

New `pdfhatch` command (AI tab → PDF → Recover Hatch) turns the loose strokes a PDF made of a pattern hatch back into a hatch object. Select the hatched area with the lines around it: regular strokes are matched against `acadiso.pat` (dot patterns such as ANSI36 included, even when the PDF dropped the dots), then user-defined single or crossed lines, and otherwise measured into a custom `PDF_HATCH` pattern (spacing, stagger and dashes). The boundary comes from closed outlines in the selection or from the faces the selected lines, arcs and polylines enclose, even when they cross, meet in T-junctions or run past the hatch; islands stay holes. The hatches are previewed in place of their strokes and converted all at once or one by one, and only objects a hatch redraws completely are erased.

`acapPdfRecognizeHatches` gains the options behind it: `faceBoundaries`, `customPatterns`, `boundaries` (caller-supplied loops) and a `trace` callback. Library matching now ignores extra line families in a region (the line work around a hatch) and prefers the pattern that explains most of it, so ANSI32-style hatches next to their boundary lines are no longer split into ANSI31 pieces. `PdfRecognizedHatchPattern` has a new `custom` variant, which `acapPdfCreatePatternHatch` writes as a Custom hatch with explicit definition lines.
