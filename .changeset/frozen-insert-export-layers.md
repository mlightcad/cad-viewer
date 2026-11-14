---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-plugin': patch
'@mlightcad/cad-html-exporter': patch
'@mlightcad/three-renderer': patch
'@mlightcad/pdf-renderer': patch
'@mlightcad/cad-editor': patch
---

fix: keep frozen INSERT geometry exportable and toggleable like AutoCAD

Freeze still hides the whole reference, but HTML/PDF export now converts and
reparents nested fragments so frozen layers can start invisible and be toggled
back on. Off INSERT layers keep converting nested on-layer geometry. Layer
manager freeze/lock icons use AutoCAD-like blue/yellow colors.
