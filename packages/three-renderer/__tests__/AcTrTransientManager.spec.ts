import { AcGeMatrix3d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import { AcTrTransientManager } from '../src/object/AcTrTransientManager'
import { AcTrMatrixUtil } from '../src/util/AcTrMatrixUtil'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: AcTrRenderContext
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
  return line
}

describe('AcTrTransientManager.applyTransforms', () => {
  it('composes preview deltas with the transient baseline INSERT matrix', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrTransientManager(scene)
    const context = new AcTrRenderContext()
    const line = createLine('line-title', { x: -180, y: 28 }, { x: 0, y: 28 }, context)
    const group = new AcTrGroup([line], context)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(574, 0, 0))
    group.objectId = 'INSERT-7B33'

    manager.add(group)
    const baseline = group.matrix.clone()

    const rotation = AcTrMatrixUtil.createMatrix4(
      new AcGeMatrix3d().makeRotationZ(Math.PI / 4)
    )
    manager.applyTransforms([{ id: group.objectId, matrix: rotation }])

    const expected = new THREE.Matrix4().copy(rotation).multiply(baseline)
    expect(group.matrix.equals(expected)).toBe(true)

    manager.dispose()
  })
})
