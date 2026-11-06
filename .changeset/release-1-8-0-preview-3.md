---
'@mlightcad/cad-agent-core': patch
'@mlightcad/cad-agent-plugin': patch
'@mlightcad/cad-demo-gallery': patch
'@mlightcad/cad-diff-viewer': patch
'@mlightcad/cad-diff-viewer-example': patch
'@mlightcad/cad-editor': patch
'@mlightcad/cad-editor-demo': patch
'@mlightcad/cad-google-drive-plugin': patch
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-exporter': patch
'@mlightcad/cad-html-plugin': patch
'@mlightcad/cad-mcp-server': patch
'@mlightcad/cad-onedrive-plugin': patch
'@mlightcad/cad-pdf-core': patch
'@mlightcad/cad-pdf-exporter': patch
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-script-core': patch
'@mlightcad/cad-script-plugin': patch
'@mlightcad/cad-simple-ui-plugin': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-simple-viewer-cli': patch
'@mlightcad/cad-simple-viewer-demo': patch
'@mlightcad/cad-svg-plugin': patch
'@mlightcad/pdf-renderer': patch
'@mlightcad/three-renderer': patch
---

feat: adds drawDim* script APIs for real dimensions, suggested-task prompts and a context-usage ring in the agent palette, and narrower entity queries so large drawings avoid script_timeout. Also frames the first Model visit from converted geometry when opening into a paper layout so ZOOM Original does not land on a blank view
