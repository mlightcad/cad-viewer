import {
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  CadSessionOpenMode,
  createCadToolCatalog,
  createDatabaseSession,
  executeCadScript,
  type ToolResult
} from '../src'

/**
 * Runs against a bare database: no viewer module is loaded or mocked here.
 */
describe('createDatabaseSession', () => {
  test('draws, selects, and reads back drawing context', async () => {
    const db = new AcDbDatabase()
    const session = createDatabaseSession(db, { title: 'plan.dxf' })

    const result = await executeCadScript(
      {
        code: `
          let ids = []
          cad.edit.transaction('draw', tx => {
            ids.push(tx.drawLine({ start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }))
            ids.push(tx.drawCircle({ center: { x: 20, y: 5 }, radius: 5 }))
          })
          cad.selection.replace(ids)
          const d = cad.drawing
          return {
            title: d.title,
            extents: d.extents,
            selected: cad.selection.entities.map(e => e.type).sort()
          }
        `
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(2)
    expect(result.highlightedIds).toEqual(result.entityIds)
    expect(session.getView()!.selectionSet.ids).toEqual(result.entityIds)
    expect(result.data).toEqual({
      title: 'plan.dxf',
      extents: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 25, y: 10, z: 0 },
        isEmpty: false
      },
      selected: ['Circle', 'Line']
    })
  })

  test('moves, rotates, and erases in one undo step', async () => {
    const db = new AcDbDatabase()
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity(line)
    const extra = new AcDbLine(
      new AcGePoint3d(0, 5, 0),
      new AcGePoint3d(1, 5, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity(extra)
    const session = createDatabaseSession(db)

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('edit', tx => {
            tx.move(['${line.objectId}'], 5, 0)
            tx.rotate(['${line.objectId}'], { x: 5, y: 0 }, 90)
            tx.erase(['${extra.objectId}'])
          })
          const g = cad.entities.byId('${line.objectId}').geometry
          return [g.start, g.end].map(p => [Math.round(p.x), Math.round(p.y)])
        `
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual([
      [5, 0],
      [5, 10]
    ])
    expect(db.tables.blockTable.getEntityById(extra.objectId)).toBeUndefined()

    expect(db.transactionManager.undo()).toBe(true)
    expect(line.startPoint.x).toBeCloseTo(0)
    expect(line.endPoint.x).toBeCloseTo(10)
    expect(db.tables.blockTable.getEntityById(extra.objectId)).toBeDefined()
  })

  test('creates layers, sets CLAYER, and skips entities on locked layers', async () => {
    const db = new AcDbDatabase()
    const locked = new AcDbLayerTableRecord({ name: 'Locked' })
    locked.standardFlags = 0x04
    db.tables.layerTable.add(locked)
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    line.layer = 'Locked'
    db.tables.blockTable.modelSpace.appendEntity(line)
    const session = createDatabaseSession(db)

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('layers', tx => {
            tx.createLayer('Walls')
            tx.setCurrentLayer('Walls')
            tx.setLayer(['${line.objectId}'], 'Walls')
            tx.move(['${line.objectId}'], 5, 0)
          })
          return {
            current: cad.drawing.currentLayer,
            locked: cad.drawing.layers.find(l => l.name === 'Locked').isLocked
          }
        `
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ current: 'Walls', locked: true })
    expect(line.layer).toBe('Locked')
    expect(line.startPoint.x).toBe(0)
  })

  test('undoes the layer on/thaw part of setCurrentLayer', async () => {
    const db = new AcDbDatabase()
    const hidden = new AcDbLayerTableRecord({ name: 'Hidden' })
    db.tables.layerTable.add(hidden)
    hidden.isOff = true
    const session = createDatabaseSession(db)

    const result = await executeCadScript(
      {
        code: 'cad.edit.transaction("clayer", tx => tx.setCurrentLayer("Hidden"))'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(db.clayer).toBe('Hidden')
    expect(hidden.isOff).toBe(false)
    expect(db.transactionManager.undo()).toBe(true)
    expect(db.tables.layerTable.getAt('Hidden')!.isOff).toBe(true)
  })

  test('rejects edits on a read-only session', async () => {
    const db = new AcDbDatabase()
    const session = createDatabaseSession(db, {
      openMode: CadSessionOpenMode.Read
    })

    const result = await executeCadScript(
      {
        code: 'cad.edit.transaction("x", tx => tx.drawPoint({ position: { x: 0, y: 0 } }))'
      },
      session
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('read_only')
  })

  test('skips previews and tells the model they are unavailable', async () => {
    const session = createDatabaseSession(new AcDbDatabase())
    const [tool] = createCadToolCatalog(session)

    expect(tool.description).toContain(
      'cad.view.capturePreview is DISABLED in this session'
    )

    const result = (await executeCadScript(
      {
        code: `
          cad.view.zoomExtents()
          return cad.view.capturePreview()
        `
      },
      session
    )) as ToolResult
    expect(result.success).toBe(true)
    expect(result.images).toBeUndefined()
    expect(result.log).toContain(
      'capturePreview skipped: this session has no renderer for previews'
    )
  })

  test('uses runEdit when the session provides it', async () => {
    const db = new AcDbDatabase()
    const base = createDatabaseSession(db)
    const labels: string[] = []
    const session = {
      ...base,
      runEdit(database: AcDbDatabase, label: string, fn: () => void) {
        labels.push(label)
        database.runDatabaseEdit(label, fn)
      }
    }

    const result = await executeCadScript(
      {
        code: `
          cad.edit.transaction('two lines', tx => {
            tx.drawLine({ start: { x: 0, y: 0 }, end: { x: 1, y: 0 } })
            tx.drawLine({ start: { x: 0, y: 1 }, end: { x: 1, y: 1 } })
          })
        `
      },
      session
    )

    expect(result.success).toBe(true)
    expect(labels).toEqual(['two lines'])
  })
})
