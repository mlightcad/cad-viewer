# @mlightcad/cad-pdf-plugin

## 1.8.0-preview.6

### Minor Changes

- b9af87c: feat(cad-paddleocr-plugin): add lazy local PaddleOCR provider for exploded text

  Registers `paddleocr` in `AcApTextRecognitionService`. PDF import lists each
  _available_ OCR option under “Recognize exploded text”: local PaddleOCR and
  every configured vision-capable LLM **model** (e.g. `kkidc — model-id`), not
  a single provider row; long labels stay inside the dialog. The AI ribbon PDF
  “Recover Text” control is a dropdown so you can pick Auto or a specific model
  for `pdftext`. Unavailable options are omitted. Demos copy ONNX Runtime wasm
  to `vendor/onnxruntime/` and resolve that path against `document.baseURI` so
  PaddleOCR works with Vite `base: './'`. Wasm and ONNX models load only on
  first PaddleOCR use.

- 0ff8b62: feat(cad-pdf-plugin): recognize dimensions on PDF import

  `PDFIMPORT` in recover mode now turns exploded AutoCAD dimensions back into
  dimension entities on the `PDF_DIM` style. A new **Recognize dimensions**
  option in the Import PDF dialog controls it (`recognizeDimensions` in
  `AcApPdfImportOptions`; on by default in recover mode, off in visual mode).
  - Recognition is evidence-scored: terminators (closed / open arrows, ticks,
    dots), dimension and extension lines, value text, and agreement with the
    drawing scale. Conflicting hypotheses are resolved best-first in two rounds;
    the second uses the scale and sizes the confident ones agree on. Import uses
    a strict profile, `pdfdim` keeps the lenient review profile.
  - New kinds: aligned, arc length and ordinate dimensions, diameters with both
    arrows, and radius callouts placed outside the circle.
  - SHX stroke text is read beside each dimension line in that line's direction,
    which is fast on whole sheets and reads rotated values. Rounded (romans /
    isocp) digits, prefixes such as `Ø`, decimal points, and digits printed as
    filled outlines are read too.
  - Candidates carry `score` and `evidence`; the import stage is available as
    `acapPdfRecognizeImportDimensions`.

- 0dd562b: feat(ui): let plugins register ribbon, export menus, and palette tabs

  Plugin chrome (ribbon groups, File → Export rows, simple-UI toolbar buttons, and palette tabs) is declared by each plugin's `/register` module through `AcApUiRegistry`. The Vue editor and simple UI draw whatever is registered, so a package that is not installed contributes no buttons. `chtml` and `cpdf` open framework-free dialogs owned by the HTML and PDF plugins. `store.features` and the Vue export dialogs are removed. Headless hosts pass `dialog: false` so those commands stay prompts. See the upgrade guide.

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

- 4e7a21a: fix(cad-pdf-plugin): keep object lines under extension lines and recognize symbol-labelled dimensions on PDF import
  - An object edge that an extension line is drawn over (for example a tube
    wall under a Ø dimension) is no longer taken as the extension line. Such an
    edge is never erased, and the real (often short) extension line wins. Edges
    that stop short of the dimension line are no longer used either.
  - Extension lines drawn twice over each other by neighbouring dimensions are
    both replaced, so no copy is left behind.
  - Text placed beyond the extension lines keeps its position, and the run of
    dimension line out to it is replaced by the dimension (DIMTMOVE 0).
  - Dimensions labelled with a symbol instead of a value (`a`, `e mini`,
    `E maxi` in weld details), including spans shorter than their arrows, are
    recognized when both terminators, the dimension line and both extension
    lines are present. A text label becomes the dimension text; a label still
    drawn as strokes stays as drawn and the dimension text is suppressed. In
    `pdfdim`, typing a value for such a row replaces the label strokes.
  - A diameter with outside arrows also replaces the stub behind its far arrow.
  - Linear dimensions with outside arrows keep the dimension line drawn past
    the arrows: the dim block now draws those tails, which were erased with
    the source lines but never drawn again.

- 7b6bac6: fix(cad-pdf-plugin): size imported TrueType text to capital-A height and drop outline twins
  - PDF `fontSize` is the em square; CAD TrueType height is capital-A. Import now
    divides mesh text height by the face scale factor before fitting width, and
    recovered CJK outline text uses the same conversion so ideographs no longer
    draw ~15–40% too tall.
  - Many PDFs keep searchable text plus stroked/filled glyph paths. After native
    TEXT is created, import removes closed glyph-like outlines (and non-arrow
    hatches) whose mass sits in each text's baseline band — not open leaders or
    3–4 vertex arrowheads, so dimension recognition beside labels is preserved.
    Fill+stroke companion outlines are still dropped when a hatch becomes text.

- 43c3a93: Fix PDF import of labels drawn over white panels.
  - PDF import honours the clip around an image: a full picture clipped down to a detail (e.g. a QR code) now imports as that detail only, instead of the whole picture.
  - Overlapping solid hatches now draw in creation order, so a later fill covers an earlier one (a coloured drop on a white label panel) while every hatch stays under linework.
  - Black PDF text and linework painted on a white fill keep a fixed black colour instead of ACI 7, so they stay readable on a dark canvas.
  - Coloured fills that a different-coloured digit sits on (water-efficiency drops) are no longer removed as outlines of that digit.

