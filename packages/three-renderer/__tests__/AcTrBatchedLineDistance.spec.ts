import * as THREE from 'three'

import { copyAttributeData } from '../src/batch/AcTrBatchedGeometryInfo'
import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrLinePatternShaders } from '../src/style/AcTrLinePatternShaders'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'
import { AcTrBufferGeometryUtil } from '../src/util/AcTrBufferGeometryUtil'

describe('copyAttributeData', () => {
  it('copies only src.count elements in the fast path', () => {
    const srcArray = new Float32Array([1, 2, 3, 4, 5, 6, 99, 99, 99])
    const src = new THREE.BufferAttribute(srcArray.subarray(0, 6), 3)

    const targetArray = new Float32Array(12)
    const target = new THREE.BufferAttribute(targetArray, 3)

    copyAttributeData(src, target, 1)

    expect(Array.from(targetArray)).toEqual([
      0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0
    ])
  })
})

describe('AcTrBatchedGroup lineDistance alignment', () => {
  it('batches dashed line segments after sanitizing non-finite vertices', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, Number.NaN, 1, 0, 2, 2, 0, 3, 3, 0],
        3
      )
    )
    geometry.setAttribute(
      'lineDistance',
      new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5], 1)
    )

    const material = new THREE.ShaderMaterial()
    const line = new THREE.LineSegments(geometry, material)
    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.add(line)

    const matrix = new THREE.Matrix4().makeTranslation(100, 0, 0)
    const cloned = geometry.clone()
    expect(AcTrBufferGeometryUtil.safeApplyMatrix4(cloned, matrix, 2)).toBe(
      true
    )
    AcTrBufferGeometryUtil.recomputeLineDistanceForLineSegments(cloned)

    const position = cloned.getAttribute('position')
    const lineDistance = cloned.getAttribute('lineDistance')
    expect(position.count).toBe(2)
    expect(lineDistance.count).toBe(position.count)

    const group = new AcTrBatchedGroup()
    expect(() => group.addEntity(entity)).not.toThrow()
  })
})

describe('AcTrBatchedLine lineDistance on demand (B1)', () => {
  const patternMaterial =
    AcTrLinePatternShaders.createLineShaderMaterialFromScaledPattern(
      [1, -0.5],
      1.5,
      0xff0000,
      1,
      { value: 1 }
    )

  function createIndexedSegmentGeometry(
    yOffset: number
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, yOffset, 0, 10, yOffset, 0, 0, yOffset, 5, 10, yOffset, 5],
        3
      )
    )
    geometry.setIndex([0, 1, 2, 3])
    return geometry
  }

  function findBatchedLine(
    batch: AcTrBatchedLine | THREE.Object3D
  ): AcTrBatchedLine {
    return batch as AcTrBatchedLine
  }

  it('skips lineDistance for solid batches and stays a no-op while solid', () => {
    const solidMaterial = new THREE.LineBasicMaterial()
    const batch = new AcTrBatchedLine(100, 200, solidMaterial)
    batch.addGeometry(createIndexedSegmentGeometry(0))
    batch.addGeometry(createIndexedSegmentGeometry(50))

    expect(batch.geometry.hasAttribute('lineDistance')).toBe(false)

    // Solid materials never consume lineDistance: the call must not add it.
    findBatchedLine(batch).ensureLineDistanceAttribute()
    expect(batch.geometry.hasAttribute('lineDistance')).toBe(false)
  })

  it('materializes per-slot distances after a rebind swaps in a pattern material', () => {
    const solidMaterial = new THREE.LineBasicMaterial()
    const batch = new AcTrBatchedLine(100, 200, solidMaterial)
    batch.addGeometry(createIndexedSegmentGeometry(0))
    batch.addGeometry(createIndexedSegmentGeometry(50))
    expect(batch.geometry.hasAttribute('lineDistance')).toBe(false)

    // Simulates AcTrBatchedGroup.updateMaterial: swap the material, then arm.
    findBatchedLine(batch).material = patternMaterial
    findBatchedLine(batch).ensureLineDistanceAttribute()

    const lineDistance = batch.geometry.getAttribute(
      'lineDistance'
    ) as THREE.BufferAttribute
    expect(lineDistance).toBeDefined()
    expect(lineDistance.count).toBe(batch.geometry.getAttribute('position').count)

    // Distances chain across the segments inside one packed slot (a slot is
    // one entity-local line), but each slot restarts at zero: slot 0 spans
    // [0, 10, 10, 20] and slot 1 repeats the identical shape instead of
    // continuing at 20. Trailing capacity stays zero.
    const values = Array.from(lineDistance.array as Float32Array)
    expect(values.slice(0, 8)).toEqual([0, 10, 10, 20, 0, 10, 10, 20])
    expect(values.slice(8).every(v => v === 0)).toBe(true)
  })

  it('keeps the attribute idempotent once materialized', () => {
    const solidMaterial = new THREE.LineBasicMaterial()
    const batch = new AcTrBatchedLine(100, 200, solidMaterial)
    batch.addGeometry(createIndexedSegmentGeometry(0))
    findBatchedLine(batch).material = patternMaterial
    findBatchedLine(batch).ensureLineDistanceAttribute()

    const before = (
      batch.geometry.getAttribute('lineDistance') as THREE.BufferAttribute
    ).array.slice()
    findBatchedLine(batch).ensureLineDistanceAttribute()
    const after = (
      batch.geometry.getAttribute('lineDistance') as THREE.BufferAttribute
    ).array.slice()
    expect(Array.from(after)).toEqual(Array.from(before))
  })
})

