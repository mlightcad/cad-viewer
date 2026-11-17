import { AcDbDatabase, AcDbLeader, AcDbMText } from '@mlightcad/data-model'

import {
  acexRedrawResolveCalibration,
  acexRedrawValidateSpec,
  CAD_EDIT_TX_METHODS,
  type CadEditTransaction,
  createCadRedraw,
  createCadScriptHost,
  createDatabaseSession,
  executeCadScript,
  type RedrawSpec
} from '../src'

function run(code: string, db = new AcDbDatabase()) {
  const session = createDatabaseSession(db, { title: 'redraw.dxf' })
  return executeCadScript({ code }, session).then(result => ({ result, db }))
}

function modelEntities(db: AcDbDatabase) {
  return [...db.tables.blockTable.modelSpace.newIterator()]
}

describe('redraw calibration', () => {
  test('similarity maps image pixels (y down) to CAD (y up)', () => {
    const resolved = acexRedrawResolveCalibration({
      id: 'c',
      method: 'similarity',
      sourcePoints: [
        [100, 500],
        [400, 500]
      ],
      cadPoints: [
        [0, 0],
        [3000, 0]
      ]
    })
    expect(resolved.unitsPerPixel).toBeCloseTo(10)
    const top = resolved.transform({ x: 100, y: 300 })
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(2000)
    expect(resolved.residual).toBeCloseTo(0)
  })

  test('dimension anchor derives scale from a readable dimension', () => {
    const resolved = acexRedrawResolveCalibration(
      {
        id: 'd',
        method: 'dimension-anchor',
        sourcePoints: [
          [10, 90],
          [210, 90]
        ],
        value: 1000
      },
      { id: 'front', sourceRoi: [10, 0, 300, 90], cadOrigin: [0, 0] }
    )
    expect(resolved.unitsPerPixel).toBeCloseTo(5)
    const p = resolved.transform({ x: 210, y: 40 })
    expect(p.x).toBeCloseTo(1000)
    expect(p.y).toBeCloseTo(250)
  })

  test('homography recovers a perspective quad', () => {
    const resolved = acexRedrawResolveCalibration({
      id: 'h',
      method: 'homography',
      sourcePoints: [
        [10, 10],
        [210, 20],
        [200, 220],
        [5, 200]
      ],
      cadPoints: [
        [0, 100],
        [100, 100],
        [100, 0],
        [0, 0]
      ]
    })
    expect(resolved.model).toBe('homography')
    expect(resolved.residual!).toBeLessThan(1e-6)
  })
})

describe('acexRedrawValidateSpec', () => {
  const base: RedrawSpec = {
    units: 'mm',
    entities: [{ id: 'a', type: 'line', start: [0, 0], end: [10, 0] }]
  }

  test('passes a minimal general spec', () => {
    expect(acexRedrawValidateSpec(base).result.status).toBe('pass')
  })

  test('fails on missing fields, duplicate ids, and unknown types', () => {
    const { result } = acexRedrawValidateSpec({
      entities: [
        { id: 'a', type: 'circle', center: [0, 0] },
        { id: 'a', type: 'line', start: [0, 0], end: [1, 0] },
        { type: 'blob' }
      ]
    })
    expect(result.status).toBe('fail')
    const messages = result.errors.map(issue => issue.message).join('\n')
    expect(result.errors.map(issue => issue.path)).toContain(
      'entities.a.radius'
    )
    expect(messages).toMatch(/duplicate entity id 'a'/)
    expect(messages).toMatch(/unsupported type 'blob'/)
  })

  test('blocks strict-dimensioned specs without units or calibration', () => {
    const { result } = acexRedrawValidateSpec({
      ...base,
      units: 'unitless',
      profile: 'strict-dimensioned'
    })
    expect(result.status).toBe('blocked')
    expect(result.errors.every(issue => issue.kind === 'blocked')).toBe(true)
  })

  test('constraint conflicts need review instead of failing silently', () => {
    const { result } = acexRedrawValidateSpec({
      ...base,
      constraints: [
        {
          id: 'total',
          type: 'sum',
          terms: [3000, 1050, 1900],
          expected: 6000,
          tolerance: 1
        }
      ]
    })
    expect(result.status).toBe('needs_review')
  })

  test('source coordinates need a calibration', () => {
    const { result } = acexRedrawValidateSpec({
      coords: 'source',
      entities: [{ type: 'line', start: [0, 0], end: [1, 0] }]
    })
    expect(result.status).toBe('fail')
  })
})

