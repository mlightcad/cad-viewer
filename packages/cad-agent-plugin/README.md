# @mlightcad/cad-agent-plugin

Natural-language CAD drawing agent for [cad-viewer](https://github.com/mlightcad/cad-viewer).

## Why scripts, not hundreds of tools?

A CAD agent that only exposes fine-grained tools (`draw_line`, `draw_circle`,
…) tends to grow into a second CAD API for AI — still incomplete, expensive in
tokens, and weak on ad-hoc analysis.

This plugin maps a **script-first** catalog from
[`@mlightcad/cad-agent-core`](../cad-agent-core/README.md): the model writes
`cad.*` JavaScript, and the host runs it against the open drawing. Lifecycle
UI stays in the chat panel; drawing logic stays in code the model can iterate
on (filter, measure, edit, verify in one call).

That means fewer tool definitions in the prompt, less round-tripping for bulk
work, and built-in self-check via `cad.measure` — the same design used by
`@mlightcad/cad-mcp-server` for external agents.

Read more:
[Building a CAD Agent: MCP, Tools, or Let AI Write Code?](https://dev.to/mlightcad/building-a-cad-agent-mcp-tools-or-let-ai-write-code-2nc4)

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