describe('AcTrBufferGeometryUtil.ensureLineDistance', () => {
  const patternMaterial =
    AcTrLinePatternShaders.createLineShaderMaterialFromScaledPattern(
      [1, -0.5],
      1.5,
      0x00ff00,
      1,
      { value: 1 }
    )

  function createSegmentGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 3, 4, 0], 3)
    )
    return geometry
  }

  it('adds entity-local distances for pattern materials', () => {
    const geometry = createSegmentGeometry()
    expect(
      AcTrBufferGeometryUtil.ensureLineDistance(geometry, patternMaterial)
    ).toBe(true)
    const lineDistance = geometry.getAttribute(
      'lineDistance'
    ) as THREE.BufferAttribute
    expect(Array.from(lineDistance.array as Float32Array)).toEqual([0, 5])
  })

  it('is a no-op for solid materials and geometries that already carry distances', () => {
    const geometry = createSegmentGeometry()
    expect(
      AcTrBufferGeometryUtil.ensureLineDistance(
        geometry,
        new THREE.LineBasicMaterial()
      )
    ).toBe(false)
    expect(geometry.hasAttribute('lineDistance')).toBe(false)

    const withDistance = createSegmentGeometry()
    withDistance.setAttribute(
      'lineDistance',
      new THREE.Float32BufferAttribute([7, 8], 1)
    )
    expect(
      AcTrBufferGeometryUtil.ensureLineDistance(
        withDistance,
        patternMaterial
      )
    ).toBe(false)
    expect(
      Array.from(
        (
          withDistance.getAttribute('lineDistance') as THREE.BufferAttribute
        ).array as Float32Array
      )
    ).toEqual([7, 8])
  })
})

describe('AcTrBatchedGroup.updateMaterial unbatched lineDistance', () => {
  const patternMaterial =
    AcTrLinePatternShaders.createLineShaderMaterialFromScaledPattern(
      [1, -0.5],
      1.5,
      0xff00ff,
      1,
      { value: 1 }
    )

  it('arms lineDistance when a cache-push rebind swaps a pattern material onto a solid unbatched line', () => {
    const solidMaterial = new THREE.LineBasicMaterial()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    geometry.setIndex([0, 1])
    const line = new THREE.LineSegments(geometry, solidMaterial)
    // Force the unbatched path used by layer cache-push rebinds.
    getSceneDrawableUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'unbatched-solid'
    entity.visible = true
    entity.add(line)

    const group = new AcTrBatchedGroup()
    group.addEntity(entity)

    let unbatched: THREE.LineSegments | undefined
    group.traverse(child => {
      if (!unbatched && child instanceof THREE.LineSegments) {
        unbatched = child
      }
    })
    expect(unbatched).toBeDefined()
    expect(unbatched!.geometry.hasAttribute('lineDistance')).toBe(false)

    group.updateMaterial(solidMaterial.id, patternMaterial)

    expect(unbatched!.material).toBe(patternMaterial)
    expect(unbatched!.geometry.hasAttribute('lineDistance')).toBe(true)
    expect(
      Array.from(
        (
          unbatched!.geometry.getAttribute('lineDistance') as THREE.BufferAttribute
        ).array as Float32Array
      )
    ).toEqual([0, 10])
  })
})
