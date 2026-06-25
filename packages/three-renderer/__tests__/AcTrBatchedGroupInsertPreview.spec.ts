import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import {
  AcTrBatchedGroup,
  disposePreviewSubset
} from '../src/batch/AcTrBatchedGroup'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const INSERT_ID = 'INSERT-7B33'

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: AcTrRenderContext,
  layerName = '0'
) {
  const line = new AcTrLine(
    [
      { x: start.x, y: start.y, z: 0 },
      { x: end.x, y: end.y, z: 0 }
    ],
    defaultTraits,
    context,
    false
  )
  line.objectId = objectId
  line.layerName = layerName
  line.userData.layerName = layerName
  return line
}

/**
 * Mirrors {@link AcTrView2d.handleGroup}: split a block reference into one
 * render entity per layer bucket while preserving the INSERT object id.
 */
function addDecomposedInsertLayerBucket(
  batchGroup: AcTrBatchedGroup,
  group: AcTrGroup,
  layerName: string,
  objects: THREE.Object3D[]
) {
  const entity = new AcTrEntity(group.renderContext)
  entity.applyMatrix4(group.matrix)
  entity.objectId = INSERT_ID
  entity.layerName = layerName
  entity.visible = true
  for (let i = 0; i < objects.length; i++) {
    entity.add(objects[i])
  }
  batchGroup.addEntity(entity)
}

function unionPreviewBox(subset: THREE.Group): THREE.Box3 {
  const box = new THREE.Box3()
  subset.updateMatrixWorld(true)
  subset.traverse(child => {
    const geometry = (child as THREE.Mesh).geometry as
      | THREE.BufferGeometry
      | undefined
    if (!geometry) {
      return
    }
    geometry.computeBoundingBox()
    if (!geometry.boundingBox) {
      return
    }
    const childBox = geometry.boundingBox.clone()
    childBox.applyMatrix4(child.matrixWorld)
    box.union(childBox)
  })
  return box
}

describe('AcTrBatchedGroup INSERT preview subset', () => {
  it('preserves INSERT world placement in preview for decomposed block references', () => {
    const context = new AcTrRenderContext()
    const titleLine = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new AcTrGroup([titleLine], context)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))

    const attribute = createLine(
      'attr-1',
      { x: -180, y: 0 },
      { x: -170, y: 10 },
      context,
      'CARTOUCHE'
    )
    group.addChild(attribute)

    const children = [...group.children]
    group.children = []
    for (const child of children) {
      child.parent = null
    }

    const batchGroup = new AcTrBatchedGroup()
    addDecomposedInsertLayerBucket(batchGroup, group, '图框层', [children[0]])
    addDecomposedInsertLayerBucket(batchGroup, group, '6文字层', [children[1]])

    const subset = batchGroup.createPreviewSubset([INSERT_ID])
    expect(subset).not.toBeNull()

    const previewBox = unionPreviewBox(subset!)
    expect(previewBox.min.x).toBeCloseTo(394, 0)
    expect(previewBox.max.x).toBeCloseTo(574, 0)

    disposePreviewSubset(subset!)
  })

  it('preserves INSERT world placement when the block group is added without decomposition', () => {
    const context = new AcTrRenderContext()
    const titleLine = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new AcTrGroup([titleLine], context)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))
    group.objectId = INSERT_ID
    group.layerName = '图框层'
    group.visible = true

    const batchGroup = new AcTrBatchedGroup()
    batchGroup.addEntity(group)

    const subset = batchGroup.createPreviewSubset([INSERT_ID])
    expect(subset).not.toBeNull()

    const previewBox = unionPreviewBox(subset!)
    expect(previewBox.min.x).toBeCloseTo(394, 0)
    expect(previewBox.max.x).toBeCloseTo(574, 0)

    disposePreviewSubset(subset!)
  })
})
