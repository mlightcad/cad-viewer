---
'@mlightcad/cad-html-core': patch
'@mlightcad/cad-html-plugin': patch
---

fix: frame every layout with its export-time extents in offline HTML

Opening an exported HTML viewer whose initially active layout was paper space
produced two framing bugs when the export option "Initial View" was "Extents":

- The first paint was slightly smaller than the toolbar **Zoom → Extents**
  result. Progressive packages mount the paper layout before its geometry
  chunks arrive, so the initial fit saw viewport frames only, while the toolbar
  action saw the fully painted layout.
- Model space did not frame its own entities on first visit. Its only fallback
  was `meta.viewExtents`, which describes the active export layout (paper
  space) — so switching to model space zoomed to the sheet's area instead of
  the model geometry, and it kept that wrong box even after the chunks painted.

Both come from the same gap: the runtime derived zoom-to-fit bounds at open
time, when only part of the drawing is resident and only one layout's bounds
are persisted. The snapshot now stores the fit box each layout computed at
export time (`AcExLayoutSnapshot.fitExtents`, written to `meta.fitExtents` by
the binary codec and to the manifest for multi-file packages), and
`resolveLayoutViewExtents` prefers it, falling back to live geometry for
snapshots written before this change.

`fitExtents` is additive and backwards compatible: the layout JSON slot keeps
its v4 wire shape, and older runtimes ignore the extra meta key.

The initial framing and **Extents** now also stay identical for layouts loaded
from a package, and user zoom/pan is still preserved per layout — a fit only
happens while the layout has no stored view state of its own.
