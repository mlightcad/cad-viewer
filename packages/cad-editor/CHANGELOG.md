# @mlightcad/cad-viewer

## 1.8.0-preview.6

### Minor Changes

- 2ee892d: `BDETECT` opens on a ready panel with detection options (rotation, mirror, scale, same layer, text variations, min. instances, min. savings, max. objects) and a Detect button; searching starts only when Detect is clicked, and Detect again re-runs with the current options. Each option has an explanation: hover or click the mark beside its label. Stop returns to the ready state instead of ending the command. The detection default for `minInstances` is now `2` (was `3`).
- 663c251: The Properties palette now edits entities in Write mode. Each value can be changed in place and the change is applied as one undoable "Properties" edit. Editing works for one entity, for one entity picked from a multi-selection, and for the properties shared by the whole selection. Layer, linetype, lineweight, transparency and color use dropdowns. Array items such as polyline vertices are edited one at a time, and the palette refreshes after undo, redo and commands. Entities on locked layers stay read-only. Adds `AcApEntityService.setEntityProperty`.
- 0dd562b: feat(ui): let plugins register ribbon, export menus, and palette tabs

  Plugin chrome (ribbon groups, File → Export rows, simple-UI toolbar buttons, and palette tabs) is declared by each plugin's `/register` module through `AcApUiRegistry`. The Vue editor and simple UI draw whatever is registered, so a package that is not installed contributes no buttons. `chtml` and `cpdf` open framework-free dialogs owned by the HTML and PDF plugins. `store.features` and the Vue export dialogs are removed. Headless hosts pass `dialog: false` so those commands stay prompts. See the upgrade guide.

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

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

- 0dd562b: fix(ui): open the palette tab chosen from the overflow menu

  Choosing a palette tab from the overflow menu now makes that tab active and keeps it visible, including when it was already the active tab. The Find field uses the same 12px type as the other palette inputs.

- 51b65c5: Bump `@mlightcad/ui-components` to 0.1.14 and drop the local overflow-tab patch. Bridge `AcApLocale` into ui-components packs (`en`/`zh`/`tr`/`cs`/`ar`, with `ja`/`ko` falling back to English), and keep Blocks palette source labels reading top-to-bottom with `text-orientation: sideways`.
- Updated dependencies [64ca714]
- Updated dependencies [8279755]
- Updated dependencies [64ca714]
- Updated dependencies [2ee892d]
- Updated dependencies [206a3d2]
- Updated dependencies [663c251]
- Updated dependencies [e4d1399]
- Updated dependencies [704af08]
- Updated dependencies [9a09628]
- Updated dependencies [67b0897]
- Updated dependencies [b9af87c]
- Updated dependencies [0dd562b]
- Updated dependencies [4e7a21a]
- Updated dependencies [0ff8b62]
- Updated dependencies [7b6bac6]
- Updated dependencies [43c3a93]
- Updated dependencies [7b6bac6]
- Updated dependencies [0dd562b]
- Updated dependencies [0617037]
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.8.0-preview.6
  - @mlightcad/cad-llm-plugin@1.8.0-preview.6
  - @mlightcad/cad-script-core@1.8.0-preview.6
  - @mlightcad/cad-agent-core@1.8.0-preview.6
  - @mlightcad/cad-script-plugin@1.8.0-preview.6
  - @mlightcad/cad-simple-viewer@1.8.0-preview.6
  - @mlightcad/three-renderer@1.8.0-preview.6
  - @mlightcad/cad-html-plugin@1.8.0-preview.6
  - @mlightcad/cad-paddleocr-plugin@1.8.0-preview.6
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.6
  - @mlightcad/cad-svg-plugin@1.8.0-preview.6
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.6
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.6
  - @mlightcad/cad-pdf-core@1.8.0-preview.6
  - @mlightcad/cad-svg-converter@1.8.0-preview.6
  - @mlightcad/pdf-renderer@1.8.0-preview.6

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies [ac569e8]
- Updated dependencies [aad8aed]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.5
  - @mlightcad/cad-agent-core@1.8.0-preview.5
  - @mlightcad/cad-agent-plugin@1.8.0-preview.5
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.5
  - @mlightcad/cad-html-plugin@1.8.0-preview.5
  - @mlightcad/cad-llm-plugin@1.8.0-preview.5
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.5
  - @mlightcad/cad-pdf-core@1.8.0-preview.5
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.5
  - @mlightcad/cad-script-core@1.8.0-preview.5
  - @mlightcad/cad-script-plugin@1.8.0-preview.5
  - @mlightcad/cad-svg-converter@1.8.0-preview.5
  - @mlightcad/cad-svg-plugin@1.8.0-preview.5
  - @mlightcad/pdf-renderer@1.8.0-preview.5
  - @mlightcad/three-renderer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

- c987f64: Absorb `@mlightcad/cad-simple-ui-plugin` into `@mlightcad/cad-simple-viewer`.
  - Built-in plain-DOM toolbar + dock palettes enable by default via `AcApDocManagerOptions.simpleUi` (opt out with `simpleUi: false`). Chrome loads lazily through a dynamic import when enabled.
  - `cad-editor` reuses the shared DOM find / design-review / measurements palettes; the Vue layer manager remains editor-only.
  - Remove the separate `@mlightcad/cad-simple-ui-plugin` package and the `@mlightcad/cad-simple-viewer/simple-ui` / `/find` subpaths; import types and helpers from `@mlightcad/cad-simple-viewer` and pass toolbar/dock options through `simpleUi`.
  - Read chrome via `simpleUi` / `simpleUiReady` (replaces `simpleUiPlugin` and `pluginManager.getPlugin('SimpleUiPlugin')`).

- 9c6be36: Add AutoCAD-compatible groups: GROUP / -GROUP / UNGROUP / GROUPEDIT / CLASSICGROUP, PICKSTYLE group selection, GROUPDISPLAYMODE grips, Object Grouping dialog, and a Home → Groups ribbon panel.
- 2632f9e: Add AutoCAD clipboard commands: `COPYCLIP` (Ctrl+C), `CUTCLIP` (Ctrl+X), `COPYBASE` (Ctrl+Shift+C), `PASTECLIP` (Ctrl+V), `PASTEORIG` and `PASTEBLOCK` (Ctrl+Shift+V). Copying writes the objects and every layer, linetype, style and block they use into a temporary drawing; pasting creates what the target drawing lacks and keeps its own definitions for names it already has, as AutoCAD does. The clipboard is shared by every open drawing and is also written to the system clipboard, so objects can be pasted into this app in another browser tab. The Home ribbon tab has a new Clipboard panel, and the simple UI toolbar has Copy, Cut and Paste buttons. The clipboard is available to other code as `AcApDocManager.instance.clipboard`.
- f599e38: Add an `exportEmptyLayouts` option (default `false`) to HTML and PDF export. Empty paper-space layouts that only contain AutoCAD's default `*Paper_Space` viewport are skipped unless the option is enabled; model space is always kept. Dialogs, `-chtml`/`-cpdf`, script `cad.file.saveHtml`/`savePdf`, and the CLI exporters expose the toggle.
- 2741958: PDF import is renamed to AutoCAD's commands: `ipdf` becomes **PDFIMPORT** and **-PDFIMPORT**. `PDFIMPORT` (the AI ribbon's Import PDF button, now item `cmd-pdfimport`) opens an Import PDF dialog after the file is picked, laid out like AutoCAD's: the file name with Browse, the page to import with a page preview or a thumbnail grid and the page size, the insertion point (X/Y, or "Specify insertion point on-screen" to pick it after OK), the scale and the import mode (Recover drawing / Keep PDF appearance). Location, scale and mode are remembered for the next import. The dialog lives in `@mlightcad/cad-pdf-plugin` (`AcUiPdfImportDialog`) and is framework-free. `-PDFIMPORT` (`AcApImportPdfPromptCmd`) keeps the former command-line prompts for page, insertion point, `Scale` and `Mode`. Strings move from `jig.ipdf` / `command.ACAD.ipdf` to `jig.pdfimport` / `command.ACAD.pdfimport` and `command.ACAD.-pdfimport`, in all locales.
- 1784dd4: feat: add LEADER, MLEADER, and MLEADEREDIT with Annotation ribbon dropdown

  Interactive AutoCAD-style leader / multileader creation and edit commands
  with live jig preview. Home → Annotation gains a Multileader dropdown
  (create / add leader / remove leader); Dim Style moves to row 3.

