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

The model writes a `cad.*` function body; the Chromium viewer runs it (headless
or with a visible window). Same runtime as the in-app CAD Agent
(`@mlightcad/cad-agent-core`), so external agents get flexibility without a
ballooning tool list — and with lower token and round-trip cost for bulk work.

## Tools (intentionally small)

| Tool | Purpose |
| --- | --- |
| `open_drawing` | Open a local/remote DXF/DWG, or omit `path` for a blank ISO template |
| `execute_cad_script` | Run a `cad.*` JavaScript function body ([script API](https://mlightcad.github.io/cad-viewer/guide/script/overview.html)) |

Both tools accept optional `visible`:

| `visible` | Browser | Session lifecycle |
| --- | --- | --- |
| `false` / omit | Headless Chromium | Reused across tool calls; **auto-closes after idle** (default 30s) |
| `true` | Visible Chromium window | Stays open so the user can watch the drawing |

The agent chooses based on the user prompt (e.g. “open the browser so I can
see the drawing” → `visible: true`; batch QA → headless). Changing `visible`
after a session started rebuilds the browser and **resets drawing state**.

There are **no** per-entity `draw_line` / `draw_circle` tools. All drawing,
queries, edits, and context live inside one script call.

## Works with cad-simple-viewer and cad-viewer

Both products share `AcApDocManager` from `@mlightcad/cad-simple-viewer`. This
server’s runner boots that kernel (not the Vue UI package). Scripts you write
for the Script panel or CAD Agent in either product are valid here, and the
reverse is true.

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

### Environment variables

| Variable | Purpose |
| --- | --- |
| `CAD_MCP_VISIBLE=1` | Default headed when tools omit `visible` |
| `CAD_MCP_IDLE_CLOSE_MS` | Headless idle auto-close delay in ms (default `30000`) |

## MCP client config

### Cursor (this monorepo)

`npx` from the workspace root crashes npm (Arborist + workspace link). Use the
launcher, which runs npx from the OS temp directory:

```json
{
  "mcpServers": {
    "cad": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/cad-mcp-server/scripts/run-published.mjs"
      ]
    }
  }
}
```

Override the pin with `CAD_MCP_SERVER_VERSION` (default `1.7.8-preview.1`).

To force a visible browser by default (agent can still pass `visible: false`):

```json
{
  "mcpServers": {
    "cad": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/cad-mcp-server/dist/cli.js"
      ],
      "env": {
        "CAD_MCP_VISIBLE": "1"
      }
    }
  }
}
```

### Claude Code / Claude Desktop (outside this repo)

```json
{
  "mcpServers": {
    "cad": {
      "command": "npx",
      "args": [
        "-y",
        "--package=@mlightcad/cad-mcp-server@1.7.8-preview.1",
        "cad-mcp-server"
      ]
    }
  }
}
```

For local monorepo development against an unbuilt/unpublished tree, point at
the built CLI instead:

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

## Typical flow

1. `open_drawing` with `{ "path": "./plan.dxf", "mode": "write" }`  
   (local path or http(s) URL; omit `path` to start blank).  
   Add `"visible": true` when the user should see the drawing.
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

Save the drawing after edits:

```js
cad.file.saveDxf('./plan-out.dxf')
```

The MCP server writes that path (relative to the server process working
directory). The DXF text is not sent back to the model; the tool result
includes `savedFiles` with the absolute path. In the in-app CAD agent the same
call downloads the file instead.

## Architecture

```
MCP client  --stdio-->  cad-mcp-server (Node)
                           |
                           | Playwright (lazy)
                           v
                     Chromium (headless or headed)
                     cad-simple-viewer + cad-agent-core
                     createCadToolCatalog / execute_cad_script
```

Headless sessions persist across tool calls until idle timeout. Headed sessions
stay open until the MCP process exits.

## Library API

```ts
import {
  createCadMcpServer,
  registerCadMcpTools,
  CadMcpSession,
  resolveVisible
} from '@mlightcad/cad-mcp-server'
```

`registerCadMcpTools` maps the same tool surface for a custom `McpServer`
(e.g. a future in-page WebMCP host that already has `AcApDocManager`).

## Related packages

- `@mlightcad/cad-agent-core` — script host and tool catalog
- `@mlightcad/cad-agent-plugin` — in-app chat agent
- `@mlightcad/cad-script-plugin` — manual script console
- `@mlightcad/cad-simple-viewer-cli` — AutoCAD `.scr` headless CLI (different script model)
