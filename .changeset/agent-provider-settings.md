---
'@mlightcad/cad-agent-plugin': minor
---

feat(agent): redesign the agent palette model settings around providers

The settings card now has two modes, modelled on the DeepSeek harness web UI:
"Third-party providers" (DeepSeek, DeepSeek VL, OpenAI, Anthropic — enter an
API key, optionally override the base URL under "Custom settings") and
"Custom model API" (Provider ID, display name, API URL, protocol — OpenAI Chat
Completions, OpenAI Responses or Anthropic Messages — and API key). Each
provider keeps its own model catalog with per-model image support, editable by
hand or filled via "Fetch available models", which queries the endpoint's
`/models` listing with the values in the form and opens a searchable picker.
Several providers can be configured at once; the input-bar model selector
lists the models of every provider that has a key. Settings saved by earlier
versions are migrated automatically (`openai-compatible` becomes a custom
provider).
