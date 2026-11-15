---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-html-core': patch
---

Make multileaders behave like AutoCAD.

- MLEADER applies the current multileader style: text height, text style, arrow size and landing follow the style (including its overall scale, or the annotation scale for annotative styles). The text is attached by its left or right side depending on the leader direction, one landing gap from the landing, so leaders drawn to the left no longer put the text on top of the landing. The in-place text editor uses the style's text height and text style. Leader type and landing set in the Options branch now take effect.
- MLEADEREDIT Add leader joins a leader on the same side of the text to the existing landing, and puts a leader on the other side on a new landing past the far edge of the text. The preview shows the multileader with its real text and style.
- Dragging multileader grips now works like AutoCAD (requires the matching `@mlightcad/data-model` release): the arrowhead grip stretches the leader, the landing and text grips move the text with its landing and flip the landing to the other side when needed, and the landing-end grip lengthens the landing.
- HTML export snaps to the full leader line of multileaders with intermediate vertices.
- `acapBuildMLeaderGeometry` no longer repeats the landing point as the last leader-line vertex (AutoCAD stores it as the branch's last leader point), and new helpers `acapCreateMLeader`, `acapLayoutMLeader`, `acapResolveMLeaderPlacement` and `acapAnnotationScaleFactor` are exported.
