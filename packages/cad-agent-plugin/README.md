# @mlightcad/cad-agent-plugin

Natural-language CAD drawing agent for [cad-viewer](https://github.com/mlightcad/cad-viewer).

## Features

- Lazy-loaded `AcApPlugin` (trigger command: `agent`)
- Vercel AI SDK `Experimental_Agent` with CAD tool calling
- Vue chat panel (`@ai-sdk/vue` `Chat` + custom transport)
- Browser-side API key (OpenAI / Anthropic / OpenAI-compatible)

## Usage in cad-viewer

```typescript
import { registerLazyAgentPlugin } from '@mlightcad/cad-agent-plugin/register'

registerLazyAgentPlugin(AcApDocManager.instance.pluginManager)
```

Run `agent` from the ribbon or command line to open the chat panel.
Run `cadscript` to open the manual script console.

## Script console

`CadScriptPanel` calls `executeCadScript` on the active drawing. It does not
need an API key. The same checks and limits as the agent tool apply: the body
is a function with one argument, `cad`, and it cannot touch the page.

`cad-simple-viewer-example` adds a toolbar button and a dock tab for this panel.
`cad-viewer` adds a tool-palette tab. Both hosts register an opener so the
`cadscript` command can show the panel.

## CAD tools

Tool schemas and execution live in [`@mlightcad/cad-agent-core`](../cad-agent-core/README.md). This package maps that catalog onto the AI SDK.

- `get_drawing_context`
- `draw_*`, `set_current_layer`, `create_layer`, `delete_entities`, `zoom_extents`
- `execute_cad_script` for queries, batch edits, and selection highlighting
