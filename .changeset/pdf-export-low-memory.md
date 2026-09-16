---
"@mlightcad/pdf-renderer": patch
"@mlightcad/cad-pdf-plugin": patch
"@mlightcad/cad-simple-viewer-cli": patch
---

Reduce peak memory of PDF export to prevent crashes on large drawings

- Multi-layout export now paints every layout into a single pdf-lib document
  instead of rendering one PDF per layout and merging via load/copyPages,
  removing several whole-document copies from peak heap.
- Model space is traversed once and its drawable tree is shared by the model
  page and all paper-space viewports, replacing per-viewport deep clones.
- Consecutive same-style strokes and opaque fills are coalesced into one PDF
  graphics-state block, cutting the number of pdf-lib operator objects on
  dense geometry (line meshes, patterned hatches, glyph triangles).
- Content streams are serialized as compact raw text instead of pdf-lib
  operator graphs, and text glyphs are tessellated once into shared
  Float32Array buffers: unique glyph sets become one Form XObject that every
  instance paints via `q cm /FmN Do Q`, so repeated text costs near-nothing.
- The page content stream is flushed to the page after painting (previously
  pages could be exported without any drawing content).
- The headless CLI captures download blobs directly instead of fetching blob
  URLs, which returned empty bodies for very large (hundreds of MB) exports.
- Images embedded on multiple pages now share one decoded image XObject.
- Multi-layout export no longer silently skips the Model layout when the
  drawing's handle registry lacks the model-space block record: the layout's
  block record is resolved through `blockTable.modelSpace` as a fallback, so
  drawings whose content lives only in model space no longer export as an
  empty PDF.
- New `textMode: 'text' | 'vector'` export option (default `'text'`): MTEXT
  and TEXT are painted as real PDF text objects with subset-embedded fonts —
  selectable, searchable, and far smaller than tessellated glyph outlines —
  falling back to vector glyphs when no embeddable program covers the text.
- Font programs are normalized once at load time (WOFF1 repacked to plain
  TTF): fontkit re-inflated WOFF tables on every glyph access, which stalled
  whole exports by seconds per text run.
- The viewer text font resolver falls back through the font manager's
  replacement chain, so style fonts missing from the catalog ("Standard",
  "标准", …) embed the same face on-screen rendering picked instead of
  silently degrading every text to vector outlines; unresolved fonts are
  reported once per font name via a console warning.
- Text-mode MTEXT now honors the entity's frame attributes: the real
  baseline angle is derived from the direction vector (libredwg leaves
  MTEXT `rotation` at 0), the layout block is pinned to the anchor per the
  attachment point (previously every block was pinned by its left edge, so
  center/right attachments shifted text by up to half the column width),
  right-to-left drawing direction reverses character order, and a
  negative-Z extrusion normal renders as mirrored glyphs via a `flipX`
  text-matrix x-axis negation that survives INSERT block transforms.
- Text-mode MTEXT now parses and lays out inline formatting codes instead of
  stripping them: the previous stripper mangled `\pxqc;`-style paragraph
  properties into literal "xqc;" text (and its case-insensitive `\P` match
  ate the `\p` of paragraph properties). Tokenization is delegated to the
  shared `@mlightcad/mtext-parser` package (new dependency) and an adapter
  resolves its per-token context snapshots into absolute styles against the
  entity height/width factor, honoring per-run text height (`\H`), width
  factor (`\W`), tracking (`\T`, emitted as per-glyph TJ adjustments),
  oblique (`\Q` via a sheared text matrix), ACI and true-color overrides
  (`\C`/`\c`), font switches (`\F`, mapped through the viewer font catalog
  with vector fallback when uncovered), underline/overline/strikethrough
  (`\L\O\K`), stacked fractions and tolerances (`\S num/den;`, `num^den;`,
  `num#den;` with mtext-renderer positioning and a fraction rule),
  paragraph justification overrides (`\pxql|qc|qr;`), `%%` control codes
  (`%%c`, `%%d`, `%%p`, `%%nnn`), Unicode escapes (`\U+XXXX`, including
  surrogate pairs), MIF `\\M+` byte escapes, tab stops, non-breaking spaces,
  brace-group style scoping, and baseline advances of
  `5/3 × lineSpaceFactor × height` with word/character wrapping against the
  entity column width.
