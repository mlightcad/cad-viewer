import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrEntityPreview } from '../src/renderer/AcTrEntityPreview'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createLine(
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
  line.updateMatrixWorld(true)
  return line
}

function getVisibleWorldExtents(camera: THREE.OrthographicCamera) {
  const worldWidth = (camera.right - camera.left) / camera.zoom
  const worldHeight = (camera.top - camera.bottom) / camera.zoom

  return {
    worldWidth,
    worldHeight,
    minX: camera.position.x - worldWidth / 2,
    maxX: camera.position.x + worldWidth / 2,
    minY: camera.position.y - worldHeight / 2,
    maxY: camera.position.y + worldHeight / 2
  }
}

function getVisibleWorldExtentsFromBox2d(box: AcGeBox2d) {
  return {
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y
  }
}

describe('AcTrEntityPreview', () => {
  it('computeObjectBounds2d unions drawable geometry bounds', () => {
    const context = new AcTrRenderContext()
    const entity = new AcTrEntity(context)
    entity.add(createLine({ x: 10, y: 20 }, { x: 110, y: 70 }, context))

    const bounds = AcTrEntityPreview.computeObjectBounds2d(entity, 1)

    expect(bounds).not.toBeNull()
    const visible = getVisibleWorldExtentsFromBox2d(bounds!)
    expect(visible.minX).toBeCloseTo(10, 5)
    expect(visible.minY).toBeCloseTo(20, 5)
    expect(visible.maxX).toBeCloseTo(110, 5)
    expect(visible.maxY).toBeCloseTo(70, 5)
  })

  it('fitExportCamera matches export framing rules', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    const bounds = new AcGeBox2d(
      new AcGePoint2d(10, 20),
      new AcGePoint2d(110, 70)
    )

    AcTrEntityPreview.fitExportCamera(camera, bounds, 800, 400)

    const visible = getVisibleWorldExtents(camera)
    expect(camera.position.x).toBeCloseTo(60)
    expect(camera.position.y).toBeCloseTo(45)
    expect(visible.worldWidth).toBeCloseTo(100, 5)
    expect(visible.worldHeight).toBeCloseTo(50, 5)
  })
})
