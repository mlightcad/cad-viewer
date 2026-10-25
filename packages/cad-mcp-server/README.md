# @mlightcad/cad-mcp-server

stdio [Model Context Protocol](https://modelcontextprotocol.io) server that lets
third-party agents (Claude Code, Cursor, Codex, …) drive CAD drawings through
the same **script-first** API as the in-app CAD Agent.

## Why scripts, not hundreds of tools?

MCP is a great way to connect agents to CAD. It is a poor place to re-export
every drawing primitive as its own tool. A catalog of `draw_line`,
`draw_circle`, `set_entity_layer`, … never finishes, burns tokens on every
request, and still cannot cover one-off analysis (“find bolt-hole outliers by
layer and report them”).

This server follows the design in
[Building a CAD Agent: MCP, Tools, or Let AI Write Code?](https://dev.to/mlightcad/building-a-cad-agent-mcp-tools-or-let-ai-write-code-2nc4):

- **Tools** for clear lifecycle steps (open / blank drawing)
- **Scripts** for combining the CAD API into analysis, edits, and verification

The model writes a `cad.*` function body; the headless viewer runs it. Same
runtime as the in-app CAD Agent (`@mlightcad/cad-agent-core`), so external
agents (Claude Code, Cursor, Codex, …) get flexibility without a ballooning
tool list — and with lower token and round-trip cost for bulk work.

## Tools (intentionally small)

| Tool | Purpose |
| --- | --- |
| `open_drawing` | Open a local/remote DXF/DWG, or omit `path` for a blank ISO template |
| `execute_cad_script` | Run a `cad.*` JavaScript function body ([script API](https://mlightcad.github.io/cad-viewer/guide/script/overview.html)) |

There are **no** per-entity `draw_line` / `draw_circle` tools. All drawing,
queries, edits, and context live inside one script call.

## Works with cad-simple-viewer and cad-viewer

Both products share `AcApDocManager` from `@mlightcad/cad-simple-viewer`. This
server’s headless runner boots that kernel (not the Vue UI package). Scripts
you write for the Script panel or CAD Agent in either product are valid here,
and the reverse is true.

This package does **not** depend on `@mlightcad/cad-viewer`.

## Requirements

- Node.js ≥ 20
- Chromium for Playwright (`pnpm --filter @mlightcad/cad-mcp-server install-browser`)

## Install / run

```bash
pnpm --filter @mlightcad/cad-mcp-server build
pnpm --filter @mlightcad/cad-mcp-server install-browser
cad-mcp-server
# or: node packages/cad-mcp-server/dist/cli.js
```

## MCP client config

### Cursor (`.cursor/mcp.json`)

Prefer `${workspaceFolder}` over a hardcoded absolute path or a bare
relative path (MCP cwd is not always the repo root):

```json
{
  "mcpServers": {
    "cad": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/cad-mcp-server/dist/cli.js"
      ]
    }
  }
}
```

### Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "cad": {
      "command": "npx",
      "args": ["-y", "@mlightcad/cad-mcp-server"]
    }
  }
}
```

(After the package is published; for local monorepo use the `node …/dist/cli.js` form.)

## Typical flow

1. `open_drawing` with `{ "path": "./plan.dxf", "mode": "write" }`  
   (local path or http(s) URL; omit `path` to start blank).
2. `execute_cad_script` with a function body:

```js
let id
cad.edit.transaction('circle', tx => {
  id = tx.drawCircle({ center: { x: 0, y: 0 }, radius: 100 })
})
cad.view.zoomExtents()
return cad.measure.report([
  cad.measure.check('r', 100, cad.measure.radius(id))
])
```

`cad.view.capturePreview` is enabled; screenshots are returned as MCP image
content.

## Architecture

```
MCP client  --stdio-->  cad-mcp-server (Node)
                           |
                           | Playwright (lazy)
                           v
                     headless Chromium
                     cad-simple-viewer + cad-agent-core
                     createCadToolCatalog / execute_cad_script
```

The browser session stays alive for the process lifetime so drawing state
persists across tool calls.

## Library API

```ts
import {
  createCadMcpServer,
  registerCadMcpTools,
  CadMcpSession
} from '@mlightcad/cad-mcp-server'
```

`registerCadMcpTools` maps the same tool surface for a custom `McpServer`
(e.g. a future in-page WebMCP host that already has `AcApDocManager`).

## Related packages

- `@mlightcad/cad-agent-core` — script host and tool catalog
- `@mlightcad/cad-agent-plugin` — in-app chat agent
- `@mlightcad/cad-script-plugin` — manual script console
- `@mlightcad/cad-simple-viewer-cli` — AutoCAD `.scr` headless CLI (different script model)
