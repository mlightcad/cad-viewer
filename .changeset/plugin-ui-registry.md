---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-html-plugin': minor
'@mlightcad/cad-pdf-plugin': minor
'@mlightcad/cad-svg-plugin': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-llm-plugin': minor
'@mlightcad/cad-script-plugin': minor
'@mlightcad/cad-simple-viewer-demo': minor
'@mlightcad/cad-simple-viewer-cli': patch
'@mlightcad/cad-editor-demo': patch
---

feat(ui): let plugins register ribbon, export menus, and palette tabs

Plugin chrome (ribbon groups, File → Export rows, simple-UI toolbar buttons, and palette tabs) is declared by each plugin's `/register` module through `AcApUiRegistry`. The Vue editor and simple UI draw whatever is registered, so a package that is not installed contributes no buttons. `chtml` and `cpdf` open framework-free dialogs owned by the HTML and PDF plugins. `store.features` and the Vue export dialogs are removed. Headless hosts pass `dialog: false` so those commands stay prompts. See the upgrade guide.
