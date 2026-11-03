---
'@mlightcad/cad-editor': minor
'@mlightcad/cad-editor-demo': minor
'@mlightcad/cad-demo-gallery': minor
---

feat: renames the `@mlightcad/cad-viewer` package to `@mlightcad/cad-editor`

The Vue 3 UI package is now published as `@mlightcad/cad-editor`, matching its
folder under `packages/`. Consumers must update imports
(`import { MlCadViewer } from '@mlightcad/cad-editor'`), the dependency name in
`package.json`, and version-pinned CDN paths, which now point at
`dist/cad-editor.js` / `dist/cad-editor.css`. The repository itself is still
named `cad-viewer`. `@mlightcad/cad-viewer` stays at 1.7.x and receives no
further releases.
