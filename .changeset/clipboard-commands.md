---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

Add AutoCAD clipboard commands: `COPYCLIP` (Ctrl+C), `CUTCLIP` (Ctrl+X), `COPYBASE` (Ctrl+Shift+C), `PASTECLIP` (Ctrl+V), `PASTEORIG` and `PASTEBLOCK` (Ctrl+Shift+V). Copying writes the objects and every layer, linetype, style and block they use into a temporary drawing; pasting creates what the target drawing lacks and keeps its own definitions for names it already has, as AutoCAD does. The clipboard is shared by every open drawing and is also written to the system clipboard, so objects can be pasted into this app in another browser tab. The Home ribbon tab has a new Clipboard panel, and the simple UI toolbar has Copy, Cut and Paste buttons. The clipboard is available to other code as `AcApDocManager.instance.clipboard`.
