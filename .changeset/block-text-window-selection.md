---
'@mlightcad/three-renderer': patch
---

Fix window (left-to-right) selection of INSERTs whose block contains MTEXT/TEXT. The renderer's logical text box is local to the rendered object, but it was treated as world space and mapped through the inverse INSERT matrix, so block text ended up indexed at block-local coordinates and the INSERT's spatial bounds stretched far outside its visible geometry. Attribute text (drawn under the inverse INSERT matrix) keeps its previous, correct bounds.
