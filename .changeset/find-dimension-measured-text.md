---
'@mlightcad/cad-simple-viewer': patch
---

fix: FIND matches the measured value shown by a dimension, with an option to search only override text

FIND resolved a dimension's block by object id, but `dimBlockId` holds the
block name, so the displayed dimension text (e.g. a measured `422`) was never
searched. The block is now resolved by name like data-model draws it,
including the scale-specific block of annotative dimensions.

The Find panel gets a "Dimensions: override text only" checkbox
(`dimensionOverrideOnly` in `AcApFindOptions`) that searches only the
dimension override text, like AutoCAD FIND. The panel options now wrap to the
panel width instead of taking one row each, and the Find button is an icon
button (its label is the tooltip).
