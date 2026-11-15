# @mlightcad/cad-svg-converter

## 1.8.0-preview.4

### Minor Changes

- feat: completes PDF import with pdftext OCR, pdfhatch and pdfdim recovery plus review palettes, and adds Smart Blocks Search and Detect. New SCALE, LEADER/MLEADER, UCS, named-view and clipboard commands land alongside a shared LLM settings plugin, an SVG Open converter, the AI ribbon tab, and the simple UI folded into cad-simple-viewer.
- ac1f322: Add `@mlightcad/cad-svg-converter` so File → Open can load `.svg` as editable CAD entities (basic vector subset). `cad-simple-viewer` routes the `svg` converter key and accepts `.svg` in open UI; `cad-editor` registers the converter in `initializeCadViewer`.
