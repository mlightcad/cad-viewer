---
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-editor': patch
---

feat(agent): add suggested-task prompts in the agent palette toolbar

Add a toolbar icon that opens categorized common CAD tasks (extract,
stats, modify, create, review). Choosing a task inserts its prompt into
the chat composer for editing before send. Also bridge the landing
`AcApI18n` locale onto the full-viewer singleton so agent UI strings
follow the host language selector.
