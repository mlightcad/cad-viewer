---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-simple-ui-plugin': minor
'@mlightcad/cad-viewer': minor
---

feat: FIND searches the whole drawing (all layouts) by default with an explicit "Current layout only" option, in both cad-simple-ui-plugin and the full Vue cad-viewer UI. Results name their layout; selecting one activates that layout, zooms to the text and selects its entity. The shared search lives in `@mlightcad/cad-simple-viewer/find` (`acapFindText`, `acapFindHitBox`, `acapListFindLayouts`) with `acapNavigateToFindHit` and `AcTrView2d.isLayoutInitialized`
