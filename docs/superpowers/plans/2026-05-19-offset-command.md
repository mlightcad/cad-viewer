# Offset Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an AutoCAD-compatible `OFFSET` command that creates parallel copies of Line, Arc, Circle, Polyline, Ellipse, and Spline entities at a user-specified distance.

**Architecture:** Hybrid approach — analytic math for Line/Arc/Circle/Ellipse (exact geometry preserved), Clipper-based path offsetting for Polyline/Spline (handles complex corner joins). A pure utility module `AcApOffsetGeometry.ts` handles all math, decoupled from the command class `AcApOffsetCmd.ts` which drives the state machine and UI.

**Tech Stack:** TypeScript, `@mlightcad/data-model` (entity types + geometry), `@doodle3d/clipper-js` (path offsetting for polylines/splines), Vitest (tests), Vue 3 (ribbon UI)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `packages/cad-simple-viewer/src/command/modify/AcApOffsetGeometry.ts` | Pure math: offset functions + side detection |
| Create | `packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts` | Command class, state machine, preview jig |
| Create | `packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts` | Unit tests for geometry module |
| Modify | `packages/cad-simple-viewer/src/command/modify/index.ts` | Export new command |
| Modify | `packages/cad-simple-viewer/src/app/AcApDocManager.ts` | Register `offset` command |
| Modify | `packages/cad-simple-viewer/src/i18n/en/jig.ts` | Add offset prompt strings |
| Modify | `packages/cad-simple-viewer/src/i18n/en/command.ts` | Add offset description |
| Modify | `packages/cad-simple-viewer/package.json` | Add `@doodle3d/clipper-js` dependency |
| Create | `packages/cad-viewer/src/svg/offset.svg` | Ribbon icon |
| Modify | `packages/cad-viewer/src/svg/index.ts` | Export offset icon |
| Modify | `packages/cad-viewer/src/component/layout/MlRibbonCommands.vue` | Add ribbon button |
| Modify | `packages/cad-viewer/src/locale/en/main.ts` | EN tooltip + label |
| Modify | `packages/cad-viewer/src/locale/vi/main.ts` | VI tooltip + label |
| Modify | `packages/cad-viewer/src/locale/zh/main.ts` | ZH tooltip + label |

---

## Task 1: Install dependency and scaffold geometry module

**Files:**
- Modify: `packages/cad-simple-viewer/package.json`
- Create: `packages/cad-simple-viewer/src/command/modify/AcApOffsetGeometry.ts`
- Create: `packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts`

- [ ] **Step 1: Add `@doodle3d/clipper-js` to cad-simple-viewer**

In `packages/cad-simple-viewer/package.json`, add to `"dependencies"`:
```json
"@doodle3d/clipper-js": "1.0.11"
```

- [ ] **Step 2: Install the dependency**

Run from repo root:
```bash
pnpm install
```
Expected: `@doodle3d/clipper-js` appears in `node_modules`.

- [ ] **Step 3: Write the failing test for `offsetLine`**

Create `packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  AcDbLine, AcDbArc, AcDbCircle, AcDbEllipse, AcDbPolyline,
  AcGePoint3d, AcGeVector3d, AcGePoint2d,
} from '@mlightcad/data-model'
import {
  offsetLine, offsetArc, offsetCircle, offsetEllipse, offsetPolyline, pickSide,
} from '../src/command/modify/AcApOffsetGeometry'

describe('offsetLine', () => {
  it('offsets a horizontal line upward by distance 2', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, 1)
    expect(result.startPoint.y).toBeCloseTo(2)
    expect(result.endPoint.y).toBeCloseTo(2)
    expect(result.startPoint.x).toBeCloseTo(0)
    expect(result.endPoint.x).toBeCloseTo(10)
  })
  it('offsets a horizontal line downward when side is -1', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, -1)
    expect(result.startPoint.y).toBeCloseTo(-2)
    expect(result.endPoint.y).toBeCloseTo(-2)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm vitest run packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts
```
Expected: FAIL — `offsetLine` not found.

