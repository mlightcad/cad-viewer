import { AcCmColor, AcDbDatabase } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderer } from '../src/renderer/AcTrRenderer'
import { AcTrSubEntityTraitsUtil } from '../src/util/AcTrEntityTraitsUtil'

function createRenderer(): AcTrRenderer {
  const webgl = {
    getSize: (size: THREE.Vector2) => size.set(800, 600)
  } as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

function dashedMaterial(renderer: AcTrRenderer, length: number) {
  const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  traits.layer = 'ROAD'
  traits.color.setByLayer()
  traits.lineType = {
    ...traits.lineType,
    name: 'DASHED',
    pattern: [
      { elementLength: length, elementTypeFlag: 0 },
      { elementLength: -length, elementTypeFlag: 0 }
    ],
    totalPatternLength: length * 2
  }
  return renderer.styleManager.getLineMaterial(traits) as THREE.ShaderMaterial
}

describe('reference renderer resource ownership', () => {
  let host: AcTrRenderer

  beforeEach(() => {
    host = createRenderer()
  })

  afterEach(() => host.dispose())

  it('isolates same-name linetypes and layer changes across original drawings', () => {
    const firstDb = new AcDbDatabase()
    const secondDb = new AcDbDatabase()
    const first = host.createReferenceRenderer(firstDb)
    const second = host.createReferenceRenderer(secondDb)
    const a = dashedMaterial(first, 10)
    const b = dashedMaterial(second, 2)

    expect(first.internalRenderer).toBe(host.internalRenderer)
    expect(first.context.database).toBe(firstDb)
    expect(second.context.database).toBe(secondDb)
    expect(host.context.database).toBeUndefined()
    expect(first.context).not.toBe(second.context)
    expect(first.context.mtextRenderer).not.toBe(second.context.mtextRenderer)
    expect(a.uniforms.pattern.value).toEqual([10, -10])
    expect(b.uniforms.pattern.value).toEqual([2, -2])

    const color = new AcCmColor().setRGBValue(0xff0000)
    first.updateLayerMaterial('ROAD', { color })
    expect(a.uniforms.u_color.value.getHex()).toBe(0xff0000)
    expect(b.uniforms.u_color.value.getHex()).not.toBe(0xff0000)
    expect(first.styleManager.getLayerBoundMaterial(b, 'OTHER')).toBe(b)
  })

  it('keeps borrowed cached materials alive until their source is disposed', () => {
    const first = host.createReferenceRenderer(new AcDbDatabase())
    const second = host.createReferenceRenderer(new AcDbDatabase())
    const a = dashedMaterial(first, 10)
    const b = dashedMaterial(second, 2)
    const disposedA = jest.spyOn(a, 'dispose')
    const disposedB = jest.spyOn(b, 'dispose')
    const entity = new AcTrEntity(first.context)
    const geometry = new THREE.BufferGeometry()
    const geometryDisposed = jest.spyOn(geometry, 'dispose')
    entity.add(new THREE.LineSegments(geometry, a))

    entity.dispose()
    expect(geometryDisposed).toHaveBeenCalledTimes(1)
    expect(disposedA).not.toHaveBeenCalled()
    first.dispose()
    first.dispose()
    expect(disposedA).toHaveBeenCalledTimes(1)
    expect(disposedB).not.toHaveBeenCalled()
    expect(dashedMaterial(second, 2)).toBe(b)
  })

  it('releases every owned child geometry without skipping siblings', () => {
    const entity = new AcTrEntity(host.context)
    const geometries = [new THREE.BufferGeometry(), new THREE.BufferGeometry()]
    const disposed = geometries.map(geometry => jest.spyOn(geometry, 'dispose'))
    for (const geometry of geometries) {
      entity.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()))
    }
    entity.dispose()
    expect(disposed[0]).toHaveBeenCalledTimes(1)
    expect(disposed[1]).toHaveBeenCalledTimes(1)
  })

  it('parks host styles independently and releases only the closed document', () => {
    const firstScope = host.captureResourceScope()
    const firstContext = host.context
    const firstMaterial = dashedMaterial(host, 10)
    const firstDisposed = jest.spyOn(firstMaterial, 'dispose')
    host.beginResourceScope()
    const secondScope = host.captureResourceScope()
    const secondContext = host.context
    const secondMaterial = dashedMaterial(host, 2)
    const secondDisposed = jest.spyOn(secondMaterial, 'dispose')
    expect(secondContext.mtextRenderer).not.toBe(firstContext.mtextRenderer)
    expect(secondMaterial.uniforms.pattern.value).toEqual([2, -2])

    host.restoreResourceScope(firstScope)
    expect(host.context).toBe(firstContext)
    expect(dashedMaterial(host, 10)).toBe(firstMaterial)
    host.releaseResourceScope(firstScope)
    expect(firstDisposed).toHaveBeenCalledTimes(1)
    expect(secondDisposed).not.toHaveBeenCalled()
    host.restoreResourceScope(secondScope)
    expect(host.context).toBe(secondContext)
    expect(dashedMaterial(host, 2)).toBe(secondMaterial)
    expect(() => host.restoreResourceScope(firstScope)).toThrow(
      'does not belong'
    )
  })

  it('rejects restoring another renderer scope', () => {
    const other = createRenderer()
    expect(() =>
      host.restoreResourceScope(other.captureResourceScope())
    ).toThrow('does not belong')
    other.dispose()
  })

  it('retains the host database across REGEN while new documents start unbound', () => {
    const database = new AcDbDatabase()
    host.context.database = database
    const previous = host.context

    host.resetResources()
    expect(host.context).not.toBe(previous)
    expect(previous.isDisposed).toBe(true)
    expect(host.context.database).toBe(database)

    host.beginResourceScope()
    expect(host.context.database).toBeUndefined()
  })

  it('propagates viewport state but preserves parked references across host reset', () => {
    const reference = host.createReferenceRenderer(new AcDbDatabase())
    const oldContext = host.context
    const referenceContext = reference.context
    host.updateLineResolution(1024, 768)
    host.currentBackgroundColor = 0xffffff
    expect(reference.styleManager.options.resolution.toArray()).toEqual([
      1024, 768
    ])
    expect(reference.currentBackgroundColor).toBe(0xffffff)

    host.resetResources()
    expect(oldContext.isDisposed).toBe(true)
    expect(host.context).not.toBe(oldContext)
    expect(reference.context).toBe(referenceContext)
    expect(referenceContext.isDisposed).toBe(false)
    host.dispose()
    expect(referenceContext.isDisposed).toBe(true)
    expect(() => host.createReferenceRenderer(new AcDbDatabase())).toThrow(
      'disposed'
    )
  })
})
