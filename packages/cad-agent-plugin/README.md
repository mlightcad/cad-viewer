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

The manual script console lives in [`@mlightcad/cad-script-plugin`](../cad-script-plugin/README.md). This package does not register `cadscript`.

## CAD tools

Tool schemas and execution live in [`@mlightcad/cad-agent-core`](../cad-agent-core/README.md). This package maps that catalog onto the AI SDK.

- `execute_cad_script` — all drawing, queries, edits, selection, zoom, and context (`cad.drawing`)

Agent mode defaults to Simple (no screenshot verification). Enable High inference
in the panel for opt-in visual verification on complex tasks.
