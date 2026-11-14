---
'@mlightcad/cad-simple-viewer': patch
---

Fix paper-space layout links, open-into-paper loading, and viewport grip mapping

Heal paper layouts whose `blockTableRecordId` is empty, stale, or wrongly
points at `*Model_Space` (common on R14 LibreDWG files) so Layout tabs appear
and `$TILEMODE = 0` opens a loaded sheet. Map model-entity grips through the
paper viewport used for click or box selection when several viewports overlap.
