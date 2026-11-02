---
"@mlightcad/cad-agent-plugin": patch
"@mlightcad/cad-script-core": patch
---

fix: send CAD tool results to the agent model again. `toModelOutput` destructured `{ output }`, but AI SDK v5 passes the raw tool result, so every `execute_cad_script` result reached the model as `null`. `CadToolDefinition.execute` now returns `Promise<ToolResult>` instead of `unknown`, and the plugin pins the `tool()` output type so a wrong signature is a type error.