- f39393b: Add the Multileader Style Manager and Modify Multileader Style dialogs (MLEADERSTYLE / MLS), with AutoCAD-style Format, Structure, and Content tabs and a style preview that uses the current canvas background.
- eb0f5e8: feat: named views and AutoCAD-style View ribbon tab

  Add `VIEW` / `NEWVIEW` / `viewrestore` with View Manager and New View dialogs,
  layer-snapshot XDATA on `viewTable` records, and a View ribbon tab (Navigate +
  Named Views) wired to pan/zoom and named-view restore.

- 529b935: PDF import Form block recovery:
  - `pdfimport` turns Form XObjects that are painted repeatedly with identical content into blocks with one reference per paint.

  Small circles far from the page origin are now recognized as circles; Float32 rounding used to leave them as two-arc polylines. `pdftext` pre-fills its default answers.

- 529b935: New `pdfdim` command turns exploded PDF dimensions back into dimension objects: linear (any angle, inside or outside arrows, architectural ticks, chained), radius and diameter. It infers the drawing scale from the dimension texts and creates a `PDF_DIM` style matching the PDF's text height and arrow size, with DIMLFAC set to that scale. A Recover Dims button joins the AI > PDF ribbon panel.
- 7f15f66: New `pdfhatch` command (AI tab → PDF → Recover Hatch) turns the loose strokes a PDF made of a pattern hatch back into a hatch object. Select the hatched area with the lines around it: regular strokes are matched against `acadiso.pat` (dot patterns such as ANSI36 included, even when the PDF dropped the dots), then user-defined single or crossed lines, and otherwise measured into a custom `PDF_HATCH` pattern (spacing, stagger and dashes). The boundary comes from closed outlines in the selection or from the faces the selected lines, arcs and polylines enclose, even when they cross, meet in T-junctions or run past the hatch; islands stay holes. The hatches are previewed in place of their strokes and converted all at once or one by one, and only objects a hatch redraws completely are erased.

  `acapPdfRecognizeHatches` gains the options behind it: `faceBoundaries`, `customPatterns`, `boundaries` (caller-supplied loops) and a `trace` callback. Library matching now ignores extra line families in a region (the line work around a hatch) and prefers the pattern that explains most of it, so ANSI32-style hatches next to their boundary lines are no longer split into ANSI31 pieces. `PdfRecognizedHatchPattern` has a new `custom` variant, which `acapPdfCreatePatternHatch` writes as a Custom hatch with explicit definition lines.

- ed40d25: `pdftext` (Recover Text) now opens a review panel in the palette instead of asking for unread lines one by one on the command line. Per font kind (SHX line text / TrueType outline text) you choose an existing text style or create one, see which font and big font it uses and replace them, adjust the height scale and the width factor (auto-fit to the original width or manual), and fix or type the text of every line. The result is previewed in the drawing, which stays pannable and zoomable; Apply converts in one undo step, Cancel or closing the palette changes nothing.

  Each line is detected as SHX or TrueType text from its strokes, and SHX text now stays SHX text by default (a `PDF_SHX` style with `txt` + `gbcbig`). Before, every recovered line used the current style, which in the default setup draws in `simsun`, so recovered SHX text changed look and its CJK characters grew noticeably.

  New `AcApPaletteService` in `@mlightcad/cad-simple-viewer` lets commands show non-modal panels in the host palette: the tool palette in `cad-editor`, the dock panel in `cad-simple-ui-plugin`, or a built-in docked panel otherwise. `acapZoomToVisible` (frame a box in the canvas area a palette does not cover) is now exported too.

  Characters recovered as separate lines can be merged into one MTEXT in the panel: select lines with Ctrl/Shift+click and **Merge into MText**, or **Merge adjacent** to merge everything that stands next to each other on one baseline. Lines on different baselines become paragraphs with the measured line spacing; width auto-fit applies per paragraph (`\W`). **Split** undoes a merge.

- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.
- e0738a9: New **AI** ribbon tab. Its **Agent** panel now holds the CAD Agent button, which moves out of Home > Utilities. Its **PDF** panel holds Import PDF (`ipdf`), Calibrate Scale (`pdfscale`) and Recover Text (`pdftext`).
- b340dd6: Add the AutoCAD-style `SCALE` command (alias `SC`). The Home ribbon tab's Modify panel shows a Scale button where the Copy button used to be; Copy remains available from the Clipboard panel.
  - Select objects, specify a base point, then type or drag the scale factor (dragging uses the cursor distance from the base point).
  - `Copy` keeps the originals and scales copies; `Reference` derives the factor from a reference length (typed or two points) and a new length (typed, dragged, or `Points`).
  - The last scale factor, reference length and new length are offered as defaults, like AutoCAD.
  - `AcApEntityService.scaleEntities()` scales entities uniformly around a base point.

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

- 6d80103: Add Smart Blocks: Detect and Convert (`BDETECT`). Without a selection, the editor finds groups of repeated objects anywhere in the drawing and lists them in a Detection tab of the tool palette, with thumbnails, editable block names and progress while it searches. Click a group to highlight its instances, review one with the Search and Convert toolbar, or convert the checked groups into new blocks at once; texts that differ between instances become attributes, and the whole run undoes in one step. The ribbon gets a Detect and Convert button on the Insert and AI tabs.

  `@mlightcad/cad-simple-viewer` adds the underlying API: `acapDetectSmartBlocks`, `acapDetectSmartBlocksAsync` (time-sliced, with progress and cancellation) and `acapConvertSmartBlockCluster`. Unlike AutoCAD's cloud model, detection is local and geometric and finds any repeated group. Searches over an unchanged drawing can share an `AcApSmartBlockCandidatePool` and the new `AcEdShapeMatchOptions.gridCache`; the matcher now picks its first anchor by kind and size rarity, which makes searches in line-heavy drawings faster.

- ac1f322: Add `@mlightcad/cad-svg-converter` so File → Open can load `.svg` as editable CAD entities (basic vector subset). `cad-simple-viewer` routes the `svg` converter key and accepts `.svg` in open UI; `cad-editor` registers the converter in `initializeCadViewer`.
- 69825da: Add AutoCAD-compatible UCS and UCSMAN: active UCS transforms, UCS icon overlay, Named UCSs / Settings dialog (no Orthographic tab), and View → Coordinates ribbon controls.

### Patch Changes

- e2aea74: `BSEARCH` (Smart Blocks: Search and Convert) now reviews its results in a Search and Convert tab of the tool palette, like Detect and Convert and Recover Text, instead of a toolbar over the canvas. The tab shows a preview of the selected objects, the search options and a list of every found instance with what sets it apart (rotation, mirroring, scale, its texts): click a row to zoom to it and use its check box to include or exclude it. Closing the palette cancels the command. Reviewing a group from Detect and Convert uses the same tab and returns to the detection list afterwards. The unreleased `MlBSearchReviewBar` component is removed.

  Ribbon: the AI tab's agent button is now labelled "Agent", and the Model Settings, Search and Convert, Detect and Convert, Find and Count icons use the theme's icon color like Quick Select and the agent. Find has a new icon that shows it searches text.

