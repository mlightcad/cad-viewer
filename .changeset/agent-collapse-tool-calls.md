---
'@mlightcad/cad-agent-plugin': minor
---

feat(agent): collapse tool calls once an agent response completes

Tool calls in the agent palette are now grouped under a one-line summary per
response ("Tool calls: 3", plus a failed count when any failed). The group stays
expanded while the response is streaming so progress is visible, collapses
when that response finishes, and can be expanded or collapsed by clicking the
summary.
