import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'

/**
 * `_entitiesMap` keeps a bare slot record while an entity owns exactly one
 * slot, and only promotes the entry to an array from the second slot on.
 *
 * Every test below therefore checks observable behavior for the 0-slot,
 * 1-slot and multi-slot cardinalities, and reads the raw record to lock the
 * representation itself: a regression that silently dropped slots, changed the
 * entity count, or broke the first/second-slot transition must fail here.
 */
function rawRecord(group: AcTrBatchedGroup, objectId: string) {
  const map = (group as unknown as { _entitiesMap: Map<string, unknown> })
    ._entitiesMap
  return map.get(objectId)
}

function createLineSegments(
  start: THREE.Vector3Like,
  end: THREE.Vector3Like,
  material = new THREE.LineBasicMaterial()
): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [start.x, start.y, start.z ?? 0, end.x, end.y, end.z ?? 0],
      3
    )
  )
  geometry.setIndex([0, 1])
  const line = new THREE.LineSegments(geometry, material)
  line.position.set(start.x, start.y, start.z ?? 0)
  line.updateMatrixWorld(true)
  return line
}

/**
 * Builds a drawable whose geometry is authored in the object's local frame and
 * translated by `offsetY`, which is how real render entities arrive (geometry
 * local, world placement on the object).
 */
function createOffsetLineSegments(
  offsetY: number,
  material: THREE.LineBasicMaterial
): THREE.LineSegments {
  const line = createLineSegments(
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    material
  )
  line.position.set(0, offsetY, 0)
  line.updateMatrixWorld(true)
  return line
}

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): AcTrEntity {
  const entity = new AcTrEntity(new AcTrRenderContext())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

function createOrthoRaycaster(
  x: number,
  y: number,
  threshold = 2
): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const camera = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  raycaster.params.Line.threshold = threshold
  return raycaster
}

function findBatchedLine(group: AcTrBatchedGroup): AcTrBatchedLine | undefined {
  let result: AcTrBatchedLine | undefined
  group.traverse(child => {
    if (!result && child instanceof AcTrBatchedLine) {
      result = child
    }
  })
  return result
}

