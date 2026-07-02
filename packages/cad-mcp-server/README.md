# @mlightcad/cad-mcp-server

An [MCP](https://modelcontextprotocol.io) server that exposes cad-viewer's drawing tools to
Claude Code, Codex, and other MCP-compatible clients.

It reuses the exact tool set and execution logic already used by the in-app CAD Agent
(`@mlightcad/cad-agent-plugin`'s `cadActionExecutor`). Under the hood, the server drives a
headless Chromium session (via Playwright) that boots `@mlightcad/cad-simple-viewer` and
runs drawing operations against a live in-memory document — the same way a user's browser
tab would.

## Setup

```bash
pnpm --filter @mlightcad/cad-mcp-server build
pnpm --filter @mlightcad/cad-mcp-server install-browser  # one-time: installs headless Chromium
```

## Using with Claude Code

Add the server to your MCP config (e.g. `.mcp.json` in the repo root, or via `claude mcp add`):

```json
{
  "mcpServers": {
    "cad-mcp-server": {
      "command": "node",
      "args": ["packages/cad-mcp-server/dist/cli.js"]
    }
  }
}
```

## Using with Codex or other MCP clients

Point the client at the same stdio command:

```bash
node packages/cad-mcp-server/dist/cli.js
```

## Tools

| Tool | Description |
| --- | --- |
| `open_drawing` | Open a DXF or DWG file from a local path into the active session |
| `get_drawing_context` | Get current layers, units, and drawing extents |
| `draw_line` | Draw a straight line segment |
| `draw_circle` | Draw a circle by center and radius |
| `draw_arc` | Draw an arc by center, radius, and start/end angles |
| `draw_rectangle` | Draw a rectangle from two opposite corners |
| `draw_polyline` | Draw a polyline through a list of points |
| `draw_text` | Draw single-line MTEXT at a position |
| `set_current_layer` | Set the current drawing layer (CLAYER) |
| `create_layer` | Create a new layer if it does not exist |
| `zoom_extents` | Zoom the view to show the full drawing extents |

One headless browser session is started lazily on the first tool call and kept alive for
the lifetime of the MCP server process, so drawing state persists across calls within one
session. Set `CAD_MCP_HEADLESS=false` to run the session in a visible browser window for
debugging.

## Scope

This first version covers the same drawing/editing tool set as the in-app CAD Agent.
Export tools (DXF/PNG/PDF/HTML) are not yet exposed here and are a natural follow-up.
