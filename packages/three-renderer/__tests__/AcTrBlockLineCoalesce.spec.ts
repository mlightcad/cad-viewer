import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrCoalescedLineRef } from '../src/renderer/AcTrBlockLineCoalesce'
import { AcTrRenderer } from '../src/renderer/AcTrRenderer'
import * as THREE from 'three'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600)
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

function applyDashedTraits(renderer: AcTrRenderer) {
  renderer.subEntityTraits.lineType = {
    ...renderer.subEntityTraits.lineType,
    name: 'DASHED',
    pattern: [
      { elementLength: 12.7, elementTypeFlag: 0 },
      { elementLength: -6.35, elementTypeFlag: 0 }
    ],
    totalPatternLength: 19.05
  }
}

function coalescedLineSegments(group: AcTrGroup): THREE.LineSegments {
  const child = group.children.find(
    object => object instanceof THREE.LineSegments
  )
  expect(child).toBeInstanceOf(THREE.LineSegments)
  return child as THREE.LineSegments
}

describe('block line coalesce', () => {
  it('merges simple block lines into one mesh and keeps a box per line', () => {
    const renderer = createRenderer()
    renderer.beginBlockLineCoalesce()
    const first = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 }
    ])
    const second = renderer.lines([
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 5, z: 0 }
    ])
    expect(first).toBeInstanceOf(AcTrCoalescedLineRef)
    expect(second).toBeInstanceOf(AcTrCoalescedLineRef)
    first.objectId = 'line-a'
    second.objectId = 'line-b'
    first.layerName = '0'
    second.layerName = '0'

    const group = renderer.group([first, second])
    renderer.endBlockLineCoalesce()

    expect(group).toBeInstanceOf(AcTrGroup)
    expect(group.isCompacted).toBe(true)
    expect(group.children.length).toBe(1)
    const ids = group.wcsChildBoxes.map(box => box.id)
    expect(ids).toContain('line-a')
    expect(ids).toContain('line-b')
  })

  it('restarts dash phase at each original line', () => {
    const renderer = createRenderer()
    applyDashedTraits(renderer)
    renderer.beginBlockLineCoalesce()
    const first = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 }
    ])
    const second = renderer.lines([
      { x: 0, y: 5, z: 0 },
      { x: 20, y: 5, z: 0 }
    ])
    const polyline = renderer.lines([
      { x: 0, y: 10, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 10, y: 15, z: 0 }
    ])
    const group = renderer.group([first, second, polyline])
    renderer.endBlockLineCoalesce()

    const line = coalescedLineSegments(group)
    expect(line.material).toBeInstanceOf(THREE.ShaderMaterial)
    const distances = line.geometry.getAttribute('lineDistance')
    expect(distances).toBeDefined()
    expect(distances.count).toBe(8)
    expect(distances.getX(0)).toBeCloseTo(0)
    expect(distances.getX(1)).toBeCloseTo(10)
    expect(distances.getX(2)).toBeCloseTo(0)
    expect(distances.getX(3)).toBeCloseTo(20)
    expect(distances.getX(4)).toBeCloseTo(0)
    expect(distances.getX(5)).toBeCloseTo(10)
    expect(distances.getX(6)).toBeCloseTo(10)
    expect(distances.getX(7)).toBeCloseTo(15)
  })

  it('keeps nested block lines off the outer vertex builder', () => {
    const renderer = createRenderer()
    renderer.beginBlockLineCoalesce()
    const outerA = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 }
    ])
    renderer.beginBlockLineCoalesce()
    const innerA = renderer.lines([
      { x: 100, y: 0, z: 0 },
      { x: 101, y: 0, z: 0 }
    ])
    const innerB = renderer.lines([
      { x: 100, y: 1, z: 0 },
      { x: 101, y: 1, z: 0 }
    ])
    innerA.objectId = 'inner-a'
    innerB.objectId = 'inner-b'
    const innerGroup = renderer.group([innerA, innerB])
    renderer.endBlockLineCoalesce()

    const innerLine = coalescedLineSegments(innerGroup)
    innerLine.updateMatrixWorld(true)
    const innerBox = new THREE.Box3().setFromObject(innerLine)
    expect(innerBox.min.x).toBeCloseTo(100)
    expect(innerBox.max.x).toBeCloseTo(101)

    const outerB = renderer.lines([
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 5, z: 0 }
    ])
    outerA.objectId = 'outer-a'
    outerB.objectId = 'outer-b'
    const outerGroup = renderer.group([outerA, innerGroup, outerB])
    renderer.endBlockLineCoalesce()

    expect(innerGroup).toBeInstanceOf(AcTrGroup)
    expect(outerGroup).toBeInstanceOf(AcTrGroup)
    expect(innerGroup.wcsChildBoxes.map(box => box.id)).toEqual(
      expect.arrayContaining(['inner-a', 'inner-b'])
    )
    expect(outerGroup.wcsChildBoxes.map(box => box.id)).toEqual(
      expect.arrayContaining(['outer-a', 'outer-b', 'inner-a', 'inner-b'])
    )

    const lines: THREE.LineSegments[] = []
    outerGroup.traverse(object => {
      if (object instanceof THREE.LineSegments) {
        lines.push(object)
      }
    })
    const ranges = lines.map(line => {
      const position = line.geometry.getAttribute('position')
      let minX = Infinity
      let maxX = -Infinity
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) + line.position.x
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
      return { minX, maxX }
    })
    expect(ranges.some(range => range.maxX < 50)).toBe(true)
    expect(ranges.some(range => range.minX > 50)).toBe(true)
  })
})
