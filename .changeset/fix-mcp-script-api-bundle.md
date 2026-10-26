---
"@mlightcad/cad-agent-core": patch
"@mlightcad/cad-agent-plugin": patch
"@mlightcad/cad-demo-gallery": patch
"@mlightcad/cad-diff-viewer": patch
"@mlightcad/cad-diff-viewer-example": patch
"@mlightcad/cad-google-drive-plugin": patch
"@mlightcad/cad-html-core": patch
"@mlightcad/cad-html-exporter": patch
"@mlightcad/cad-html-plugin": patch
"@mlightcad/cad-mcp-server": patch
"@mlightcad/cad-onedrive-plugin": patch
"@mlightcad/cad-pdf-plugin": patch
"@mlightcad/cad-script-plugin": patch
"@mlightcad/cad-simple-ui-plugin": patch
"@mlightcad/cad-simple-viewer": patch
"@mlightcad/cad-simple-viewer-cli": patch
"@mlightcad/cad-simple-viewer-demo": patch
"@mlightcad/cad-svg-plugin": patch
"@mlightcad/cad-viewer": patch
"@mlightcad/cad-editor-demo": patch
"@mlightcad/pdf-renderer": patch
"@mlightcad/three-renderer": patch
---

fix: include the Node-safe cad-agent-core script-api Vite bundle in the Nx CI build so npm packages ship dist/cad-agent-core-script-api.js. Without it, @mlightcad/cad-mcp-server failed to resolve @mlightcad/cad-agent-core/script-api after install because the project build only ran the main lib Vite step and skipped vite.script-api.config.ts
