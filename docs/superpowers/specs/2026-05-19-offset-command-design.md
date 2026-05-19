# Offset Command Design

**Date:** 2026-05-19  
**Feature:** `OFFSET` command for `@pccc/cad-simple-viewer` and `@pccc/cad-viewer`

---

## Overview

Implement an AutoCAD-compatible `OFFSET` command that creates a parallel copy of a selected entity at a specified distance. Supports all major entity types: Line, Arc, Circle, Polyline, Ellipse, and Spline.

---

## 1. Command Flow

1. Prompt for offset distance — or `Through` keyword to pick a pass-through point instead of typing a distance.
2. Select a single entity to offset (one at a time, not a selection set).
3. Pick a side — click on the side of the entity to offset toward.
4. Offset entity is created and added to the database on the same layer as the source (unless `Layer=Current` is active).
5. Loop back to step 2 with the same distance — keep prompting for more entities until the user cancels (Escape or Enter with no selection).

**Keywords available at the distance prompt:**
- `Through` — pick a point; distance is computed as perpendicular distance from that point to the entity
- `Erase` — toggle whether the source entity is deleted after offsetting (default: No)
- `Layer` — toggle whether the result goes on the source entity's layer or the current layer (default: Source)

---

## 2. Geometry Engine

A pure utility module `AcApOffsetGeometry.ts` handles all math, decoupled from the command class.

### Analytic (exact) — no Clipper

| Entity | Result type | Logic |
|---|---|---|
| `AcDbLine` | `AcDbLine` | Translate start/end perpendicular to line direction by ±distance |
| `AcDbArc` | `AcDbArc` | Same center and angles; radius ±distance |
| `AcDbCircle` | `AcDbCircle` | Same center; radius ±distance |
| `AcDbEllipse` | `AcDbEllipse` | Same center/axes; both `majorAxisRadius` and `minorAxisRadius` ±distance |

### Clipper-based (approximate) — via `@doodle3d/clipper-js`

| Entity | Result type | Logic |
|---|---|---|
| `AcDbPolyline` | `AcDbPolyline` | Convert vertices+bulges to Clipper path; run `ClipperOffset`; reconstruct polyline |
| `AcDbSpline` | `AcDbPolyline` | Sample spline control points to dense point array; run Clipper offset; result is a polyline (no exact parallel spline exists) |

### Side detection

`pickSide(entity, pickPoint): 1 | -1`

- **Line:** cross product of line direction and (pickPoint − lineStart); sign of Z component
- **Arc/Circle:** distance from pickPoint to center vs radius — inside = negative offset, outside = positive
- **Ellipse:** same as circle but using normalized ellipse distance
- **Polyline/Spline:** nearest segment, then cross product against that segment

### Clipper coordinate scaling

Clipper uses 32-bit integer math internally. All coordinates are multiplied by `1e6` before passing to Clipper and divided by `1e6` after, giving sub-micron precision for typical CAD drawings (coordinates up to ±2147 units at this scale).

### Invalid offset handling

- If the offset would produce a degenerate result (e.g., arc radius goes negative, circle radius ≤ 0), the command shows an error message and re-prompts for a new side or cancels gracefully.

---

## 3. Command Structure

**File:** `packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts`

### State machine

```
DistanceState → SelectEntityState → PickSideState → [loop to SelectEntityState]
```

**`DistanceState`**
- Prompts: `Specify offset distance or [Through/Erase/Layer]:`
- On numeric input: stores distance, transitions to `SelectEntityState`
- On `Through`: transitions to `SelectEntityState` with `through=true`
- On `Erase`/`Layer`: toggles flag, re-prompts same state
- Distance value persists across the entity loop

**`SelectEntityState`**
- Single-entity pick via `AcApDocManager.instance.editor.getEntity(options)` (not `getSelection`)
- Validates entity is one of: `AcDbLine`, `AcDbArc`, `AcDbCircle`, `AcDbPolyline`, `AcDbEllipse`, `AcDbSpline`
- If unsupported type: shows "Cannot offset this object" and re-prompts
- Escape/Enter with no pick: exits command

**`PickSideState`**
- Prompts: `Specify point on side to offset or [Through/Multiple/Undo]:`
- Live preview jig shows offset result as transient entity while cursor moves
- On pick: calls `pickSide()` to determine sign, calls geometry engine, adds result to database
- If `Through` mode: distance = perpendicular distance from picked point to entity; then creates offset

