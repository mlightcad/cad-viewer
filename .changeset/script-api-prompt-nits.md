---
'@mlightcad/cad-script-core': patch
'@mlightcad/cad-agent-plugin': patch
'@mlightcad/cad-script-plugin': patch
'@mlightcad/cad-mcp-server': patch
---

feat(agent): queue follow-ups, edit/resend messages, and relative timestamps

Add Cursor-style follow-up queueing while the agent is busy, inline edit/resend
for prior user turns, message copy, and relative timestamps. Also document
common `tx.draw*` argument names and allow object property keys named like
banned globals (`{ window: n }`) while still blocking free identifiers.