describe('cad.redraw.draw', () => {
  test('draws calibrated geometry, annotations, leader, and table on standard layers', async () => {
    const { result, db } = await run(`
      const spec = {
        profile: 'general',
        units: 'mm',
        calibration: [{
          id: 'cal', method: 'similarity', evidence: 'known',
          sourcePoints: [[100, 500], [400, 500]], cadPoints: [[0, 0], [3000, 0]]
        }],
        entities: [
          { id: 'outline', type: 'rectangle', coords: 'source', corner1: [100, 500], corner2: [400, 300], evidence: 'scaled' },
          { id: 'hole', type: 'circle', center: [1500, 1000], radius: 200, evidence: 'inferred' },
          { id: 'axis', type: 'line', start: [1500, -100], end: [1500, 2100], layer: 'CENTER' },
          { id: 'w', type: 'linear_dimension', p1: [0, 0], p2: [3000, 0], dimLine: [1500, -400], value: 3000, evidence: 'known' },
          { id: 'note', type: 'leader', points: [[1650, 1150], [2200, 1700], [2500, 1700]], text: '4x M8' },
          { id: 'title', type: 'text', position: [0, 2300], text: 'PLATE' },
          { id: 'bom', type: 'table', origin: [3500, 2000], columnWidths: [400, 800], rowHeights: [200, 200], cells: [['No', 'Name'], ['1', 'Plate']] }
        ],
        checks: [
          { name: 'hole r', measure: 'radius', entity: 'hole', expected: 200 },
          { name: 'width', measure: 'dimension', entity: 'w', expected: 3000, tolerance: 0.5 }
        ]
      }
      const r = cad.redraw.draw(spec)
      return { status: r.status, drawn: r.drawn, ids: Object.keys(r.idMap).sort(), layers: r.layersCreated.sort(), checks: r.checks.map(c => c.pass), dim: r.dimensionChecks.map(c => c.pass), entityCount: r.entityCount }
    `)

    expect(result.success).toBe(true)
    const data = result.data as {
      status: string
      drawn: boolean
      ids: string[]
      layers: string[]
      checks: boolean[]
      dim: boolean[]
      entityCount: number
    }
    expect(data.drawn).toBe(true)
    expect(data.status).toBe('pass')
    expect(data.ids).toEqual([
      'axis',
      'bom',
      'hole',
      'note',
      'outline',
      'title',
      'w'
    ])
    expect(data.layers).toEqual([
      'ASSUMPTION',
      'CENTER',
      'DIM',
      'OBJECT',
      'TABLE',
      'TEXT'
    ])
    expect(data.checks).toEqual([true, true])
    expect(data.dim).toEqual([true])

    const entities = modelEntities(db)
    // rect + circle + axis + dim + leader + leader mtext + title + table (rect, 1 v, 1 h, 4 texts)
    expect(data.entityCount).toBe(14)
    expect(entities).toHaveLength(14)

    const outline = entities.find(
      e => e.type === 'Polyline' && e.layer === 'OBJECT'
    )
    expect(outline?.geometricExtents.max.x).toBeCloseTo(3000)
    expect(outline?.geometricExtents.max.y).toBeCloseTo(2000)

    const leader = entities.find(
      (e): e is AcDbLeader => e instanceof AcDbLeader
    )
    expect(leader?.hasArrowHead).toBe(true)
    expect(leader?.numVertices).toBe(3)
    const leaderText = entities.find(
      (e): e is AcDbMText => e instanceof AcDbMText && e.contents === '4x M8'
    )
    expect(leaderText).toBeDefined()
    expect(leader?.associatedAnnotation).toBe(leaderText?.objectId)
    expect(leaderText!.height).toBeGreaterThan(0)

    const center = db.tables.layerTable.getAt('CENTER')
    expect(center?.linetype).toBe('CENTER')
    expect(db.tables.linetypeTable.has('CENTER')).toBe(true)
  })

  test('geometry-only skips annotations and is one undo step', async () => {
    const db = new AcDbDatabase()
    const { result } = await run(
      `
      const r = cad.redraw.draw({
        profile: 'geometry-only',
        entities: [
          { type: 'circle', center: [0, 0], radius: 5 },
          { type: 'text', position: [0, 10], text: 'A' },
          { type: 'aligned_dimension', p1: [0, 0], p2: [5, 0], dimLine: [0, -3] },
          { type: 'table', origin: [20, 0], columnWidths: [5], rowHeights: [2], cells: [['x']] }
        ]
      })
      return { status: r.status, skipped: r.skipped, count: r.entityCount }
    `,
      db
    )
    expect(result.data).toEqual({
      status: 'pass_with_warnings',
      skipped: { text: 1, aligned_dimension: 1 },
      count: 2
    })
    expect(
      modelEntities(db)
        .map(e => e.type)
        .sort()
    ).toEqual(['Circle', 'Polyline'])
    expect(db.transactionManager.undo()).toBe(true)
    expect(modelEntities(db)).toHaveLength(0)
  })

  test('refuses to draw a failing spec and reports dimension conflicts', async () => {
    const { result, db } = await run(`
      const bad = cad.redraw.draw({ entities: [{ type: 'circle', center: [0, 0] }] })
      const conflict = cad.redraw.draw({
        entities: [
          { id: 'd', type: 'aligned_dimension', p1: [0, 0], p2: [90, 0], dimLine: [45, -10], value: 100, evidence: 'known' }
        ]
      })
      return { bad: [bad.status, bad.drawn], conflict: conflict.status }
    `)
    expect(result.data).toEqual({
      bad: ['fail', false],
      conflict: 'needs_review'
    })
    expect(modelEntities(db)).toHaveLength(1)
  })

  test('compares angular values in degrees and area checks on closed shapes', async () => {
    const { result } = await run(`
      const r = cad.redraw.draw({
        entities: [
          { id: 'sq', type: 'rectangle', x: 0, y: 0, width: 10, height: 4 },
          { id: 'ang', type: 'angular_dimension', center: [0, 0], p1: [10, 0], p2: [0, 10], arcPoint: [5, 5], value: 90, evidence: 'known' }
        ],
        checks: [{ measure: 'area', entity: 'sq', expected: 40 }]
      })
      return { status: r.status, dim: r.dimensionChecks.map(c => [c.pass, Math.round(c.actual)]), area: r.checks[0].pass }
    `)
    expect(result.data).toEqual({ status: 'pass', dim: [[true, 90]], area: true })
  })

  test('writes spec units to INSUNITS and uses a CJK text style', async () => {
    const { result, db } = await run(`
      const r = cad.redraw.draw({
        units: 'mm',
        entities: [
          { id: 'n', type: 'text', position: [0, 0], text: '技术要求' },
          { id: 'w', type: 'aligned_dimension', p1: [0, 0], p2: [50, 0], dimLine: [25, -8] }
        ]
      })
      return { unitsApplied: r.unitsApplied, textStyle: r.textStyle, dimStyle: r.dimStyle }
    `)
    const data = result.data as {
      unitsApplied: boolean
      textStyle: string
      dimStyle: string
    }
    expect(data.textStyle).toBe('REDRAW_TEXT')
    expect(db.insunits).toBe(4)
    const style = db.tables.textStyleTable.getAt('REDRAW_TEXT')
    expect(style?.bigFontFileName).toBe('hztxt.shx')
    const note = modelEntities(db).find(
      (e): e is AcDbMText => e instanceof AcDbMText && e.contents === '技术要求'
    )
    expect(note?.styleName).toBe('REDRAW_TEXT')
    expect(db.tables.dimStyleTable.getAt(data.dimStyle)?.dimtxsty).toBe(
      'REDRAW_TEXT'
    )

    // Undo restores the previous units together with the geometry.
    const before = new AcDbDatabase().insunits
    expect(db.transactionManager.undo()).toBe(true)
    expect(db.insunits).toBe(before)
  })
})

