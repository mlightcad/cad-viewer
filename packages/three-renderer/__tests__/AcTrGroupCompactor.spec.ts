import { AcCmColor } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil, getSceneDrawableUserData } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: AcTrRenderContext,
  options: {
    layerName?: string
    basicMaterialOnly?: boolean
    color?: number
  } = {}
) {
  const traits = {
    ...defaultTraits,
    layer: options.layerName ?? '0',
    color: new AcCmColor().setRGBValue(options.color ?? 0xffffff)
  }
  const line = new AcTrLine(
    [
      { x: start.x, y: start.y, z: 0 },
      { x: end.x, y: end.y, z: 0 }
    ],
    traits,
    context,
    options.basicMaterialOnly ?? true
  )
  line.objectId = objectId
  line.layerName = options.layerName ?? '0'
  line.userData.layerName = options.layerName ?? '0'
  return line
}

function countVertices(object: THREE.Object3D): number {
  let total = 0
  object.traverse(child => {
    if (!('geometry' in child)) return
    const geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry
    if (!geometry) return
    if (geometry.getAttribute('instanceStart')) {
      total += geometry.getAttribute('instanceStart').count * 2
      return
    }
    const position = geometry.getAttribute('position')
    if (position) {
      total += position.count
    }
  })
  return total
}

describe('AcTrGroupCompactor', () => {
  it('merges same-material leaves into fewer drawables while preserving vertex count', () => {
    const context = new AcTrRenderContext()
    const lines = Array.from({ length: 8 }, (_, i) =>
      createLine(
        `line-${i}`,
        { x: i * 10, y: 0 },
        { x: i * 10 + 5, y: 0 },
        context
      )
    )
    const group = new AcTrGroup(lines, context)
    const beforeChildren = group.children.length
    const beforeVertices = countVertices(group)
    expect(beforeChildren).toBeGreaterThan(1)

    group.compactForInstancing()

    expect(group.isCompacted).toBe(true)
    expect(group.children.length).toBeLessThan(beforeChildren)
    expect(countVertices(group)).toBe(beforeVertices)
    // Spatial index metadata is unchanged.
    expect(group.wcsChildBoxes).toHaveLength(8)
  })

  it('keeps different materials in separate buckets', () => {
    const context = new AcTrRenderContext()
    const red = createLine('red', { x: 0, y: 0 }, { x: 10, y: 0 }, context, {
      color: 0xff0000
    })
    const green = createLine(
      'green',
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      context,
      { color: 0x00ff00 }
    )
    const group = new AcTrGroup([red, green], context)
    const beforeChildren = [...group.children]

    group.compactForInstancing()

    // Two materials → still two leaves (nothing to merge across materials).
    expect(group.children.length).toBe(beforeChildren.length)
    // Singletons must not be rebuilt — open-time compact skips bake/rebase.
    expect(group.children).toEqual(expect.arrayContaining(beforeChildren))
  })

  it('keeps different layers in separate buckets', () => {
    const context = new AcTrRenderContext()
    const a = createLine('a', { x: 0, y: 0 }, { x: 10, y: 0 }, context, {
      layerName: 'A'
    })
    const b = createLine('b', { x: 0, y: 5 }, { x: 10, y: 5 }, context, {
      layerName: 'B'
    })
    const group = new AcTrGroup([a, b], context)

    group.compactForInstancing()

    const layers = group.children.map(child => child.userData.layerName).sort()
    expect(layers).toEqual(['A', 'B'])
  })

  it('recomputes lineDistance per leaf when present before merge', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('b', { x: 20, y: 0 }, { x: 30, y: 0 }, context)
    const group = new AcTrGroup([lineA, lineB], context)

    // basic LineBasicMaterial leaves may not carry lineDistance; inject it so
    // the per-leaf recompute path is exercised before mergeGeometries.
    for (const child of group.children) {
      if (!(child instanceof THREE.LineSegments)) continue
      const geometry = child.geometry
      const position = geometry.getAttribute('position')
      const distances = new Float32Array(position.count)
      for (let i = 0; i < position.count; i++) {
        distances[i] = i === 0 ? 0 : 1
      }
      geometry.setAttribute(
        'lineDistance',
        new THREE.Float32BufferAttribute(distances, 1)
      )
    }

    group.compactForInstancing()

    const leaf = group.children[0] as THREE.LineSegments
    const lineDistance = leaf.geometry.getAttribute('lineDistance')
    expect(lineDistance).toBeDefined()
    // Each original leaf restarts dash distance at 0 after per-leaf recompute.
    expect(lineDistance.getX(0)).toBe(0)
  })

  it('does not merge noBatch leaves', () => {
    const context = new AcTrRenderContext()
    const a = createLine('a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const b = createLine('b', { x: 0, y: 5 }, { x: 10, y: 5 }, context)
    const group = new AcTrGroup([a, b], context)
    for (const child of group.children) {
      getSceneDrawableUserData(child).noBatch = true
    }
    const before = group.children.length

    group.compactForInstancing()

    expect(group.children.length).toBe(before)
  })

  it('does not merge AcTrEntity wrappers still present as children', () => {
    const context = new AcTrRenderContext()
    const line = createLine('a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const group = new AcTrGroup([line], context)
    const wrapper = new AcTrEntity(context)
    wrapper.userData.layerName = '0'
    group.add(wrapper)
    const before = group.children.length

    group.compactForInstancing()

    expect(group.children.some(child => child instanceof AcTrEntity)).toBe(true)
    expect(group.children.length).toBe(before)
  })

  it('merges LineSegments2 fat-line leaves', () => {
    const context = new AcTrRenderContext()
    // basicMaterialOnly=false may produce LineSegments2 depending on style.
    const lines = Array.from({ length: 4 }, (_, i) =>
      createLine(
        `fat-${i}`,
        { x: i * 10, y: 0 },
        { x: i * 10 + 5, y: 0 },
        context,
        { basicMaterialOnly: false }
      )
    )
    const group = new AcTrGroup(lines, context)
    const hadLine2 = group.children.some(
      child => child instanceof LineSegments2
    )
    if (!hadLine2) {
      // Style manager chose basic lines in this environment; skip.
      return
    }
    const beforeVertices = countVertices(group)
    const beforeChildren = group.children.length

    group.compactForInstancing()

    expect(group.children.length).toBeLessThan(beforeChildren)
    expect(countVertices(group)).toBe(beforeVertices)
    expect(group.children.every(child => child instanceof LineSegments2)).toBe(
      true
    )
  })
})
