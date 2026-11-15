---
'@mlightcad/cad-simple-viewer': patch
---

Fix MLEADEREDIT Remove leader (ribbon "Remove Leader", `mleadereditremove`, and the Remove keyword of `mleaderedit`).

- A leader can be picked anywhere along its line, not only next to its arrowhead, using a fixed on-screen pick aperture at any zoom level.
- Adding or removing leaders is now recorded for UNDO/REDO.
- Removing one line from a landing that carries several lines keeps the order of the other landings.
- Clicking where there is no leader shows "No leader found at that point" instead of "Must select a multileader".