describe('cad.redraw.draw dimension fallback', () => {
  test('draws lines + text (or a leader) when a dimension cannot be created', () => {
    const db = new AcDbDatabase()
    const session = createDatabaseSession(db)
    const created: string[] = []
    const fail = () => {
      throw new Error('engine_failure')
    }
    const host = createCadScriptHost(session, {
      log: [],
      highlightedIds: [],
      createdIds: created,
      previewRequests: [],
      dxfSaveRequests: [],
      pdfSaveRequests: [],
      htmlSaveRequests: []
    })
    const redraw = createCadRedraw({
      getDatabase: () => db,
      transaction: (label, fn) =>
        host.edit.transaction(label, tx =>
          fn({
            ...pickTx(tx),
            drawDimAligned: fail,
            drawDimLinear: fail,
            drawDimRadius: fail,
            drawDimDiameter: fail,
            drawDimAngular: fail
          })
        ),
      layerNames: () => [...db.tables.layerTable.newIterator()].map(l => l.name),
      snapshot: id => host.entities.byId(id),
      tick: () => undefined
    })

    const r = redraw.draw({
      entities: [
        { id: 'w', type: 'linear_dimension', p1: [0, 0], p2: [40, 0], dimLine: [20, -5], value: 40 },
        { id: 'r', type: 'radial_dimension', center: [0, 20], radius: 5, value: 5 }
      ]
    })

    expect(r.drawn).toBe(true)
    expect(r.fallbacks).toEqual({ linear_dimension: 1, radial_dimension: 1 })
    expect(r.status).toBe('pass_with_warnings')
    const types = modelEntities(db).map(e => e.type).sort()
    expect(types).toEqual(['Leader', 'Line', 'MText', 'MText'])
    const labels = modelEntities(db)
      .filter((e): e is AcDbMText => e instanceof AcDbMText)
      .map(e => e.contents)
      .sort()
    expect(labels).toEqual(['40', 'R5'])
  })
})

