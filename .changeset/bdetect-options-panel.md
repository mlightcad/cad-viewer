---
'@mlightcad/cad-editor': minor
'@mlightcad/cad-simple-viewer': patch
---

`BDETECT` opens on a ready panel with detection options (rotation, mirror, scale, same layer, text variations, min. instances, min. savings, max. objects) and a Detect button; searching starts only when Detect is clicked, and Detect again re-runs with the current options. Each option has an explanation: hover or click the mark beside its label. Stop returns to the ready state instead of ending the command. The detection default for `minInstances` is now `2` (was `3`).
