---
'@mlightcad/cad-agent-plugin': patch
---

fix(agent): require redraw.compare and gate sheet-frame questions

Strengthen the image-redraw prompts so the model finishes with
`cad.redraw.compare` (and a pixel↔CAD calibration). When an attached image
shows a title block / border and the user has not chosen yet, the first reply
must be a text-only question with no draw tools — do not silently omit the
frame.
