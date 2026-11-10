---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-editor': patch
---

`BSEARCH`: selected texts no longer take part in the geometry match. Like AutoCAD, copies are found by their geometry and each selected text picks up the text sitting at the same place in the copy, so labels whose insertion point moves with the string (axis bubbles "1" / "10" / "B" imported from PDF) are found and become attributes. Text variations (`TEXTTOATTRIBUTE`) are now on by default, as in AutoCAD; turn them off to accept only identical text. `AcEdShapeMatchOptions` gains an `accept` callback that lets symmetric shapes try their other transforms.

When existing block references are converted into a new block with attributes, each reference now keeps its own attribute values and placement instead of getting the source text's value at the source position.
