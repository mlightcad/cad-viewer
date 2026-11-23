---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

Align built-in command aliases with AutoCAD `acad.pgp`: add `J` for JOIN and `MI` for MIRROR; add missing standard aliases (`G`/`-G`, `CP`, `MT`, `CB`, `MLD`, `LE`, `H`, `-I`, `XR`, `PR`/`CH`/`MO`, `UN`); remove non-AutoCAD shortcuts (`OP` for OPEN, `RA` for RAY, `SE` for SELECT). Editor-registered UI commands (`LAYER`, `HATCH`, `XREF`, `PROPERTIES`, `UNITS`) now pick up those defaults.