- [ ] **Step 5: Create the geometry module**

Create `packages/cad-simple-viewer/src/command/modify/AcApOffsetGeometry.ts`:
```ts
import {
  AcDbArc, AcDbCircle, AcDbEllipse, AcDbEntity, AcDbLine,
  AcDbPolyline, AcDbSpline, AcGePoint2d, AcGePoint3d,
  AcGePoint3dLike, AcGeVector3d,
} from '@mlightcad/data-model'
import ClipperShape from '@doodle3d/clipper-js'

const CLIPPER_SCALE = 1e6

export function offsetLine(line: AcDbLine, distance: number, side: 1 | -1): AcDbLine {
  const s = line.startPoint
  const e = line.endPoint
  const dir = new AcGeVector3d(e.x - s.x, e.y - s.y, 0).normalize()
  const perp = new AcGeVector3d(-dir.y, dir.x, 0)
  const d = distance * side
  return new AcDbLine(
    new AcGePoint3d(s.x + perp.x * d, s.y + perp.y * d, s.z),
    new AcGePoint3d(e.x + perp.x * d, e.y + perp.y * d, e.z),
  )
}

export function offsetArc(arc: AcDbArc, distance: number, side: 1 | -1): AcDbArc | null {
  const r = arc.radius + distance * side
  if (r <= 0) return null
  return new AcDbArc(arc.center, r, arc.startAngle, arc.endAngle)
}

export function offsetCircle(circle: AcDbCircle, distance: number, side: 1 | -1): AcDbCircle | null {
  const r = circle.radius + distance * side
  if (r <= 0) return null
  return new AcDbCircle(circle.center, r)
}

export function offsetEllipse(ellipse: AcDbEllipse, distance: number, side: 1 | -1): AcDbEllipse | null {
  const major = ellipse.majorAxisRadius + distance * side
  const minor = ellipse.minorAxisRadius + distance * side
  if (major <= 0 || minor <= 0) return null
  return new AcDbEllipse(
    ellipse.center, ellipse.normal,
    new AcGeVector3d(major, 0, 0),
    major, minor, ellipse.startAngle, ellipse.endAngle,
  )
}

export function offsetPolyline(poly: AcDbPolyline, distance: number, side: 1 | -1): AcDbPolyline | null {
  const n = poly.numberOfVertices
  if (n < 2) return null
  const path = []
  for (let i = 0; i < n; i++) {
    const pt = poly.getPoint2dAt(i)
    path.push({ X: Math.round(pt.x * CLIPPER_SCALE), Y: Math.round(pt.y * CLIPPER_SCALE) })
  }
  const shape = new ClipperShape([path], poly.closed, true, false)
  const offsetShape = shape.offset(distance * side * CLIPPER_SCALE, {
    jointType: 'jtMiter',
    endType: poly.closed ? 'etClosedPolygon' : 'etOpenButt',
  })
  const paths = offsetShape.paths
  if (!paths || paths.length === 0) return null
  const result = new AcDbPolyline()
  paths[0].forEach((pt: { X: number; Y: number }, i: number) => {
    result.addVertexAt(i, new AcGePoint2d(pt.X / CLIPPER_SCALE, pt.Y / CLIPPER_SCALE))
  })
  result.closed = poly.closed
  return result
}

// Spline offset: control points not accessible via public API; returns null gracefully.
export function offsetSpline(_spline: AcDbSpline, _distance: number, _side: 1 | -1): AcDbPolyline | null {
  return null
}

export function pickSide(entity: AcDbEntity, p: AcGePoint3dLike): 1 | -1 {
  if (entity instanceof AcDbLine) {
    const s = entity.startPoint
    const e = entity.endPoint
    return ((e.x - s.x) * (p.y - s.y) - (e.y - s.y) * (p.x - s.x)) >= 0 ? 1 : -1
  }
  if (entity instanceof AcDbArc || entity instanceof AcDbCircle) {
    const c = (entity as AcDbCircle).center
    const r = (entity as AcDbCircle).radius
    return Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2) >= r ? 1 : -1
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    const a = entity.majorAxisRadius
    const b = entity.minorAxisRadius
    return ((p.x - c.x) / a) ** 2 + ((p.y - c.y) / b) ** 2 >= 1 ? 1 : -1
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let bestDist = Infinity
    let bestSide: 1 | -1 = 1
    for (let i = 0; i < n - 1; i++) {
      const a = entity.getPoint2dAt(i)
      const b = entity.getPoint2dAt(i + 1)
      const dx = b.x - a.x; const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
      const d = (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2
      if (d < bestDist) {
        bestDist = d
        bestSide = (dx * (p.y - a.y) - dy * (p.x - a.x)) >= 0 ? 1 : -1
      }
    }
    return bestSide
  }
  return 1
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm vitest run packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts
```
Expected: PASS for `offsetLine` tests.

