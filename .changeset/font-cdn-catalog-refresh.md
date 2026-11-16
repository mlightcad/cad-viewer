---
'@mlightcad/cad-simple-viewer': patch
'@mlightcad/cad-pdf-exporter': patch
'@mlightcad/cad-html-exporter': patch
'@mlightcad/three-renderer': patch
---

Pin the default font CDN to `cad-data@main`, bump `@mlightcad/mtext-renderer` to 0.13.10 (catalog refresh + preferred-type glyph fallback), and give headless PDF/HTML export the same stale-`fonts.json` revalidation and GitHub raw fallback as the browser viewer.
