# @mlightcad/cad-llm-plugin

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

- 0dd562b: feat(ui): let plugins register ribbon, export menus, and palette tabs

  Plugin chrome (ribbon groups, File → Export rows, simple-UI toolbar buttons, and palette tabs) is declared by each plugin's `/register` module through `AcApUiRegistry`. The Vue editor and simple UI draw whatever is registered, so a package that is not installed contributes no buttons. `chtml` and `cpdf` open framework-free dialogs owned by the HTML and PDF plugins. `store.features` and the Vue export dialogs are removed. Headless hosts pass `dialog: false` so those commands stay prompts. See the upgrade guide.

- feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.

### Patch Changes

- 64ca714: Show Working/Thinking feedback while the CAD agent waits on the model, and make the context-usage meter honest when usage exceeds the local window estimate (optional per-model `contextWindow`, estimated-window note, percentages may exceed 100%).
- Updated dependencies [2ee892d]
- Updated dependencies [663c251]
- Updated dependencies [e4d1399]
- Updated dependencies [704af08]
- Updated dependencies [9a09628]
- Updated dependencies [b9af87c]
- Updated dependencies [0dd562b]
- Updated dependencies [0ff8b62]
- Updated dependencies [7b6bac6]
- Updated dependencies [0dd562b]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.6

## 1.8.0-preview.5

### Minor Changes

- fix: makes published type declarations resolve under moduleResolution nodenext by emitting explicit .js import specifiers, keeps middle-button panning working while the PAN command is active, and upgrades realdwg-web to 1.15.30 to pick up the latest data-model and DWG conversion fixes.

### Patch Changes

- Updated dependencies [ac569e8]
- Updated dependencies [aad8aed]
- Updated dependencies
  - @mlightcad/cad-simple-viewer@1.8.0-preview.5

## 1.8.0-preview.4

### Minor Changes

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

### Patch Changes

- 84f82ff: `pdftext` (Recover Texts) now recognizes all lines at once: lines are read from the glyph dictionary, every other line goes to the AI model in a few batch requests (up to 20 line images each), and the whole selection is converted in one step without per-line confirmation. Only lines nothing could read are still prompted. When text recognition fails (invalid API key, network, quota, unexpected answer), the reason is shown instead of being silently ignored.

  `AcApTextRecognitionService` gains `recognizeBatch()` and an `onError` option on `recognize()` / `recognizeBatch()`; recognizers can implement the optional `recognizeBatch` method.

  Erasing many entities at once is much faster: `AcApEntityService.eraseEntities` removes them from each block in one pass instead of scanning the block per entity, and the view removes them in bulk (`AcTrBatchedGroup.removeEntities`, `AcTrScene.removeEntities`), compacting each geometry batch once instead of once per entity. Converting about 6000 PDF text strokes in a 93,000-entity drawing went from over 40 seconds of frozen UI to about half a second.

- 4bbb670: `pdftext` (Recover Texts) on tables: grid lines that the PDF splits into short segments are no longer taken for text strokes, so table cells are no longer glued into tall blocks read as vertical text, one glyph per line. The text direction of each phrase is now chosen by glyph spacing (tight along the baseline), which also handles widely spaced titles and narrow table columns; short ambiguous phrases such as `Q1` follow the rest of the drawing.

  AI text recognition requests now time out after 120 seconds, so a provider that never answers no longer leaves the command loading forever; the timeout is reported like other recognition errors.

- Updated dependencies [c987f64]
- Updated dependencies [9c6be36]
- Updated dependencies [2632f9e]
- Updated dependencies [03ff81b]
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
- Updated dependencies [68d4365]
- Updated dependencies [f6048ff]
- Updated dependencies [6d80103]
- Updated dependencies [ac1f322]
- Updated dependencies [69825da]
  - @mlightcad/cad-simple-viewer@1.8.0-preview.4