- [ ] **Step 7: Commit**

```bash
git add packages/cad-simple-viewer/package.json packages/cad-simple-viewer/src/command/modify/AcApOffsetGeometry.ts packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts pnpm-lock.yaml
git commit -m "feat: add offset geometry module with line/arc/circle/ellipse/polyline support"
```

---

## Task 2: Expand geometry tests for Arc, Circle, Ellipse, Polyline, and pickSide

**Files:**
- Modify: `packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts`

- [ ] **Step 1: Add tests for remaining entity types**

Append to `packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts`:
```ts
describe('offsetArc', () => {
  it('increases radius when offsetting outward', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 5, 0, Math.PI)
    const result = offsetArc(arc, 2, 1)
    expect(result).not.toBeNull()
    expect(result!.radius).toBeCloseTo(7)
  })
  it('decreases radius when offsetting inward', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 5, 0, Math.PI)
    const result = offsetArc(arc, 2, -1)
    expect(result!.radius).toBeCloseTo(3)
  })
  it('returns null when inward offset collapses radius', () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 2, 0, Math.PI)
    expect(offsetArc(arc, 3, -1)).toBeNull()
  })
})

describe('offsetCircle', () => {
  it('increases radius when offsetting outward', () => {
    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
    expect(offsetCircle(circle, 3, 1)!.radius).toBeCloseTo(8)
  })
  it('returns null when inward offset collapses radius', () => {
    expect(offsetCircle(new AcDbCircle(new AcGePoint3d(0, 0, 0), 2), 3, -1)).toBeNull()
  })
})

describe('offsetEllipse', () => {
  it('increases both radii when offsetting outward', () => {
    const e = new AcDbEllipse(
      new AcGePoint3d(0,0,0), new AcGeVector3d(0,0,1), new AcGeVector3d(1,0,0), 10, 5, 0, Math.PI*2
    )
    const result = offsetEllipse(e, 2, 1)
    expect(result!.majorAxisRadius).toBeCloseTo(12)
    expect(result!.minorAxisRadius).toBeCloseTo(7)
  })
  it('returns null when inward offset collapses minor radius', () => {
    const e = new AcDbEllipse(
      new AcGePoint3d(0,0,0), new AcGeVector3d(0,0,1), new AcGeVector3d(1,0,0), 10, 2, 0, Math.PI*2
    )
    expect(offsetEllipse(e, 3, -1)).toBeNull()
  })
})

describe('offsetPolyline', () => {
  it('offsets a closed square outward', () => {
    const poly = new AcDbPolyline()
    poly.addVertexAt(0, new AcGePoint2d(0, 0))
    poly.addVertexAt(1, new AcGePoint2d(10, 0))
    poly.addVertexAt(2, new AcGePoint2d(10, 10))
    poly.addVertexAt(3, new AcGePoint2d(0, 10))
    poly.closed = true
    const result = offsetPolyline(poly, 1, 1)
    expect(result).not.toBeNull()
    expect(result!.numberOfVertices).toBeGreaterThanOrEqual(4)
  })
})

describe('pickSide', () => {
  it('returns 1 for point above a horizontal line', () => {
    const line = new AcDbLine(new AcGePoint3d(0,0,0), new AcGePoint3d(10,0,0))
    expect(pickSide(line, new AcGePoint3d(5, 3, 0))).toBe(1)
  })
  it('returns -1 for point below a horizontal line', () => {
    const line = new AcDbLine(new AcGePoint3d(0,0,0), new AcGePoint3d(10,0,0))
    expect(pickSide(line, new AcGePoint3d(5, -3, 0))).toBe(-1)
  })
  it('returns 1 for point outside a circle', () => {
    expect(pickSide(new AcDbCircle(new AcGePoint3d(0,0,0), 5), new AcGePoint3d(8,0,0))).toBe(1)
  })
  it('returns -1 for point inside a circle', () => {
    expect(pickSide(new AcDbCircle(new AcGePoint3d(0,0,0), 5), new AcGePoint3d(2,0,0))).toBe(-1)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
pnpm vitest run packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts
```
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts
git commit -m "test: add full geometry test coverage for offset module"
```

---

## Task 3: Add i18n strings for the offset command

**Files:**
- Modify: `packages/cad-simple-viewer/src/i18n/en/jig.ts`
- Modify: `packages/cad-simple-viewer/src/i18n/en/command.ts`

- [ ] **Step 1: Add offset jig strings to `jig.ts`**

In `packages/cad-simple-viewer/src/i18n/en/jig.ts`, find the `mtext:` block and add the `offset:` block after it:
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
    },
  },
```

