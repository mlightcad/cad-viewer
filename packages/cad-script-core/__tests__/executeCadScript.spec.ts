import {
  AcDbBlockTableRecord,
  AcDbCircle,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import type {
  CadCapturePreviewOptions,
  CaptureDrawingPreviewResult
} from '../src/preview/types'
import { executeCadScript } from '../src/script/executeCadScript'
import {
  CAD_MCP_DXF_OUTBOX_KEY,
  CAD_MCP_FILE_OUTBOX_KEY
} from '../src/script/scriptApi'
import {
  type CadSession,
  CadSessionOpenMode,
  type CadSessionView
} from '../src/session/CadSession'
import { createDatabaseSession } from '../src/session/createDatabaseSession'

const COUNT_SCRIPT = `
const counts = {}
for (const e of cad.entities.where(e => e.type === 'Circle')) {
  counts[e.layer] = (counts[e.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
`

describe('executeCadScript', () => {
  test('stops an infinite loop', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      { code: 'while (true) {}', intent: 'loop' },
      session,
      { limits: { maxTicks: 30, maxMilliseconds: 2_000 } }
    )
    expect(result.success).toBe(false)
    expect(result.error).toBe('script_timeout')
  })

  test('counts circles by layer and highlights the busiest layer', async () => {
    const { session, db, selection } = createFixture()
    const walls = [...db.tables.blockTable.modelSpace.newIterator()]
      .filter(entity => entity.type === 'Circle' && entity.layer === 'Walls')
      .map(entity => entity.objectId)
      .sort()

    const result = await executeCadScript(
      { code: COUNT_SCRIPT, intent: 'count circles' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      counts: { '0': 1, Walls: 2 },
      highlightLayer: 'Walls',
      count: 2
    })
    expect([...selection.ids].sort()).toEqual(walls)
    expect([...(result.highlightedIds ?? [])].sort()).toEqual(walls)
  })

  test('copies snapshots only for entities the predicate accepts', async () => {
    const { session, db } = createFixture()
    const line = [...db.tables.blockTable.modelSpace.newIterator()].find(
      entity => entity.type === 'Line'
    )
    if (!line) throw new Error('fixture line missing')
    const extents = jest.spyOn(line, 'geometricExtents', 'get')

    const result = await executeCadScript(
      {
        code: `
          return cad.entities.where(e => e.type === 'Circle' && e.geometry.radius > 1)
            .map(e => e.geometry.radius)
        `,
        intent: 'large circles'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual([2])
    expect(extents).not.toHaveBeenCalled()
  })

  test('counts without snapshotting unmatched geometry', async () => {
    const { session, db } = createFixture()
    const line = [...db.tables.blockTable.modelSpace.newIterator()].find(
      entity => entity.type === 'Line'
    )
    if (!line) throw new Error('fixture line missing')
    const extents = jest.spyOn(line, 'geometricExtents', 'get')

    const result = await executeCadScript(
      {
        code: `
          return {
            circles: cad.entities.count(e => e.type === 'Circle'),
            lines: cad.entities.count(e => e.type === 'Line')
          }
        `,
        intent: 'count types'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ circles: 3, lines: 1 })
    expect(extents).not.toHaveBeenCalled()
  })

  test('cad.blocks exposes per-block typeCounts without snapshots', async () => {
    const { session, db } = createFixture()
    const line = [...db.tables.blockTable.modelSpace.newIterator()].find(
      entity => entity.type === 'Line'
    )
    if (!line) throw new Error('fixture line missing')
    const extents = jest.spyOn(line, 'geometricExtents', 'get')

    const block = new AcDbBlockTableRecord({ name: 'Widget' })
    db.tables.blockTable.add(block)
    block.appendEntity(new AcDbCircle(new AcGePoint3d(5, 5, 0), 3))

    const result = await executeCadScript(
      {
        code: `
          const model = cad.blocks.find(b => b.isModelSpace)
          const widget = cad.blocks.find(b => b.name === 'Widget')
          return {
            model: { entityCount: model.entityCount, typeCounts: model.typeCounts },
            widget: { entityCount: widget.entityCount, typeCounts: widget.typeCounts }
          }
        `,
        intent: 'block stats'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      model: { entityCount: 4, typeCounts: { Circle: 3, Line: 1 } },
      widget: { entityCount: 1, typeCounts: { Circle: 1 } }
    })
    expect(extents).not.toHaveBeenCalled()
  })

  test('stops where when too many entities would be snapshotted', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      {
        code: 'return cad.entities.where(() => true)',
        intent: 'too many'
      },
      session,
      { limits: { maxWhereMatches: 2 } }
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/^too_many_matches/)
  })

  test('inBlock with predicate only snapshots matches', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      {
        code: `
          const model = cad.blocks.find(b => b.isModelSpace)
          return cad.entities.inBlock(model.id, e => e.type === 'Line')
            .map(e => e.type)
        `,
        intent: 'lines in model'
      },
      session
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual(['Line'])
  })

  test('refreshes cad.blocks after an edit transaction', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      {
        code: `
          const before = cad.blocks.find(b => b.isModelSpace).entityCount
          cad.edit.transaction('add circle', tx => {
            tx.drawCircle({ center: { x: 0, y: 0 }, radius: 1 })
          })
          const after = cad.blocks.find(b => b.isModelSpace).entityCount
          return { before, after }
        `,
        intent: 'blocks cache'
      },
      session
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ before: 4, after: 5 })
  })

  test('serializes the host without failing on toJSON', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      { code: 'return cad', intent: 'inspect host' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        log: 'function log',
        selection: expect.objectContaining({
          ids: [],
          entities: [],
          replace: 'function replace'
        })
      })
    )
    expect(result.data).not.toHaveProperty('__tick')
  })

  test('returns selection methods instead of an empty object', async () => {
    const { session } = createFixture()
    const result = await executeCadScript(
      { code: 'return cad.selection', intent: 'inspect selection' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      ids: [],
      entities: [],
      replace: 'function replace',
      add: 'function add',
      remove: 'function remove',
      clear: 'function clear'
    })
  })

  test('resolves selection ids without scanning model space', async () => {
    const { session, db, selection } = createFixture()
    const id = [...db.tables.blockTable.modelSpace.newIterator()][0].objectId
    selection.add(id)
    const iterator = jest.spyOn(db.tables.blockTable.modelSpace, 'newIterator')

    const result = await executeCadScript(
      {
        code: `
          return {
            ids: cad.selection.ids,
            entities: cad.selection.entities
          }
        `,
        intent: 'lookup selection'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      ids: [id],
      entities: [expect.objectContaining({ id, type: 'Circle' })]
    })
    expect(iterator).not.toHaveBeenCalled()
  })

  test('rejects a write script on a read-only drawing', async () => {
    const { session, db } = createFixture(CadSessionOpenMode.Read)
    const spy = jest.spyOn(db, 'runDatabaseEdit')
    const before = countEntities(db)

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('add', tx => {
            tx.drawCircle({ center: { x: 0, y: 0 }, radius: 4 })
          })
        `,
        intent: 'draw'
      },
      session
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('read_only')
    expect(spy).not.toHaveBeenCalled()
    expect(countEntities(db)).toBe(before)
  })

  test('groups script draws into one undo mark', async () => {
    const { session, db } = createFixture()
    const before = countEntities(db)
    const spy = jest.spyOn(db, 'runDatabaseEdit')

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('batch', tx => {
            tx.drawCircle({ center: { x: 1, y: 1 }, radius: 3 })
            tx.drawLine({ start: { x: 0, y: 0 }, end: { x: 5, y: 0 } })
          })
        `,
        intent: 'batch draw'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(2)
    expect(countEntities(db)).toBe(before + 2)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(db.transactionManager.undo()).toBe(true)
    expect(countEntities(db)).toBe(before)
  })

  test('measures drawn geometry and returns a check report', async () => {
    const { session } = createFixture()

    const result = await executeCadScript(
      {
        code: `
          let circleId = ''
          let lineId = ''
          cad.edit.transaction('measure draw', tx => {
            circleId = tx.drawCircle({ center: { x: 30, y: 40 }, radius: 10 })
            lineId = tx.drawLine({
              start: { x: 0, y: 0 },
              end: { x: 3, y: 4 }
            })
          })
          const origin = { x: 0, y: 0 }
          const center = cad.measure.center(circleId)
          const bearing = cad.measure.angleDeg(origin, center)
          return {
            ...cad.measure.report([
              cad.measure.check('r', 10, cad.measure.radius(circleId)),
              cad.measure.check('pcd', 50, cad.measure.distance(origin, center)),
              cad.measure.check('len', 5, cad.measure.length(lineId)),
              cad.measure.check(
                'angle',
                53.130102,
                bearing,
                0.01
              ),
              cad.measure.check(
                'delta',
                90,
                cad.measure.deltaAngleDeg(0, 90)
              )
            ]),
            entityIds: [circleId, lineId]
          }
        `,
        intent: 'measure'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      ok: true,
      checks: [
        { name: 'r', expected: 10, actual: 10, pass: true },
        { name: 'pcd', expected: 50, actual: 50, pass: true },
        { name: 'len', expected: 5, actual: 5, pass: true },
        {
          name: 'angle',
          expected: 53.130102,
          actual: expect.closeTo(53.130102, 5),
          pass: true
        },
        { name: 'delta', expected: 90, actual: 90, pass: true }
      ],
      entityIds: expect.any(Array)
    })
  })

  test('queues capturePreview and attaches images after the script', async () => {
    const { session, capturePreview } = createFixture()

    const result = await executeCadScript(
      {
        code: `
          const shot = cad.view.capturePreview({ longSide: 512 })
          return shot
        `,
        intent: 'screenshot'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ queued: true, index: 0 })
    expect(capturePreview).toHaveBeenCalledWith({ longSide: 512 })
    expect(result.images).toEqual([
      { mediaType: 'image/png', dataUrl: 'data:image/png;base64,aaa' }
    ])
  })

  test('queues selection capturePreview with selection: true', async () => {
    const { session, capturePreview } = createFixture()

    const result = await executeCadScript(
      {
        code: `
          cad.view.capturePreview({ longSide: 256, selection: true })
          return { ok: true }
        `,
        intent: 'selection screenshot'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(capturePreview).toHaveBeenCalledWith({
      longSide: 256,
      selection: true
    })
    expect(result.images).toEqual([
      { mediaType: 'image/png', dataUrl: 'data:image/png;base64,aaa' }
    ])
  })

  test('treats a bare capturePreview number as longSide', async () => {
    const { session, capturePreview } = createFixture()

    const result = await executeCadScript(
      {
        code: `
          cad.view.capturePreview(512)
          return { ok: true }
        `,
        intent: 'legacy longSide'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(capturePreview).toHaveBeenCalledWith({ longSide: 512 })
  })

  test('logs no-selection when selection capture fails', async () => {
    const { session, capturePreview } = createFixture()
    capturePreview.mockImplementationOnce(async () => ({
      ok: false as const,
      reason: 'no-selection' as const
    }))

    const result = await executeCadScript(
      {
        code: `
          cad.view.capturePreview({ selection: true })
          return { ok: true }
        `,
        intent: 'empty selection'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.images).toBeUndefined()
    expect(result.log).toContain('capturePreview failed: no-selection')
  })

  test('skips capturePreview when fulfillPreviews is false', async () => {
    const { session, capturePreview } = createFixture()

    const result = await executeCadScript(
      {
        code: `
          cad.view.capturePreview({ longSide: 512 })
          return { ok: true }
        `,
        intent: 'no screenshot'
      },
      session,
      { fulfillPreviews: false }
    )

    expect(result.success).toBe(true)
    expect(capturePreview).not.toHaveBeenCalled()
    expect(result.images).toBeUndefined()
    expect(result.log).toContain(
      'capturePreview skipped: screenshots disabled in this session'
    )
  })

  test('queues saveDxf without returning DXF text', async () => {
    const { session } = createFixture()
    const host = globalThis as unknown as Record<string, unknown>
    host.__cadMcp = {}
    host[CAD_MCP_DXF_OUTBOX_KEY] = []

    try {
      const result = await executeCadScript(
        {
          code: `return cad.file.saveDxf('out/plan.dxf')`,
          intent: 'save dxf'
        },
        session
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        queued: true,
        index: 0,
        fileName: 'plan.dxf'
      })
      expect(result.savedFiles).toEqual([
        expect.objectContaining({
          fileName: 'plan.dxf',
          path: 'out/plan.dxf',
          delivery: 'mcp',
          bytes: expect.any(Number)
        })
      ])
      const outbox = host[CAD_MCP_DXF_OUTBOX_KEY] as Array<{ text: string }>
      expect(outbox).toHaveLength(1)
      expect(outbox[0]?.text.length).toBeGreaterThan(0)
      expect(JSON.stringify(result)).not.toContain(outbox[0]?.text.slice(0, 40))
    } finally {
      delete host.__cadMcp
      delete host[CAD_MCP_DXF_OUTBOX_KEY]
    }
  })

  test('queues savePdf through exportPdf without returning bytes', async () => {
    const { session } = createFixture()
    const pdfBytes = new Uint8Array([1, 2, 3, 4, 5])
    session.exportPdf = jest.fn(async () => pdfBytes)
    const host = globalThis as unknown as Record<string, unknown>
    host.__cadMcp = {}
    host[CAD_MCP_FILE_OUTBOX_KEY] = []

    try {
      const result = await executeCadScript(
        {
          code: `return cad.file.savePdf('out/plan.pdf')`,
          intent: 'save pdf'
        },
        session
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        queued: true,
        index: 0,
        fileName: 'plan.pdf'
      })
      expect(session.exportPdf).toHaveBeenCalled()
      expect(result.savedFiles).toEqual([
        expect.objectContaining({
          fileName: 'plan.pdf',
          path: 'out/plan.pdf',
          delivery: 'mcp',
          bytes: 5
        })
      ])
      const outbox = host[CAD_MCP_FILE_OUTBOX_KEY] as Array<{
        bytesBase64: string
        mediaType: string
      }>
      expect(outbox).toHaveLength(1)
      expect(outbox[0]?.mediaType).toBe('application/pdf')
      expect(outbox[0]?.bytesBase64.length).toBeGreaterThan(0)
      expect(JSON.stringify(result)).not.toContain(outbox[0]?.bytesBase64)
    } finally {
      delete host.__cadMcp
      delete host[CAD_MCP_FILE_OUTBOX_KEY]
    }
  })

  test('skips saveHtml when the session has no exportHtml hook', async () => {
    const session = createDatabaseSession(new AcDbDatabase(), {
      title: 'blank'
    })
    const result = await executeCadScript(
      {
        code: `return cad.file.saveHtml('out/plan.html')`,
        intent: 'save html'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      queued: true,
      index: 0,
      fileName: 'plan.html'
    })
    expect(result.savedFiles).toBeUndefined()
    expect(result.log).toContain(
      'saveHtml skipped: this session has no HTML exporter (needs a viewer host)'
    )
  })

  test('keeps success when savePdf fails after the script body', async () => {
    const { session } = createFixture()
    session.exportPdf = jest.fn(async () => {
      throw new Error('pdf boom')
    })

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('draw', tx => {
            tx.drawCircle({ center: { x: 0, y: 0 }, radius: 1 })
          })
          return cad.file.savePdf('out/plan.pdf')
        `,
        intent: 'draw then pdf'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.savedFiles).toBeUndefined()
    expect(result.log?.some(line => line.includes('savePdf failed'))).toBe(
      true
    )
  })

  test('queues saveHtml through exportHtml without returning bytes', async () => {
    const { session } = createFixture()
    const html = new TextEncoder().encode('<html></html>')
    session.exportHtml = jest.fn(async () => ({
      fileName: 'plan.html',
      bytes: html,
      mediaType: 'text/html;charset=utf-8'
    }))
    const host = globalThis as unknown as Record<string, unknown>
    host.__cadMcp = {}
    host[CAD_MCP_FILE_OUTBOX_KEY] = []

    try {
      const result = await executeCadScript(
        {
          code: `return cad.file.saveHtml('out/plan.html')`,
          intent: 'save html'
        },
        session
      )

      expect(result.success).toBe(true)
      expect(session.exportHtml).toHaveBeenCalled()
      expect(result.savedFiles).toEqual([
        expect.objectContaining({
          fileName: 'plan.html',
          path: 'out/plan.html',
          delivery: 'mcp',
          bytes: html.byteLength
        })
      ])
    } finally {
      delete host.__cadMcp
      delete host[CAD_MCP_FILE_OUTBOX_KEY]
    }
  })

  test('draws dimension entities including diameter from circle geometry', async () => {
    const { session, db } = createFixture()
    const before = countEntities(db)

    const result = await executeCadScript(
      {
        code: `
          const ids = []
          cad.edit.transaction('dims', tx => {
            ids.push(tx.drawDimAligned({
              xLine1Point: { x: 0, y: 0 },
              xLine2Point: { x: 10, y: 0 },
              dimLinePoint: { x: 5, y: 3 }
            }))
            ids.push(tx.drawDimLinear({
              xLine1Point: { x: 0, y: 0 },
              xLine2Point: { x: 0, y: 8 },
              dimLinePoint: { x: -2, y: 4 },
              rotationDeg: 90
            }))
            ids.push(tx.drawDimDiameter({
              center: { x: 20, y: 0 },
              radius: 2,
              angleDeg: 30,
              leaderLength: 1
            }))
            ids.push(tx.drawDimRadius({
              center: { x: 30, y: 0 },
              radius: 2,
              angleDeg: 45,
              leaderLength: 1
            }))
            ids.push(tx.drawDimAngular({
              center: { x: 0, y: 0 },
              xLine1Point: { x: 10, y: 0 },
              xLine2Point: { x: 0, y: 10 },
              arcPoint: { x: 5, y: 5 }
            }))
            ids.push(tx.drawDimArc({
              center: { x: 40, y: 0 },
              xLine1Point: { x: 45, y: 0 },
              xLine2Point: { x: 40, y: 5 },
              arcPoint: { x: 43.5, y: 3.5 }
            }))
            ids.push(tx.drawDimOrdinate({
              definingPoint: { x: 12, y: 7 },
              leaderEndPoint: { x: 18, y: 7 },
              useXAxis: true,
              origin: { x: 0, y: 0 }
            }))
          })
          const snaps = ids.map(id => cad.entities.byId(id))
          return {
            types: snaps.map(s => s.type),
            diameter: snaps[2].geometry.measurement,
            radius: snaps[3].geometry.measurement
          }
        `,
        intent: 'draw dimensions'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(7)
    expect(countEntities(db)).toBe(before + 7)
    const data = result.data as {
      types: string[]
      diameter: number
      radius: number
    }
    expect(data.types).toEqual([
      'AlignedDimension',
      'RotatedDimension',
      'DiametricDimension',
      'RadialDimension',
      '3PointAngularDimension',
      'ArcDimension',
      'OrdinateDimension'
    ])
    expect(data.diameter).toBeCloseTo(4, 10)
    expect(data.radius).toBeCloseTo(2, 10)

    const dimBlocks = [...db.tables.blockTable.newIterator()].filter(block =>
      block.name.startsWith('*D')
    )
    expect(dimBlocks).toHaveLength(7)
  })

  test('rejects radius dimension without center', async () => {
    const { session, db } = createFixture()
    const before = countEntities(db)

    const result = await executeCadScript(
      {
        code: `
          let outcome
          cad.edit.transaction('bad radius', tx => {
            try {
              tx.drawDimRadius({ radius: 5, angleDeg: 0 })
              outcome = { threw: false }
            } catch (error) {
              outcome = {
                threw: true,
                message: error instanceof Error ? error.message : String(error)
              }
            }
          })
          return outcome
        `,
        intent: 'invalid radius dim'
      },
      session
    )

    expect(result.success).toBe(true)
    const data = result.data as { threw: boolean; message?: string }
    expect(data.threw).toBe(true)
    expect(data.message).toBe('invalid_radius_points')
    expect(countEntities(db)).toBe(before)
  })

  test('draws extended entity types in one transaction', async () => {
    const { session, db } = createFixture()
    const before = countEntities(db)

    const result = await executeCadScript(
      {
        code: `
          const ids = []
          cad.edit.transaction('extended draws', tx => {
            ids.push(tx.drawEllipse({
              center: { x: 0, y: 0 },
              majorRadius: 10,
              minorRadius: 5
            }))
            ids.push(tx.drawHatch({
              boundary: [
                { x: 0, y: 0 },
                { x: 4, y: 0 },
                { x: 4, y: 3 }
              ],
              patternName: 'SOLID'
            }))
            ids.push(tx.drawPoint({ position: { x: 1, y: 2 } }))
            ids.push(tx.drawRay({
              start: { x: 0, y: 0 },
              through: { x: 1, y: 0 }
            }))
            ids.push(tx.drawXline({
              start: { x: 0, y: 0 },
              through: { x: 0, y: 1 }
            }))
            ids.push(tx.drawSpline({
              points: [
                { x: 0, y: 0 },
                { x: 2, y: 1 },
                { x: 4, y: 0 }
              ]
            }))
          })
          return { ids, types: ids.map(id => cad.entities.byId(id).type) }
        `,
        intent: 'extended draws'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(6)
    expect(countEntities(db)).toBe(before + 6)
    expect(result.data).toEqual({
      ids: expect.any(Array),
      types: ['Ellipse', 'Hatch', 'Point', 'Ray', 'Xline', 'Spline']
    })
  })

  test('reads every block, symbol table, and entity owner', async () => {
    const { session, db } = createFixture()
    const block = new AcDbBlockTableRecord({ name: 'Widget' })
    db.tables.blockTable.add(block)
    const nested = new AcDbCircle(new AcGePoint3d(5, 5, 0), 3)
    nested.layer = '0'
    block.appendEntity(nested)

    const paper = new AcDbBlockTableRecord({ name: '*Paper_Space' })
    db.tables.blockTable.add(paper)
    const paperLine = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(8, 0, 0)
    )
    paper.appendEntity(paperLine)

    const result = await executeCadScript(
      {
        code: `
          const widget = cad.blocks.find(block => block.name === 'Widget')
          const model = cad.blocks.find(block => block.isModelSpace)
          const owned = cad.entities.inBlock(widget.id)
          const paper = cad.entities.where(entity => {
            const owner = cad.blocks.find(block => block.id === entity.ownerId)
            return owner && owner.isPaperSpace
          })
          return {
            names: cad.blocks.map(block => block.name),
            widgetEntities: owned.map(entity => entity.type),
            widgetEntityCount: widget.entityCount,
            owned: owned.map(entity => ({ type: entity.type, ownerId: entity.ownerId })),
            modelCount: model.entityCount,
            layoutCount: cad.entities.count(() => true),
            layers: cad.tables.layerTable.records.map(record => record.name),
            hasPaper: cad.blocks.some(block => block.isPaperSpace),
            paperCount: paper.length
          }
        `,
        intent: 'inspect database'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        widgetEntities: ['Circle'],
        widgetEntityCount: 1,
        owned: [{ type: 'Circle', ownerId: block.objectId }],
        modelCount: 4,
        hasPaper: true,
        paperCount: 1
      })
    )
    const data = result.data as {
      names: string[]
      layoutCount: number
      layers: string[]
    }
    expect(data.names).toEqual(
      expect.arrayContaining(['*Model_Space', '*Paper_Space', 'Widget'])
    )
    // where/count skip block definitions — Widget's circle is only via inBlock.
    expect(data.layoutCount).toBe(5)
    expect(data.layers).toEqual(expect.arrayContaining(['Walls']))
  })
})

function createFixture(openMode: number = CadSessionOpenMode.Write) {
  const db = new AcDbDatabase()
  db.tables.layerTable.add(new AcDbLayerTableRecord({ name: 'Walls' }))

  const origin = new AcDbCircle(new AcGePoint3d(0, 0, 0), 1)
  origin.layer = '0'
  const wallA = new AcDbCircle(new AcGePoint3d(10, 0, 0), 1)
  wallA.layer = 'Walls'
  const wallB = new AcDbCircle(new AcGePoint3d(20, 0, 0), 2)
  wallB.layer = 'Walls'
  const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
  line.layer = '0'
  db.tables.blockTable.modelSpace.appendEntity(origin)
  db.tables.blockTable.modelSpace.appendEntity(wallA)
  db.tables.blockTable.modelSpace.appendEntity(wallB)
  db.tables.blockTable.modelSpace.appendEntity(line)

  const selection = new FakeSelection()
  const view: CadSessionView = {
    selectionSet: selection,
    zoomToFitDrawing() {
      return undefined
    },
    getDrawingExtents() {
      return undefined
    },
    search() {
      return []
    }
  }
  const capturePreview = jest.fn(
    async (
      _options?: CadCapturePreviewOptions
    ): Promise<CaptureDrawingPreviewResult> => ({
      ok: true,
      dataUrl: 'data:image/png;base64,aaa'
    })
  )
  const session: CadSession = {
    capturePreview,
    getDocument: () => ({
      database: db,
      openMode,
      docTitle: 'fixture',
      layerStore: {
        getLayers: () =>
          [...db.tables.layerTable.newIterator()].map(layer => ({
            name: layer.name,
            isOn: !layer.isOff,
            isFrozen: layer.isFrozen,
            isLocked: false
          })),
        getCurrentLayerName: () => db.clayer
      },
      layerService: {
        setCurrentLayer: () => false,
        createLayers: () => ({ created: 0, existed: [] })
      },
      entityService: {
        eraseEntities: () => 0,
        getEntitiesByIds: () => [],
        translateEntities: () => 0,
        rotateEntities: () => 0
      }
    }),
    getView: () => view
  }
  return { session, db, selection, capturePreview }
}

function countEntities(db: AcDbDatabase): number {
  return [...db.tables.blockTable.modelSpace.newIterator()].length
}

class FakeSelection {
  private readonly selected = new Set<string>()

  get ids(): string[] {
    return [...this.selected]
  }

  add(value: string | readonly string[]): void {
    const ids = typeof value === 'string' ? [value] : value
    for (const id of ids) this.selected.add(id)
  }

  delete(value: string | readonly string[]): void {
    const ids = typeof value === 'string' ? [value] : value
    for (const id of ids) this.selected.delete(id)
  }

  clear(): void {
    this.selected.clear()
  }
}