- 7b6bac6: `pdftext` Auto no longer waits forever on a hung local OCR engine. Model CDN fetches time out, and unread lines still open in the review panel so the command can be used without PaddleOCR models cached.
- Updated dependencies [2ee892d]
- Updated dependencies [206a3d2]
- Updated dependencies [663c251]
- Updated dependencies [e4d1399]
- Updated dependencies [704af08]
- Updated dependencies [9a09628]
- Updated dependencies [b9af87c]
- Updated dependencies [0dd562b]
- Updated dependencies [0ff8b62]
- Updated dependencies [7b6bac6]
- Updated dependencies [43c3a93]
- Updated dependencies [0dd562b]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.6
  - @mlightcad/three-renderer@1.8.0-preview.6
  - @mlightcad/cad-pdf-core@1.8.0-preview.6
  - @mlightcad/pdf-renderer@1.8.0-preview.6

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies [ac569e8]
- Updated dependencies [aad8aed]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.5
  - @mlightcad/cad-pdf-core@1.8.0-preview.5
  - @mlightcad/pdf-renderer@1.8.0-preview.5
  - @mlightcad/three-renderer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- 2741958: PDF import is renamed to AutoCAD's commands: `ipdf` becomes **PDFIMPORT** and **-PDFIMPORT**. `PDFIMPORT` (the AI ribbon's Import PDF button, now item `cmd-pdfimport`) opens an Import PDF dialog after the file is picked, laid out like AutoCAD's: the file name with Browse, the page to import with a page preview or a thumbnail grid and the page size, the insertion point (X/Y, or "Specify insertion point on-screen" to pick it after OK), the scale and the import mode (Recover drawing / Keep PDF appearance). Location, scale and mode are remembered for the next import. The dialog lives in `@mlightcad/cad-pdf-plugin` (`AcUiPdfImportDialog`) and is framework-free. `-PDFIMPORT` (`AcApImportPdfPromptCmd`) keeps the former command-line prompts for page, insertion point, `Scale` and `Mode`. Strings move from `jig.ipdf` / `command.ACAD.ipdf` to `jig.pdfimport` / `command.ACAD.pdfimport` and `command.ACAD.-pdfimport`, in all locales.
- 529b935: PDF import Form block recovery:
  - `pdfimport` turns Form XObjects that are painted repeatedly with identical content into blocks with one reference per paint.

  Small circles far from the page origin are now recognized as circles; Float32 rounding used to leave them as two-arc polylines. `pdftext` pre-fills its default answers.

- 529b935: New `pdfdim` command turns exploded PDF dimensions back into dimension objects: linear (any angle, inside or outside arrows, architectural ticks, chained), radius and diameter. It infers the drawing scale from the dimension texts and creates a `PDF_DIM` style matching the PDF's text height and arrow size, with DIMLFAC set to that scale. A Recover Dims button joins the AI > PDF ribbon panel.
- 510b0dc: PDF import (`ipdf`) now rebuilds CAD curves instead of flattening them: Bézier circles, arcs and ellipses become `AcDbCircle` / `AcDbArc` / `AcDbEllipse`, mixed line–arc outlines become bulged polylines, free-form curves become exact splines, and arcs already flattened into short lines are refitted. `ipdf` now asks for the page, insertion point, scale and whether to recognize curves; stroke widths map to line weights and duplicate outlines are dropped. New `pdfscale` command calibrates imported geometry from a known distance.
- e4b1046: PDF conversion follow-ups:
  - `ipdf` gives dashed strokes `PDF_DASH_*` linetypes and imported text `PDF_<font family>` text styles. With the `fillHatches` option it turns filled areas into solid hatches, with holes from even-odd fills.
  - `pdfdim` also recognizes angular dimensions.
  - `pdfscale` pre-fills the real length from the scale that dimension texts in the selection imply.
  - `pdftext` remembers confirmed glyph shapes across sessions.
  - A new user guide page, "Converting PDF Drawings", is available in all seven languages.
- ec6b73d: feat(cad-pdf-plugin): add Recover / Visual import modes to `ipdf`

  `ipdf` now asks for a `Mode` instead of `Curves`:
  - **Recover** (default) rebuilds the source drawing as before: curves,
    duplicate removal, merged text runs, form blocks and text styles.
  - **Visual** keeps the PDF exactly as painted: every path becomes a line or a
    flattened polyline and every text run its own text, like `ipdf` did before
    curve recovery was added.

  The API gains `AcApPdfImportOptions.mode` (`'recover' | 'visual'`); it sets
  the defaults of the reconstruction options, and explicit options still win.

- 137e36e: feat(cad-pdf-plugin): recover pattern hatches on PDF import

  AutoCAD and other CAD programs write a pattern hatch to PDF as thousands of
  short strokes, so `ipdf` used to import ANSI31, brick or cross-hatch areas as
  loose lines. In `recover` mode the import now finds groups of regularly spaced
  strokes and rebuilds them as `AcDbHatch` entities. It matches the strokes
  against the `acadiso.pat` library, or makes a user-defined single or double
  hatch when no library pattern fits. It recovers the scale, angle and origin,
  and finds the boundary from a drawn closed outline, the PDF clip path, or the
  stroke ends. A hatch is kept only when re-drawing it reproduces the source
  strokes; anything else stays as lines. Turn it off with
  `recognizeHatches: false` or tune it with `hatchRecognition`.

