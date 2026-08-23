import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { copyArrayContents } from '../src/batch/AcTrBatchedGeometryInfo'
import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrBatchedLine2 } from '../src/batch/AcTrBatchedLine2'
import {
  AcTrBatchHighlightState,
  BATCH_SLOT_ID_ATTRIBUTE,
  COMPARE_ROLE_ADDED,
  COMPARE_ROLE_DELETED
} from '../src/batch/highlight'
import { buildLineGeometry } from '../src/object/AcTrLineGeometryBuilder'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import {
  HIGHLIGHT_HOVER_COLOR,
  HIGHLIGHT_SELECT_COLOR
} from '../src/util/AcTrMaterialUtil'
import { getObjectUserData } from '../src/util/AcTrObjectUserData'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createBatchedLineEntity(objectId: string) {
  const context = new AcTrRenderContext()
  const line = new AcTrLine(
    [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 }
    ],
    defaultTraits,
    context,
    false
  )
  const entity = new AcTrEntity(context)
  entity.objectId = objectId
  entity.visible = true
  entity.add(line)
  return entity
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

function appendIndexedLine(
  group: AcTrBatchedGroup,
  material: THREE.LineBasicMaterial,
  objectId: string,
  x: number
) {
  const built = buildLineGeometry(
    [
      { x, y: 0, z: 0 },
      { x: x + 1, y: 0, z: 0 }
    ],
    material
  )
  expect(built).not.toBeNull()
  if (!built) return
  expect(
    group.appendLineGeometry(
      built.geometry as THREE.BufferGeometry,
      material,
      built.worldOffset,
      { objectId }
    )
  ).toBe(true)
  built.geometry.dispose()
}

