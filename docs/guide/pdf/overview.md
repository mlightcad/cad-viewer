---
title: Converting PDF Drawings
---

# Converting PDF Drawings

PDF drawings keep only what was printed: curves are Bézier paths, text is often strokes, and dimensions and blocks are loose lines. The **AI** ribbon tab's **PDF** panel turns such a drawing back into editable CAD objects. Clear-cut cases are converted automatically on import; for the rest you pick an example or confirm what was found.

| Button | Command | What it does |
|---|---|---|
| Import PDF | `ipdf` | Imports a PDF page and rebuilds curves, blocks, line weights and linetypes |
| Calibrate Scale | `pdfscale` | Rescales the import to real-world size from one known distance |
| Recover Text | `pdftext` | Turns exploded text strokes back into text |
| Make Block | `pdfblock` | Turns repeated geometry back into a block |
| Recover Dims | `pdfdim` | Turns exploded dimensions back into dimension objects |

The commands need **Write** mode. A typical order is `ipdf` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim`.

## Import (`ipdf`)

1. Choose the PDF file.
2. For a multi-page file, enter the page number.
3. Specify the insertion point, or press Enter for the origin. Options:
   - **Scale**: a uniform factor applied on import.
   - **Mode**: how the page is imported.
     - **Recover** (default): tries to rebuild the original drawing, as described below.
     - **Visual**: keeps the PDF exactly as it looks. Every path becomes a line or a polyline (curves are flattened) and every text run its own text; nothing is merged, de-duplicated or turned into blocks. Use it when recovery changes how a page looks.

In **Recover** mode, the following is rebuilt automatically:

- **Curves**: Bézier circles, arcs and ellipses become circles, arcs and ellipses. Outlines mixing lines and arcs become polylines with arc segments. Arcs that the producer already broke into short lines are refitted. Free-form curves become splines.
- **Blocks**: content drawn several times from the same PDF form becomes one block (`PDF_FORM_n`) with a reference per copy, including rotated and mirrored ones.
- **Styles**: stroke widths become line weights, dashed lines get a `PDF_DASH_*` linetype, and text gets a `PDF_<font>` text style. Fragmented text runs of one line are joined.
- **Clean-up**: exact duplicate outlines are dropped.

Filled areas (coloured panels, filled logos and text outlines) import as solid hatches in their fill colour, drawn in the same order as on the page. Integrations can set the `fillHatches` option to `false` to import them as outlines only.

In both modes, text is stretched or squeezed to the width it had in the PDF, because the viewer usually draws it with a different font. Pictures (photos, logos, QR codes) are imported as raster images named `PDF_IMAGE_n.png`; their pixels stay in the open drawing only, because DWG and DXF reference images as separate files. Black-on-transparent pictures such as QR codes are placed on white, as on the PDF page.

## Calibrate scale (`pdfscale`)

PDFs are usually printed at a scale such as 1:50 or 1:100.

1. Select the objects to rescale.
2. Pick the two ends of a known distance, for example a dimensioned edge.
3. Type the real length.

If the selection contains exploded dimensions, the scale their texts imply is filled in for you; press Enter to accept it.

## Recover text (`pdftext`)

1. Select the area with the text. Frames and other large lines are ignored.
2. The strokes are grouped into lines, and each line is highlighted in turn. Type its text and confirm; leave it empty to skip the line, or press Esc to stop.
3. Every confirmed character shape is remembered. Lines made only of known shapes are converted without asking, so the more you type, the less you need to.

The remembered shapes are kept in the browser, so drawings that use the same font benefit too. When an AI model with image support is configured for the CAD Agent, each line comes with a suggested text.

## Make a block (`pdfblock`)

1. Select the objects of **one** copy of a repeated symbol.
2. Pick the block base point. The **Scale** option also matches copies of a different size.
3. Confirm the block name.
4. All other copies, including rotated and mirrored ones, are highlighted. Choose **Yes** to replace them all, **No** to make only your selection a block, or **Review** to decide copy by copy.

## Recover dimensions (`pdfdim`)

1. Select the area with the dimensions.
2. These are recognized:
   - **Linear**: any angle, arrows inside or outside, architectural ticks, and chained dimensions.
   - **Radius and diameter**: an arrow touching a circle, with an `R…` or `Ø…` text.
   - **Angular**: an arc with an arrow at each end.
3. Choose **Yes**, **No** or **Review**, as with blocks.

The dimensions use a `PDF_DIM` style whose text height and arrow size match the PDF. Its linear scale factor equals the drawing scale read from the texts, so a 1:100 drawing still shows its real values. Texts that differ from the measurement, or carry extra symbols, are kept as written.

::: tip
Run `pdfscale` first if you want the geometry at real size. `pdfdim` then finds a scale of 1:1.
:::
