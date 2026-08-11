# @mlightcad/cad-simple-viewer-cli

## 1.5.11

### Patch Changes

- feat: adds headless .scr script support to the simple-viewer CLI and waits for the scene to become idle before export so rendered output is complete. Example app bundles are split so data-model and three stay cacheable, isolating example chunks, and HTML runtime plugin options are fixed for more reliable offline HTML export workflows.
- Updated dependencies
  - @mlightcad/cad-html-plugin@1.5.11
  - @mlightcad/cad-pdf-plugin@1.5.11
  - @mlightcad/cad-simple-viewer@1.5.11
  - @mlightcad/cad-svg-plugin@1.5.11
