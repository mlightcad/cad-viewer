---
'@mlightcad/cad-simple-ui-plugin': patch
---

feat: search layers by name in the simple UI layer panel

The layer list now has a search box that filters rows with a
case-insensitive substring match on the layer name. Sorting still
applies to the filtered results, and the header On checkbox only
toggles layers that match the current search.
