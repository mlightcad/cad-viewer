---
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-demo-gallery': minor
'@mlightcad/cad-diff-viewer': minor
'@mlightcad/cad-diff-viewer-example': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-editor-demo': minor
'@mlightcad/cad-google-drive-plugin': minor
'@mlightcad/cad-html-core': minor
'@mlightcad/cad-html-exporter': minor
'@mlightcad/cad-html-plugin': minor
'@mlightcad/cad-llm-plugin': minor
'@mlightcad/cad-mcp-server': minor
'@mlightcad/cad-onedrive-plugin': minor
'@mlightcad/cad-paddleocr-plugin': minor
'@mlightcad/cad-pdf-core': minor
'@mlightcad/cad-pdf-exporter': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-script-plugin': minor
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-simple-viewer-cli': minor
'@mlightcad/cad-simple-viewer-demo': minor
'@mlightcad/cad-svg-converter': minor
'@mlightcad/cad-svg-plugin': minor
'@mlightcad/pdf-renderer': minor
'@mlightcad/three-renderer': minor
---

feat: makes the Properties palette editable in Write mode, lets plugins register ribbon menus and palettes, and opens BDETECT with an options panel. Agent redraw adds evidence-tracked cad.redraw with pixel comparison plus a clearer busy and context meter. PDF import recognizes dimensions and exploded text via local PaddleOCR, honours image clips and hatch order, and HTML package zips include a drawing thumbnail. Also fixes elevated geometry clipping, block linework precision, and Model_Space placeholders while reading.
