import { AcDbEntity, AcGeBox2d } from '@mlightcad/data-model'

import type { AcEdSelectionMode } from '../src/editor/view/AcEdBaseView'
import type { AcEdSpatialQueryResultItemEx } from '../src/editor/view/AcEdSpatialQueryResult'
import {
  acedCollectViewportBoxSelectionIds,
  acedMergeSelectionIds,
  AcEdViewportBoxProjection
} from '../src/editor/view/AcEdViewportBoxSelection'

/**
 * Paper viewport whose sheet area is `paper` and whose model view is `model`.
 *
 * Both mappings are pure axis-aligned scaling, which is what a viewport with
 * `viewTwistAngle === 0` produces.
 */
function createViewport(
  paper: [number, number, number, number],
  model: [number, number, number, number],
  options: { frozenLayers?: string[] } = {}
): AcEdViewportBoxProjection {
  const [paperMinX, paperMinY, paperMaxX, paperMaxY] = paper
  const [modelMinX, modelMinY, modelMaxX, modelMaxY] = model
  const paperW = paperMaxX - paperMinX
  const paperH = paperMaxY - paperMinY
  const modelW = modelMaxX - modelMinX
  const modelH = modelMaxY - modelMinY
  return {
    paperBox: new AcGeBox2d(
      { x: paperMinX, y: paperMinY },
      { x: paperMaxX, y: paperMaxY }
    ),
    frozenLayers: options.frozenLayers,
    paperPointToModel: point => ({
      x: modelMinX + ((point.x - paperMinX) / paperW) * modelW,
      y: modelMinY + ((point.y - paperMinY) / paperH) * modelH
    }),
    modelPointToPaper: point => ({
      x: paperMinX + ((point.x - modelMinX) / modelW) * paperW,
      y: paperMinY + ((point.y - modelMinY) / modelH) * paperH
    })
  }
}

/** Line-shaped fake entity so crossing refine can test real geometry. */
function createLineEntity(
  id: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  layer = '0'
): AcDbEntity {
  return {
    objectId: id,
    layer,
    subGetIntersectCurves: () => [
      {
        kind: 'line',
        line: {
          startPoint: { x: start.x, y: start.y, z: 0 },
          endPoint: { x: end.x, y: end.y, z: 0 }
        }
      }
    ]
  } as unknown as AcDbEntity
}

interface SetupOptions {
  mode: AcEdSelectionMode
  /** Paper-space pick rectangle. */
  pick: [number, number, number, number]
  items: AcEdSpatialQueryResultItemEx[]
  entities: AcDbEntity[]
  viewports: AcEdViewportBoxProjection[]
  /** Model boxes each search call received (for assertions). */
  searchBoxes?: AcGeBox2d[]
}

/** Paper-space pick rectangle as an `AcGeBox2d`. */
function pickBox(pick: [number, number, number, number]) {
  const [minX, minY, maxX, maxY] = pick
  return new AcGeBox2d({ x: minX, y: minY }, { x: maxX, y: maxY })
}

function intersects(item: AcEdSpatialQueryResultItemEx, box: AcGeBox2d) {
  return new AcGeBox2d(
    { x: item.minX, y: item.minY },
    { x: item.maxX, y: item.maxY }
  ).intersectsBox(box)
}

function contains(item: AcEdSpatialQueryResultItemEx, box: AcGeBox2d) {
  return box.containsBox(
    new AcGeBox2d(
      { x: item.minX, y: item.minY },
      { x: item.maxX, y: item.maxY }
    )
  )
}

/**
 * Mirrors `AcTrHierarchicalSpatialIndex.search` for the fixture items.
 *
 * A hit with `children` behaves like a block reference with a child index:
 * `children` is narrowed to the boxes that intersect the query, and window
 * mode requires **every** indexed child to be inside the box — not just the
 * intersecting ones. Fixtures that want to model a child entirely outside the
 * query list it in `children` too.
 */
