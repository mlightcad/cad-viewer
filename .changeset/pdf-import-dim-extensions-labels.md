---
'@mlightcad/cad-pdf-plugin': patch
---

fix(cad-pdf-plugin): keep object lines under extension lines and recognize symbol-labelled dimensions on PDF import

- An object edge that an extension line is drawn over (for example a tube
  wall under a Ø dimension) is no longer taken as the extension line. Such an
  edge is never erased, and the real (often short) extension line wins. Edges
  that stop short of the dimension line are no longer used either.
- Extension lines drawn twice over each other by neighbouring dimensions are
  both replaced, so no copy is left behind.
- Text placed beyond the extension lines keeps its position, and the run of
  dimension line out to it is replaced by the dimension (DIMTMOVE 0).
- Dimensions labelled with a symbol instead of a value (`a`, `e mini`,
  `E maxi` in weld details), including spans shorter than their arrows, are
  recognized when both terminators, the dimension line and both extension
  lines are present. A text label becomes the dimension text; a label still
  drawn as strokes stays as drawn and the dimension text is suppressed. In
  `pdfdim`, typing a value for such a row replaces the label strokes.
- A diameter with outside arrows also replaces the stub behind its far arrow.
- Linear dimensions with outside arrows keep the dimension line drawn past
  the arrows: the dim block now draws those tails, which were erased with
  the source lines but never drawn again.
