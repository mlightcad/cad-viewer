# @mlightcad/cad-agent-core

Viewer binding for the CAD agent runtime. The script runtime itself lives in
[`@mlightcad/cad-script-core`](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-core), which depends only
on `@mlightcad/data-model`. This package connects that runtime to
`@mlightcad/cad-simple-viewer` and re-exports its whole API, so existing imports
from `@mlightcad/cad-agent-core` keep working.

`@mlightcad/cad-agent-plugin` maps the catalog onto the Vercel AI SDK.
`@mlightcad/cad-mcp-server` maps the same catalog over stdio MCP. An in-page
WebMCP adapter should also map this catalog instead of reimplementing drawing
operations.

This package does not depend on a model SDK or a UI framework.

## What the viewer binding adds

`createDocManagerSession()` returns a `CadSession` that reads
`AcApDocManager.instance` on each call, so an MDI document switch is visible to
the next tool. On top of the plain data-model behavior it:

- highlights `cad.selection` ids through the viewer selection set
- fits the camera for `cad.view.zoomExtents()`
- uses the scene extents for `cad.drawing.extents`
- renders `cad.view.capturePreview()` with `captureDrawingPreview` (WebGL)
- runs edits through `acapRunDatabaseEdit`, which notifies the UI about the
  undo stack after each commit

`createCadToolCatalog`, `executeCadScript`, `createCadScriptHost`, and
`CadActionExecutor` from this package behave as before: the session defaults
to `createDocManagerSession()`, and a custom session without `runEdit` or
`capturePreview` gets the viewer implementation of those hooks.

## When to use which package

- In a viewer app (chat plugin, script console, MCP runner page): use this
  package.
- Without a viewer (Node, worker, tests, batch jobs): use
  `@mlightcad/cad-script-core` and `createDatabaseSession(db)`. It does not load
  the viewer or a renderer.

Node hosts that only need the script API text can import
`@mlightcad/cad-script-core/script-api`. The older
`@mlightcad/cad-agent-core/script-api` entry still works and re-exports it.

See the [`cad-script-core` README](https://github.com/mlightcad/cad-viewer/tree/main/packages/cad-script-core) for the
script host API, checks, and limits.

## Peers

- `@mlightcad/cad-script-core`
- `@mlightcad/cad-simple-viewer`
- `@mlightcad/data-model`