- [ ] **Step 2: Add offset command description to `command.ts`**

In `packages/cad-simple-viewer/src/i18n/en/command.ts`, find the `move:` block and add `offset:` after it:
```ts
    offset: {
      description: 'Creates a parallel copy of a selected object at a specified distance',
      prompt: 'Select object to offset',
    },
```

- [ ] **Step 3: Commit**

```bash
git add packages/cad-simple-viewer/src/i18n/en/jig.ts packages/cad-simple-viewer/src/i18n/en/command.ts
git commit -m "feat: add i18n strings for offset command"
```

---

## Task 4: Implement the offset command class

**Files:**
- Create: `packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts`
- Modify: `packages/cad-simple-viewer/src/command/modify/index.ts`
- Modify: `packages/cad-simple-viewer/src/app/AcApDocManager.ts`

- [ ] **Step 1: Create `AcApOffsetCmd.ts`**

Create `packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts`:
```ts
import {
  AcDbArc, AcDbCircle, AcDbEllipse, AcDbEntity, AcDbLine,
  AcDbPolyline, AcDbSpline, AcGePoint3d, AcGePoint3dLike,
} from '@mlightcad/data-model'
import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView, AcEdCommand, AcEdOpenMode, AcEdPreviewJig,
  AcEdPromptDistanceOptions, AcEdPromptDoubleResult,
  AcEdPromptEntityOptions, AcEdPromptEntityResult,
  AcEdPromptPointOptions, AcEdPromptPointResult, AcEdPromptStatus,
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  offsetArc, offsetCircle, offsetEllipse, offsetLine,
  offsetPolyline, offsetSpline, pickSide,
} from './AcApOffsetGeometry'

const OFFSETTABLE_TYPES = ['Line', 'Arc', 'Circle', 'Polyline', 'Ellipse', 'Spline']

function computeOffset(entity: AcDbEntity, distance: number, side: 1 | -1): AcDbEntity | null {
  if (entity instanceof AcDbLine) return offsetLine(entity, distance, side)
  if (entity instanceof AcDbArc) return offsetArc(entity, distance, side)
  if (entity instanceof AcDbCircle) return offsetCircle(entity, distance, side)
  if (entity instanceof AcDbEllipse) return offsetEllipse(entity, distance, side)
  if (entity instanceof AcDbPolyline) return offsetPolyline(entity, distance, side)
  if (entity instanceof AcDbSpline) return offsetSpline(entity, distance, side)
  return null
}

function computeThroughDistance(entity: AcDbEntity, p: AcGePoint3dLike): number {
  if (entity instanceof AcDbLine) {
    const s = entity.startPoint; const e = entity.endPoint
    const dx = e.x - s.x; const dy = e.y - s.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return 0
    return Math.abs((dy * p.x - dx * p.y + e.x * s.y - e.y * s.x) / len)
  }
  if (entity instanceof AcDbCircle || entity instanceof AcDbArc) {
    const c = (entity as AcDbCircle).center; const r = (entity as AcDbCircle).radius
    return Math.abs(Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2) - r)
  }
  if (entity instanceof AcDbEllipse) {
    const c = entity.center
    return Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)
  }
  if (entity instanceof AcDbPolyline) {
    const n = entity.numberOfVertices
    let minDist = Infinity
    for (let i = 0; i < n - 1; i++) {
      const a = entity.getPoint2dAt(i); const b = entity.getPoint2dAt(i + 1)
      const dx = b.x - a.x; const dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
      const d = Math.sqrt((p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2)
      if (d < minDist) minDist = d
    }
    return minDist === Infinity ? 0 : minDist
  }
  return 0
}

class AcApOffsetPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _source: AcDbEntity
  private _distance: number
  private _preview: AcDbEntity | null = null

  constructor(view: AcEdBaseView, source: AcDbEntity, distance: number) {
    super(view)
    this._view = view
    this._source = source
    this._distance = distance
  }

  get entity(): AcDbEntity | null { return this._preview }

  update(point: AcGePoint3dLike): void {
    if (this._preview) {
      this._view.removeTransientEntity(this._preview.objectId)
      this._preview = null
    }
    const result = computeOffset(this._source, this._distance, pickSide(this._source, point))
    if (result) {
      this._preview = result
      this._view.addTransientEntity(result)
    }
  }

  override end(): void {
    if (this._preview) {
      this._view.removeTransientEntity(this._preview.objectId)
      this._preview = null
    }
  }
}

export class AcApOffsetCmd extends AcEdCommand {
  constructor() { super(); this.mode = AcEdOpenMode.Review }

  async execute(context: AcApContext): Promise<void> {
    const db = context.doc.database
    const blockTable = db.tables.blockTable
    let distance: number | undefined
    let throughMode = false
    let eraseSource = false
    let layerMode: 'source' | 'current' = 'source'

    while (distance === undefined && !throughMode) {
      const distPrompt = new AcEdPromptDistanceOptions(AcApI18n.t('jig.offset.distanceOrOptions'))
      distPrompt.useBasePoint = false
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.through.display'), AcApI18n.t('jig.offset.keywords.through.global'), AcApI18n.t('jig.offset.keywords.through.local'))
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.erase.display'), AcApI18n.t('jig.offset.keywords.erase.global'), AcApI18n.t('jig.offset.keywords.erase.local'))
      distPrompt.keywords.add(AcApI18n.t('jig.offset.keywords.layer.display'), AcApI18n.t('jig.offset.keywords.layer.global'), AcApI18n.t('jig.offset.keywords.layer.local'))
      const distResult: AcEdPromptDoubleResult = await AcApDocManager.instance.editor.getDistance(distPrompt)
      if (distResult.status === AcEdPromptStatus.OK) {
        if (distResult.value! <= 0) { AcApDocManager.instance.editor.showMessage(AcApI18n.t('jig.offset.invalidDistance')); continue }
        distance = distResult.value!
      } else if (distResult.status === AcEdPromptStatus.Keyword) {
        const kw = distResult.stringResult ?? ''
        if (kw === 'Through') { throughMode = true; break }
        if (kw === 'Erase') { eraseSource = !eraseSource; continue }
        if (kw === 'Layer') { layerMode = layerMode === 'source' ? 'current' : 'source'; continue }
        return
      } else { return }
    }

    while (true) {
      const entityPrompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.offset.selectObject'))
      entityPrompt.allowNone = true
      entityPrompt.setRejectMessage(AcApI18n.t('jig.offset.cannotOffset'))
      OFFSETTABLE_TYPES.forEach(t => entityPrompt.addAllowedClass(t))
      const entityResult: AcEdPromptEntityResult = await AcApDocManager.instance.editor.getEntity(entityPrompt)
      if (entityResult.status !== AcEdPromptStatus.OK || !entityResult.objectId) break
      const source = blockTable.getEntityById(entityResult.objectId)
      if (!source) break

      const sidePrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.offset.sideToOffset'))
      if (!throughMode) sidePrompt.jig = new AcApOffsetPreviewJig(context.view, source, distance!)
      const sideResult: AcEdPromptPointResult = await AcApDocManager.instance.editor.getPoint(sidePrompt)
      if (sideResult.status !== AcEdPromptStatus.OK || !sideResult.value) continue

      const pickPoint = new AcGePoint3d(sideResult.value)
      const side = pickSide(source, pickPoint)
      const effectiveDist = throughMode ? computeThroughDistance(source, pickPoint) : distance!
      const offsetEntity = effectiveDist > 0 ? computeOffset(source, effectiveDist, side) : null

      if (!offsetEntity) { AcApDocManager.instance.editor.showMessage(AcApI18n.t('jig.offset.cannotOffset')); continue }
      offsetEntity.layer = layerMode === 'source' ? source.layer : (db.clayer ?? source.layer)
      blockTable.modelSpace.appendEntity(offsetEntity)
      if (eraseSource) blockTable.removeEntity([source.objectId])
    }
    context.view.selectionSet.clear()
  }
}
```

