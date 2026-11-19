---
'@mlightcad/three-renderer': patch
---

Fix jagged block linework at survey-scale coordinates (e.g. contour polylines at X ~ 3.36e7). Block-template compaction baked each leaf's absolute translation into float32 vertices before subtracting the bucket origin, and simple block lines were staged in a float32 buffer, so vertices snapped to a 4-unit grid. Both paths now rebase in float64 before storing float32.
