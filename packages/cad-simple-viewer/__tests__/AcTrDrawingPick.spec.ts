import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGeBox2d,
  AcGePoint3d,
  AcGiViewport,
  acdbHostApplicationServices,
  acdbWithDatabase
} from '@mlightcad/data-model'
import {
  AcTrBaseView,
  AcTrRenderer,
  AcTrViewportView
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  acTrPickDrawingEntities,
  type AcTrDrawingPickSource
} from '../src/view/AcTrDrawingPick'
import { acTrPrepareOverlay } from '../src/view/AcTrOverlay'
import type { AcTrLayout } from '../src/view/AcTrLayout'

function drawing(length = 10) {
  const database = new AcDbDatabase()
  return acdbWithDatabase(database, () => {
    database.createDefaultData()
    const layer = new AcDbLayerTableRecord({ name: 'SURVEY' })
    database.tables.layerTable.add(layer)
    const block = new AcDbBlockTableRecord({ name: 'WALL', objectId: 'F1' })
    database.tables.blockTable.add(block)
    const edge = new AcDbLine({ x: 0, y: 0, z: 0 }, { x: length, y: 0, z: 0 })
    edge.objectId = 'F2'
    edge.layer = 'SURVEY'
    block.appendEntity(edge)
    const insert = new AcDbBlockReference('WALL')
    insert.objectId = 'F3'
    database.tables.blockTable.modelSpace.appendEntity(insert)
    return { database, edge, insert, layer }
  })
}

function pick(
  source: AcTrDrawingPickSource,
  x: number,
  y: number,
  radius = 0.5
) {
  const aperture = new AcGeBox2d().setFromPoints([
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y + radius }
  ])
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(), camera)
  ray.params.Line.threshold = radius
  ray.params.Points.threshold = radius
  return acTrPickDrawingEntities(source, aperture, ray).filter(
    hit => !(hit.entity instanceof AcDbBlockReference)
  )
}