- 3fefca4: feat(cad-pdf-plugin): fit imported text to its PDF width and import images
  - `ipdf` now stretches or squeezes each text to the width it had in the PDF.
    The viewer rarely has the PDF's font, and substitutes used to run long
    and overlap neighbouring content. Option `fitTextWidth` (default `true`).
  - PDF images (photos, logos, QR codes) are imported as `AcDbRasterImage`
    entities named `PDF_IMAGE_n.png`, with rotation and mirroring baked in.
    Black-on-transparent images such as QR codes are placed on white so they
    stay readable on a dark canvas. Option `images` (default `true`).
  - `AcApFontUtil.prepareTextMeasurement` / `measureTextWidth` and
    `acapMeasureTextWidth` measure single-line text the way the TEXT renderer
    lays it out.

- 242c8db: New `pdftext` command converts exploded PDF text (SHX line text, outlined fonts) back into text objects. It clusters strokes into lines, asks for each line's text, and learns glyph shapes so repeated text converts automatically. `ipdf` now merges text runs that continue one line. `AcApTextRecognitionService` lets hosts register OCR. The CAD Agent plugin registers a recognizer backed by the configured vision model, which pre-fills `pdftext` prompts.
- 1795cc0: `pdfdim` opens a palette review like `pdftext` / `pdfhatch`: edit recovered values, pick or create a dim style (with the shared dim-style preview), then Apply. Value text may still be exploded strokes (before `pdftext`) — digits and CAD symbols are read with a built-in grid template matcher (no LLM), and linear dimensions fall back to the measured length when strokes cannot be read. Recovered dimensions pin paper sizes via entity overrides so an existing style with a large DIMSCALE cannot hide extension lines or blow up the text. Also preserves inside/outside arrow direction and rejects stroke misreadings such as "111".
- 7f15f66: New `pdfhatch` command (AI tab → PDF → Recover Hatch) turns the loose strokes a PDF made of a pattern hatch back into a hatch object. Select the hatched area with the lines around it: regular strokes are matched against `acadiso.pat` (dot patterns such as ANSI36 included, even when the PDF dropped the dots), then user-defined single or crossed lines, and otherwise measured into a custom `PDF_HATCH` pattern (spacing, stagger and dashes). The boundary comes from closed outlines in the selection or from the faces the selected lines, arcs and polylines enclose, even when they cross, meet in T-junctions or run past the hatch; islands stay holes. The hatches are previewed in place of their strokes and converted all at once or one by one, and only objects a hatch redraws completely are erased.

  `acapPdfRecognizeHatches` gains the options behind it: `faceBoundaries`, `customPatterns`, `boundaries` (caller-supplied loops) and a `trace` callback. Library matching now ignores extra line families in a region (the line work around a hatch) and prefers the pattern that explains most of it, so ANSI32-style hatches next to their boundary lines are no longer split into ANSI31 pieces. `PdfRecognizedHatchPattern` has a new `custom` variant, which `acapPdfCreatePatternHatch` writes as a Custom hatch with explicit definition lines.

- f80a8c1: `PDFHATCH` (Recover Hatch) now reviews its results in a palette panel, like `PDFTEXT`, instead of Yes/No/Review prompts. The panel lists every recovered hatch with how well it re-draws its strokes; a hatch can be skipped, switched to another `acadiso.pat` or user-defined pattern, or given another scale and angle (each change is refitted to the strokes and scored, and only strokes the new hatch re-draws completely are replaced). **Add area** picks a point inside an area the recognition missed and fits the best pattern to the strokes there. The fitting is available to other code as `acapPdfFitHatch`, `acapPdfMatchHatch` and `acapPdfBoundaryAt`.
- 7f15f66: PDFIMPORT now finds hatch boundaries among the faces of the surrounding line work (lines, arcs and polylines that cross, meet in T-junctions or run past the hatch), so about twice as many pattern hatches come back as hatch objects on a typical architectural page. Face boundary finding is several times faster: the planar arrangement is built once per region and shared by its pattern hypotheses, and its spatial indexes use numeric cells. `faceBoundaries` in `acapPdfRecognizeHatches` now defaults to `true`; pass `false` to keep only closed outlines, clip paths and stroke ends as boundary sources. `acapPdfFaceArrangement` and `acapPdfFaceBoundaryIn` split `acapPdfFaceBoundary` for callers that test several hit sets against the same line work.
- ed40d25: `pdftext` (Recover Text) now opens a review panel in the palette instead of asking for unread lines one by one on the command line. Per font kind (SHX line text / TrueType outline text) you choose an existing text style or create one, see which font and big font it uses and replace them, adjust the height scale and the width factor (auto-fit to the original width or manual), and fix or type the text of every line. The result is previewed in the drawing, which stays pannable and zoomable; Apply converts in one undo step, Cancel or closing the palette changes nothing.

  Each line is detected as SHX or TrueType text from its strokes, and SHX text now stays SHX text by default (a `PDF_SHX` style with `txt` + `gbcbig`). Before, every recovered line used the current style, which in the default setup draws in `simsun`, so recovered SHX text changed look and its CJK characters grew noticeably.

  New `AcApPaletteService` in `@mlightcad/cad-simple-viewer` lets commands show non-modal panels in the host palette: the tool palette in `cad-editor`, the dock panel in `cad-simple-ui-plugin`, or a built-in docked panel otherwise. `acapZoomToVisible` (frame a box in the canvas area a palette does not cover) is now exported too.

  Characters recovered as separate lines can be merged into one MTEXT in the panel: select lines with Ctrl/Shift+click and **Merge into MText**, or **Merge adjacent** to merge everything that stands next to each other on one baseline. Lines on different baselines become paragraphs with the measured line spacing; width auto-fit applies per paragraph (`\W`). **Split** undoes a merge.

- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.
- 68d4365: feat(llm): share one AI model configuration between the CAD Agent and PDF OCR

  The LLM provider settings move from `@mlightcad/cad-agent-plugin` into the new
  `@mlightcad/cad-llm-plugin`, which adds the `llmsettings` command and a
  framework-free settings dialog (model in use, built-in and custom providers,
  model catalogs). `@mlightcad/cad-simple-viewer` adds `AcApLlmSettingsService`
  so features can open the dialog or check whether a vision model is configured
  without depending on the plugin. `pdftext` now hints once per session when no
  image-capable model is configured, and OCR falls back to the first
  image-capable configured model when the model in use is text-only.
  `@mlightcad/cad-editor` registers the plugin when installed and adds an
  AI → Model Settings ribbon button. The agent panel's gear button opens the
  shared dialog. Saved settings carry over unchanged. See the upgrade guide for
  host migration.

- f6048ff: Add Smart Blocks: Search and Convert (AutoCAD 2026 `BSEARCH`). Select one instance; every identical copy in model space is found (rotated, mirrored and optionally scaled copies, optionally existing block references and copies whose text differs) and highlighted. Review the instances in a toolbar over the canvas, include or exclude them, then convert the selection and the included instances into a new block (text variations become attributes) or an existing block definition, in one undo step. `-BSEARCH` offers the same workflow at the command line; `BCONVERT` is an alias. The ribbon gets a Search and Convert button on the Insert and AI tabs.

  Shape matching lives in `@mlightcad/cad-simple-viewer` (`acedFindShapeMatches`, `acedEntityToShapeFeature`) and handles single-shape templates under rotation and mirroring, heavy 2D/3D polylines with bulges, 2D solids, traces, points and hatches, with per-kind spatial grids for large drawings. The old `@mlightcad/cad-pdf-plugin` matching exports remain as deprecated aliases.

### Patch Changes

- 47c83c2: Fix Hangul PDF text and frozen-viewport layer plotting

  Embed Hangul-capable TrueType faces without pdf-lib subsetting so Korean
  glyphs stay visible in Acrobat, and keep plotting model content through
  viewports whose border layer is Off/Frozen (AutoCAD frame-hide workflow).

- d7787ad: PDF export no longer drops hatch pattern lines whose offset points to the right of the line direction. AR-CONC and AR-SAND, and any mirrored hatch, lost about half their line families on export (`tessellateHatchPattern` counted no lines when the spacing was negative).

  Hatch recognition (`pdfimport` and `pdfhatch`):
  - **AR-CONC style patterns:** recognized even though their dot-only lines leave no strokes in the PDF, and their lines are placed one by one when no single translation fits all of them.
  - **Patterns spread over several rooms:** split into patches when the whole is too large to bound.
  - **Touching hatches of one pattern:** kept apart. Their strokes stop on the shared edge instead of crossing it, while axis lines drawn across one hatch still keep it whole.
  - **Face boundaries:** large faces holding only stray strokes are no longer pulled into a boundary.

- d66d654: Fix PDF vector import contrast remapping (ACI 7 / foreground), Form XObject placement, fill path closing, and drop unpainted leftover paths.
- a3cba74: `ipdf` now keeps filled PDF areas filled: coloured panels, filled logos and text outlines import as solid hatches in their fill colour and paint order (`fillHatches` now defaults to `true`). Small filled circles and closed two-vertex rounded shapes are filled too. `pdfdim` also recognizes filled arrowheads imported as solid hatches, and imported hatches are no longer marked associative.
- 885bc1a: Import PDF keeps geometry nested inside a hidden optional-content group on that hidden layer. A frozen INSERT exported to PDF (for example a block on a frozen layer whose children sit on other layers) no longer reappears on the children's visible layers after import.
- ec6b73d: fix(cad-pdf-plugin): stop PDF import from losing text and dark linework
  - PDF import now passes CMap and standard-font locations to PDF.js. Before,
    text in CID fonts (Chinese, Japanese, Korean, …) imported as empty runs and
    disappeared. They default to the jsDelivr copy of the bundled `pdfjs-dist`
    version; hosts can serve their own copies with
    `acapPdfSetImportResourceUrls()`.
  - `Td` / `TD` / `T*` text moves are now scaled by the text matrix, so lines of
    a paragraph no longer collapse onto each other.
  - "Rich black" ink such as `#2c2e35` is mapped to ACI 7 like pure black, so
    it no longer renders almost invisible on a dark canvas.

