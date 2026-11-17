---
'@mlightcad/cad-script-core': minor
'@mlightcad/cad-agent-core': minor
'@mlightcad/cad-agent-plugin': minor
'@mlightcad/cad-script-plugin': patch
'@mlightcad/cad-mcp-server': patch
---

feat(agent): evidence-tracked image redraw with `cad.redraw`

Port the image-to-CAD redraw workflow into the script runtime. Scripts build a
semantic spec (profile, units, per-view calibration, evidence levels,
constraints, entities, checks); `cad.redraw.validate` checks it,
`cad.redraw.draw` draws it in one undo group on standard layers (OBJECT,
HIDDEN, CENTER, DIM, TEXT, TABLE, BORDER, CONSTRUCTION, ASSUMPTION) with real
dimensions, leaders, text, and line-drawn tables, and `cad.redraw.inspect`
compares readable dimension values with the drawn geometry. Results carry a
`pass` / `pass_with_warnings` / `needs_review` / `blocked` / `fail` status.
Image pixel coordinates can be mapped through dimension-anchor, similarity,
affine, or homography calibrations. Drawing sets `INSUNITS` from the spec
units, uses a CJK-capable `REDRAW_TEXT` style for text and dimension text, and
falls back to lines + text (or a leader) when a dimension cannot be created.

Also add `tx.drawLeader` (LEADER with an associated MTEXT annotation),
`rotationDeg` / `width` on `tx.drawText`, and fix two drawing bugs: `drawText`
set an MTEXT height property that does not exist (text drew with height 0), and
`drawArc` passed degrees where radians are expected. The agent prompt gains an
IMAGE REDRAW section and a "Redraw image as editable CAD" suggested task, and
the MCP `execute_cad_script` description includes the spec reference.