### Preview jig

`AcApOffsetPreviewJig` extends `AcEdPreviewJig<AcGePoint3dLike>`:
- Holds a reference to the source entity
- On each `update(point)`: calls `pickSide(entity, point)` and the appropriate offset function, replaces the transient entity
- Handles degenerate cases silently (no transient shown if offset would be invalid)

### Entity creation

After computing the offset entity:
1. Set `layerId` to source entity's layer (or current layer if `Layer=Current`)
2. Copy color, linetype, lineweight from source entity
3. Append to the current block table record via `blockTable.appendEntity(offsetEntity)`
4. Call `context.view.updateEntity(offsetEntity)` and `offsetEntity.triggerModifiedEvent()`
5. If `Erase=Yes`: erase source entity

---

## 4. Registration & Integration

### Command registration

In `AcApDocManager.ts` `registerCommands()`:
```ts
addSystemCommand('offset', 'offset', new AcApOffsetCmd())
```

### Module exports

- `packages/cad-simple-viewer/src/command/modify/index.ts` — add `export * from './AcApOffsetCmd'`
- `packages/cad-simple-viewer/src/command/index.ts` — already re-exports from `modify/index.ts`

### i18n strings

**`src/i18n/en/jig.ts`** — add `offset` key:
```ts
offset: {
  distanceOrOptions: 'Specify offset distance or',
  selectObject: 'Select object to offset or',
  sideToOffset: 'Specify point on side to offset or',
  through: 'Specify through point:',
  eraseSourceYes: 'Erase source objects after offsetting? [Yes/No]',
  layerCurrent: 'Enter layer option for offset objects [Current/Source]:',
  cannotOffset: 'Cannot offset this object.',
  invalidDistance: 'Offset distance must be positive.',
  keywords: {
    through: { display: 'Through(T)', global: 'Through', local: 'Through' },
    erase: { display: 'Erase(E)', global: 'Erase', local: 'Erase' },
    layer: { display: 'Layer(L)', global: 'Layer', local: 'Layer' },
    yes: { display: 'Yes(Y)', global: 'Yes', local: 'Yes' },
    no: { display: 'No(N)', global: 'No', local: 'No' },
    current: { display: 'Current(C)', global: 'Current', local: 'Current' },
    source: { display: 'Source(S)', global: 'Source', local: 'Source' },
  }
}
```

**`src/i18n/en/command.ts`** — add offset description entry.

### Ribbon button

In `MlRibbonCommands.vue`, add to `home-modify-main` collection (alongside move/rotate/copy):
```ts
{
  id: 'cmd-offset',
  type: 'button',
  label: t('main.ribbon.command.offset'),
  tooltip: ribbonTooltips.offset,
  size: 'small',
  props: { icon: offset }  // custom SVG — create packages/cad-viewer/src/svg/offset.svg and export from svg/index.ts
}
```

Add corresponding tooltip and i18n entries in the viewer's locale files.

### Dependency

Add to `packages/cad-simple-viewer/package.json`:
```json
"@doodle3d/clipper-js": "1.0.11"
```

---

## 5. Files to Create / Modify

| Action | File |
|---|---|
| **Create** | `packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts` |
| **Create** | `packages/cad-simple-viewer/src/command/modify/AcApOffsetGeometry.ts` |
| **Modify** | `packages/cad-simple-viewer/src/command/modify/index.ts` |
| **Modify** | `packages/cad-simple-viewer/src/app/AcApDocManager.ts` |
| **Modify** | `packages/cad-simple-viewer/src/i18n/en/jig.ts` |
| **Modify** | `packages/cad-simple-viewer/src/i18n/en/command.ts` |
| **Modify** | `packages/cad-simple-viewer/package.json` |
| **Modify** | `packages/cad-viewer/src/component/layout/MlRibbonCommands.vue` |
| **Modify** | `packages/cad-viewer/src/i18n/en/` (ribbon labels/tooltips) |
| **Create** | `packages/cad-viewer/src/svg/offset.svg` (custom ribbon icon) |
| **Modify** | `packages/cad-viewer/src/svg/index.ts` (export offset icon) |

---

## 6. Out of Scope

- `AcDbMLine` offset (complex multi-line geometry, separate feature)
- `AcDbHatch` offset
- Offset of block references
- Undo within the offset loop (single Ctrl+Z undoes the last created entity via the existing undo stack)
