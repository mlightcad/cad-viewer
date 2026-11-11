---
'@mlightcad/cad-pdf-plugin': patch
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/three-renderer': patch
---

Fix three issues found when recovering text with `pdftext`:

- **Hide original strokes did nothing the first time.** Hiding an entity collapses its batch slot, but only set `needsUpdate`. While a batch attribute still had update ranges recorded by earlier appends, three.js uploaded just those ranges, so the change stayed on the CPU until a later full upload (the second toggle). The draw-visibility strategies now record the range they change.
- **Merged MTEXT moved down.** The viewer anchors MTEXT on its drawn glyphs, so a top-left anchor at the cap height pushed text whose glyphs are shorter than the cap height (e.g. CJK) down. Merged text is now attached bottom-left at the ink bottom of its last line, like a TEXT at its baseline.
- **Merged MTEXT lost the gaps between characters.** Letter-spaced text such as "剪 力 墙 身 表" or "标   高" is now merged with the number of spaces that keeps each character at its original place (measured in the chosen fonts), also between CJK characters.

`AcApFontUtil.measureTextWidth` now matches the renderer (`@mlightcad/mtext-renderer` 0.13.9): each glyph is sized with the scale of the font that supplies it, so a CJK cell of `txt.shx` + `gbcbig.shx` measures one text height (it measured 4/3), and a space advances by the style font's space glyph at the text height. This also fixes width auto-fit of recovered and imported CJK text.
