---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-simple-viewer-demo': minor
'@mlightcad/cad-simple-viewer-cli': patch
'@mlightcad/cad-mcp-server': patch
'@mlightcad/cad-diff-viewer': patch
---

Absorb `@mlightcad/cad-simple-ui-plugin` into `@mlightcad/cad-simple-viewer`.

- Built-in plain-DOM toolbar + dock palettes enable by default via `AcApDocManagerOptions.simpleUi` (opt out with `simpleUi: false`; chrome loads from `@mlightcad/cad-simple-viewer/simple-ui`).
- `cad-editor` reuses the shared DOM find / design-review / measurements palettes; the Vue layer manager remains editor-only.
- Remove the separate `@mlightcad/cad-simple-ui-plugin` package; migrate imports to `@mlightcad/cad-simple-viewer/simple-ui` and pass toolbar/dock options through `simpleUi`.
- Drop the `@mlightcad/cad-simple-viewer/find` subpath (import find APIs from the main package) and publish the simple-ui chunk as `dist/cad-simple-ui.js`.
