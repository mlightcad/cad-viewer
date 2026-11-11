---
title: Converting PDF Drawings
---

# Converting PDF Drawings

PDF drawings keep only what was printed: curves are Bézier paths, text is often strokes, and dimensions and blocks are loose lines. The **AI** ribbon tab's **PDF** panel turns such a drawing back into editable CAD objects. Clear-cut cases are converted automatically on import; for the rest you pick an example or confirm what was found.

| Button | Command | What it does |
|---|---|---|
| Import PDF | `pdfimport` / `-pdfimport` | Imports a PDF page and rebuilds curves, blocks, line weights and linetypes |
| Calibrate Scale | `pdfscale` | Rescales the import to real-world size from one known distance |
| Recover Text | `pdftext` | Turns exploded text strokes back into text |
| Make Block | `pdfblock` | Turns repeated geometry back into a block |
| Recover Dims | `pdfdim` | Turns exploded dimensions back into dimension objects |

The commands need **Write** mode. A typical order is `pdfimport` → `pdfscale` → `pdftext` → `pdfblock` → `pdfdim`.

## Import (`pdfimport`)

1. Choose the PDF file. The **Import PDF** dialog opens.
2. In **Page to import**, pick the page (multi-page files only). The preview shows the page; the thumbnail button next to it lists every page. **Browse...** picks another file.
3. In **Location**, enter the insertion point X/Y (the origin by default), or tick **Specify insertion point on-screen** to pick it in the drawing after OK. **Scale** is a uniform factor applied on import.
4. In **Import mode**, choose how the page is imported:
   - **Recover drawing** (default): tries to rebuild the original drawing, as described below.
   - **Keep PDF appearance**: keeps the PDF exactly as it looks. Every path becomes a line or a polyline (curves are flattened) and every text run its own text; nothing is merged, de-duplicated or turned into blocks. Use it when recovery changes how a page looks.
5. Click **OK**. The dialog remembers the location, scale and mode for the next `pdfimport`.

`-pdfimport` imports without the dialog: after the file picker it asks for the page (multi-page files only), then the insertion point with **Scale** and **Mode** options on the command line. Enter accepts the origin.

In **Recover drawing** mode, the following is rebuilt automatically:

- **Curves**: Bézier circles, arcs and ellipses become circles, arcs and ellipses. Outlines mixing lines and arcs become polylines with arc segments. Arcs that the producer already broke into short lines are refitted. Free-form curves become splines.
- **Blocks**: content drawn several times from the same PDF form becomes one block (`PDF_FORM_n`) with a reference per copy, including rotated and mirrored ones.
- **Styles**: stroke widths become line weights, dashed lines get a `PDF_DASH_*` linetype, and text gets a `PDF_<font>` text style. Fragmented text runs of one line are joined.
- **Clean-up**: exact duplicate outlines are dropped.

Filled areas (coloured panels, filled logos and text outlines) import as solid hatches in their fill colour, drawn in the same order as on the page. Integrations can set the `fillHatches` option to `false` to import them as outlines only.

Pattern hatches (ANSI31, brick, cross-hatch, ...) reach a PDF as thousands of short lines. In **Recover drawing** mode they are rebuilt as hatch objects: the lines are matched against the standard `acadiso.pat` patterns, or a user-defined single or crossed pattern, with the scale, angle and origin they were drawn with. The boundary comes from a drawn closed outline, the PDF clip path or the line ends. A hatch is kept only when drawing it reproduces the lines on the page; anything else stays as lines. Integrations can set `recognizeHatches` to `false` to keep every line.

In both modes, text is stretched or squeezed to the width it had in the PDF, because the viewer usually draws it with a different font. Pictures (photos, logos, QR codes) are imported as raster images named `PDF_IMAGE_n.png`; their pixels stay in the open drawing only, because DWG and DXF reference images as separate files. Black-on-transparent pictures such as QR codes are placed on white, as on the PDF page.

## Calibrate scale (`pdfscale`)

PDFs are usually printed at a scale such as 1:50 or 1:100.

1. Select the objects to rescale.
2. Pick the two ends of a known distance, for example a dimensioned edge.
3. Type the real length.

If the selection contains exploded dimensions, the scale their texts imply is filled in for you; press Enter to accept it.

## Recover text (`pdftext`)

1. Select the area with the text. Frames and other large lines are ignored.
2. The strokes are grouped into lines. Each line is detected as **SHX** text (open line strokes) or **TrueType** text (closed outlines). Lines made only of character shapes you typed before are read right away.
3. When an AI model with image support is configured (`LLMSETTINGS`), all other lines are sent to it at once, in a few requests. If recognition fails, a message tells you why (for example an invalid API key).
4. The **Recover Text** panel opens in the palette, and the result is previewed in the drawing. You can pan and zoom while it is open.
   - For SHX text and for TrueType text separately, choose an existing **text style** or create a new one, and check the **font** and **big font** it uses. Replace them if they do not match the original; a warning tells you when a font is missing and what is drawn instead, or when changing the fonts of an existing style also changes the texts already using it. By default SHX text uses a `PDF_SHX` style (`txt` + `gbcbig`), so it keeps the look and size of SHX text.
   - Adjust the **height scale**, and fit the **width factor** to the original width or set it yourself.
   - The list shows every line with its text and where it came from (learned, OCR, edited or unread). Lines nothing could read come first. Click a line to frame it in the drawing, fix or type its text, and press Enter to go to the next unread line; typing one line also fills other lines that reuse its characters. Clear a line's check box to skip it, or switch a wrongly detected line between SHX and TrueType.
   - Characters that should be one text but came out as separate lines can be merged into one multiline text (MTEXT): select the lines with Ctrl+click or Shift+click and click **Merge into MText**, or click **Merge adjacent** to merge everything that stands next to each other on one baseline. Lines on different baselines become separate lines of the MTEXT, with the original line spacing. **Split** turns a merged text back into its lines.
   - **Hide original strokes** shows the preview alone.
5. Click **Apply** to convert. **Cancel**, or closing the palette, changes nothing.

Every character shape you type is remembered in the browser, so drawings that use the same font benefit too. Text read by the AI model is not remembered. The whole command is one undo step, and converted texts can be edited like any other text.

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
