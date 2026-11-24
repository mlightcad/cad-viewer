---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

Add AutoCAD-style TRIM (`TR`) and EXTEND (`EX`) modify commands with ribbon entries in the Modify panel. Both support Quick and Standard modes, shift-pick to switch between trim and extend, Fence, Crossing, Project, Edge, eRase (TRIM), in-command Undo, and a hover preview of the result. Geometry uses the data model's `intersectWith`, `getSplitCurves` and `extendToPoint`.

Options follow the AutoCAD system variables `TRIMEXTENDMODE` (Quick / Standard), `EDGEMODE` (extended edges in Standard mode), `PROJMODE`, `TRIMEDGES` (hatch pattern lines as Quick-mode edges when 0) and `COMMANDPREVIEW` (hover preview on / off); each can be set by typing its name, and the command options write them back.
