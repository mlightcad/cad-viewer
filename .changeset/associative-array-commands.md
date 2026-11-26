---
'@mlightcad/cad-simple-viewer': minor
'@mlightcad/cad-editor': minor
---

feat(array): add ARRAY / ARRAYRECT / ARRAYPOLAR / ARRAYPATH / ARRAYEDIT / ARRAYCLOSE

Registers AutoCAD-style array commands (alias `AR`) on associative arrays from
`@mlightcad/data-model`, with `ARRAYASSOCIATIVITY`, `ARRAYTYPE`, and
`ARRAYEDITSTATE`, EXPLODE cleanup, count grips, and end-of-command
`evaluateTopLevelNetwork`. ARRAY defaults from `ARRAYTYPE`; ARRAYCLOSE is
registered (no-op until ARRAYEDIT Source mode sets `ARRAYEDITSTATE`). The
editor Home → Modify ribbon gains an Array dropdown (rectangular / polar /
path). Shows a live creation preview (AutoCAD ARRAY behavior; not gated by
`COMMANDPREVIEW`). Polar fill angle correctly converts `getAngle` degrees to
radians. Requires a `data-model` release that includes the assoc framework.
