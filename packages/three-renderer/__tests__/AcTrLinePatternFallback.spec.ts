import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBatchedLine2 } from '../src/batch/AcTrBatchedLine2'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrLineSegments } from '../src/object/AcTrLineSegments'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'
import { AcTrSubEntityTraitsUtil } from '../src/util'

/**
 * Builds traits whose linetype carries the given pattern
 * `[elementLength, elementTypeFlag]` pairs.
 */
function makePatternTraits(
  pattern: Array<[number, number?]>,
  lineTypeScale = 1
) {
  const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
  traits.lineType = {
    ...traits.lineType,
    name: 'CUSTOM',
    pattern: pattern.map(([elementLength, elementTypeFlag = 0]) => ({
      elementLength,
      elementTypeFlag
    }))
  }
  traits.lineTypeScale = lineTypeScale
  return traits
}

function makeBrokenContext(): AcTrRenderContext {
  const context = new AcTrRenderContext()
  context.styleManager.options.linePatternShaderBroken = true
  return context
}

function getDistances(geometry: THREE.BufferGeometry, count?: number) {
  const start = geometry.getAttribute('instanceDistanceStart')
  const end = geometry.getAttribute('instanceDistanceEnd')
  const activeCount = count ?? start.count
  return {
    start,
    end,
    values: Array.from({ length: activeCount }, (_, i) => [
      start.getX(i),
      end.getX(i)
    ])
  }
}

function activeSegmentCount(geometry: THREE.BufferGeometry) {
  return (geometry as THREE.InstancedBufferGeometry).instanceCount
}

function segmentGeometry(sx: number, sy: number, ex: number, ey: number) {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions([sx, sy, 0, ex, ey, 0])
  return geometry
}

describe('dashed fallback material (broken linetype shader)', () => {
  it('aggregates dash and gap sizes from a scaled pattern', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.options.linePatternShaderBroken = true
    const material = styleManager.getLineMaterial(
      makePatternTraits([[100], [-50]], 2)
    ) as LineMaterial

    expect(material).toBeInstanceOf(LineMaterial)
    expect(material.dashed).toBe(true)
    expect(material.dashSize).toBe(200)
    expect(material.gapSize).toBe(100)
  })

  it('uses a fixed dash for pure dot patterns', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.options.linePatternShaderBroken = true
    const material = styleManager.getLineMaterial(
      makePatternTraits([[0], [-25]])
    ) as LineMaterial

    expect(material.dashed).toBe(true)
    expect(material.dashSize).toBe(0.5)
    expect(material.gapSize).toBe(25)
  })

  it('folds complex-element lengths into the dash sum', () => {
    const styleManager = new AcTrStyleManager()
    styleManager.options.linePatternShaderBroken = true
    const material = styleManager.getLineMaterial(
      makePatternTraits([[-30, 1], [10], [-5]])
    ) as LineMaterial

    expect(material.dashSize).toBe(40)
    expect(material.gapSize).toBe(5)
  })

  it('keeps the custom shader material on healthy GPUs', () => {
    const styleManager = new AcTrStyleManager()
    const material = styleManager.getLineMaterial(
      makePatternTraits([[100], [-50]])
    )

    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
  })
})

describe('unbatched dashed fat lines', () => {
  it('computes cumulative instance distances on AcTrLineSegments', () => {
    const array = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0])
    const entity = new AcTrLineSegments(
      array,
      3,
      new Uint16Array([0, 1, 1, 2]),
      makePatternTraits([[12], [-6]]),
      makeBrokenContext()
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()

    const { values } = getDistances(line!.geometry as THREE.BufferGeometry)
    expect(values).toEqual([
      [0, 10],
      [10, 20]
    ])
  })

  it('computes instance distances on AcTrLine', () => {
    const entity = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 6, y: 8, z: 0 }
      ],
      makePatternTraits([[12], [-6]]),
      makeBrokenContext()
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()

    const { values } = getDistances(line!.geometry as THREE.BufferGeometry)
    expect(values).toEqual([[0, 10]])
  })

  it('skips distance attributes for solid fat lines', () => {
    const context = new AcTrRenderContext()
    context.styleManager.showLineWeight = true
    const traits = AcTrSubEntityTraitsUtil.createDefaultTraits()
    traits.lineWeight = 30
    const entity = new AcTrLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      traits,
      context
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()
    expect(
      (line!.geometry as THREE.BufferGeometry).getAttribute(
        'instanceDistanceStart'
      )
    ).toBeUndefined()
  })
})

describe('AcTrBatchedLine2 dash distances', () => {
  function dashedBatch(capacity: number) {
    return new AcTrBatchedLine2(
      capacity,
      new LineMaterial({
        color: 0xffffff,
        dashed: true,
        dashSize: 5,
        gapSize: 5
      })
    )
  }

  it('chains cumulative distances across appended geometries', () => {
    const batch = dashedBatch(8)
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))
    batch.addGeometry(segmentGeometry(0, 0, 0, 5))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [10, 15]
    ])
  })

  it('preserves the distance chain across capacity growth', () => {
    const batch = dashedBatch(2)
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))
    batch.addGeometry(segmentGeometry(0, 0, 0, 5))
    batch.addGeometry(segmentGeometry(0, 0, 1, 0))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [10, 15],
      [15, 16]
    ])
  })

  it('re-chains downstream distances after rewriting a packed geometry', () => {
    const batch = dashedBatch(8)
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))
    batch.addGeometry(segmentGeometry(0, 0, 0, 5))
    batch.addGeometry(segmentGeometry(0, 0, 1, 0))

    batch.setGeometryAt(1, segmentGeometry(0, 0, 0, 2))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [10, 12],
      [12, 13]
    ])
  })

  it('skips distance attributes for solid batches', () => {
    const batch = new AcTrBatchedLine2(8, new LineMaterial({ color: 0xffffff }))
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))

    expect(
      (batch.geometry as THREE.BufferGeometry).getAttribute(
        'instanceDistanceStart'
      )
    ).toBeUndefined()
  })
})
