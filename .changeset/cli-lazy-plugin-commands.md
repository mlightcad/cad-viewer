---
'@mlightcad/cad-simple-viewer': patch
---

Commands of lazily loaded plugins (`ipdf`, `chtml`, `csvg`, `agent`, `cadscript`, ...) can now be typed on the command line and on the canvas. Previously they were reported as unknown until their plugin had been loaded another way. Command-line auto-completion also lists them before they are loaded.
