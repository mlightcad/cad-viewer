---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

Add Smart Blocks: Detect and Convert (`BDETECT`). Without a selection, the editor finds groups of repeated objects anywhere in the drawing and lists them in a Detection tab of the tool palette, with thumbnails, editable block names and progress while it searches. Click a group to highlight its instances, review one with the Search and Convert toolbar, or convert the checked groups into new blocks at once; texts that differ between instances become attributes, and the whole run undoes in one step. The ribbon gets a Detect and Convert button on the Insert and AI tabs.

`@mlightcad/cad-simple-viewer` adds the underlying API: `acapDetectSmartBlocks`, `acapDetectSmartBlocksAsync` (time-sliced, with progress and cancellation) and `acapConvertSmartBlockCluster`. Unlike AutoCAD's cloud model, detection is local and geometric and finds any repeated group. Searches over an unchanged drawing can share an `AcApSmartBlockCandidatePool` and the new `AcEdShapeMatchOptions.gridCache`; the matcher now picks its first anchor by kind and size rarity, which makes searches in line-heavy drawings faster.