- 1795cc0: Make Recover Text / Recover Dimensions style sections collapsible, fix the dim-style SVG preview when switching styles, and assign the selected (or newly created) dim style on preview and Apply instead of always writing `PDF_DIM`.
- efe8963: fix(cad-pdf-plugin): recover dimensions drawn without arrowheads or ticks

  PDFDIM (Recover Dims) only paired arrowheads or architectural ticks, so a
  dimension line ending on its extension lines with no terminators was reported
  as "no dimensions". Such dimensions are now recognized when both extension
  lines run past the dimension line and a numeric value text sits beside it. The
  `PDF_DIM` style uses `_NONE` arrows when most recovered linear dimensions had
  no terminators, so they keep their original look.

- 90e5d82: `pdfhatch` and PDF import now recover ANSI35 and other patterns whose lines
  sit evenly inside the pattern repeat (a solid and a dashed line half a repeat
  apart). Their strokes repeat at a shorter spacing than the pattern's line
  spacing, so these patterns were never tried.
- 833c202: fix(pdfimport): import large PDF pages without freezing the browser

  PDFIMPORT on dense pages (hundreds of thousands of paths) froze the tab and
  threw "Maximum call stack size exceeded". The imported entities are now
  committed in chunks of 5000, still as one undo record, and the view's convert
  queue no longer spreads the whole batch into `push(...)`.

- 84f82ff: `pdftext` (Recover Texts) now recognizes all lines at once: lines are read from the glyph dictionary, every other line goes to the AI model in a few batch requests (up to 20 line images each), and the whole selection is converted in one step without per-line confirmation. Only lines nothing could read are still prompted. When text recognition fails (invalid API key, network, quota, unexpected answer), the reason is shown instead of being silently ignored.

  `AcApTextRecognitionService` gains `recognizeBatch()` and an `onError` option on `recognize()` / `recognizeBatch()`; recognizers can implement the optional `recognizeBatch` method.

  Erasing many entities at once is much faster: `AcApEntityService.eraseEntities` removes them from each block in one pass instead of scanning the block per entity, and the view removes them in bulk (`AcTrBatchedGroup.removeEntities`, `AcTrScene.removeEntities`), compacting each geometry batch once instead of once per entity. Converting about 6000 PDF text strokes in a 93,000-entity drawing went from over 40 seconds of frozen UI to about half a second.

- 84f82ff: `pdftext` (Recover Texts) now works on PDFs that store text as many tiny separate line segments. The text height is estimated from strokes chained end to end instead of single segments, so such text is no longer split into hundreds of one-glyph fragments. Long strokes of a title taller than the body text are kept with their line instead of being left behind, while underlines and frames are still skipped.
- 05b2041: Fix three issues found when recovering text with `pdftext`:
  - **Hide original strokes did nothing the first time.** Hiding an entity collapses its batch slot, but only set `needsUpdate`. While a batch attribute still had update ranges recorded by earlier appends, three.js uploaded just those ranges, so the change stayed on the CPU until a later full upload (the second toggle). The draw-visibility strategies now record the range they change.
  - **Merged MTEXT moved down.** The viewer anchors MTEXT on its drawn glyphs, so a top-left anchor at the cap height pushed text whose glyphs are shorter than the cap height (e.g. CJK) down. Merged text is now attached bottom-left at the ink bottom of its last line, like a TEXT at its baseline.
  - **Merged MTEXT lost the gaps between characters.** Letter-spaced text such as "剪 力 墙 身 表" or "标 高" is now merged with the number of spaces that keeps each character at its original place (measured in the chosen fonts), also between CJK characters.

  `AcApFontUtil.measureTextWidth` now matches the renderer (`@mlightcad/mtext-renderer` 0.13.9): each glyph is sized with the scale of the font that supplies it, so a CJK cell of `txt.shx` + `gbcbig.shx` measures one text height (it measured 4/3), and a space advances by the style font's space glyph at the text height. This also fixes width auto-fit of recovered and imported CJK text.

- 4bbb670: `pdftext` (Recover Texts) on tables: grid lines that the PDF splits into short segments are no longer taken for text strokes, so table cells are no longer glued into tall blocks read as vertical text, one glyph per line. The text direction of each phrase is now chosen by glyph spacing (tight along the baseline), which also handles widely spaced titles and narrow table columns; short ambiguous phrases such as `Q1` follow the rest of the drawing.

  AI text recognition requests now time out after 120 seconds, so a provider that never answers no longer leaves the command loading forever; the timeout is reported like other recognition errors.

