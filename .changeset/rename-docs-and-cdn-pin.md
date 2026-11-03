---
'@mlightcad/cad-demo-gallery': patch
---

docs: explain the `@mlightcad/cad-viewer` → `@mlightcad/cad-editor` rename and unbreak the CDN bootstrap

The upgrade guide in all seven locales now opens with a warning that states the
1.8.0 rename, why `@mlightcad/cad-viewer` no longer receives releases, that the
API is unchanged, and how to migrate the dependency, the import specifier, and
version-pinned CDN URLs. The root READMEs keep pointing their npm downloads
badge and the `cad-editor-demo` link at `@mlightcad/cad-viewer`, because that is
still the published package until 1.8.0 ships.

The zero-build CDN bootstrap demo pinned `@mlightcad/cad-editor@1.7.7`, which
does not exist on npm and returned 404. It loads the published
`@mlightcad/cad-viewer@1.7.7` bundle again, and fixes the undefined
`CAD_VIEWER_URL` reference that crashed the inline loader.
