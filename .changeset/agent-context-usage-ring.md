---
'@mlightcad/cad-agent-plugin': patch
---

feat(agent): show a Cursor-style context usage ring with category breakdown

Report last-step prompt tokens after each model step, render a circular meter
beside the model selector, and open a categorized usage popover (system prompt,
tool definitions, images when present, conversation).