describe('AcTrBatchedGroup slot-mask highlight', () => {
  it('writes slotId when batching line geometry', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    const batchedLine = findBatchedLine(group)
    expect(batchedLine).toBeDefined()
    const slotId = batchedLine!.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId).toBeDefined()
    expect(slotId.getX(0)).toBe(0)
  })

  it('selects batched entities without creating overlay drawables', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    group.select('line-1')

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)

    const batchedLine = findBatchedLine(group)!
    expect(batchedLine._highlightState.selectedMask[0]).toBe(1)
  })

  it('selectMany keeps overlay groups empty for batched entities', () => {
    const group = new AcTrBatchedGroup()
    for (let index = 0; index < 100; index++) {
      group.addEntity(createBatchedLineEntity(`line-${index}`))
    }

    group.selectMany(Array.from({ length: 100 }, (_, index) => `line-${index}`))

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)
    expect(group.entityCount).toBe(100)
  })

  it('clears batched highlight state on unselect', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    group.select('line-1')
    group.unselect('line-1')

    const batchedLine = findBatchedLine(group)!
    expect(batchedLine._highlightState.selectedMask[0]).toBe(0)
  })

  it('uploads large highlight masks as a 2D texture within GPU limits', () => {
    const state = new AcTrBatchHighlightState()
    state.setAddressableSlotCount(65536)
    state.setHighlight(65535, 'select', true)

    state.uploadMaskTexture()

    expect(state.maskTextureWidth).toBe(4096)
    expect(state.maskTextureHeight).toBe(16)
    expect(state.maskTexture?.image.width).toBe(4096)
    expect(state.maskTexture?.image.height).toBe(16)
  })

  it('sizes mask texture to all addressable slots when only low slots are highlighted', () => {
    const state = new AcTrBatchHighlightState()
    state.setAddressableSlotCount(500)
    state.setHighlight(0, 'select', true)

    state.uploadMaskTexture()

    expect(state.maskTextureWidth).toBe(500)
    expect(state.maskTextureHeight).toBe(1)
    expect(state.selectedMask[499]).toBe(0)
  })

  it('skips redundant mask uploads when highlight state is unchanged', () => {
    const state = new AcTrBatchHighlightState()
    state.setHighlight(0, 'select', true)
    const firstTexture = state.uploadMaskTexture()
    const firstData = firstTexture.image.data as Uint8Array

    const secondTexture = state.uploadMaskTexture()

    expect(secondTexture).toBe(firstTexture)
    expect(secondTexture.image.data).toBe(firstData)
  })

  it('uses hover highlight color for unbatched drawables', () => {
    const group = new AcTrBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'unbatched-hover'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.hover('unbatched-hover')

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_HOVER_COLOR.getHex())
  })

  it('keeps hover highlight after unselect when both were active', () => {
    const group = new AcTrBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'unbatched-both'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.select('unbatched-both')
    group.hover('unbatched-both')
    group.unselect('unbatched-both')

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_HOVER_COLOR.getHex())
  })

  it('uses in-place material swap for unbatched drawables', () => {
    const group = new AcTrBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = 'unbatched-1'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.select('unbatched-1')

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(clonedLine).toBeDefined()
    expect(getObjectUserData(clonedLine).originalMaterial).toBe(material)
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_SELECT_COLOR.getHex())

    group.unselect('unbatched-1')
    expect(clonedLine.material).toBe(material)
    expect(getObjectUserData(clonedLine).originalMaterial).toBeUndefined()
  })

  it('replaces compare roles so leftover deleted masks do not linger', () => {
    const group = new AcTrBatchedGroup()
    group.addEntity(createBatchedLineEntity('old-deleted'))
    group.addEntity(createBatchedLineEntity('kept'))

    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: 'old-deleted', role: 'deleted' }]
    })
    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: 'kept', role: 'added' }]
    })

    const roles: number[] = []
    group.traverse(child => {
      if (!(child instanceof AcTrBatchedLine)) return
      const state = (
        child as AcTrBatchedLine & { _highlightState: AcTrBatchHighlightState }
      )._highlightState
      roles.push(...state.compareRoleMask)
    })
    expect(roles).not.toContain(COMPARE_ROLE_DELETED)
    expect(roles).toContain(COMPARE_ROLE_ADDED)
  })

  it('applies compare roles to entities batched after setCompareDisplay', () => {
    const group = new AcTrBatchedGroup()
    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: '926', role: 'added' }]
    })
    group.addEntity(createBatchedLineEntity('926'))

    const batchedLine = findBatchedLine(group)!
    expect(batchedLine._highlightState.compareRoleMask[0]).toBe(
      COMPARE_ROLE_ADDED
    )
  })

  it('stores Line2 slotId as an instanced attribute per segment', () => {
    const group = new AcTrBatchedGroup()
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions([0, 0, 0, 100, 0, 0, 100, 0, 0, 160, -20, 0])
    const line2 = new LineSegments2(
      geometry,
      new LineMaterial({
        color: 0xffffff,
        linewidth: 2,
        resolution: new THREE.Vector2(800, 600)
      })
    )
    const entity = new AcTrEntity(new AcTrRenderContext())
    entity.objectId = '927'
    entity.visible = true
    entity.add(line2)
    group.addEntity(entity)

    let batched: AcTrBatchedLine2 | undefined
    group.traverse(child => {
      if (!batched && child instanceof AcTrBatchedLine2) {
        batched = child
      }
    })
    expect(batched).toBeDefined()
    const slotId = batched!.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId).toBeInstanceOf(THREE.InstancedBufferAttribute)
    expect(slotId.getX(0)).toBe(0)
    expect(slotId.getX(1)).toBe(0)

    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: '927', role: 'added' }]
    })
    expect(batched!._highlightState.compareRoleMask[0]).toBe(COMPARE_ROLE_ADDED)
  })

  it('keeps slotIds and added roles after indexed-line batch growth', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const group = new AcTrBatchedGroup()
    const ids: string[] = []
    for (let i = 0; i < 448; i++) {
      ids.push(`line-${i}`)
    }
    ids.push('926', '927')

    for (let i = 0; i < ids.length; i++) {
      const built = buildLineGeometry(
        [
          { x: i, y: 0, z: 0 },
          { x: i + 1, y: 0, z: 0 }
        ],
        material
      )
      expect(built).not.toBeNull()
      if (!built) return
      expect(
        group.appendLineGeometry(
          built.geometry as THREE.BufferGeometry,
          material,
          built.worldOffset,
          { objectId: ids[i] }
        )
      ).toBe(true)
      built.geometry.dispose()
    }

    const batchedLine = findBatchedLine(group)!
    const slotId = batchedLine.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId.getX(100)).toBe(50)
    expect(slotId.getX(896)).toBe(448)
    expect(slotId.getX(898)).toBe(449)

    group.setCompareDisplay({
      enabled: true,
      overrides: [
        { objectId: '926', role: 'added' },
        { objectId: '927', role: 'added' }
      ]
    })

    const state = batchedLine._highlightState
    expect(state.compareRoleMask[448]).toBe(COMPARE_ROLE_ADDED)
    expect(state.compareRoleMask[449]).toBe(COMPARE_ROLE_ADDED)
    expect(state.compareRoleMask[50]).toBe(0)

    const texture = state.uploadMaskTexture(true)
    const data = texture.image.data as Uint8Array
    expect(data[448 * 4 + 2]).toBe(170)
    expect(data[449 * 4 + 2]).toBe(170)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)

    const overlay = group.getObjectByName('CompareOverlay') as THREE.Group
    expect(overlay.children).toHaveLength(2)
    const overlayLine = overlay.children[0] as THREE.LineSegments
    expect(
      (overlayLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x22c55e)
  })

  it('rebinds compare overlay geometry after a later batch growth', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const group = new AcTrBatchedGroup()
    group.setCompareDisplay({
      enabled: true,
      overrides: [{ objectId: 'hit', role: 'added' }]
    })

    appendIndexedLine(group, material, 'hit', 0)
    const overlay = group.getObjectByName('CompareOverlay') as THREE.Group
    expect(overlay.children).toHaveLength(1)
    const overlayLine = overlay.children[0] as THREE.LineSegments
    const attributesBefore = overlayLine.geometry.attributes
    expect(attributesBefore).toBe(findBatchedLine(group)!.geometry.attributes)

    // INITIAL_LINE_VERTEX_CAPACITY is 128 (2 verts/segment → 64 lines).
    for (let i = 1; i <= 70; i++) {
      appendIndexedLine(group, material, `filler-${i}`, i)
    }

    const batchedLine = findBatchedLine(group)!
    expect(overlay.children).toHaveLength(1)
    expect(overlay.children[0]).toBe(overlayLine)
    expect(overlayLine.geometry.attributes).toBe(
      batchedLine.geometry.attributes
    )
    expect(overlayLine.geometry.attributes).not.toBe(attributesBefore)
    expect(
      (overlayLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(0x22c55e)
  })

  it('drops compare overlay children when the entity is removed', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const group = new AcTrBatchedGroup()
    appendIndexedLine(group, material, 'drop', 0)
    appendIndexedLine(group, material, 'keep', 1)
    group.setCompareDisplay({
      enabled: true,
      overrides: [
        { objectId: 'keep', role: 'added' },
        { objectId: 'drop', role: 'deleted' }
      ]
    })

    const overlay = group.getObjectByName('CompareOverlay') as THREE.Group
    expect(overlay.children).toHaveLength(2)
    expect(group.removeEntity('drop')).toBe(true)
    expect(overlay.children).toHaveLength(1)
    expect(getObjectUserData(overlay.children[0]).objectId).toBe('keep')
    const overlayLine = overlay.children[0] as THREE.LineSegments
    expect(overlayLine.geometry.attributes).toBe(
      findBatchedLine(group)!.geometry.attributes
    )
  })

  it('copies typed-array views with a non-zero byteOffset', () => {
    const buffer = new ArrayBuffer(16)
    const src = new Float32Array(buffer, 8, 2)
    src[0] = 448
    src[1] = 449
    const target = new Float32Array(4)
    copyArrayContents(src, target)
    expect(Array.from(target)).toEqual([448, 449, 0, 0])
  })
})
