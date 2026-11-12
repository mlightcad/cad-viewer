---
'@mlightcad/cad-simple-viewer': patch
---

fix: FIND again matches text when Model_Space has a nonstandard owner

Some DWGs parent `*Model_Space` under an intermediate object instead of the
BlockTable. FIND used `blockTable.getIdAt`, which rejects those BTRs, so
searches returned no hits even though the drawing showed text. Layout BTRs
are now resolved with the same fallback as open (#864): `modelSpace` /
block-table iteration when `getIdAt` fails.