- 279f460: `BSEARCH`: selected texts no longer take part in the geometry match. Like AutoCAD, copies are found by their geometry and each selected text picks up the text sitting at the same place in the copy, so labels whose insertion point moves with the string (axis bubbles "1" / "10" / "B" imported from PDF) are found and become attributes. Text variations (`TEXTTOATTRIBUTE`) are now on by default, as in AutoCAD; turn them off to accept only identical text. `AcEdShapeMatchOptions` gains an `accept` callback that lets symmetric shapes try their other transforms.

  When existing block references are converted into a new block with attributes, each reference now keeps its own attribute values and placement instead of getting the source text's value at the source position.

- 1477693: Show a busy overlay during clipboard copy, cut and paste so large selections do not freeze the UI without feedback. `AcApClipboard.set` now awaits system-clipboard DXF serialization so the overlay stays up for the whole blocking write. Also use the custom undo/redo SVG icons in the ribbon header instead of Element Plus refresh icons.
- c3dcfa2: Complete the UI translations for every supported language. Japanese and Korean were mostly English (ribbon, menus, dialogs, properties, command prompts, plugins, and the exported HTML viewer); Turkish, Czech and Arabic were missing the dimension/multileader style dialogs, view and UCS managers, and many command prompts. All of these now show in the selected language instead of falling back to English.
- cafbb8f: fix: keep frozen INSERT geometry exportable and toggleable like AutoCAD

  Freeze still hides the whole reference, but HTML/PDF export now converts and
  reparents nested fragments so frozen layers can start invisible and be toggled
  back on. Off INSERT layers keep converting nested on-layer geometry. Layer
  manager freeze/lock icons use AutoCAD-like blue/yellow colors.

- cafbb8f: feat(ribbon): give Import PDF a dedicated icon

  Replace the generic upload glyph with a PDF page plus import-arrow icon so the
  AI tab button reads as both PDF and import.

- 1795cc0: `pdfdim` opens a palette review like `pdftext` / `pdfhatch`: edit recovered values, pick or create a dim style (with the shared dim-style preview), then Apply. Value text may still be exploded strokes (before `pdftext`) — digits and CAD symbols are read with a built-in grid template matcher (no LLM), and linear dimensions fall back to the measured length when strokes cannot be read. Recovered dimensions pin paper sizes via entity overrides so an existing style with a large DIMSCALE cannot hide extension lines or blow up the text. Also preserves inside/outside arrow direction and rejects stroke misreadings such as "111".
- ee7d5da: Remove the redundant bottom-left axes gizmo and keep the UCS icon Y axis upright while a drawing is still opening.
- 17e4920: feat(ribbon): redesign AI tab icons

  The Recognize Text, Recognize Dimensions and Recognize Hatch buttons now share
  a scan-viewfinder frame around the recognized object, Create Block shows loose
  geometry being converted into a block with a base point, and the Agent button
  uses a robot icon instead of a chat bubble.

- 17e4920: fix(ribbon): unify icon line weights

  Ribbon and toolbar icons now share one line weight: 1/16 of the icon size
  (1.25 in 20-unit and 1.5 in 24-unit viewBoxes), matching Element Plus icons —
  about 1.6px on large ribbon buttons and 1px on small ones. Thin filled-outline
  glyphs (draw, modify, layer, text) were thickened; heavy dimension, leader,
  markup, and measure strokes were thinned. The attribute definition icon is now
  an outline to match edit attribute, and the elliptical arc icon no longer draws
  a doubled outline.

- Updated dependencies [c987f64]
- Updated dependencies [9c6be36]
- Updated dependencies [2632f9e]
- Updated dependencies [03ff81b]
- Updated dependencies [2018b40]
- Updated dependencies [279f460]
- Updated dependencies [228004a]
- Updated dependencies [75c44d2]
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
- Updated dependencies [d66d654]
- Updated dependencies [510b0dc]
- Updated dependencies [a3cba74]
- Updated dependencies [e4b1046]
- Updated dependencies [885bc1a]
- Updated dependencies [ec6b73d]
- Updated dependencies [ec6b73d]
- Updated dependencies [137e36e]
- Updated dependencies [3fefca4]
- Updated dependencies [1795cc0]
- Updated dependencies [242c8db]
- Updated dependencies [efe8963]
- Updated dependencies [1795cc0]
- Updated dependencies [90e5d82]
- Updated dependencies [7f15f66]
- Updated dependencies [f80a8c1]
- Updated dependencies [7f15f66]
- Updated dependencies [833c202]
- Updated dependencies [84f82ff]
- Updated dependencies [84f82ff]
- Updated dependencies [05b2041]
- Updated dependencies [ed40d25]
- Updated dependencies [4bbb670]
- Updated dependencies
- Updated dependencies [ee7d5da]
- Updated dependencies [17e4920]
- Updated dependencies [b340dd6]
- Updated dependencies [b8fbeac]
- Updated dependencies [75c44d2]
- Updated dependencies [b4306a7]
- Updated dependencies [68d4365]
- Updated dependencies [f6048ff]
- Updated dependencies [6d80103]
- Updated dependencies [ac1f322]
- Updated dependencies [69825da]
  - @mlightcad/cad-simple-viewer@1.8.0-preview.4
  - @mlightcad/three-renderer@1.8.0-preview.4
  - @mlightcad/cad-script-core@1.8.0-preview.4
  - @mlightcad/cad-agent-core@1.8.0-preview.4
  - @mlightcad/cad-script-plugin@1.8.0-preview.4
  - @mlightcad/cad-agent-plugin@1.8.0-preview.4
  - @mlightcad/cad-html-plugin@1.8.0-preview.4
  - @mlightcad/cad-pdf-core@1.8.0-preview.4
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.4
  - @mlightcad/pdf-renderer@1.8.0-preview.4
  - @mlightcad/cad-llm-plugin@1.8.0-preview.4
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.4
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.4
  - @mlightcad/cad-svg-converter@1.8.0-preview.4
  - @mlightcad/cad-svg-plugin@1.8.0-preview.4

## 1.8.0-preview.3

### Patch Changes

- dd031f0: feat(agent): add suggested-task prompts in the agent palette toolbar

  Add a toolbar icon that opens categorized common CAD tasks (extract,
  stats, modify, create, review). Choosing a task inserts its prompt into
  the chat composer for editing before send. Also bridge the landing
  `AcApI18n` locale onto the full-viewer singleton so agent UI strings
  follow the host language selector.

- feat: adds drawDim\* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
- Updated dependencies [5e6c08e]
- Updated dependencies [9667011]
- Updated dependencies [dd031f0]
- Updated dependencies [5926492]
- Updated dependencies
- Updated dependencies [ab2447c]
  - @mlightcad/cad-agent-plugin@1.8.0-preview.3
  - @mlightcad/cad-script-core@1.8.0-preview.3
  - @mlightcad/cad-script-plugin@1.8.0-preview.3
  - @mlightcad/cad-simple-viewer@1.8.0-preview.3
  - @mlightcad/cad-agent-core@1.8.0-preview.3
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.3
  - @mlightcad/cad-html-plugin@1.8.0-preview.3
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.3
  - @mlightcad/cad-pdf-core@1.8.0-preview.3
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.3
  - @mlightcad/cad-svg-plugin@1.8.0-preview.3
  - @mlightcad/pdf-renderer@1.8.0-preview.3
  - @mlightcad/three-renderer@1.8.0-preview.3

## 1.8.0-preview.2

### Patch Changes