describe('native source-qualified drawing picks', () => {
  let renderer: AcTrRenderer
  let layouts: AcTrLayout[]
  beforeEach(() => {
    renderer = new AcTrRenderer({
      getSize: (v: THREE.Vector2) => v.set(800, 600)
    } as THREE.WebGLRenderer)
    layouts = []
  })
  afterEach(() => {
    layouts.forEach(layout => layout.clear())
    renderer.dispose()
  })

  async function prepare(
    database: AcDbDatabase,
    referenceId: string,
    x = 100,
    y = 200
  ) {
    const layout = await acTrPrepareOverlay(renderer, database, {
      transform: {
        position: { x, y, z: 0 },
        rotationRad: Math.PI / 2,
        scale: 2
      }
    })
    layouts.push(layout)
    return { database, referenceId, layout, isCurrent: () => true }
  }

  it('keeps equal handles and repeated placements distinct without changing the host', async () => {
    const host = new AcDbDatabase()
    acdbWithDatabase(host, () => host.createDefaultData())
    acdbHostApplicationServices().workingDatabase = host
    const a = drawing()
    const b = drawing(20)
    const first = await prepare(a.database, 'a')
    const second = await prepare(b.database, 'b', 300, 400)
    const repeated = await prepare(a.database, 'a-again', 500, 600)
    const hit = pick(first, 100, 210)[0]
    expect(hit.entity).toBe(a.edge)
    expect(hit.referenceId).toBe('a')
    expect(hit.rootId).toBe('F3')
    expect(hit.path).toEqual(['F2'])
    const displayed = new AcGePoint3d(a.edge.endPoint).applyMatrix4(
      hit.transform
    )
    expect(displayed.x).toBeCloseTo(100)
    expect(displayed.y).toBeCloseTo(220)
    expect(pick(second, 300, 410)[0].entity).toBe(b.edge)
    expect(pick(repeated, 500, 610)[0].referenceId).toBe('a-again')
    expect(pick(first, 5, 0)).toEqual([])
    expect(acdbHostApplicationServices().workingDatabase).toBe(host)
    expect([...host.tables.blockTable.modelSpace.newIterator()]).toHaveLength(0)
    expect(a.edge.endPoint.x).toBe(10)
    expect(b.edge.endPoint.x).toBe(20)
  })

  it('rejects acquired hits when the reference, leaf layer, entity or placement changes', async () => {
    const d = drawing()
    const source = await prepare(d.database, 'a')
    const initial = pick(source, 100, 210)[0]
    expect(initial.isCurrent()).toBe(true)
    source.layout.visible = false
    expect(initial.isCurrent()).toBe(false)
    expect(pick(source, 100, 210)).toEqual([])
    source.layout.visible = true
    const beforeLayer = pick(source, 100, 210)[0]
    source.layout.getLayer('SURVEY')!.visible = false
    expect(beforeLayer.isCurrent()).toBe(false)
    expect(pick(source, 100, 210)).toEqual([])
    source.layout.getLayer('SURVEY')!.visible = true
    const beforeEntity = pick(source, 100, 210)[0]
    source.layout.setEntityVisible('F3', false)
    expect(beforeEntity.isCurrent()).toBe(false)
    expect(pick(source, 100, 210)).toEqual([])
    source.layout.setEntityVisible('F3', true)
    const beforeMove = pick(source, 100, 210)[0]
    source.layout.internalObject.position.x += 100
    expect(beforeMove.isCurrent()).toBe(false)
    expect(pick(source, 100, 210)).toEqual([])
    expect(pick(source, 200, 210)).toHaveLength(1)
    const beforeRemoval = pick(source, 200, 210)[0]
    source.isCurrent = () => false
    expect(beforeRemoval.isCurrent()).toBe(false)
    expect(pick(source, 200, 210)).toEqual([])
  })

  it('uses a displayed aperture independent of reference scale', async () => {
    const source = await prepare(drawing().database, 'scaled')
    expect(pick(source, 100.4, 210, 0.5)).toHaveLength(1)
    expect(pick(source, 100.6, 210, 0.5)).toEqual([])
  })

  it('queries hidden model space through its native paper viewport and returns displayed coordinates', async () => {
    const d = drawing()
    const layout = await acTrPrepareOverlay(renderer, d.database)
    layouts.push(layout)
    layout.visible = false // Model layout is visible only through the viewport.
    const gi = new AcGiViewport()
    gi.id = 'P1'
    gi.centerPoint = new AcGePoint3d(5, 5, 0)
    gi.width = 10
    gi.height = 10
    gi.viewCenter = new AcGePoint3d(0, 0, 0)
    gi.viewTarget = new AcGePoint3d(5, 0, 0)
    gi.viewHeight = 20
    gi.viewTwistAngle = Math.PI / 2
    const parent = new AcTrBaseView(renderer, 800, 600)
    const viewport = new AcTrViewportView(parent, gi, renderer)
    const aperture = new AcGeBox2d().setFromPoints([
      { x: 4.75, y: 4.75 },
      { x: 5.25, y: 5.25 }
    ])
    const hits = acTrPickDrawingEntities(
      { database: d.database, layout, viewport, isCurrent: () => true },
      aperture,
      viewport.resetRaycaster(viewport.paperPointToModel({ x: 5, y: 5 }), 0.5)
    )
    const hit = hits.find(item => item.entity === d.edge)!
    expect(hit.viewportId).toBe('P1')
    expect(hit.referenceId).toBeUndefined()
    const endpoint = new AcGePoint3d(d.edge.endPoint).applyMatrix4(
      hit.transform
    )
    expect(endpoint.x).toBeCloseTo(5)
    expect(endpoint.y).toBeCloseTo(2.5)
    expect(hit.isCurrent()).toBe(true)
    const projection = viewport.modelToPaperTransform
    viewport.viewport.width = 12
    expect(viewport.modelToPaperTransform.equals(projection)).toBe(true)
    expect(hit.isCurrent()).toBe(false)
    viewport.viewport.width = 10
    viewport.viewport.viewTwistAngle = 0
    expect(hit.isCurrent()).toBe(false)
  })

  it('keeps nested display and picks source-local across freeze, off, thaw and explicit hiding', async () => {
    const d = drawing()
    acdbWithDatabase(d.database, () => {
      for (const name of ['ROOT', 'LEFT', 'RIGHT']) {
        d.database.tables.layerTable.add(new AcDbLayerTableRecord({ name }))
      }
      const inherited = new AcDbLine(
        { x: 0, y: 2, z: 0 },
        { x: 10, y: 2, z: 0 }
      )
      d.database.tables.blockTable.getAt('WALL')!.appendEntity(inherited)
      const outer = new AcDbBlockTableRecord({ name: 'PAIR' })
      d.database.tables.blockTable.add(outer)
      for (const [name, x] of [
        ['LEFT', 0],
        ['RIGHT', 30]
      ] as const) {
        const child = new AcDbBlockReference('WALL')
        child.layer = name
        child.position = { x, y: 0, z: 0 }
        outer.appendEntity(child)
      }
      d.insert.blockName = 'PAIR'
      d.insert.layer = 'ROOT'
    })
    const a = await prepare(d.database, 'A')
    const b = await prepare(d.database, 'B')
    const revision = d.database.renderingRevision
    a.layout.setLayerVisibility('0', { isFrozen: true })
    // Nested layer 0 inherits LEFT/RIGHT; global layer 0 must not hide it.
    expect(pick(a, 96, 210)).toHaveLength(1)
    const retained = pick(a, 100, 210)[0]
    expect(retained?.entity).toBe(d.edge)
    const geometryCount = a.layout.stats.summary.entityCount
    const beforeBounds = a.layout.box.clone()
    a.layout.setLayerVisibility('LEFT', { isFrozen: true })
    expect(retained.isCurrent()).toBe(false)
    expect(pick(a, 100, 210)).toEqual([])
    expect(pick(a, 100, 270)[0]?.entity).toBe(d.edge)
    expect(pick(b, 100, 210)[0]?.entity).toBe(d.edge)
    expect(a.layout.box.min.x).toBeGreaterThan(beforeBounds.min.x)
    expect(a.layout.getEntityVisible(d.insert.objectId)).toBe(true)
    expect(a.layout.stats.summary.entityCount).toBe(geometryCount)
    expect(d.database.tables.layerTable.getAt('LEFT')!.isFrozen).toBe(false)
    expect(d.database.renderingRevision).toBe(revision)

    // OFF on an INSERT preserves its independently named SURVEY contents.
    a.layout.setLayerVisibility('LEFT', { isFrozen: false, isOff: true })
    expect(pick(a, 100, 210)[0]?.entity).toBe(d.edge)
    expect(pick(a, 96, 210)).toEqual([])
    expect(pick(b, 96, 210)).toHaveLength(1)
    a.layout.setLayerVisibility('SURVEY', { isOff: true })
    expect(pick(a, 100, 210)).toEqual([])
    expect(pick(a, 100, 270)).toEqual([])
    a.layout.setLayerVisibility('SURVEY', { isOff: false })
    a.layout.setLayerVisibility('ROOT', { isFrozen: true })
    expect(a.layout.box.isEmpty()).toBe(true)
    a.layout.setEntityVisible(d.insert.objectId, false)
    a.layout.setLayerVisibility('ROOT', { isFrozen: false })
    expect(a.layout.box.isEmpty()).toBe(true)
    expect(pick(a, 100, 270)).toEqual([])
    a.layout.setEntityVisible(d.insert.objectId, true)
    expect(pick(a, 100, 270)[0]?.entity).toBe(d.edge)
  })

  it('resolves actual nested INSERT and MINSERT occurrences without aliasing leaf handles', async () => {
    const d = drawing()
    acdbWithDatabase(d.database, () => {
      const outer = new AcDbBlockTableRecord({ name: 'PAIR' })
      d.database.tables.blockTable.add(outer)
      for (const [id, x] of [
        ['A1', 0],
        ['A2', 30]
      ] as const) {
        const child = new AcDbBlockReference('WALL')
        child.objectId = id
        child.position = { x, y: 0, z: 0 }
        outer.appendEntity(child)
      }
      d.insert.blockName = 'PAIR'
      d.insert.columnCount = 2
      d.insert.columnSpacing = 100
      d.insert.rowCount = 2
      d.insert.rowSpacing = 100
    })
    const source = await prepare(d.database, 'array')
    const occurrences = []
    for (const row of [0, 1]) {
      for (const col of [0, 1]) {
        for (const x of [5, 35]) {
          const hit = pick(
            source,
            100 - 200 * row,
            200 + 2 * (100 * col + x)
          )[0]
          expect(hit?.entity).toBe(d.edge)
          expect(hit.path).toEqual([x === 5 ? 'A1' : 'A2', 'F2'])
          const start = new AcGePoint3d(d.edge.startPoint).applyMatrix4(
            hit.transform
          )
          expect(start.x).toBeCloseTo(100 - 200 * row)
          expect(start.y).toBeCloseTo(200 + 2 * (100 * col + x - 5))
          occurrences.push(JSON.stringify(hit.instancePath))
        }
      }
    }
    expect(new Set(occurrences).size).toBe(8)
  })
})