describe('AcTrBatchedGroup entity slot records', () => {
  it('keeps a zero-slot entity registered, counted and removable', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('empty-1'))

    expect(rawRecord(group, 'empty-1')).toBeNull()
    expect(group.hasEntity('empty-1')).toBe(true)
    expect(group.entityCount).toBe(1)
    expect(group.stats.summary.entityCount).toBe(1)

    expect(group.getEntityVisible('empty-1')).toBeUndefined()
    expect(group.setEntityVisible('empty-1', false)).toBe(true)
    expect(group.getEntityVisible('empty-1')).toBeUndefined()
    expect(() => group.select('empty-1')).not.toThrow()
    expect(group.isIntersectWith('empty-1', createOrthoRaycaster(5, 5))).toBe(
      false
    )
    expect(group.createPreviewSubset(['empty-1'])).toBeNull()

    // No slot and no unbatched drawable — removeEntity returns false but still
    // clears the null placeholder.
    expect(group.removeEntity('empty-1')).toBe(false)
    expect(group.hasEntity('empty-1')).toBe(false)
    expect(group.entityCount).toBe(0)
  })

  it('stores a bare item for one slot and keeps every read identical', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(
      createEntity(
        'one-slot',
        createLineSegments({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 })
      )
    )

    const record = rawRecord(group, 'one-slot')
    expect(record).not.toBeNull()
    expect(Array.isArray(record)).toBe(false)
    expect(group.entityCount).toBe(1)

    expect(group.getEntityVisible('one-slot')).toBe(true)
    expect(group.setEntityVisible('one-slot', false)).toBe(true)
    expect(group.getEntityVisible('one-slot')).toBe(false)
    expect(group.setEntityVisible('one-slot', true)).toBe(true)
    expect(group.getEntityVisible('one-slot')).toBe(true)

    expect(group.isIntersectWith('one-slot', createOrthoRaycaster(50, 0))).toBe(
      true
    )
    expect(
      group.isIntersectWith('one-slot', createOrthoRaycaster(50, 120))
    ).toBe(false)

    const subset = group.createPreviewSubset(['one-slot'])
    expect(subset).not.toBeNull()
    expect(subset!.children.length).toBe(1)

    expect(group.removeEntity('one-slot')).toBe(true)
    expect(group.hasEntity('one-slot')).toBe(false)
    expect(group.entityCount).toBe(0)
  })

  it('promotes to an array from the second slot on and visits every slot', () => {
    const group = new AcTrBatchedGroup()
    // One shared material so both drawables land in the same batch container.
    const material = new THREE.LineBasicMaterial()
    group.addEntity(
      createEntity(
        'two-slots',
        createLineSegments(
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
          material
        ),
        createOffsetLineSegments(20, material)
      )
    )

    const record = rawRecord(group, 'two-slots')
    expect(Array.isArray(record)).toBe(true)
    expect((record as unknown[]).length).toBe(2)
    expect(group.entityCount).toBe(1)

    expect(group.getEntityVisible('two-slots')).toBe(true)

    // Hiding only the second slot must be observed: an implementation that
    // looked at the first slot only would still report `true` here.
    const batchedLine = findBatchedLine(group)!
    batchedLine.setVisibleAt(1, false)
    expect(group.getEntityVisible('two-slots')).toBe(false)
    batchedLine.setVisibleAt(1, true)
    expect(group.getEntityVisible('two-slots')).toBe(true)

    // `setEntityVisible` must reach both slots.
    expect(group.setEntityVisible('two-slots', false)).toBe(true)
    expect(batchedLine.getVisibleAt(0)).toBe(false)
    expect(batchedLine.getVisibleAt(1)).toBe(false)
    expect(group.setEntityVisible('two-slots', true)).toBe(true)
    expect(batchedLine.getVisibleAt(0)).toBe(true)
    expect(batchedLine.getVisibleAt(1)).toBe(true)

    // Pick and highlight must scan every slot, not just the first.
    expect(
      group.isIntersectWith('two-slots', createOrthoRaycaster(50, 20))
    ).toBe(true)
    expect(
      group.isIntersectWith('two-slots', createOrthoRaycaster(50, 120))
    ).toBe(false)
    expect(() => group.select('two-slots')).not.toThrow()

    // The slot budget still caps extraction at `maxSlots` for arrays.
    const capped = group.createPreviewSubset(['two-slots'], { maxSlots: 1 })
    expect(capped).not.toBeNull()
    expect(capped!.children.length).toBe(1)
    const full = group.createPreviewSubset(['two-slots'])
    expect(full!.children.length).toBe(2)

    expect(group.removeEntity('two-slots')).toBe(true)
    expect(group.hasEntity('two-slots')).toBe(false)
    expect(group.entityCount).toBe(0)
  })

  it('accumulates slots across addEntity passes for one object id', () => {
    const group = new AcTrBatchedGroup()
    const material = new THREE.LineBasicMaterial()

    group.addEntity(
      createEntity(
        'multi-pass',
        createLineSegments(
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
          material
        )
      )
    )
    expect(Array.isArray(rawRecord(group, 'multi-pass'))).toBe(false)

    group.addEntity(
      createEntity('multi-pass', createOffsetLineSegments(20, material))
    )

    const record = rawRecord(group, 'multi-pass')
    expect(Array.isArray(record)).toBe(true)
    expect((record as unknown[]).length).toBe(2)
    expect(group.entityCount).toBe(1)

    const batchedLine = findBatchedLine(group)!
    expect(group.getEntityVisible('multi-pass')).toBe(true)
    batchedLine.setVisibleAt(0, false)
    expect(group.getEntityVisible('multi-pass')).toBe(false)

    expect(group.removeEntity('multi-pass')).toBe(true)
    expect(group.hasEntity('multi-pass')).toBe(false)
    expect(group.entityCount).toBe(0)
  })

  it('keeps the zero-slot placeholder when a later pass adds no slot', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createEntity('empty-x2'))
    group.addEntity(createEntity('empty-x2'))

    expect(rawRecord(group, 'empty-x2')).toBeNull()
    expect(group.entityCount).toBe(1)
    expect(group.hasEntity('empty-x2')).toBe(true)
  })

  it('does not overwrite a single slot with a later empty pass', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(
      createEntity(
        'slot-then-empty',
        createLineSegments({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
      )
    )
    group.addEntity(createEntity('slot-then-empty'))

    const record = rawRecord(group, 'slot-then-empty')
    expect(Array.isArray(record)).toBe(false)
    expect(record).not.toBeNull()
    expect(group.getEntityVisible('slot-then-empty')).toBe(true)
    expect(
      group.isIntersectWith('slot-then-empty', createOrthoRaycaster(5, 0))
    ).toBe(true)
    expect(
      group.createPreviewSubset(['slot-then-empty'])!.children.length
    ).toBe(1)
  })
})
