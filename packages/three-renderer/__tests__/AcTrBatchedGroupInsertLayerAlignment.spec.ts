import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrBatchedGroup } from '../src/batch/AcTrBatchedGroup'
import { AcTrBatchedLine } from '../src/batch/AcTrBatchedLine'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

/**
 * Regression coverage for https://github.com/mlightcad/cad-viewer/issues/365
 *
 * Title-block INSERTs are split by {@link AcTrView2d.handleGroup} into one render
 * entity per layer bucket. Each bucket lands in a different {@link AcTrLayer}
 * with its own {@link AcTrBatchedGroup}, so RTE rebasing origins are chosen
 * independently per layer. At large WCS coordinates the shared block anchor must
 * stay aligned across those buckets.
 */

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const INSERT_ID = 'INSERT-TITLE-BLOCK'

/** Typical large WCS placement seen in engineering drawings. */
const INSERT_X = 1_234_567
const INSERT_Y = 2_345_678

/** Shared block-local anchor used by both the frame and text linework. */
const BLOCK_ANCHOR = { x: -180, y: 0 }
const BLOCK_FRAME_END = { x: 0, y: 0 }
const BLOCK_TEXT_TOP = { x: -180, y: 50 }

const EXPECTED_SHARED_CORNER = {
  x: INSERT_X + BLOCK_ANCHOR.x,
  y: INSERT_Y + BLOCK_ANCHOR.y,
  z: 0
}

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
 * Mirrors {@link AcTrView2d.handleGroup}: one render entity per layer bucket,
 * each added to a separate scene-layer batch group.
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

function collectBatchedLineWcsPoints(group: AcTrBatchedGroup): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  group.updateMatrixWorld(true)
  group.traverse(child => {
    if (!(child instanceof AcTrBatchedLine)) {
      return
    }
    child.updateMatrixWorld(true)
    const positions = child.geometry.getAttribute('position')
      .array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      points.push(
        new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        ).applyMatrix4(child.matrixWorld)
      )
    }
  })
  return points
}

function findNearestPoint(
  points: readonly THREE.Vector3[],
  target: THREE.Vector3Like
): THREE.Vector3 | undefined {
  let best: THREE.Vector3 | undefined
  let bestDistance = Infinity
  for (const point of points) {
    const dx = point.x - target.x
    const dy = point.y - target.y
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      bestDistance = distance
      best = point
    }
  }
  return best
}

function buildTitleBlockInsert(context: AcTrRenderContext) {
  const frameLine = createLine(
    'frame-bottom',
    BLOCK_ANCHOR,
    BLOCK_FRAME_END,
    context,
    '图框层'
  )
  const textLine = createLine(
    'text-margin',
    BLOCK_ANCHOR,
    BLOCK_TEXT_TOP,
    context,
    'CARTOUCHE'
  )

  const group = new AcTrGroup([frameLine, textLine], context)
  expect(group.isOnTheSameLayer).toBe(false)
  group.applyMatrix(new AcGeMatrix3d().makeTranslation(INSERT_X, INSERT_Y, 0))

  const children = [...group.children]
  group.children = []
  for (const child of children) {
    child.parent = null
  }

  return { group, children }
}

describe('AcTrBatchedGroup INSERT cross-layer alignment (issue #365 regression)', () => {
  it('keeps the shared block anchor aligned across decomposed layer batches at large coordinates', () => {
    const context = new AcTrRenderContext()
    const { group, children } = buildTitleBlockInsert(context)

    const frameBatchGroup = new AcTrBatchedGroup()
    const textBatchGroup = new AcTrBatchedGroup()
    addDecomposedInsertLayerBucket(frameBatchGroup, group, '图框层', [
      children[0]!
    ])
    addDecomposedInsertLayerBucket(textBatchGroup, group, 'CARTOUCHE', [
      children[1]!
    ])

    const frameCorner = findNearestPoint(
      collectBatchedLineWcsPoints(frameBatchGroup),
      EXPECTED_SHARED_CORNER
    )
    const textCorner = findNearestPoint(
      collectBatchedLineWcsPoints(textBatchGroup),
      EXPECTED_SHARED_CORNER
    )

    expect(frameCorner).toBeDefined()
    expect(textCorner).toBeDefined()
    expect(frameCorner!.x).toBeCloseTo(EXPECTED_SHARED_CORNER.x, 1)
    expect(frameCorner!.y).toBeCloseTo(EXPECTED_SHARED_CORNER.y, 1)
    expect(textCorner!.x).toBeCloseTo(frameCorner!.x, 3)
    expect(textCorner!.y).toBeCloseTo(frameCorner!.y, 3)
  })

  it('preserves expected WCS bounds for each decomposed layer bucket at large coordinates', () => {
    const context = new AcTrRenderContext()
    const { group, children } = buildTitleBlockInsert(context)

    const frameBatchGroup = new AcTrBatchedGroup()
    const textBatchGroup = new AcTrBatchedGroup()
    addDecomposedInsertLayerBucket(frameBatchGroup, group, '图框层', [
      children[0]!
    ])
    addDecomposedInsertLayerBucket(textBatchGroup, group, 'CARTOUCHE', [
      children[1]!
    ])

    const frameBox = frameBatchGroup.computeBoundingBox(new THREE.Box3())
    expect(frameBox.min.x).toBeCloseTo(EXPECTED_SHARED_CORNER.x, 1)
    expect(frameBox.min.y).toBeCloseTo(EXPECTED_SHARED_CORNER.y, 1)
    expect(frameBox.max.x).toBeCloseTo(INSERT_X + BLOCK_FRAME_END.x, 1)
    expect(frameBox.max.y).toBeCloseTo(INSERT_Y + BLOCK_FRAME_END.y, 1)

    const textBox = textBatchGroup.computeBoundingBox(new THREE.Box3())
    expect(textBox.min.x).toBeCloseTo(EXPECTED_SHARED_CORNER.x, 1)
    expect(textBox.min.y).toBeCloseTo(EXPECTED_SHARED_CORNER.y, 1)
    expect(textBox.max.x).toBeCloseTo(INSERT_X + BLOCK_TEXT_TOP.x, 1)
    expect(textBox.max.y).toBeCloseTo(INSERT_Y + BLOCK_TEXT_TOP.y, 1)
  })

  it('matches undecomposed INSERT placement when all block geometry stays on one batch group', () => {
    const context = new AcTrRenderContext()
    const { group, children } = buildTitleBlockInsert(context)

    const batchGroup = new AcTrBatchedGroup()
    addDecomposedInsertLayerBucket(batchGroup, group, '图框层', children)

    const box = batchGroup.computeBoundingBox(new THREE.Box3())
    expect(box.min.x).toBeCloseTo(EXPECTED_SHARED_CORNER.x, 1)
    expect(box.min.y).toBeCloseTo(EXPECTED_SHARED_CORNER.y, 1)
    expect(box.max.x).toBeCloseTo(INSERT_X + BLOCK_FRAME_END.x, 1)
    expect(box.max.y).toBeCloseTo(INSERT_Y + BLOCK_TEXT_TOP.y, 1)
  })
})
