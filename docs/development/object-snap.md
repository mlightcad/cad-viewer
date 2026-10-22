---
title: "Object Snap (OSNAP)"
---

# Object Snap (OSNAP)

This page explains how OSNAP works in **cad-viewer** with data from **realdwg-web**.

## Background

In AutoCAD/ObjectARX, each entity can override `getOsnapPoints(...)` to return candidate snap points for a specific snap mode.

In `realdwg-web`, we use a similar pattern with `subGetOsnapPoints(...)` on each entity class.  
`cad-viewer` consumes those returned points to perform snapping in the UI.

Reference:
- AutoCAD ObjectARX `getOsnapPoints`: https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-__OVERLOADED_getOsnapPoints_AcDbEntity

## Core API in realdwg-web

Base definition:
- `AcDbEntity.subGetOsnapPoints(osnapMode, pickPoint, lastPoint, snapPoints, gsMark?)`

Parameters:

- `osnapMode`: one mode each call
- `pickPoint`: current cursor world point
- `lastPoint`: previous committed point in command flow
- `snapPoints`: output array to append candidate points
- `gsMark` (optional): sub-entity id, currently important for `INSERT` (`AcDbBlockReference`) sub-entity snapping

## Supported OSNAP modes

Defined in `AcDbOsnapMode`:
- `EndPoint = 1`
- `MidPoint = 2`
- `Center = 3`
- `Node = 4`
- `Quadrant = 5`
- `Insertion = 7`
- `Perpendicular = 8`
- `Tangent = 9`
- `Nearest = 10`
- `Centroid = 11`

Important:

- These values are ordinal ids, not bit flags.
- Use `acdbOsnapModesToMask(...)` and `acdbMaskToOsnapModes(...)` for mask conversion.

## Current cad-viewer UI exposure

Status bar (`MlOsnapButton.vue`) currently exposes:

- EndPoint
- MidPoint
- Center
- Node
- Quadrant
- Insertion

Not exposed in UI yet (commented out):

- Perpendicular
- Tangent
- Nearest
- Centroid

Default enabled mask in settings (`AcApSettingManager`):

- EndPoint + MidPoint + Center

## Runtime Flow in cad-simple-viewer

1. `AcEdFloatingInput.getPosition()` calls `getOsnapPoint()`.
2. `getOsnapPoint()` calls `getOsnapPoints()`.
3. `getOsnapPoints()` runs `view.pick(point, hitRadius)`.
4. For each picked item:
- resolve model-space entity by `item.id`
- if `item.children` exists, call entity osnap with `gsMark = child.id`
- otherwise call entity osnap without `gsMark`
5. For each active mode in current mask, call `entity.subGetOsnapPoints(...)`.
6. Choose nearest returned point to cursor.
7. Apply world-distance threshold converted from screen `hitRadius` (default 20 px).
8. If accepted, snap cursor and show marker.

## Entity Implementation Snapshot (from realdwg-web code)

- `AcDbLine`: EndPoint, MidPoint, Nearest, Perpendicular (`Tangent` branch exists but no point)
- `AcDbArc`: EndPoint, MidPoint, Nearest, Tangent (`Perpendicular` branch exists but no point)
- `AcDbCircle`: Center, Centroid, Quadrant, Nearest, Tangent
- `AcDbEllipse`: EndPoint (open arc only), MidPoint (open arc only), Quadrant (closed ellipse only)
- `AcDbPolyline`: EndPoint
- `AcDb2dPolyline`: EndPoint
- `AcDb3dPolyline`: EndPoint
- `AcDbPoint`: Node
- `AcDbText`: Insertion
- `AcDbMText`: Insertion
- `AcDbBlockReference` (`INSERT`): Insertion + delegated sub-entity snapping via `gsMark`
- Additional entities with limited support:
- `AcDbRay`: EndPoint (base point)
- `AcDbFace`: EndPoint (vertices)
- `AcDbTrace`: EndPoint (vertices)
- `AcDbSpline`: EndPoint

## INSERT (`AcDbBlockReference`) OSNAP Logic

`subGetOsnapPoints` has two paths:

1. `Insertion` mode:
- directly pushes block reference insertion point (`this._position`)

2. Other modes:
- only works when `gsMark` is provided
- delegates to `subEntityGetOsnapPoints(...)`

Delegation flow (`subEntityGetOsnapPoints`):

1. Guard: if `gsMark === this.objectId`, return (avoid recursion)
2. Resolve entity by `blockTable.getEntityById(gsMark)`
3. Call that sub-entity’s `subGetOsnapPoints(...)`
4. Transform returned points by this block reference `blockTransform`
5. Push transformed points to output

## Why INSERT snapping can fail (current behavior)

1. No `gsMark`:
- For non-`Insertion` modes, `AcDbBlockReference` returns nothing if `gsMark` is missing.

2. `gsMark` model is simplified:
- Current `gsMark` is sub-entity object id from spatial child hits, not full AutoCAD GS marker semantics.

3. Layer-grouped rendering for INSERT:
- Rendering may split one INSERT into multiple layer-based render groups with same parent object id.
- Picking relies on hierarchical child boxes to recover sub-entity ids.

4. Complex/nested/edge transforms:
- Delegation applies `blockTransform` of the current INSERT.
- Edge cases (for example nested block scenarios or non-default normal/extrusion cases) can still produce incorrect or missing snap points.

This matches the known roadmap note in `README.md`:
- Endpoint snapping for INSERT is not fully reliable yet.

## Known Limitations / TODO

- OSNAP coverage is entity-dependent; many mode/entity combinations are intentionally not implemented yet.
- INSERT non-insertion snapping depends on correct child hit -> `gsMark` propagation.
- Current marker mechanism is object-id based and not full AutoCAD GS marker behavior.
- More regression tests are needed for INSERT, especially nested blocks and transformed blocks.

## Recommended Contribution Direction

- Improve robustness of child-hit to `gsMark` mapping for INSERT.
- Add nested block regression tests for EndPoint/MidPoint/Center/Nearest/Tangent cases.
- Expand per-entity mode coverage incrementally.
- Align marker model closer to AutoCAD GS marker semantics when feasible.


