# @mlightcad/cad-html-core

Shared ACEX snapshot schema, codecs, scene batch collection, and HTML/package
assembly for offline CAD HTML export.

This package has **no** dependency on `@mlightcad/cad-simple-viewer` or the DOM.
Browser plugins and Node exporters both consume it.

## Public surface

- Snapshot types and encode/decode (`encodeSnapshot`, codecs, gzip)
- Geometry collection (`collectBatchesFromObject3D`)
- OSNAP catalogs from `AcDbDatabase`
- `packHtml` / `packHtmlEmbeddedPackage` / `buildAcExPackage` / zip
- Scene-agnostic snapshot assembly (`buildSnapshotFromExportScene`)

## Peers

- `@mlightcad/data-model`
- `@mlightcad/three-renderer`
- `three`
