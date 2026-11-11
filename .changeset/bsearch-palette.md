---
'@mlightcad/cad-editor': patch
---

`BSEARCH` (Smart Blocks: Search and Convert) now reviews its results in a Search and Convert tab of the tool palette, like Detect and Convert and Recover Text, instead of a toolbar over the canvas. The tab shows a preview of the selected objects, the search options and a list of every found instance with what sets it apart (rotation, mirroring, scale, its texts): click a row to zoom to it and use its check box to include or exclude it. Closing the palette cancels the command. Reviewing a group from Detect and Convert uses the same tab and returns to the detection list afterwards. The unreleased `MlBSearchReviewBar` component is removed.

Ribbon: the AI tab's agent button is now labelled "Agent", and the Model Settings, Search and Convert, Detect and Convert, Find and Count icons use the theme's icon color like Quick Select and the agent. Find has a new icon that shows it searches text.
