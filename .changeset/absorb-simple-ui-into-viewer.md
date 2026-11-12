---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
'@mlightcad/cad-simple-viewer-demo': minor
'@mlightcad/cad-simple-viewer-cli': patch
'@mlightcad/cad-mcp-server': patch
'@mlightcad/cad-diff-viewer': patch
---

Absorb `@mlightcad/cad-simple-ui-plugin` into `@mlightcad/cad-simple-viewer`.

- Built-in plain-DOM toolbar + dock palettes enable by default via `AcApDocManagerOptions.simpleUi` (opt out with `simpleUi: false`). Chrome loads lazily through a dynamic import when enabled.
- `cad-editor` reuses the shared DOM find / design-review / measurements palettes; the Vue layer manager remains editor-only.
- Remove the separate `@mlightcad/cad-simple-ui-plugin` package and the `@mlightcad/cad-simple-viewer/simple-ui` / `/find` subpaths; import types and helpers from `@mlightcad/cad-simple-viewer` and pass toolbar/dock options through `simpleUi`.
- Read chrome via `simpleUi` / `simpleUiReady` (replaces `simpleUiPlugin` and `pluginManager.getPlugin('SimpleUiPlugin')`).