- [ ] **Step 2: Export from `modify/index.ts`**

In `packages/cad-simple-viewer/src/command/modify/index.ts`, add:
```ts
export * from './AcApOffsetCmd'
export * from './AcApOffsetGeometry'
```

- [ ] **Step 3: Register command in `AcApDocManager.ts`**

In `packages/cad-simple-viewer/src/app/AcApDocManager.ts`:

Add to the import block (with other modify commands around line 64):
```ts
  AcApOffsetCmd,
```

Add to `registerCommands()` after the `move` line (around line 919):
```ts
    addSystemCommand('offset', 'offset', new AcApOffsetCmd())
```

- [ ] **Step 4: Commit**

```bash
git add packages/cad-simple-viewer/src/command/modify/AcApOffsetCmd.ts packages/cad-simple-viewer/src/command/modify/index.ts packages/cad-simple-viewer/src/app/AcApDocManager.ts
git commit -m "feat: implement offset command with state machine and preview jig"
```

---

## Task 5: Add ribbon button and SVG icon

**Files:**
- Create: `packages/cad-viewer/src/svg/offset.svg`
- Modify: `packages/cad-viewer/src/svg/index.ts`
- Modify: `packages/cad-viewer/src/component/layout/MlRibbonCommands.vue`
- Modify: `packages/cad-viewer/src/locale/en/main.ts`
- Modify: `packages/cad-viewer/src/locale/vi/main.ts`
- Modify: `packages/cad-viewer/src/locale/zh/main.ts`

