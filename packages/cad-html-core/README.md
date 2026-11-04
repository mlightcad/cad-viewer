# @mlightcad/cad-html-core

Shared ACEX snapshot schema, codecs, scene batch collection, and HTML/package
assembly for offline CAD HTML export.

This package has **no** dependency on `@mlightcad/cad-simple-viewer` or the DOM.
Browser plugins and Node exporters both consume it.

## Public surface

- Snapshot types and encode/decode (`acexHtmlEncodeSnapshot`, codecs, gzip)
- Geometry collection (`acexHtmlCollectBatchesFromObject3D`)
- OSNAP catalogs from `AcDbDatabase`
- `acexHtmlPackHtml` / `acexHtmlPackHtmlEmbeddedPackage` / `acexHtmlBuildPackage` / zip
- Scene-agnostic snapshot assembly (`acexHtmlBuildSnapshotFromExportScene`)

## Peers

- `@mlightcad/data-model`
- `@mlightcad/three-renderer`
- `three`
