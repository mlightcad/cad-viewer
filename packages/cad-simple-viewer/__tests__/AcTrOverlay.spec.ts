import {
  AcCmColor,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  acdbWithDatabase,
  acdbHostApplicationServices
} from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrMTextRenderer,
  AcTrRenderer
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { acTrPrepareOverlay } from '../src/view/AcTrOverlay'
import { AcTrScene } from '../src/view/AcTrScene'
import { AcTrLayout } from '../src/view/AcTrLayout'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(yes => {
    resolve = yes
  })
  return { promise, resolve }
}

/** Native source DB with controllable asynchronous drawable completion. */
function source(worldDraw: (renderer: AcTrRenderer) => AcTrEntity | null) {
  const database = new AcDbDatabase()
  acdbWithDatabase(database, () => {
    database.tables.layerTable.add(new AcDbLayerTableRecord({ name: '0' }))
    const entity = new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })
    jest
      .spyOn(entity, 'worldDraw')
      .mockImplementation(
        renderer => worldDraw(renderer as AcTrRenderer) ?? undefined
      )
    database.tables.blockTable.modelSpace.appendEntity(entity)
  })
  return database
}

function line(renderer: AcTrRenderer, length: number) {
  return renderer.lines([
    { x: 0, y: 0, z: 0 },
    { x: length, y: 0, z: 0 }
  ])
}