- [ ] **Step 1: Create `offset.svg`**

Create `packages/cad-viewer/src/svg/offset.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <rect x="2" y="8.6" width="16" height=".8"></rect>
  <rect x="2" y="11.6" width="16" height=".8"></rect>
  <polygon points="10 5 12.31 9 10 7.67 7.69 9 10 5"></polygon>
</svg>
```

- [ ] **Step 2: Export from `svg/index.ts`**

In `packages/cad-viewer/src/svg/index.ts`, add in alphabetical order (after `mtext`):
```ts
export { default as offset } from './offset.svg'
```

- [ ] **Step 3: Add EN locale strings**

In `packages/cad-viewer/src/locale/en/main.ts`:

In the tooltip section (after `erase:` tooltip, around line 261):
```ts
      offset: 'Create a parallel copy of an object at a specified distance.',
```

In the command label section (after `erase:` label, around line 367):
```ts
      offset: 'Offset',
```

- [ ] **Step 4: Add VI locale strings**

In `packages/cad-viewer/src/locale/vi/main.ts`:

In the tooltip section (after `erase:`):
```ts
      offset: 'Tạo bản sao song song của đối tượng ở khoảng cách xác định.',
```

In the command label section (after `erase:`):
```ts
      offset: 'Offset',
```

- [ ] **Step 5: Add ZH locale strings**

