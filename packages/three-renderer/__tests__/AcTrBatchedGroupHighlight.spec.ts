import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrBatchedLine2 } from '../src/batch/AcTrBatchedLine2'
import {
  AcTrBatchHighlightState,
  BATCH_SLOT_ID_ATTRIBUTE,
  COMPARE_ROLE_ADDED,
  COMPARE_ROLE_DELETED
} from '../src/batch/highlight'
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
})