describe('detached native overlay preparation', () => {
  let host: AcTrRenderer

  beforeEach(() => {
    host = new AcTrRenderer({
      getSize: (size: THREE.Vector2) => size.set(800, 600)
    } as THREE.WebGLRenderer)
  })
  afterEach(() => host.dispose())

  it('does not start font readiness for a line-only reference', async () => {
    const ensure = jest
      .spyOn(AcTrMTextRenderer.prototype, 'ensureDefaultFontsReady')
      .mockResolvedValue(undefined)
    const db = source(renderer => line(renderer, 10))
    try {
      const layout = await acTrPrepareOverlay(host, db)
      expect(layout.entityCount).toBe(1)
      expect(ensure).not.toHaveBeenCalled()
      layout.clear()
    } finally {
      ensure.mockRestore()
    }
  })

  it('keeps interleaved source contexts separate and applies placement before returning', async () => {
    const gate = deferred()
    let firstRenderer!: AcTrRenderer
    let secondRenderer!: AcTrRenderer
    const firstDb = source(renderer => {
      firstRenderer = renderer
      const drawable = line(renderer, 10)
      drawable.asyncDraw = () => gate.promise
      return drawable
    })
    const secondDb = source(renderer => {
      secondRenderer = renderer
      return line(renderer, 20)
    })
    const transform = {
      position: { x: 100, y: 200, z: 0 },
      scale: 2,
      rotationRad: Math.PI / 2
    }
    const firstWork = acTrPrepareOverlay(host, firstDb, { transform })
    // Keep a failed assertion in the second preparation from orphaning this job.
    void firstWork.catch(() => undefined)
    transform.position.x = 999
    const second = await acTrPrepareOverlay(host, secondDb)
    expect(host.context.database).toBeUndefined()
    expect(firstRenderer.context.database).toBe(firstDb)
    expect(secondRenderer.context.database).toBe(secondDb)
    expect(firstRenderer.context).not.toBe(secondRenderer.context)
    gate.resolve()
    const first = await firstWork
    expect(first.internalObject.parent).toBeNull()
    expect(second.internalObject.parent).toBeNull()
    expect(first.internalObject.position.toArray()).toEqual([100, 200, 0])
    expect(first.internalObject.scale.toArray()).toEqual([2, 2, 2])
    expect(first.internalObject.rotation.z).toBeCloseTo(Math.PI / 2)
    expect(first.isReference).toBe(true)
    const firstContext = firstRenderer.context
    first.clear()
    expect(firstContext.isDisposed).toBe(true)
    expect(secondRenderer.context.isDisposed).toBe(false)
    expect(host.context.isDisposed).toBe(false)
    second.clear()
  })

  it('rejects and releases its scope when entity conversion fails', async () => {
    let context!: AcTrRenderer['context']
    const db = source(child => {
      context = child.context
      throw new Error('broken source')
    })
    await expect(acTrPrepareOverlay(host, db)).rejects.toThrow('broken source')
    expect(context.isDisposed).toBe(true)
    expect(host.context.isDisposed).toBe(false)
  })

  it('preserves reference geometry and resources through host regeneration', async () => {
    let child!: AcTrRenderer
    const db = source(renderer => {
      child = renderer
      return line(renderer, 10)
    })
    const reference = await acTrPrepareOverlay(host, db)
    const scene = new AcTrScene()
    const primaryRoot = new THREE.Group()
    scene.internalScene.add(primaryRoot, reference.internalObject)
    scene.clear({ preserveReferences: true })
    host.resetResources()
    expect(primaryRoot.parent).toBeNull()
    expect(reference.internalObject.parent).toBe(scene.internalScene)
    expect(child.context.isDisposed).toBe(false)
    scene.internalScene.remove(reference.internalObject)
    const context = child.context
    reference.clear()
    expect(context.isDisposed).toBe(true)
  })

  it('aborts promptly while native geometry is pending and cleans its late result', async () => {
    const gate = deferred()
    const controller = new AbortController()
    let context!: AcTrRenderer['context']
    let dispose!: jest.SpyInstance
    const lateGeometry = new THREE.BufferGeometry()
    const releaseLate = jest.spyOn(lateGeometry, 'dispose')
    const db = source(child => {
      context = child.context
      const drawable = line(child, 10)
      dispose = jest.spyOn(drawable, 'dispose')
      drawable.asyncDraw = async () => {
        await gate.promise
        // Even an adapter that produces late geometry is disposed by the owner.
        drawable.add(new THREE.Mesh(lateGeometry))
      }
      return drawable
    })
    const pending = acTrPrepareOverlay(host, db, { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(context.isDisposed).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)
    gate.resolve()
    await gate.promise
    await Promise.resolve()
    expect(dispose).toHaveBeenCalledTimes(2)
    expect(releaseLate).toHaveBeenCalledTimes(1)
  })

  it('validates placement and an already-aborted signal before allocating a scope', async () => {
    const create = jest.spyOn(host, 'createReferenceRenderer')
    const db = source(renderer => line(renderer, 1))
    await expect(
      acTrPrepareOverlay(host, db, {
        transform: { position: { x: 0, y: 0, z: 0 }, scale: 0, rotationRad: 0 }
      })
    ).rejects.toThrow('positive scale')
    const controller = new AbortController()
    controller.abort()
    await expect(
      acTrPrepareOverlay(host, db, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects pending preparation when its native renderer is destroyed', async () => {
    const gate = deferred()
    const db = source(child => {
      const drawable = line(child, 1)
      drawable.asyncDraw = () => gate.promise
      return drawable
    })
    const pending = acTrPrepareOverlay(host, db)
    host.dispose()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve()
    await gate.promise
  })

  it('places two real colliding block databases beside an editable host without merging them', async () => {
    function drawing(length: number, color: number) {
      const database = new AcDbDatabase()
      return acdbWithDatabase(database, () => {
        database.createDefaultData()
        const layer = new AcDbLayerTableRecord({
          name: 'SURVEY',
          objectId: 'F0',
          color: new AcCmColor().setRGBValue(color)
        })
        database.tables.layerTable.add(layer)
        const block = new AcDbBlockTableRecord({ name: 'WALL', objectId: 'F1' })
        database.tables.blockTable.add(block)
        const edge = new AcDbLine(
          { x: 0, y: 0, z: 0 },
          { x: length, y: 0, z: 0 }
        )
        edge.objectId = 'F2'
        edge.layer = 'SURVEY'
        edge.color.setByLayer()
        block.appendEntity(edge)
        const insert = new AcDbBlockReference('WALL')
        insert.objectId = 'F3'
        insert.layer = 'SURVEY'
        database.tables.blockTable.modelSpace.appendEntity(insert)
        return { database, insert, edge }
      })
    }
    function drawableColors(root: THREE.Object3D) {
      const colors = new Set<number>()
      root.traverse(object => {
        const material = (object as THREE.Mesh).material
        if (!material) return
        for (const entry of Array.isArray(material) ? material : [material]) {
          const color =
            (entry as THREE.ShaderMaterial).uniforms?.u_color?.value ??
            (entry as THREE.MeshBasicMaterial).color
          if (color instanceof THREE.Color) colors.add(color.getHex())
        }
      })
      return colors
    }
    const hostDb = new AcDbDatabase()
    const hostLine = acdbWithDatabase(hostDb, () => {
      hostDb.createDefaultData()
      const entity = new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })
      hostDb.tables.blockTable.modelSpace.appendEntity(entity)
      return entity
    })
    const previous = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = hostDb
    host.context.database = hostDb
    const primary = new AcTrLayout()
    for (const layer of hostDb.tables.layerTable.newIterator()) {
      primary.addLayer({
        name: layer.name,
        color: layer.color,
        isOff: false,
        isFrozen: false
      })
    }
    function drawPrimary() {
      const geometry = hostLine.worldDraw(host) as AcTrEntity
      geometry.objectId = hostLine.objectId
      geometry.ownerId = hostLine.ownerId
      geometry.layerName = hostLine.layer
      primary.addEntity(geometry)
      geometry.dispose()
    }
    const scene = new AcTrScene()
    const a = drawing(10, 0xff0000)
    const b = drawing(25, 0x0000ff)
    let first: AcTrLayout | undefined
    let second: AcTrLayout | undefined
    try {
      drawPrimary()
      scene.internalScene.add(primary.internalObject)
      first = await acTrPrepareOverlay(host, a.database, {
        transform: {
          position: { x: 100, y: 200, z: 0 },
          scale: 2,
          rotationRad: 0
        }
      })
      second = await acTrPrepareOverlay(host, b.database, {
        transform: {
          position: { x: 300, y: 400, z: 0 },
          scale: 1,
          rotationRad: Math.PI / 2
        }
      })
      scene.internalScene.add(first.internalObject, second.internalObject)
      expect(a.insert.objectId).toBe(b.insert.objectId)
      expect(a.edge.objectId).toBe(b.edge.objectId)
      expect(first.entityCount).toBe(1)
      expect(second.entityCount).toBe(1)
      expect(first.box.max.x - first.box.min.x).toBeCloseTo(10)
      expect(second.box.max.x - second.box.min.x).toBeCloseTo(25)
      expect(drawableColors(first.internalObject)).toContain(0xff0000)
      expect(drawableColors(second.internalObject)).toContain(0x0000ff)
      const firstWorld = first.box
        .clone()
        .applyMatrix4(first.internalObject.matrix)
      const secondWorld = second.box
        .clone()
        .applyMatrix4(second.internalObject.matrix)
      expect(firstWorld.min.x).toBeCloseTo(100)
      expect(firstWorld.max.x).toBeCloseTo(120)
      expect(secondWorld.min.y).toBeCloseTo(400)
      expect(secondWorld.max.y).toBeCloseTo(425)

      scene.internalScene.remove(first.internalObject)
      first.clear()
      expect(second.internalObject.parent).toBe(scene.internalScene)
      expect(second.box.max.x - second.box.min.x).toBeCloseTo(25)
      expect(drawableColors(second.internalObject)).toContain(0x0000ff)
      expect(host.context.database).toBe(hostDb)
      expect(acdbHostApplicationServices().workingDatabase).toBe(hostDb)
      expect([...hostDb.tables.blockTable.modelSpace.newIterator()]).toEqual([
        hostLine
      ])
      hostLine.endPoint = { x: 8, y: 0, z: 0 }
      const edited = hostLine.worldDraw(host) as AcTrEntity
      expect(edited.wcsBbox.max.x).toBeCloseTo(8)
      edited.dispose()
      expect(a.edge.endPoint.x).toBe(10)
      expect(b.edge.endPoint.x).toBe(25)
    } finally {
      first?.clear()
      second?.clear()
      primary.clear()
      acdbHostApplicationServices().workingDatabase = previous
    }
  })
})