- fix: keeps MTEXT background masks under their glyphs after INSERT compact by preserving original child order in the group compactor, and loads OrbitControls via an explicit .js import so ESM resolution does not break. Also upgrades mtext-renderer to 0.13.8 and mtext-input-box to 0.3.8
- Updated dependencies [aeaed4c]
- Updated dependencies
  - @mlightcad/three-renderer@1.8.0-preview.2
  - @mlightcad/cad-agent-core@1.8.0-preview.2
  - @mlightcad/cad-agent-plugin@1.8.0-preview.2
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.2
  - @mlightcad/cad-html-plugin@1.8.0-preview.2
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.2
  - @mlightcad/cad-pdf-core@1.8.0-preview.2
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.2
  - @mlightcad/cad-script-core@1.8.0-preview.2
  - @mlightcad/cad-script-plugin@1.8.0-preview.2
  - @mlightcad/cad-simple-viewer@1.8.0-preview.2
  - @mlightcad/cad-svg-plugin@1.8.0-preview.2
  - @mlightcad/pdf-renderer@1.8.0-preview.2

## 1.8.0-preview.1

### Patch Changes

- a6b5042: Add `@mlightcad/cad-simple-viewer/file-open-panel` so landing pages can load the file picker and data-source registry without pulling `AcApDocManager` / three-renderer. Demo apps lazy-load the full viewer after a drawing is chosen; `@mlightcad/cad-editor/locale` exposes i18n without mounting `MlCadViewer`.
- feat: adds a lightweight `@mlightcad/cad-simple-viewer/file-open-panel` landing entry so demos can pick a drawing before loading the full viewer, and fuzzy layer-name search in the simple UI layer panel. PDF and HTML export now respect Off, Frozen, and no-plot layers; HTML keeps OLE/IMAGE layer toggles working after geometry release and skips baking selection overlays into the offline scene
- Updated dependencies [a6b5042]
- Updated dependencies [7399150]
- Updated dependencies
- Updated dependencies [66328f6]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.1
  - @mlightcad/cad-html-plugin@1.8.0-preview.1
  - @mlightcad/three-renderer@1.8.0-preview.1
  - @mlightcad/pdf-renderer@1.8.0-preview.1
  - @mlightcad/cad-agent-core@1.8.0-preview.1
  - @mlightcad/cad-agent-plugin@1.8.0-preview.1
  - @mlightcad/cad-google-drive-plugin@1.8.0-preview.1
  - @mlightcad/cad-onedrive-plugin@1.8.0-preview.1
  - @mlightcad/cad-pdf-core@1.8.0-preview.1
  - @mlightcad/cad-pdf-plugin@1.8.0-preview.1
  - @mlightcad/cad-script-core@1.8.0-preview.1
  - @mlightcad/cad-script-plugin@1.8.0-preview.1
  - @mlightcad/cad-svg-plugin@1.8.0-preview.1

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
- 19c1add: feat: renames the `@mlightcad/cad-viewer` package to `@mlightcad/cad-editor`

  The Vue 3 UI package is now published as `@mlightcad/cad-editor`, matching its
  folder under `packages/`. Consumers must update imports
  (`import { MlCadViewer } from '@mlightcad/cad-editor'`), the dependency name in
  `package.json`, and version-pinned CDN paths, which now point at
  `dist/cad-editor.js` / `dist/cad-editor.css`. The repository itself is still
  named `cad-viewer`. `@mlightcad/cad-viewer` stays at 1.7.x and receives no
  further releases.

### Patch Changes

- c571cbc: fix: declare peer dependencies as compatible ranges instead of exact versions

  Peer dependencies were pinned with `workspace:*`, which Changesets treats as the
  exact current version. Any package taking a minor bump therefore fell outside
  those peers and was escalated to a major, and the fixed group then dragged every
  other package up with it — a routine `pnpm changeset version` could only ever
  produce a patch or the next major.

  Peers now use `workspace:^`, so a minor release of a peer stays inside the
  declared range and dependents keep the minor bump. Combined with
  `onlyUpdatePeerDependentsWhenOutOfRange`, a major is still forced when a peer
  actually leaves the range.

> Renamed to `@mlightcad/cad-editor` in 1.8.0. This file keeps the old heading
> for the 1.7.x entries below; see the 1.8.0 entry for the migration.

## 1.7.8

### Patch Changes

- feat: adds dimension drawing commands with an annotation scale selector, rebuilds the Dimension Style Manager with AutoCAD-style tabs, and moves the ribbon dimension tools into the Annotation dropdown. Adds a script-first MCP server with headed/idle session control and `cad.file.saveDxf`, and splits the script runtime into `@mlightcad/cad-script-core`. Fixes repeated redo and redone-entity rendering, box selection through paper-space viewports, offline HTML layout framing, coordinate-bubble drift, embedded raster images, ACI-7 block colours on layer 0, and large-coordinate glyph precision.
- Updated dependencies [d2f9e04]
- Updated dependencies [05fdcf3]
- Updated dependencies
- Updated dependencies [d2f9e04]
  - @mlightcad/cad-agent-plugin@1.7.8
  - @mlightcad/cad-script-core@1.7.8
  - @mlightcad/three-renderer@1.7.8
  - @mlightcad/cad-agent-core@1.7.8
  - @mlightcad/cad-google-drive-plugin@1.7.8
  - @mlightcad/cad-html-plugin@1.7.8
  - @mlightcad/cad-onedrive-plugin@1.7.8
  - @mlightcad/cad-pdf-plugin@1.7.8
  - @mlightcad/cad-script-plugin@1.7.8
  - @mlightcad/cad-simple-viewer@1.7.8
  - @mlightcad/cad-svg-plugin@1.7.8
  - @mlightcad/pdf-renderer@1.7.8

## 1.7.8-preview.6

### Patch Changes