- Updated dependencies [c987f64]
- Updated dependencies [9c6be36]
- Updated dependencies [2632f9e]
- Updated dependencies [03ff81b]
- Updated dependencies [2018b40]
- Updated dependencies [279f460]
- Updated dependencies [228004a]
- Updated dependencies [aa2a7f7]
- Updated dependencies [1477693]
- Updated dependencies [2632f9e]
- Updated dependencies [c3dcfa2]
- Updated dependencies [76a6673]
- Updated dependencies [b340dd6]
- Updated dependencies [f599e38]
- Updated dependencies [2a75363]
- Updated dependencies [0b7c923]
- Updated dependencies [0acd637]
- Updated dependencies [8bfe54b]
- Updated dependencies [cafbb8f]
- Updated dependencies [4252a9d]
- Updated dependencies [2741958]
- Updated dependencies [a1a707b]
- Updated dependencies [1784dd4]
- Updated dependencies [1cf426f]
- Updated dependencies [c2cc263]
- Updated dependencies [17e4920]
- Updated dependencies [b340dd6]
- Updated dependencies [b340dd6]
- Updated dependencies [eb0f5e8]
- Updated dependencies [47c83c2]
- Updated dependencies [529b935]
- Updated dependencies [529b935]
- Updated dependencies [47c83c2]
- Updated dependencies [d7787ad]
- Updated dependencies [510b0dc]
- Updated dependencies [e4b1046]
- Updated dependencies [ec6b73d]
- Updated dependencies [3fefca4]
- Updated dependencies [242c8db]
- Updated dependencies [1795cc0]
- Updated dependencies [7f15f66]
- Updated dependencies [f80a8c1]
- Updated dependencies [833c202]
- Updated dependencies [84f82ff]
- Updated dependencies [05b2041]
- Updated dependencies [ed40d25]
- Updated dependencies
- Updated dependencies [ee7d5da]
- Updated dependencies [17e4920]
- Updated dependencies [b340dd6]
- Updated dependencies [b4306a7]
- Updated dependencies [68d4365]
- Updated dependencies [f6048ff]
- Updated dependencies [6d80103]
- Updated dependencies [ac1f322]
- Updated dependencies [69825da]
  - @mlightcad/cad-simple-viewer@1.8.0-preview.4
  - @mlightcad/three-renderer@1.8.0-preview.4
  - @mlightcad/cad-pdf-core@1.8.0-preview.4
  - @mlightcad/pdf-renderer@1.8.0-preview.4

## 1.8.0-preview.3

### Patch Changes

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies [5926492]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.3
  - @mlightcad/cad-pdf-core@1.8.0-preview.3
  - @mlightcad/pdf-renderer@1.8.0-preview.3
  - @mlightcad/three-renderer@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies [aeaed4c]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.2
  - @mlightcad/cad-pdf-core@1.8.0-preview.2
  - @mlightcad/cad-simple-viewer@1.8.0-preview.2
  - @mlightcad/pdf-renderer@1.8.0-preview.2

## 1.8.0-preview.1

### Patch Changes

- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [a6b5042]
- Updated dependencies [7399150]
- Updated dependencies
- Updated dependencies [66328f6]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.1
  - @mlightcad/three-renderer@1.8.0-preview.1
  - @mlightcad/pdf-renderer@1.8.0-preview.1
  - @mlightcad/cad-pdf-core@1.8.0-preview.1

## 1.8.0-preview.0

### Minor Changes

- c525fa8: feat: headless PDF exporter and a monochrome PDF color mode

  PDF export logic moved into the new `@mlightcad/cad-pdf-core` package (option
  model, glyph provider, database → PDF pipeline), which does not depend on
  `cad-simple-viewer` or the DOM. `@mlightcad/cad-pdf-plugin` now builds on it,
  and the new `@mlightcad/cad-pdf-exporter` uses it to export DXF/DWG to PDF in
  Node without a browser (`exportFileToPdf`, `convertDatabaseToPdf`), mirroring
  `cad-html-core` / `cad-html-exporter`.

  PDF export gains a `colorMode` option: `color` (default, unchanged output) or
  `monochrome` — white paper with black linework and text, and solid/gradient
  fills in grey by luminance so linework on top of them stays readable.
  Wipeouts still mask in white. The option is available in the `cpdf` dialog,
  as a new last `-cpdf` prompt (`Color` / `Monochrome`, default `Color`), in
  `pdf-renderer` (`AcPdfExportOptions.colorMode`) and in the exporter
  (`--color-mode`). The CLI ships `export-pdf-monochrome.scr` and
  `batch-export-pdf.mjs`; existing `-cpdf` scripts should add a `Color` or empty
  line after the text-mode answer.

- feat: renames `@mlightcad/cad-viewer` to `@mlightcad/cad-editor`, adds headless PDF export with monochrome mode plus script savePdf/saveHtml APIs, and ships richer entity snapshots for drawing analysis. Agent settings move to a multi-provider model catalog with collapsible tool-call groups. Canvas typing starts commands with Space to confirm or repeat, and coordinate entry matches AutoCAD syntax. Public HTML/PDF core exports use AcExHtml/AcExPdf prefixes; hatch, wipeout, and PDF-export hangs are fixed

## 1.7.8

### Patch Changes

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.
- Updated dependencies [05fdcf3]
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8
  - @mlightcad/cad-simple-viewer@1.7.8
  - @mlightcad/pdf-renderer@1.7.8

## 1.7.8-preview.6

### Patch Changes

- fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.
- Updated dependencies [42351f3]
- Updated dependencies [57c330c]
- Updated dependencies
  - @mlightcad/three-renderer@1.7.8-preview.6
  - @mlightcad/cad-simple-viewer@1.7.8-preview.6
  - @mlightcad/pdf-renderer@1.7.8-preview.6

## 1.7.8-preview.5

### Patch Changes

- 1020d4d: fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.
- Updated dependencies [1020d4d]
  - @mlightcad/cad-simple-viewer@1.7.8-preview.5
  - @mlightcad/pdf-renderer@1.7.8-preview.5
  - @mlightcad/three-renderer@1.7.8-preview.5

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.4
  - @mlightcad/pdf-renderer@1.7.8-preview.4
  - @mlightcad/three-renderer@1.7.8-preview.4

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.3
  - @mlightcad/pdf-renderer@1.7.8-preview.3
  - @mlightcad/three-renderer@1.7.8-preview.3

## 1.7.8-preview.2

### Patch Changes

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies [8a2d140]
- Updated dependencies [07ef40e]
- Updated dependencies [07ef40e]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.2
  - @mlightcad/pdf-renderer@1.7.8-preview.2
  - @mlightcad/three-renderer@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.1
  - @mlightcad/pdf-renderer@1.7.8-preview.1
  - @mlightcad/three-renderer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.0
  - @mlightcad/pdf-renderer@1.7.8-preview.0
  - @mlightcad/three-renderer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7
  - @mlightcad/pdf-renderer@1.7.7
  - @mlightcad/three-renderer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7-preview.1
  - @mlightcad/pdf-renderer@1.7.7-preview.1
  - @mlightcad/three-renderer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.7-preview.0
  - @mlightcad/pdf-renderer@1.7.7-preview.0
  - @mlightcad/three-renderer@1.7.7-preview.0

## 1.7.6

### Patch Changes

- feat: ships whole-drawing FIND with one-click navigation, Quick Select by entity handle, and paper-space fixes for osnap, properties, VPLAYER-frozen layers, and annotative MTEXT viewport scales. INSERT rendering shares block geometry, hatch islands and pattern lines stay correct, and HTML export adds base85 snapshots plus optional gzip chunks. Also fixes shared-geometry reading-mode tint, viewer teardown, and linear-time MTEXT parsing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6
  - @mlightcad/pdf-renderer@1.7.6
  - @mlightcad/three-renderer@1.7.6

## 1.7.6-preview.0

### Patch Changes

- feat: ships whole-drawing FIND search across all layouts with one-click navigation and an explicit current-layout-only mode in both the Vue and simple-UI shells. Paper-space viewports now hide VPLAYER-frozen layers, INSERT rendering shares block geometry and defers spatial indexes for faster opens, and headless export skips duplicate converts on a headless GPU. Plus mobile-bridge and DWG/DXF foundations, hatch pattern transform and mtext \pxq fixes, and Changesets pre mode for npm preview prereleases
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.6-preview.0
  - @mlightcad/pdf-renderer@1.7.6-preview.0
  - @mlightcad/three-renderer@1.7.6-preview.0

## 1.7.5

### Patch Changes

- feat: adds OneDrive and Google Drive data-source plugins, upgrades the data model, and falls back when the linetype shader is broken. Speeds headless HTML export open and package builds, fixes SVG INSERT cloning and finite-extents framing, and stops dual font parse plus worker-pool fan-out during open. Also hides landing-page viewer chrome, defaults MSAL redirect to the current path, isolates the file-open theme, and swallows missed-font worker rejections.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.5
  - @mlightcad/pdf-renderer@1.7.5
  - @mlightcad/three-renderer@1.7.5

## 1.7.4

### Patch Changes

- feat: adds a radius measure tool and async smart extents with cache and busy overlay, and maps PDF optional content groups to CAD layers. Fixes cover wipeout paint order, drawable scene extents, stalled font open overlays, PDF MText colours and INSERT labels, inline ACI-7 MText, selection glow scaling, Fit-to-screen measure badges, multi-attribute edit, and a font CDN notice
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.4
  - @mlightcad/pdf-renderer@1.7.4
  - @mlightcad/three-renderer@1.7.4

## 1.7.3

### Patch Changes

- feat: brings smart extents and AutoCAD saved-view zoom to live viewer toolbars, and cuts open-time stalls by speeding INSERT indexing and font regeneration. Fallback fonts preload before the first glyph bake so text no longer flashes with missing glyphs, and docs link the proprietary DWG converter install guide to the wiki
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.3
  - @mlightcad/pdf-renderer@1.7.3
  - @mlightcad/three-renderer@1.7.3

## 1.7.2

### Patch Changes

- feat: draws complex TEXT and SHAPE linetypes as strokes and glyphs, renders closed wide polylines as offset rings, and adds HTML export smart extents plus AutoCAD saved-view zoom. The CLI gains a self-hosted base URL and open-view, no-plot, and circle-sides options. Dynamic blocks and arc-aligned text come with the data-model upgrade. Drawing open is faster with font preload and lighter line batches, and fixes cover raster and OLE textures, PDF PDMODE, and progressive open.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.2
  - @mlightcad/pdf-renderer@1.7.2
  - @mlightcad/three-renderer@1.7.2

