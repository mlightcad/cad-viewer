---
'@mlightcad/cad-simple-viewer': patch
---

feat: type commands on the canvas and confirm or repeat them with Space

Printable keys pressed while the view has focus now go to the command line,
so a command starts without clicking the input first. Space works like Enter
(AutoCAD behavior): it confirms the command line, the dynamic-input fields,
and selection/entity/box prompts, and repeats the last command on an idle
view. String prompts that accept spaces keep Space as text. Letters typed
into numeric dynamic-input fields move to the command line so keywords can be
entered there. Esc in the command line, and the end of a dynamic-input prompt,
hand focus back to the view so Delete and Ctrl+Z keep working. Keys are not
captured while the command line is hidden (by the host setting or the phone
layout) or while a modal dialog is open.
