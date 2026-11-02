---
"@mlightcad/cad-script-core": patch
"@mlightcad/cad-agent-core": patch
"@mlightcad/cad-mcp-server": patch
---

refactor: move the CAD script runtime into the new `@mlightcad/cad-script-core` package, which depends only on `@mlightcad/data-model`. It adds `createDatabaseSession(db)` for running scripts without a viewer. `CadSession` gains optional `runEdit` and `capturePreview` hooks, so viewer behavior is injected instead of imported. `@mlightcad/cad-agent-core` is now the viewer binding: it re-exports the runtime and keeps its existing API and defaults. The MCP server's Node side imports `@mlightcad/cad-script-core/script-api`.