In `packages/cad-viewer/src/locale/zh/main.ts`:

In the tooltip section (after `erase:`):
```ts
      offset: '在指定距离处创建对象的平行副本。',
```

In the command label section (after `erase:`):
```ts
      offset: '偏移',
```

- [ ] **Step 6: Add ribbon button in `MlRibbonCommands.vue`**

In `packages/cad-viewer/src/component/layout/MlRibbonCommands.vue`:

Add `offset` to the SVG imports (around line 103, with other svg imports):
```ts
  offset,
```

Add to `ribbonTooltips` computed (after `erase:` tooltip, around line 627):
```ts
    offset: t('main.ribbon.tooltip.offset'),
```

Add the button to `home-modify-main` collection after the `copy` button (around line 1264):
```ts
                {
                  id: 'cmd-offset',
                  type: 'button',
                  label: t('main.ribbon.command.offset'),
                  tooltip: ribbonTooltips.offset,
                  size: 'small',
                  props: { icon: offset }
                },
```

- [ ] **Step 7: Commit**

```bash
git add packages/cad-viewer/src/svg/offset.svg packages/cad-viewer/src/svg/index.ts packages/cad-viewer/src/component/layout/MlRibbonCommands.vue packages/cad-viewer/src/locale/en/main.ts packages/cad-viewer/src/locale/vi/main.ts packages/cad-viewer/src/locale/zh/main.ts
git commit -m "feat: add offset ribbon button, SVG icon, and locale strings"
```

---

## Task 6: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run the geometry test suite**

```bash
pnpm vitest run packages/cad-simple-viewer/__tests__/AcApOffsetGeometry.spec.ts
```
Expected: All tests PASS.

- [ ] **Step 2: Run the project build**

```bash
pnpm build
```
Expected: Build completes with no TypeScript errors.

- [ ] **Step 3: Start the dev server and manually test**

```bash
pnpm dev
```

Open the app in a browser. Draw a line, a circle, an arc, and a polyline. For each:
1. Click the Offset button in the ribbon (or type `offset` in the command line)
2. Enter a distance (e.g. `5`)
3. Click the entity
4. Click on the side to offset toward
5. Verify the offset entity appears on the correct side at the correct distance
6. Press Escape to exit

Also test:
- `Through` mode: type `T` at the distance prompt, pick an entity, click a point — verify the offset passes through that point
- `Erase` mode: type `E` at the distance prompt to toggle, then offset — verify source is deleted
- Invalid offset: try to offset a circle inward past its radius — verify graceful error message

- [ ] **Step 4: Final commit**

```bash
git add -p
git commit -m "feat: complete offset command implementation"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Command flow (distance → entity → side → loop) — Task 4
- ✅ Through mode — Task 4 (`computeThroughDistance`)
- ✅ Erase toggle — Task 4
- ✅ Layer toggle — Task 4
- ✅ Analytic offsets: Line, Arc, Circle, Ellipse — Task 1
- ✅ Clipper-based: Polyline — Task 1
- ✅ Spline: returns null gracefully — Task 1 (control points not accessible via public API)
- ✅ Side detection — Task 1 (`pickSide`)
- ✅ Preview jig — Task 4
- ✅ Invalid offset handling — Task 4
- ✅ i18n strings — Task 3
- ✅ Command registration — Task 4
- ✅ Ribbon button + icon + locales — Task 5

**Type consistency:** All function signatures in Task 4 match Task 1 definitions. `pickSide` returns `1 | -1`, `computeOffset` returns `AcDbEntity | null` throughout.