## 1.7.1

### Patch Changes

- feat: adds a native AcGi PDF renderer with direct vector export and lower-memory text modes, plus HTML export that embeds progressive ACEX chunks, multi-file ZIP packages, and leaner multi-layout switching. Shared toolbar and notification engines land across viewers, with reading mode, mobile session accessories, and parallel package downloads. Fixes cover font sync, hatch shaders, mirrored INSERTs, OLE2Frame embeds, selection, and PDSIZE/highlight/dashed-line rendering
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.1
  - @mlightcad/pdf-renderer@1.7.1
  - @mlightcad/three-renderer@1.7.1

## 1.7.0

### Minor Changes

- feat: expands mobile and touch review with responsive phone/pad toolbars, a long-press snap loupe, confirmed pick marks, and a command session panel with live metrics. Measurement gains continuous distance, a results list palette, endpoint grips with osnap, unit conversion, and zoom-scaled hairline overlays. HTML export adds multi-file ACEX packages, paper-space background choice, and lazy font catalogs, plus reading mode and a VitePress multi-language docs site

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.0
  - @mlightcad/cad-svg-plugin@1.7.0

## 1.6.3

### Patch Changes

- feat: ships a CAD diff viewer with MDI document sessions, COMPARE sysvar support, revision-cloud grouping, and polished compare display with shared toolbar icons and a locale picker. Design Review gains callouts attached to shape markups and a reordered review toolbar. HTML export can require expiry and a password. Arabic locale is complete, UI-component locales sync with the CAD viewer, and toolbar SVGs are consolidated with a unified clear icon
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.3
  - @mlightcad/cad-svg-plugin@1.6.3

## 1.6.2

### Patch Changes

- feat: adds an in-browser DWG/DXF to offline HTML converter, HTML export of paper-space viewports with layout switching, and a drawing layout switcher in the simple-ui toolbar. Object snap gains AutoCAD-style center ticks and intersection snaps. Overlay toolbars keep style controls while markup or measure is selected, restore named ACI colors, and restore undo for deleted entities. Arc-length measure locks onto circles, and hatch fills stay below linework in HTML export.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.2
  - @mlightcad/cad-svg-plugin@1.6.2

## 1.6.1

### Patch Changes

- feat: extends Design Review markup and measurement to the HTML viewer with sidecar persistence, aligned review icons, and HTML-only measure overlays that avoid forcing WebGL redraws. Also preserves absolute hatch colours when only lineweight is ByLayer, and documents GitMCP servers in the README and Cursor config
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.1
  - @mlightcad/cad-svg-plugin@1.6.1

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.6.0
  - @mlightcad/cad-svg-plugin@1.6.0

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.11
  - @mlightcad/cad-svg-plugin@1.5.11

## 1.5.10

### Patch Changes

- feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.10
  - @mlightcad/cad-svg-plugin@1.5.10

## 1.5.9

### Patch Changes

- feat: this release adds Czech localization, an Attribute Definition dialog, and an About dialog; improves XREF overlays, XATTACH defaults, and INSERT Off/Freeze layer behavior; ships a faster DXF pipeline with compacted block templates; expands offline HTML locales (Czech, Turkish); and documents the proprietary DWG converter plus Read the Docs API publishing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.9
  - @mlightcad/cad-svg-plugin@1.5.9

## 1.5.8

### Patch Changes

- feat: expanded the CAD Viewer with Blocks, Layer Manager, Attribute Editor, Count, Memory, and Missing Resources palettes, plus -INSERT support, Xref overlays, overlay drawing support, and numerous rendering, interaction, and workflow improvements
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.8
  - @mlightcad/cad-svg-plugin@1.5.8

## 1.5.7

### Patch Changes

- feat: added file open dialog, web worker readiness, collapsible toolbar UI, layer/entity refactors, undo/redo, GPU batch previews, and synchronization fixes
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.7
  - @mlightcad/cad-svg-plugin@1.5.7

## 1.5.6

### Patch Changes

- feat: major update featuring grip point editing, proxy entity support, enhanced HTML export, AutoCAD-style command input, improved large-drawing rendering, SHAPE and dimension support, mobile usability enhancements, and extensive performance, rendering, and stability improvements
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.6
  - @mlightcad/cad-svg-plugin@1.5.6

## 1.5.5

### Patch Changes

- chore: add version sync check and update deps
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.5
  - @mlightcad/cad-svg-plugin@1.5.5

## 1.5.4

### Patch Changes

- feat: Text Style dialog, SHAPE rendering, batch visibility/HIDEOBJECTS, and font fallback/CDN; fix zoom-fit bounds, PNG export frustum, paper-space viewport detection, and dev startup deps; add demo links to README
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.4
  - @mlightcad/cad-svg-plugin@1.5.4

## 1.5.3

### Patch Changes

- chore(deps): reclassify package dependencies and pin lodash-es via pnpm overrides
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.3
  - @mlightcad/cad-svg-plugin@1.5.3

## 1.5.2

### Patch Changes

- feat: HTML/SVG export plugins, offline viewer enhancements, and ortho/polar tracking
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.2
  - @mlightcad/cad-svg-plugin@1.5.2