/** Copies the sealed transaction's methods onto a plain object. */
function pickTx(tx: CadEditTransaction): CadEditTransaction {
  const copy = {} as Record<string, unknown>
  for (const name of CAD_EDIT_TX_METHODS) {
    copy[name] = (tx as unknown as Record<string, unknown>)[name]
  }
  return copy as unknown as CadEditTransaction
}

describe('redraw spec checks and constraints', () => {
  test('rejects malformed checks before drawing', () => {
    const { result } = acexRedrawValidateSpec({
      entities: [{ id: 'a', type: 'line', start: [0, 0], end: [1, 0] }],
      checks: [
        { measure: 'length', entity: 'missing', expected: 1 },
        { measure: 'distance', from: 'a', to: 'nope', expected: 1 },
        { measure: 'volume' as 'length', entity: 'a', expected: 1 }
      ]
    })
    expect(result.status).toBe('fail')
    expect(result.errors.map(issue => issue.path).sort()).toEqual([
      'checks[0].entity',
      'checks[1].to',
      'checks[2].measure'
    ])
  })

  test('equality constraints flag any term outside the tolerance', () => {
    const conflict = acexRedrawValidateSpec({
      entities: [{ type: 'line', start: [0, 0], end: [1, 0] }],
      constraints: [{ type: 'equality', terms: [500, 500, 520], expected: 500, tolerance: 1 }]
    }).result
    expect(conflict.status).toBe('needs_review')
    const ok = acexRedrawValidateSpec({
      entities: [{ type: 'line', start: [0, 0], end: [1, 0] }],
      constraints: [{ type: 'equality', terms: [500, 500.5], expected: 500, tolerance: 1 }]
    }).result
    expect(ok.status).toBe('pass')
  })
})

describe('drawLeader / drawText / drawArc', () => {
  test('creates a leader with linked text, sized text, and arcs in radians', async () => {
    const { result, db } = await run(`
      let leader, text, arc
      cad.edit.transaction('t', tx => {
        leader = tx.drawLeader({ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], text: 'R5', textHeight: 3 })
        text = tx.drawText({ position: { x: 0, y: 20 }, text: 'Hi', height: 4, rotationDeg: 90 })
        arc = tx.drawArc({ center: { x: 0, y: 0 }, radius: 10, startAngleDeg: 0, endAngleDeg: 90 })
      })
      const a = cad.entities.byId(arc).geometry
      return { leaderType: cad.entities.byId(leader).type, arcLength: a.length }
    `)
    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(4)
    const data = result.data as { leaderType: string; arcLength: number }
    expect(data.leaderType).toBe('Leader')
    expect(data.arcLength).toBeCloseTo((Math.PI * 10) / 2)
    const hi = modelEntities(db).find(
      (e): e is AcDbMText => e instanceof AcDbMText && e.contents === 'Hi'
    )
    expect(hi?.height).toBe(4)
    expect(hi?.rotation).toBeCloseTo(Math.PI / 2)
  })

  test('rejects a leader with fewer than two points', async () => {
    const { result } = await run(`
      cad.edit.transaction('t', tx => { tx.drawLeader({ points: [{ x: 0, y: 0 }] }) })
    `)
    expect(result.success).toBe(false)
  })
})