- 42351f3: fix: keep explicit ACI-7 block colours on layer 0 instead of inheriting the INSERT layer

  A block entity authored on layer `0` with an explicit ACI-7 (foreground) colour
  was rebound to the INSERT layer's colour, so a title frame that AutoCAD draws
  white rendered red on a red INSERT layer.

  The two cases were indistinguishable: `AcGiSubEntityTraits.color` is stored
  pre-resolved, so ByLayer content on an ACI-7 layer also arrives as an absolute
  ACI 7. `data-model` now records the original provenance on the traits
  (`isColorByLayer`), and `three-renderer` uses it to set `isByLayerColor`
  truthfully. `AcTrInheritedLayerMaterialMapper` can then decide directly: a
  ByLayer colour inherits the INSERT layer, an explicit colour does not.

  Missing bindings (`isByLayerColor == null`, from conversion paths that drop the
  flag) are still inferred from the remaining ByLayer markers, so the earlier
  fixes for ByLayer legend headers (#602) and lost-flag DXF conversions keep
  working.

  The material cache key now includes that provenance. A ByLayer colour on an
  ACI-7 layer and an explicit ACI-7 resolve to the same symbolic colour, so they
  previously shared one cache entry and the first creator's `isByLayerColor`
  leaked to every later user. Which one won depended on draw order, so the same
  title frame could inherit the INSERT colour, and inherited ByLayer content could
  fall back to black on model-space (dark) backgrounds. Traits without provenance
  keep the historical key.

- 57c330c: fix: box-select model entities through paper-space viewports

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

- fix: box selection in paper-space viewports now reaches model entities, offline HTML exports frame every layout with its own export-time extents, and the coordinate bubble stays anchored to its point while zooming. Explicit ACI-7 block colours on layer 0 keep their colour instead of inheriting the INSERT layer, and the layer-material cache no longer leaks ByLayer provenance between entities.
- Updated dependencies [4e7ed11]
- Updated dependencies [9220b20]
- Updated dependencies [42351f3]
- Updated dependencies [57c330c]
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.7.8-preview.6
  - @mlightcad/three-renderer@1.7.8-preview.6
  - @mlightcad/cad-simple-viewer@1.7.8-preview.6
  - @mlightcad/cad-agent-core@1.7.8-preview.6
  - @mlightcad/cad-agent-plugin@1.7.8-preview.6
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.6
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.6
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.6
  - @mlightcad/cad-script-plugin@1.7.8-preview.6
  - @mlightcad/cad-svg-plugin@1.7.8-preview.6
  - @mlightcad/pdf-renderer@1.7.8-preview.6

## 1.7.8-preview.5

### Patch Changes

- 1020d4d: fix: leader entities now expose their properties in the properties palette with localized labels, and TrueType text glyphs are parented to the layout that owns them, so model-space text no longer disappears inside paper-space viewports or headless HTML exports. Dependencies move to data-model 1.15.19 and libredwg-converter 3.15.19.
- Updated dependencies [1020d4d]
  - @mlightcad/cad-agent-core@1.7.8-preview.5
  - @mlightcad/cad-agent-plugin@1.7.8-preview.5
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.5
  - @mlightcad/cad-html-plugin@1.7.8-preview.5
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.5
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.5
  - @mlightcad/cad-script-plugin@1.7.8-preview.5
  - @mlightcad/cad-simple-viewer@1.7.8-preview.5
  - @mlightcad/cad-svg-plugin@1.7.8-preview.5
  - @mlightcad/pdf-renderer@1.7.8-preview.5
  - @mlightcad/three-renderer@1.7.8-preview.5

## 1.7.8-preview.4

### Patch Changes

- fix: headless HTML export now embeds raster and OLE images. Node has no canvas, so IMAGE and OLE textures were omitted from offline HTML. The exporter decodes PNG, JPEG, and BMP and writes those pixels back into the snapshot as PNG, so pictures in paper drawings survive a headless export.
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.4
  - @mlightcad/cad-agent-plugin@1.7.8-preview.4
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.4
  - @mlightcad/cad-html-plugin@1.7.8-preview.4
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.4
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.4
  - @mlightcad/cad-script-plugin@1.7.8-preview.4
  - @mlightcad/cad-simple-viewer@1.7.8-preview.4
  - @mlightcad/cad-svg-plugin@1.7.8-preview.4
  - @mlightcad/pdf-renderer@1.7.8-preview.4
  - @mlightcad/three-renderer@1.7.8-preview.4

## 1.7.8-preview.3

### Patch Changes

- fix: HTML export now includes instanced block geometry from a hidden model layout, so paper viewports keep walls, fills, and borders. ACI color 7 is remapped onto the selected canvas background, and gradient hatch endpoints flip when the offline viewer changes that background. This preview also upgrades realdwg-web to 1.15.18.
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.3
  - @mlightcad/cad-agent-plugin@1.7.8-preview.3
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.3
  - @mlightcad/cad-html-plugin@1.7.8-preview.3
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.3
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.3
  - @mlightcad/cad-script-plugin@1.7.8-preview.3
  - @mlightcad/cad-simple-viewer@1.7.8-preview.3
  - @mlightcad/cad-svg-plugin@1.7.8-preview.3
  - @mlightcad/pdf-renderer@1.7.8-preview.3
  - @mlightcad/three-renderer@1.7.8-preview.3

## 1.7.8-preview.2

### Patch Changes

- 8a2d140: feat: rebuild Dimension Style Manager tabs after AutoCAD

  Replace the plain field grids with AutoCAD-style layouts for Lines,
  Symbols and Arrows, Text, Fit, Primary Units, Alternate Units, and
  Tolerances. The Text tab adds text style ("..." opens Text Style),
  text/fill color, height, fraction height scale, draw text frame,
  position, view direction, and alignment. The live SVG preview now
  honors text background fills (DIMTFILL/DIMTFILLCLR), the text frame
  (negative DIMGAP), right-to-left text (DIMTXTDIRECTION), and outside
  alignment (DIMTOH). Requires the new `@mlightcad/data-model` DIMSTYLE
  fields (1.15.16+).

- 07ef40e: fix: allow multiple consecutive redo steps

  `AcDbUndoStack` re-pushed the redone record through `push()`, which also
  clears the redo stack. As a result the second redo step was lost: after
  creating two shapes, undoing twice and redoing once, the redo button
  became disabled and the second shape could not be restored.

  Redo now re-pushes through a dedicated `pushUndo()` that keeps the
  remaining redo entries, while `push()` still drops them when a new edit
  is made. Requires `@mlightcad/data-model` 1.15.17+.

- 07ef40e: fix: restore entities after undo then redo

  `AcTrView2d.batchConvert` claims an object id before committing its geometry
  and keeps that claim for as long as the entity stays in the scene. Undo erases
  the entity from the database, which calls `AcTrView2d.removeEntity`; that
  dropped the scene drawable but left the convert claim behind. The redo pass then
  hit the "already scheduled" skip in `batchConvert`, so a redone line or circle
  never reappeared in the view even though the database and the undo/redo stack
  were correct.

  `removeEntity` now releases the claim and bumps the per-id convert generation,
  so the redone entity converts again while an in-flight convert or deferred glyph
  commit for the erased id can no longer re-add geometry.

- feat: adds dimension drawing commands and annotation scale UI, rebuilds the Dimension Style Manager tabs to follow AutoCAD layouts for lines, symbols, text, fit, units, and tolerances, and moves the ribbon dimension commands into the Annotation panel dropdown. Undo/redo is fixed so repeated redo steps work and redone entities reappear, and the proprietary parser document now describes pricing as a one-time payment with an annual license fee.
- Updated dependencies [8a2d140]
- Updated dependencies [07ef40e]
- Updated dependencies [07ef40e]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.7.8-preview.2
  - @mlightcad/cad-agent-core@1.7.8-preview.2
  - @mlightcad/cad-agent-plugin@1.7.8-preview.2
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.2
  - @mlightcad/cad-html-plugin@1.7.8-preview.2
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.2
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.2
  - @mlightcad/cad-script-plugin@1.7.8-preview.2
  - @mlightcad/cad-svg-plugin@1.7.8-preview.2
  - @mlightcad/pdf-renderer@1.7.8-preview.2
  - @mlightcad/three-renderer@1.7.8-preview.2

## 1.7.8-preview.1

### Patch Changes

- fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.1
  - @mlightcad/cad-agent-plugin@1.7.8-preview.1
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.1
  - @mlightcad/cad-html-plugin@1.7.8-preview.1
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.1
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.1
  - @mlightcad/cad-script-plugin@1.7.8-preview.1
  - @mlightcad/cad-simple-viewer@1.7.8-preview.1
  - @mlightcad/cad-svg-plugin@1.7.8-preview.1
  - @mlightcad/pdf-renderer@1.7.8-preview.1
  - @mlightcad/three-renderer@1.7.8-preview.1

## 1.7.8-preview.0

### Patch Changes

- feat: adds a script-first cad-mcp-server for third-party agents, batches TrueType mesh glyphs with harder MTEXT editing, keeps INSERT block TEXT when PDF glyphs settle late, and updates the demo gallery landing page plus plugin documentation
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.8-preview.0
  - @mlightcad/cad-agent-plugin@1.7.8-preview.0
  - @mlightcad/cad-google-drive-plugin@1.7.8-preview.0
  - @mlightcad/cad-html-plugin@1.7.8-preview.0
  - @mlightcad/cad-onedrive-plugin@1.7.8-preview.0
  - @mlightcad/cad-pdf-plugin@1.7.8-preview.0
  - @mlightcad/cad-script-plugin@1.7.8-preview.0
  - @mlightcad/cad-simple-viewer@1.7.8-preview.0
  - @mlightcad/cad-svg-plugin@1.7.8-preview.0
  - @mlightcad/pdf-renderer@1.7.8-preview.0
  - @mlightcad/three-renderer@1.7.8-preview.0

## 1.7.7

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, agent tool streaming, and MTEXT ribbon hangs in production. Externalizes data-model in the HTML exporter Node build, pins @mlightcad packages to exact releases, and upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7
  - @mlightcad/cad-agent-plugin@1.7.7
  - @mlightcad/cad-google-drive-plugin@1.7.7
  - @mlightcad/cad-html-plugin@1.7.7
  - @mlightcad/cad-onedrive-plugin@1.7.7
  - @mlightcad/cad-pdf-plugin@1.7.7
  - @mlightcad/cad-script-plugin@1.7.7
  - @mlightcad/cad-simple-viewer@1.7.7
  - @mlightcad/cad-svg-plugin@1.7.7
  - @mlightcad/pdf-renderer@1.7.7
  - @mlightcad/three-renderer@1.7.7

## 1.7.7-preview.1

### Patch Changes

- fix: stops the MTEXT ribbon from hanging in production builds and externalizes data-model in the HTML exporter Node build so Node consumers resolve correctly. Pins @mlightcad package versions to exact releases for reproducible installs, and adds a development guide for contributors
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7-preview.1
  - @mlightcad/cad-agent-plugin@1.7.7-preview.1
  - @mlightcad/cad-google-drive-plugin@1.7.7-preview.1
  - @mlightcad/cad-html-plugin@1.7.7-preview.1
  - @mlightcad/cad-onedrive-plugin@1.7.7-preview.1
  - @mlightcad/cad-pdf-plugin@1.7.7-preview.1
  - @mlightcad/cad-script-plugin@1.7.7-preview.1
  - @mlightcad/cad-simple-viewer@1.7.7-preview.1
  - @mlightcad/cad-svg-plugin@1.7.7-preview.1
  - @mlightcad/pdf-renderer@1.7.7-preview.1
  - @mlightcad/three-renderer@1.7.7-preview.1

## 1.7.7-preview.0

### Patch Changes

- feat: adds Node HTML export with thumbnails and complex linetype SVG previews, plus a script-first CAD agent with measure APIs, searchable built-in scripts, and a Vue-free script console. Fixes layout framing via openViewMode, locked-layer edits, INSERT highlight/pan stability, and agent tool streaming. Also upgrades data-model/libredwg-converter and three.js rendering deps
- Updated dependencies
  - @mlightcad/cad-agent-core@1.7.7-preview.0
  - @mlightcad/cad-agent-plugin@1.7.7-preview.0
  - @mlightcad/cad-google-drive-plugin@1.7.7-preview.0
  - @mlightcad/cad-html-plugin@1.7.7-preview.0
  - @mlightcad/cad-onedrive-plugin@1.7.7-preview.0
  - @mlightcad/cad-pdf-plugin@1.7.7-preview.0
  - @mlightcad/cad-script-plugin@1.7.7-preview.0
  - @mlightcad/cad-simple-viewer@1.7.7-preview.0
  - @mlightcad/cad-svg-plugin@1.7.7-preview.0
  - @mlightcad/pdf-renderer@1.7.7-preview.0
  - @mlightcad/three-renderer@1.7.7-preview.0

## 1.7.6

### Patch Changes

- feat: ships whole-drawing FIND with one-click navigation, Quick Select by entity handle, and paper-space fixes for osnap, properties, VPLAYER-frozen layers, and annotative MTEXT viewport scales. INSERT rendering shares block geometry, hatch islands and pattern lines stay correct, and HTML export adds base85 snapshots plus optional gzip chunks. Also fixes shared-geometry reading-mode tint, viewer teardown, and linear-time MTEXT parsing
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.6
  - @mlightcad/cad-google-drive-plugin@1.7.6
  - @mlightcad/cad-html-plugin@1.7.6
  - @mlightcad/cad-onedrive-plugin@1.7.6
  - @mlightcad/cad-pdf-plugin@1.7.6
  - @mlightcad/cad-simple-viewer@1.7.6
  - @mlightcad/cad-svg-plugin@1.7.6
  - @mlightcad/pdf-renderer@1.7.6
  - @mlightcad/three-renderer@1.7.6

## 1.7.6-preview.0

### Patch Changes

- feat: ships whole-drawing FIND search across all layouts with one-click navigation and an explicit current-layout-only mode in both the Vue and simple-UI shells. Paper-space viewports now hide VPLAYER-frozen layers, INSERT rendering shares block geometry and defers spatial indexes for faster opens, and headless export skips duplicate converts on a headless GPU. Plus mobile-bridge and DWG/DXF foundations, hatch pattern transform and mtext \pxq fixes, and Changesets pre mode for npm preview prereleases
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.6-preview.0
  - @mlightcad/cad-google-drive-plugin@1.7.6-preview.0
  - @mlightcad/cad-html-plugin@1.7.6-preview.0
  - @mlightcad/cad-onedrive-plugin@1.7.6-preview.0
  - @mlightcad/cad-pdf-plugin@1.7.6-preview.0
  - @mlightcad/cad-simple-viewer@1.7.6-preview.0
  - @mlightcad/cad-svg-plugin@1.7.6-preview.0
  - @mlightcad/pdf-renderer@1.7.6-preview.0
  - @mlightcad/three-renderer@1.7.6-preview.0

## 1.7.5

### Patch Changes

- feat: adds OneDrive and Google Drive data-source plugins, upgrades the data model, and falls back when the linetype shader is broken. Speeds headless HTML export open and package builds, fixes SVG INSERT cloning and finite-extents framing, and stops dual font parse plus worker-pool fan-out during open. Also hides landing-page viewer chrome, defaults MSAL redirect to the current path, isolates the file-open theme, and swallows missed-font worker rejections.
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.5
  - @mlightcad/cad-google-drive-plugin@1.7.5
  - @mlightcad/cad-html-plugin@1.7.5
  - @mlightcad/cad-onedrive-plugin@1.7.5
  - @mlightcad/cad-pdf-plugin@1.7.5
  - @mlightcad/cad-simple-viewer@1.7.5
  - @mlightcad/cad-svg-plugin@1.7.5
  - @mlightcad/pdf-renderer@1.7.5
  - @mlightcad/three-renderer@1.7.5

## 1.7.4

### Patch Changes

- feat: adds a radius measure tool and async smart extents with cache and busy overlay, and maps PDF optional content groups to CAD layers. Fixes cover wipeout paint order, drawable scene extents, stalled font open overlays, PDF MText colours and INSERT labels, inline ACI-7 MText, selection glow scaling, Fit-to-screen measure badges, multi-attribute edit, and a font CDN notice
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.4
  - @mlightcad/cad-html-plugin@1.7.4
  - @mlightcad/cad-pdf-plugin@1.7.4
  - @mlightcad/cad-simple-viewer@1.7.4
  - @mlightcad/cad-svg-plugin@1.7.4
  - @mlightcad/pdf-renderer@1.7.4
  - @mlightcad/three-renderer@1.7.4

## 1.7.3

### Patch Changes

- feat: brings smart extents and AutoCAD saved-view zoom to live viewer toolbars, and cuts open-time stalls by speeding INSERT indexing and font regeneration. Fallback fonts preload before the first glyph bake so text no longer flashes with missing glyphs, and docs link the proprietary DWG converter install guide to the wiki
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.3
  - @mlightcad/cad-html-plugin@1.7.3
  - @mlightcad/cad-pdf-plugin@1.7.3
  - @mlightcad/cad-simple-viewer@1.7.3
  - @mlightcad/cad-svg-plugin@1.7.3
  - @mlightcad/pdf-renderer@1.7.3
  - @mlightcad/three-renderer@1.7.3

## 1.7.2

### Patch Changes

- feat: draws complex TEXT and SHAPE linetypes as strokes and glyphs, renders closed wide polylines as offset rings, and adds HTML export smart extents plus AutoCAD saved-view zoom. The CLI gains a self-hosted base URL and open-view, no-plot, and circle-sides options. Dynamic blocks and arc-aligned text come with the data-model upgrade. Drawing open is faster with font preload and lighter line batches, and fixes cover raster and OLE textures, PDF PDMODE, and progressive open.
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.2
  - @mlightcad/cad-html-plugin@1.7.2
  - @mlightcad/cad-pdf-plugin@1.7.2
  - @mlightcad/cad-simple-viewer@1.7.2
  - @mlightcad/cad-svg-plugin@1.7.2
  - @mlightcad/pdf-renderer@1.7.2
  - @mlightcad/three-renderer@1.7.2

## 1.7.1

### Patch Changes

- feat: adds a native AcGi PDF renderer with direct vector export and lower-memory text modes, plus HTML export that embeds progressive ACEX chunks, multi-file ZIP packages, and leaner multi-layout switching. Shared toolbar and notification engines land across viewers, with reading mode, mobile session accessories, and parallel package downloads. Fixes cover font sync, hatch shaders, mirrored INSERTs, OLE2Frame embeds, selection, and PDSIZE/highlight/dashed-line rendering
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.1
  - @mlightcad/cad-html-plugin@1.7.1
  - @mlightcad/cad-pdf-plugin@1.7.1
  - @mlightcad/cad-simple-viewer@1.7.1
  - @mlightcad/cad-svg-plugin@1.7.1
  - @mlightcad/pdf-renderer@1.7.1
  - @mlightcad/three-renderer@1.7.1

## 1.7.0

### Minor Changes

- feat: expands mobile and touch review with responsive phone/pad toolbars, a long-press snap loupe, confirmed pick marks, and a command session panel with live metrics. Measurement gains continuous distance, a results list palette, endpoint grips with osnap, unit conversion, and zoom-scaled hairline overlays. HTML export adds multi-file ACEX packages, paper-space background choice, and lazy font catalogs, plus reading mode and a VitePress multi-language docs site

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.7.0
  - @mlightcad/cad-html-plugin@1.7.0
  - @mlightcad/cad-pdf-plugin@1.7.0
  - @mlightcad/cad-simple-viewer@1.7.0
  - @mlightcad/cad-svg-plugin@1.7.0
  - @mlightcad/three-renderer@1.7.0

## 1.6.3

### Patch Changes

- feat: ships a CAD diff viewer with MDI document sessions, COMPARE sysvar support, revision-cloud grouping, and polished compare display with shared toolbar icons and a locale picker. Design Review gains callouts attached to shape markups and a reordered review toolbar. HTML export can require expiry and a password. Arabic locale is complete, UI-component locales sync with the CAD viewer, and toolbar SVGs are consolidated with a unified clear icon
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.6.3
  - @mlightcad/cad-html-plugin@1.6.3
  - @mlightcad/cad-pdf-plugin@1.6.3
  - @mlightcad/cad-simple-viewer@1.6.3
  - @mlightcad/cad-svg-plugin@1.6.3
  - @mlightcad/three-renderer@1.6.3

## 1.6.2

### Patch Changes

- feat: adds an in-browser DWG/DXF to offline HTML converter, HTML export of paper-space viewports with layout switching, and a drawing layout switcher in the simple-ui toolbar. Object snap gains AutoCAD-style center ticks and intersection snaps. Overlay toolbars keep style controls while markup or measure is selected, restore named ACI colors, and restore undo for deleted entities. Arc-length measure locks onto circles, and hatch fills stay below linework in HTML export.
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.6.2
  - @mlightcad/cad-html-plugin@1.6.2
  - @mlightcad/cad-pdf-plugin@1.6.2
  - @mlightcad/cad-simple-viewer@1.6.2
  - @mlightcad/cad-svg-plugin@1.6.2
  - @mlightcad/three-renderer@1.6.2

## 1.6.1

### Patch Changes

- feat: extends Design Review markup and measurement to the HTML viewer with sidecar persistence, aligned review icons, and HTML-only measure overlays that avoid forcing WebGL redraws. Also preserves absolute hatch colours when only lineweight is ByLayer, and documents GitMCP servers in the README and Cursor config
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.6.1
  - @mlightcad/cad-html-plugin@1.6.1
  - @mlightcad/cad-pdf-plugin@1.6.1
  - @mlightcad/cad-simple-viewer@1.6.1
  - @mlightcad/cad-svg-plugin@1.6.1
  - @mlightcad/three-renderer@1.6.1

## 1.6.0

### Minor Changes

- feat: adds Design Review markup and measurement overlays with sidecar JSON persistence, undoable edits, draw-style controls, and AutoCAD-style REVCLOUD/SKETCH tools. Review overlays pick by stroke, support in-place text and window/crossing selection, and render on HTML canvas without forcing WebGL redraws. Ships a zero-build CDN bootstrap example, makes LibreDWG DWG support host opt-in, and retires cad-html-exporter-cli in favor of cad-simple-viewer-cli

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.6.0
  - @mlightcad/cad-html-plugin@1.6.0
  - @mlightcad/cad-pdf-plugin@1.6.0
  - @mlightcad/cad-simple-viewer@1.6.0
  - @mlightcad/cad-svg-plugin@1.6.0
  - @mlightcad/three-renderer@1.6.0

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.5.11
  - @mlightcad/cad-html-plugin@1.5.11
  - @mlightcad/cad-pdf-plugin@1.5.11
  - @mlightcad/cad-simple-viewer@1.5.11
  - @mlightcad/cad-svg-plugin@1.5.11
  - @mlightcad/three-renderer@1.5.11

## 1.5.10

### Patch Changes

- feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.5.10
  - @mlightcad/cad-html-plugin@1.5.10
  - @mlightcad/cad-pdf-plugin@1.5.10
  - @mlightcad/cad-simple-viewer@1.5.10
  - @mlightcad/cad-svg-plugin@1.5.10

## 1.5.9

### Patch Changes

- feat: this release adds Czech localization, an Attribute Definition dialog, and an About dialog; improves XREF overlays, XATTACH defaults, and INSERT Off/Freeze layer behavior; ships a faster DXF pipeline with compacted block templates; expands offline HTML locales (Czech, Turkish); and documents the proprietary DWG converter plus Read the Docs API publishing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.9
  - @mlightcad/cad-agent-plugin@1.5.9
  - @mlightcad/cad-html-plugin@1.5.9
  - @mlightcad/cad-pdf-plugin@1.5.9
  - @mlightcad/cad-svg-plugin@1.5.9

## 1.5.8

### Patch Changes

- feat: expanded the CAD Viewer with Blocks, Layer Manager, Attribute Editor, Count, Memory, and Missing Resources palettes, plus -INSERT support, Xref overlays, overlay drawing support, and numerous rendering, interaction, and workflow improvements
- Updated dependencies
  - @mlightcad/cad-agent-plugin@1.5.8
  - @mlightcad/cad-html-plugin@1.5.8
  - @mlightcad/cad-pdf-plugin@1.5.8
  - @mlightcad/cad-simple-viewer@1.5.8
  - @mlightcad/cad-svg-plugin@1.5.8

## 1.5.7

### Patch Changes

- feat: added file open dialog, web worker readiness, collapsible toolbar UI, layer/entity refactors, undo/redo, GPU batch previews, and synchronization fixes
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.7
  - @mlightcad/cad-pdf-plugin@1.5.7
  - @mlightcad/cad-simple-viewer@1.5.7
  - @mlightcad/cad-svg-plugin@1.5.7

## 1.5.6

### Patch Changes

- feat: major update featuring grip point editing, proxy entity support, enhanced HTML export, AutoCAD-style command input, improved large-drawing rendering, SHAPE and dimension support, mobile usability enhancements, and extensive performance, rendering, and stability improvements
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.6
  - @mlightcad/cad-pdf-plugin@1.5.6
  - @mlightcad/cad-simple-viewer@1.5.6
  - @mlightcad/cad-svg-plugin@1.5.6

## 1.5.5

### Patch Changes

- chore: add version sync check and update deps
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.5
  - @mlightcad/cad-pdf-plugin@1.5.5
  - @mlightcad/cad-simple-viewer@1.5.5
  - @mlightcad/cad-svg-plugin@1.5.5

## 1.5.4

### Patch Changes

- feat: Text Style dialog, SHAPE rendering, batch visibility/HIDEOBJECTS, and font fallback/CDN; fix zoom-fit bounds, PNG export frustum, paper-space viewport detection, and dev startup deps; add demo links to README
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.4
  - @mlightcad/cad-pdf-plugin@1.5.4
  - @mlightcad/cad-simple-viewer@1.5.4
  - @mlightcad/cad-svg-plugin@1.5.4

## 1.5.3

### Patch Changes

- chore(deps): reclassify package dependencies and pin lodash-es via pnpm overrides
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.3
  - @mlightcad/cad-pdf-plugin@1.5.3
  - @mlightcad/cad-simple-viewer@1.5.3
  - @mlightcad/cad-svg-plugin@1.5.3

## 1.5.2

### Patch Changes

- feat: HTML/SVG export plugins, offline viewer enhancements, and ortho/polar tracking
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.2
  - @mlightcad/cad-pdf-plugin@1.5.2
  - @mlightcad/cad-simple-viewer@1.5.2
  - @mlightcad/cad-svg-plugin@1.5.2

## 1.5.1

### Patch Changes

- feat: adds offline HTML export (self-contained viewer, Playwright CLI, measurement, object snap, OrbitControls), MTEXT editing with ribbon integration and positioning fixes, the OFFSET command, and a Drawing Units (UNITS) dialog with LUNITS/AUNITS formatting. It improves paper-space layout switching, viewport picking, hatch rendering, and DXF/DWG load UX. Infrastructure updates include Node.js 24, pnpm 10, dependency upgrades, and production build/tree-shaking fixes
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.1

## 1.5.0

### Minor Changes

- fix: upgrade dependencies to fix some position issues on rendering texts

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.5.0

## 1.4.13

### Patch Changes

- feat: add commands polygon, ellipse, hatch, layer, move, qselect, and pngout
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.13

## 1.4.12

### Patch Changes

- fix: fix lots of bugs
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.12

## 1.4.11

### Patch Changes

- feat: add measurement feature
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.11

## 1.4.10

### Patch Changes

- feat: add line weight supports
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.10

## 1.4.9

### Patch Changes

- fix: fix issue 103 and update cad-simple-viewer-demo to be able to verify it
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.9

## 1.4.8

### Patch Changes

- feat: support annotation
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.8

## 1.4.7

### Patch Changes

- fix: fix issues 89 and 90
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.7

## 1.4.6

### Patch Changes

- feat: support ATTDEF ATTRIB entities when reading DXF file
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.6

## 1.4.5

### Patch Changes

- fix: fix issues 79 andn 80
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.5

## 1.4.4

### Patch Changes

- fix: fix issues 64 and 73
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.4

## 1.4.3

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.3

## 1.4.2

### Patch Changes

- feat: supports setting webworker javascript bundle urls in AcApDocManagerOptions
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.2

## 1.4.1

### Patch Changes

- feat: fix some issues on rendering linetype and hatch
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.1

## 1.4.0

### Minor Changes

- feat: support osnap for insert entity

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.4.0

## 1.3.4

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.3.4

## 1.3.3

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.3.3

## 1.3.2

### Patch Changes

- fix: fix regression isssue on rendering block with wrong color
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.3.2

## 1.3.1

### Patch Changes

- feat: upgrade dependencies to fix issue on reading color from dwg file
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.3.1

## 1.3.0

### Minor Changes

- feat: support changing layer color

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.3.0

## 1.2.5

### Patch Changes

- feat: refine input mangager and jig system
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.5

## 1.2.4

### Patch Changes

- fix: fix bundle size issue in lastest version of cad-simple-viewer
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.4

## 1.2.3

### Patch Changes

- fix: fix bugs on rendering polyline2d and polyline3d
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.3

## 1.2.2

### Patch Changes

- fix: fix bugs on rendering polyline2d, polyline3d, and linear dimension
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.2

## 1.2.1

### Patch Changes

- fix: fix bug on baseUrl
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.1

## 1.2.0

### Minor Changes

- feat: support dxf file with gbk encoding

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.2.0

## 1.1.12

### Patch Changes

- feat: bump version to fix some bugs
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.12

## 1.1.11

### Patch Changes

- feat: upgrade dependencies version to fix some bugs
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.11

## 1.1.10

### Patch Changes

- fix: fix issue 74, 75, and 76
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.10

## 1.1.9

### Patch Changes

- fix: fix UI bugs on layer manager
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.9

## 1.1.8

### Patch Changes

- feat: fix bug on zoomToFit
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.8

## 1.1.7

### Patch Changes

- feat: show warning message if found some unknown entities after parsed drawing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.7

## 1.1.6

### Patch Changes

- fix: upgrade dependencies to fix issue on parsing entity color when its color is byBlock
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.6

## 1.1.5

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.5

## 1.1.4

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.4

## 1.1.3

### Patch Changes

- fix: add logic to load default font back due to some bugs on rendering texts in blocks
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.3

## 1.1.2

### Patch Changes

- fix: fix regression issue #60
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.2

## 1.1.1

### Patch Changes

- feat: upgrade dependencies to fix bug on rendering shx fonts
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.1.1

## 1.1.0

### Patch Changes

- feat: simplify styles of cad-viewer component
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.24

## 1.0.23

### Patch Changes

- feat: remove property 'canvasId' and add property 'localFile' for cad-viewer component
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.23

## 1.0.22

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.22

## 1.0.21

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.21

## 1.0.20

### Patch Changes

- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.20

## 1.0.19

### Patch Changes

- feat: render mtexts in web worker
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.19

## 1.0.18

### Patch Changes

- feat: support batch append for entities
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.18

## 1.0.17

### Patch Changes

- fix: fix issue on opening one empty dxf/dwg file
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.17

## 1.0.16

### Patch Changes

- feat: add new property 'background' for component MlCadViewer
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.16

## 1.0.15

### Patch Changes

- feat: simplify usage of cad-simple-viewer and cad-viewer by using web worker
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.15

## 1.0.14

### Patch Changes

- feat: upgrade version of dependencies
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.14

## 1.0.13

### Patch Changes

- feat: use extents value from AcDbDatabase to zoom to extents
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.13

## 1.0.12

### Patch Changes

- fix: fix bug on getting tranlated entity name in order to show entity information when hovering on one entity
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.12

## 1.0.11

### Patch Changes

- fix: upgrade new version of dependencies to fix bugs on getting layer name and line type name
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.11

## 1.0.10

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.10

## 1.0.9

### Patch Changes

- fix: upgrade new version of libredwg-web and libredwg-converter to fix bugs on decoding texts
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.9

## 1.0.8

### Patch Changes

- fix: catch errors to continue rendering drawing if bigfont characters are found
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.8

## 1.0.7

### Patch Changes

- feat: upgrade realdwg-web to version 1.1.8 to fix some bugs
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.7

## 1.0.6

### Patch Changes

- feat: upgrade version of realdwg-web to fix some bugs
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.6

## 1.0.5

### Patch Changes

- fix: fix dependencies of cad-simple-viewer
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.5

## 1.0.4

### Patch Changes

- feat: add property 'canvasId' for MlCadViewer component and update its example and readme
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.4

## 1.0.3

### Patch Changes

- feat: upgrade version of data-model package to fix issue on refreshing multiple times when opening one drawing
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.3

## 1.0.2

### Patch Changes

- feat: refine MlCadViewer component by adding properties 'url' and 'wait'
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.2

## 1.0.1

### Patch Changes

- feat: removing logic to create one example drawing when launching viewer
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.0.1