function searchFixture(
  items: AcEdSpatialQueryResultItemEx[],
  box: AcGeBox2d,
  mode: AcEdSelectionMode
): AcEdSpatialQueryResultItemEx[] {
  const results: AcEdSpatialQueryResultItemEx[] = []
  for (const item of items) {
    const children = item.children
    if (children && children.length > 0) {
      const asEx = (box_: (typeof children)[number]) => ({
        ...box_,
        id: box_.id ?? item.id
      })
      if (mode === 'window' && !children.every(c => contains(asEx(c), box))) {
        continue
      }
      const intersecting = children.filter(c => intersects(asEx(c), box))
      if (intersecting.length === 0) continue
      results.push({ ...item, children: intersecting })
      continue
    }
    if (!intersects(item, box)) continue
    if (mode === 'window' && !contains(item, box)) continue
    results.push(item)
  }
  return results
}

function collect(options: SetupOptions) {
  const byId = new Map<string, AcDbEntity>()
  for (const entity of options.entities) {
    byId.set(String(entity.objectId), entity)
  }
  return acedCollectViewportBoxSelectionIds({
    selectionBox: pickBox(options.pick),
    mode: options.mode,
    viewports: options.viewports,
    searchModel: (box, mode) => {
      options.searchBoxes?.push(box.clone())
      return searchFixture(options.items, box, mode)
    },
    entityOf: id => byId.get(String(id))
  })
}

