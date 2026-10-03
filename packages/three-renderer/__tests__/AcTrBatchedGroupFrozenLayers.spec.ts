import * as THREE from 'three'

import {
  AcTrBatchedGroup,
  disposePreviewSubset
} from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import {
  getObjectUserData,
  getSceneDrawableUserData
} from '../src/util/AcTrObjectUserData'

function line(y: number, names: readonly string[], unbatched = false) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
  )
  geometry.setIndex([0, 1])
  const object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  object.position.y = y
  const data = getSceneDrawableUserData(object)
  getObjectUserData(object).ancestorLayerNames = names
  if (unbatched) data.noBatch = true
  return object
}

function ray(y: number) {
  const result = new THREE.Raycaster(
    new THREE.Vector3(5, y, 100),
    new THREE.Vector3(0, 0, -1)
  )
  result.params.Line.threshold = 0.1
  return result
}

describe('native batch ancestor layer freeze masks', () => {
  let context: AcTrRenderContext
  let group: AcTrBatchedGroup
  beforeEach(() => {
    context = new AcTrRenderContext()
    group = new AcTrBatchedGroup()
  })
  afterEach(() => {
    group.clear()
    context.dispose()
  })

  function entity(...children: THREE.Object3D[]) {
    const result = new AcTrEntity(context)
    result.objectId = 'ROOT'
    result.layerName = 'LEAF'
    result.userData.ancestorLayerNames = ['OUTER']
    if (children.length > 0) result.add(...children)
    return result
  }

  it.each([false, true])(
    'masks only a frozen sibling for unbatched=%s, including ray hits, bounds and previews',
    unbatched => {
      group.addEntity(
        entity(
          line(0, ['INNER_A'], unbatched),
          line(20, ['INNER_B'], unbatched)
        )
      )
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(true)
      group.setFrozenLayers(new Set(['INNER_A']))
      expect(group.getEntityVisible('ROOT')).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(true)
      const bounds = group.computeBoundingBox()
      expect(bounds.min.y).toBeCloseTo(20)
      expect(bounds.max.y).toBeCloseTo(20)
      const preview = group.createPreviewSubset(['ROOT'])!
      expect(preview.children).toHaveLength(1)
      disposePreviewSubset(preview)
      // Selection/hover style cannot restore a frozen occurrence.
      group.select('ROOT')
      group.hover('ROOT')
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(true)
      group.setFrozenLayers(new Set())
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(true)
    }
  )

  it.each([false, true])(
    'keeps logical hide/show independent from freeze/thaw for unbatched=%s',
    unbatched => {
      group.addEntity(
        entity(
          line(0, ['INNER_A'], unbatched),
          line(20, ['INNER_B'], unbatched)
        )
      )
      group.setFrozenLayers(new Set(['INNER_A']))
      group.setEntityVisible('ROOT', false)
      group.setFrozenLayers(new Set())
      expect(group.getEntityVisible('ROOT')).toBe(false)
      expect(group.computeBoundingBox().isEmpty()).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(false)
      expect(group.createPreviewSubset(['ROOT'])).toBeNull()
      group.setFrozenLayers(new Set(['INNER_A']))
      group.setEntityVisible('ROOT', true)
      expect(group.getEntityVisible('ROOT')).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(true)
    }
  )

  it.each([false, true])(
    'applies current frozen ancestry before publishing new geometry for unbatched=%s',
    unbatched => {
      const frozen = new Set(['OUTER'])
      group.setFrozenLayers(frozen)
      frozen.clear() // caller mutation must not silently thaw the owned snapshot
      const unsplit = entity(line(0, ['0', 'INNER_A'], unbatched))
      unsplit.layerName = 'OUTER'
      group.addEntity(unsplit)
      expect(group.getEntityVisible('ROOT')).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
      group.setFrozenLayers(new Set())
      expect(group.isIntersectWith('ROOT', ray(0))).toBe(true)
      group.setEntityVisible('ROOT', false)
      group.addEntity(entity(line(20, ['INNER_B'], unbatched)))
      expect(group.isIntersectWith('ROOT', ray(20))).toBe(false)
      group.removeEntity('ROOT')
      group.addEntity(entity(line(40, ['INNER_B'], unbatched)))
      expect(group.getEntityVisible('ROOT')).toBe(true)
      expect(group.isIntersectWith('ROOT', ray(40))).toBe(true)
    }
  )

  it('refreshes managed compare overlays after partial freeze, hide and thaw', () => {
    group.addEntity(entity(line(0, ['INNER_A']), line(20, ['INNER_B'])))
    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: 'ROOT', role: 'added' }]
    })
    const overlay = group.getObjectByName('CompareOverlay')!
    expect(overlay.children).toHaveLength(2)
    group.setFrozenLayers(new Set(['INNER_A']))
    expect(overlay.children).toHaveLength(1)
    group.setEntityVisible('ROOT', false)
    expect(overlay.children).toHaveLength(0)
    group.setFrozenLayers(new Set())
    expect(overlay.children).toHaveLength(0)
    group.setEntityVisible('ROOT', true)
    expect(overlay.children).toHaveLength(2)
  })

  it('keeps direct append visibility behavior and supports resolved ancestor masks', () => {
    const append = (y: number, visible = true) => {
      const object = line(0, [])
      const result = group.appendLineGeometry(
        object.geometry,
        object.material as THREE.Material,
        new THREE.Vector3(0, y, 0),
        { objectId: 'DIRECT', visible, ancestorLayerNames: ['INNER_A'] }
      )
      object.geometry.dispose()
      return result
    }
    group.setFrozenLayers(new Set(['INNER_A']))
    expect(append(0, false)).toBe(false)
    expect(group.hasEntity('DIRECT')).toBe(false)
    expect(append(0)).toBe(true)
    expect(group.getEntityVisible('DIRECT')).toBe(true)
    expect(group.isIntersectWith('DIRECT', ray(0))).toBe(false)
    group.setFrozenLayers(new Set())
    expect(group.isIntersectWith('DIRECT', ray(0))).toBe(true)
    group.setEntityVisible('DIRECT', false)
    expect(append(20)).toBe(true)
    expect(group.isIntersectWith('DIRECT', ray(20))).toBe(false)
    group.clear()
    expect(group.getEntityVisible('DIRECT')).toBeUndefined()
    expect(append(40)).toBe(true)
    expect(group.getEntityVisible('DIRECT')).toBe(true)
    expect(group.isIntersectWith('DIRECT', ray(40))).toBe(true)
  })

  it('preserves the empty-geometry sentinel and pending explicit hide until drawable append', () => {
    group.addEntity(entity())
    expect(group.getEntityVisible('ROOT')).toBeUndefined()
    group.setEntityVisible('ROOT', false)
    expect(group.getEntityVisible('ROOT')).toBeUndefined()
    group.addEntity(entity(line(0, ['INNER_A'])))
    expect(group.getEntityVisible('ROOT')).toBe(false)
    expect(group.isIntersectWith('ROOT', ray(0))).toBe(false)
    group.setEntityVisible('ROOT', true)
    expect(group.getEntityVisible('ROOT')).toBe(true)
    expect(group.isIntersectWith('ROOT', ray(0))).toBe(true)
  })
})
