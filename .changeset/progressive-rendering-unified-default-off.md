---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-viewer': patch
---

Keep progressive rendering off unless `progressiveRendering: true` is passed. When it is on, geometry paints during convert and the open overlay hides once entity convert finishes; when it is off (the default), the canvas and overlay wait until entities and deferred text geometry are idle. Deprecated `waitForTextGeometry` is ignored.