describe('acedCollectViewportBoxSelectionIds', () => {
  it('selects model entities visible through a paper viewport (crossing)', () => {
    const ids = collect({
      mode: 'crossing',
      pick: [4.4, 4.4, 5.6, 5.6],
      items: [{ id: 'lead', minX: 45, minY: 45, maxX: 55, maxY: 55 }],
      entities: [createLineEntity('lead', { x: 45, y: 45 }, { x: 55, y: 55 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual(['lead'])
  })

  it('maps the pick rectangle into model space before querying', () => {
    const searchBoxes: AcGeBox2d[] = []
    collect({
      mode: 'crossing',
      pick: [2, 2, 3, 3],
      items: [],
      entities: [],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])],
      searchBoxes
    })

    expect(searchBoxes).toHaveLength(1)
    expect(searchBoxes[0]!.min.x).toBeCloseTo(20)
    expect(searchBoxes[0]!.min.y).toBeCloseTo(20)
    expect(searchBoxes[0]!.max.x).toBeCloseTo(30)
    expect(searchBoxes[0]!.max.y).toBeCloseTo(30)
  })

  it('requires full containment in window mode', () => {
    const inside = { id: 'in', minX: 45, minY: 45, maxX: 55, maxY: 55 }
    const straddling = { id: 'out', minX: 45, minY: 45, maxX: 75, maxY: 55 }
    const ids = collect({
      mode: 'window',
      pick: [4, 4, 6, 6],
      items: [inside, straddling],
      entities: [
        createLineEntity('in', { x: 45, y: 45 }, { x: 55, y: 55 }),
        createLineEntity('out', { x: 45, y: 45 }, { x: 75, y: 55 })
      ],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual(['in'])
  })

  it('keeps crossing semantics for entities pierced by the rectangle', () => {
    const ids = collect({
      mode: 'crossing',
      pick: [4.9, 4.9, 5.1, 5.1],
      items: [{ id: 'tall', minX: 50, minY: 0, maxX: 50, maxY: 100 }],
      entities: [createLineEntity('tall', { x: 50, y: 0 }, { x: 50, y: 100 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual(['tall'])
  })

  it('drops entities that only look hit because of their AABB', () => {
    const ids = collect({
      mode: 'crossing',
      // Corner of the diagonal's AABB, far from the leader geometry itself.
      pick: [4.0, 5.8, 4.2, 6.0],
      items: [{ id: 'diag', minX: 40, minY: 40, maxX: 60, maxY: 60 }],
      entities: [createLineEntity('diag', { x: 40, y: 40 }, { x: 60, y: 60 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual([])
  })

  it('tests twisted viewport geometry in paper space, not its model AABB', () => {
    // 45° twisted viewport: the paper pick rectangle maps to a rotated
    // rectangle in model space, whose AABB is larger than the real region.
    // This diagonal crosses a corner of that AABB while staying outside the
    // paper pick rectangle, so only a paper-space geometry test rejects it.
    const angle = Math.PI / 4
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const toModel = (p: { x: number; y: number }) => {
      const dx = (p.x - 5) * 10
      const dy = (p.y - 5) * 10
      return { x: 50 + dx * cos - dy * sin, y: 50 + dx * sin + dy * cos }
    }
    const toPaper = (p: { x: number; y: number }) => {
      const dx = p.x - 50
      const dy = p.y - 50
      return {
        x: 5 + (dx * cos + dy * sin) / 10,
        y: 5 + (-dx * sin + dy * cos) / 10
      }
    }
    const start = { x: 45.599913268696305, y: 51.62244765373665 }
    const end = { x: 52.91377377205993, y: 43.71379372494294 }

    const ids = acedCollectViewportBoxSelectionIds({
      selectionBox: pickBox([4.8, 4.8, 5.3, 5.3]),
      mode: 'crossing',
      viewports: [
        {
          paperBox: new AcGeBox2d({ x: 0, y: 0 }, { x: 10, y: 10 }),
          paperPointToModel: toModel,
          modelPointToPaper: toPaper
        }
      ],
      searchModel: (box, mode) =>
        searchFixture(
          [
            {
              id: 'lead',
              minX: Math.min(start.x, end.x),
              minY: Math.min(start.y, end.y),
              maxX: Math.max(start.x, end.x),
              maxY: Math.max(start.y, end.y)
            }
          ],
          box,
          mode
        ),
      entityOf: () =>
        createLineEntity('lead', start, end) as unknown as AcDbEntity
    })

    expect(ids).toEqual([])
  })

  it('ignores the part of the pick rectangle outside the viewport', () => {
    // Pick spans the viewport's right border: only the model content shown
    // inside the border may be selected.
    const ids = collect({
      mode: 'crossing',
      pick: [8, 4, 13, 6],
      items: [
        // Shown at paper x≈9 (inside the border) …
        { id: 'inside', minX: 88, minY: 45, maxX: 92, maxY: 55 },
        // … and at paper x≈11 (outside, clipped away by the viewport).
        { id: 'outside', minX: 108, minY: 45, maxX: 112, maxY: 55 }
      ],
      entities: [
        createLineEntity('inside', { x: 88, y: 45 }, { x: 92, y: 55 }),
        createLineEntity('outside', { x: 108, y: 45 }, { x: 112, y: 55 })
      ],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual(['inside'])
  })

  it('ignores model content outside the viewport rectangle', () => {
    const ids = collect({
      mode: 'crossing',
      // Entirely to the right of the viewport border on the sheet.
      pick: [12, 4, 13, 6],
      items: [{ id: 'lead', minX: 45, minY: 45, maxX: 55, maxY: 55 }],
      entities: [createLineEntity('lead', { x: 45, y: 45 }, { x: 55, y: 55 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual([])
  })

  it('drops entities on layers frozen in the viewport', () => {
    const ids = collect({
      mode: 'crossing',
      pick: [4.4, 4.4, 5.6, 5.6],
      items: [{ id: 'hidden', minX: 45, minY: 45, maxX: 55, maxY: 55 }],
      entities: [
        createLineEntity(
          'hidden',
          { x: 45, y: 45 },
          { x: 55, y: 55 },
          'VPLAYER-FROZEN'
        )
      ],
      viewports: [
        createViewport([0, 0, 10, 10], [0, 0, 100, 100], {
          frozenLayers: ['VPLAYER-FROZEN']
        })
      ]
    })

    expect(ids).toEqual([])
  })

  it('deduplicates entities shared by overlapping viewports', () => {
    const ids = collect({
      mode: 'crossing',
      pick: [4.4, 4.4, 5.6, 5.6],
      items: [{ id: 'lead', minX: 45, minY: 45, maxX: 55, maxY: 55 }],
      entities: [createLineEntity('lead', { x: 45, y: 45 }, { x: 55, y: 55 })],
      viewports: [
        createViewport([0, 0, 10, 10], [0, 0, 100, 100]),
        createViewport([2, 2, 8, 8], [20, 20, 80, 80])
      ]
    })

    expect(ids).toEqual(['lead'])
  })

  it('uses child boxes for block references in window mode', () => {
    const ids = collect({
      mode: 'window',
      pick: [4, 4, 6, 6],
      items: [
        {
          id: 'insert',
          // Coarse aggregate box far larger than the pick rectangle.
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100,
          children: [{ id: 'child#0', minX: 45, minY: 45, maxX: 55, maxY: 55 }]
        }
      ],
      entities: [
        createLineEntity('insert', { x: 45, y: 45 }, { x: 55, y: 55 })
      ],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual(['insert'])
  })

  it('requires every block child inside a window selection', () => {
    // The index narrows `children` to the intersecting ones, so a block whose
    // other child lies outside the pick rectangle must not be selected.
    const ids = collect({
      mode: 'window',
      pick: [4, 4, 6, 6],
      items: [
        {
          id: 'insert',
          minX: 45,
          minY: 45,
          maxX: 400,
          maxY: 400,
          children: [
            { id: 'child#0', minX: 45, minY: 45, maxX: 55, maxY: 55 },
            // Far outside the pick rectangle.
            { id: 'child#1', minX: 300, minY: 300, maxX: 400, maxY: 400 }
          ]
        }
      ],
      entities: [
        createLineEntity('insert', { x: 45, y: 45 }, { x: 55, y: 55 })
      ],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual([])
  })

  it('returns nothing for an empty (unset) pick box', () => {
    const ids = collect({
      mode: 'crossing',
      // `min > max` — the state of a box that was never expanded by a point.
      pick: [5, 5, 4, 4],
      items: [{ id: 'lead', minX: 0, minY: 0, maxX: 100, maxY: 100 }],
      entities: [createLineEntity('lead', { x: 0, y: 0 }, { x: 100, y: 100 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual([])
  })

  it('skips stale hierarchical hits with no intersected children', () => {
    const ids = collect({
      mode: 'crossing',
      pick: [4.4, 4.4, 5.6, 5.6],
      items: [
        {
          id: 'stale',
          minX: 40,
          minY: 40,
          maxX: 60,
          maxY: 60,
          children: []
        }
      ],
      entities: [createLineEntity('stale', { x: 45, y: 45 }, { x: 55, y: 55 })],
      viewports: [createViewport([0, 0, 10, 10], [0, 0, 100, 100])]
    })

    expect(ids).toEqual([])
  })
})

describe('acedMergeSelectionIds', () => {
  it('appends drill-through ids after the active-layout hits', () => {
    expect(acedMergeSelectionIds(['viewport-frame'], ['lead'])).toEqual([
      'viewport-frame',
      'lead'
    ])
  })

  it('does not duplicate ids reported by both passes', () => {
    expect(acedMergeSelectionIds(['lead'], ['lead'])).toEqual(['lead'])
  })

  it('returns the input untouched when nothing drills through', () => {
    const ids = ['frame']
    expect(acedMergeSelectionIds(ids, [])).toBe(ids)
  })

  it('keeps the first occurrence order when extra ids repeat', () => {
    expect(acedMergeSelectionIds(['a'], ['b', 'a', 'b', 'c'])).toEqual([
      'a',
      'b',
      'c'
    ])
  })
})
