import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import {
  buildLineGeometry,
  buildPointGeometry
} from '../src/object/AcTrLineGeometryBuilder'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

describe('AcTrBatchedGroup direct line append', () => {
  it('registers objectId and supports visibility / remove', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    const group = new AcTrBatchedGroup()

    expect(
      group.appendLineGeometry(
        built.geometry as THREE.BufferGeometry,
        material,
        built.worldOffset,
        {
          objectId: 'line-1',
          visible: true
        }
      )
    ).toBe(true)
    built.geometry.dispose()

    expect(group.hasEntity('line-1')).toBe(true)
    expect(group.setEntityVisible('line-1', false)).toBe(true)
    expect(group.getEntityVisible('line-1')).toBe(false)
    expect(group.removeEntity('line-1')).toBe(true)
    expect(group.hasEntity('line-1')).toBe(false)
  })

  it('skips append when visible is false', () => {
    const material = new THREE.LineBasicMaterial()
    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    const group = new AcTrBatchedGroup()

    expect(
      group.appendLineGeometry(
        built.geometry as THREE.BufferGeometry,
        material,
        built.worldOffset,
        {
          objectId: 'hidden',
          visible: false
        }
      )
    ).toBe(false)
    built.geometry.dispose()
    expect(group.hasEntity('hidden')).toBe(false)
  })

  it('merges direct-append geometry into the same batch as addEntity(AcTrLine)', () => {
    const styleManager = new AcTrStyleManager()
    const context = new AcTrRenderContext(styleManager)
    const material = styleManager.getLineMaterial(defaultTraits, false)

    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    const group = new AcTrBatchedGroup()
    group.appendLineGeometry(
      built.geometry as THREE.BufferGeometry,
      material,
      built.worldOffset,
      { objectId: 'direct-1' }
    )
    built.geometry.dispose()

    const line = new AcTrLine(
      [
        { x: 10, y: 0, z: 0 },
        { x: 15, y: 0, z: 0 }
      ],
      defaultTraits,
      context,
      false
    )
    line.objectId = 'legacy-1'
    line.visible = true
    group.addEntity(line)
    line.dispose()

    expect(group.hasEntity('direct-1')).toBe(true)
    expect(group.hasEntity('legacy-1')).toBe(true)

    let lineBatchCount = 0
    group.traverse(child => {
      if (child instanceof THREE.LineSegments) {
        lineBatchCount++
      }
    })
    expect(lineBatchCount).toBe(1)
  })

  it('appends fat-line geometry into LineSegments2 batches', () => {
    const material = new LineMaterial({ color: 0xffffff, linewidth: 2 })
    const built = buildLineGeometry(
      [
        { x: 0, y: 0, z: 0 },
        { x: 8, y: 0, z: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    expect(built.kind).toBe('fat')

    const group = new AcTrBatchedGroup()
    expect(
      group.appendLine2Geometry(
        built.geometry as import('three/examples/jsm/lines/LineSegmentsGeometry.js').LineSegmentsGeometry,
        material,
        built.worldOffset,
        { objectId: 'fat-1' }
      )
    ).toBe(true)
    built.geometry.dispose()
    expect(group.hasEntity('fat-1')).toBe(true)
    material.dispose()
  })

  it('appends point geometry into point batches', () => {
    const material = new THREE.PointsMaterial({ color: 0xff0000 })
    const built = buildPointGeometry({ x: 5, y: 6, z: 0 }, material)
    const group = new AcTrBatchedGroup()

    expect(
      group.appendPointGeometry(
        built.geometry,
        material,
        built.worldOffset,
        {
          objectId: 'pt-1',
          position: built.position
        }
      )
    ).toBe(true)
    built.geometry.dispose()

    expect(group.hasEntity('pt-1')).toBe(true)
    expect(group.removeEntity('pt-1')).toBe(true)
    material.dispose()
  })

  it('appends mesh geometry with draw-order renderOrder', () => {
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-1, -1, 0, 1, -1, 0, 0, 1, 0],
        3
      )
    )
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1))

    const group = new AcTrBatchedGroup()
    expect(
      group.appendMeshGeometry(geometry, material, new THREE.Vector3(50, 50, 0), {
        objectId: 'mesh-1'
      })
    ).toBe(true)
    geometry.dispose()

    expect(group.hasEntity('mesh-1')).toBe(true)
    group.removeEntity('mesh-1')
    material.dispose()
  })
})
