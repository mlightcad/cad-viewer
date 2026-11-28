---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

Honor VPORT **UCSFOLLOW** (`ucsFollowMode`) when applying a UCS so the view plans with the new axes (including UCS icon grip rotates). Read/write **UCSICON** via ObjectARX `iconEnabled` / `iconAtOrigin` on `*Active`.

Skip registering a system variable as a command when a real command already owns that name (AutoCAD: typing **UCSICON** runs the command; the variable is via SETVAR) so DocManager init no longer throws on the UCSICON clash.
