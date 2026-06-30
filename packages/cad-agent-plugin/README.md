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

Run `agent` from the ribbon or command line to open the panel.

## CAD tools (Phase 1)

- `get_drawing_context`
- `draw_line`, `draw_circle`, `draw_arc`, `draw_rectangle`, `draw_polyline`, `draw_text`
- `set_current_layer`, `create_layer`, `zoom_extents`
