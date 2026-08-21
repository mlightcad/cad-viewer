# @mlightcad/cad-diff-viewer

Reusable side-by-side / overlay CAD comparison widget. It depends on
[`@mlightcad/cad-simple-viewer`](../cad-simple-viewer) and creates both WebGL
canvases internally — the host only supplies a parent container.

## Usage

```ts
import { AcApDiffViewer } from '@mlightcad/cad-diff-viewer'

const viewer = new AcApDiffViewer({
  container: document.getElementById('diff-host')!,
  compareColors: {
    unchanged: 0x9ca3af,
    deleted: 0xe11d48, // left / old
    added: 0x22c55e, // right / new
    modified: 0xe11d48
  },
  webworkerFileUrls: {
    mtextRender: './workers/mtext-renderer-worker.js',
    dwgParser: './workers/libredwg-parser-worker.js'
  }
})

await viewer.openDocument('left', file.name, await file.arrayBuffer())
```

### Features

- Side-by-side or overlay view modes
- Drop a DWG/DXF onto a pane, or click the pane / open-file icon
- Compare results panel (by change kind or entity type) with prev/next navigation
- Markup tools (cloud, callout, text, rect, circle, arrow, stamp, …)
- Compare display mode: gray base, deleted red, added green (configurable)
- Strings go through `AcApI18n` (`diffViewer.*`)

`AcApDocManager` is a process singleton. Mount `AcApDiffViewer` on a page that
does not already host another CAD viewer.

DWG parsing is not bundled. Register a converter in the host (see the
[`cad-diff-viewer-example`](../cad-diff-viewer-example) demo).
