import { AcDbRenderingCache, AcGePoint3dLike } from '@mlightcad/data-model'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { AcTrEntity } from '../object/AcTrEntity'
import { AcTrGroup } from '../object/AcTrGroup'
import { AcTrBufferGeometryUtil } from '../util'

/**
 * Shared vertex buffer for one block-template draw.
 *
 * Simple lines append here instead of allocating a `number[]` per entity.
 * Nested block draws push their own builder so an inner merge cannot consume
 * the outer block's vertices.
 */
export class AcTrLineVertexBuilder {
  private data = new Float32Array(4096)
  length = 0

  append(points: AcGePoint3dLike[]): { offset: number; floatCount: number } {
    const floatCount = points.length * 3
    this.ensure(this.length + floatCount)
    const offset = this.length
    const data = this.data
    let p = offset
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      data[p++] = point.x
      data[p++] = point.y
      data[p++] = point.z ?? 0
    }
    this.length = p
    return { offset, floatCount }
  }

  ensure(needed: number) {
    if (needed <= this.data.length) {
      return
    }
    let cap = this.data.length
    while (cap < needed) {
      cap *= 2
    }
    const next = new Float32Array(cap)
    next.set(this.data.subarray(0, this.length))
    this.data = next
  }

  get buffer(): Float32Array {
    return this.data
  }
}

/**
 * Stand-in returned while a block template is being drawn.
 *
 * {@link AcDbRenderingCache} still stamps object id and layer onto it. The
 * real line geometry is merged later in {@link mergeCoalescedBlockLines}.
 */
export class AcTrCoalescedLineRef {
  objectId = ''
  ownerId = ''
  layerName = ''
  visible: boolean = true
  material: THREE.Material
  builder: AcTrLineVertexBuilder
  /** Index into {@link builder} of the first xyz float. */
  offset: number
  floatCount: number
  minX: number
  minY: number
  maxX: number
  maxY: number

  constructor(
    material: THREE.Material,
    builder: AcTrLineVertexBuilder,
    offset: number,
    floatCount: number
  ) {
    this.material = material
    this.builder = builder
    this.offset = offset
    this.floatCount = floatCount
    const data = builder.buffer
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const end = offset + floatCount
    for (let i = offset; i < end; i += 3) {
      const x = data[i]
      const y = data[i + 1]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }
}

export function isAcTrCoalescedLineRef(
  value: unknown
): value is AcTrCoalescedLineRef {
  return value instanceof AcTrCoalescedLineRef
}

/**
 * Wraps block-template draws so simple lines can skip per-entity meshes.
 * Nested `draw` calls share one depth counter. Renderers without the hooks
 * are unchanged.
 */
let _blockLineCoalescePatched = false

export function installBlockLineCoalescePatch(): void {
  if (_blockLineCoalescePatched) {
    return
  }
  _blockLineCoalescePatched = true
  const proto = AcDbRenderingCache.prototype as unknown as {
    draw: (renderer: object, ...args: unknown[]) => unknown
  }
  const original = proto.draw
  proto.draw = function (this: unknown, renderer: object, ...args: unknown[]) {
    const hooks = renderer as {
      beginBlockLineCoalesce?: () => void
      endBlockLineCoalesce?: () => void
    }
    hooks.beginBlockLineCoalesce?.()
    try {
      return original.call(this, renderer, ...args)
    } finally {
      hooks.endBlockLineCoalesce?.()
    }
  }
}

export function captureCoalescedLine(
  points: AcGePoint3dLike[],
  material: THREE.Material,
  layerName: string,
  builder: AcTrLineVertexBuilder
): AcTrCoalescedLineRef {
  const { offset, floatCount } = builder.append(points)
  const ref = new AcTrCoalescedLineRef(material, builder, offset, floatCount)
  ref.layerName = layerName
  return ref
}

/**
 * Merges coalesced line refs into a handful of {@link AcTrEntity} shells and
 * returns one spatial box per original line.
 */
export function mergeCoalescedBlockLines(
  refs: AcTrCoalescedLineRef[],
  context: ConstructorParameters<typeof AcTrEntity>[0]
): { entities: AcTrEntity[]; boxes: AcTrGroup['wcsChildBoxes'] } {
  const buckets = new Map<
    string,
    {
      material: THREE.Material
      layerName: string
      visible: boolean
      refs: AcTrCoalescedLineRef[]
      floats: number
      minX: number
      minY: number
      minZ: number
      maxX: number
      maxY: number
      maxZ: number
    }
  >()

  const boxes: AcTrGroup['wcsChildBoxes'] = []
  for (let r = 0; r < refs.length; r++) {
    const ref = refs[r]
    boxes.push({
      minX: ref.minX,
      minY: ref.minY,
      maxX: ref.maxX,
      maxY: ref.maxY,
      id: ref.objectId
    })
    if (ref.visible === false || ref.floatCount < 6) {
      continue
    }
    const key = `${ref.material.id}|${ref.layerName}|${ref.visible}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        material: ref.material,
        layerName: ref.layerName,
        visible: true,
        refs: [],
        floats: 0,
        minX: Infinity,
        minY: Infinity,
        minZ: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        maxZ: -Infinity
      }
      buckets.set(key, bucket)
    }
    const data = ref.builder.buffer
    const end = ref.offset + ref.floatCount
    for (let i = ref.offset; i < end; i += 3) {
      const x = data[i]
      const y = data[i + 1]
      const z = data[i + 2]
      if (x < bucket.minX) bucket.minX = x
      if (y < bucket.minY) bucket.minY = y
      if (z < bucket.minZ) bucket.minZ = z
      if (x > bucket.maxX) bucket.maxX = x
      if (y > bucket.maxY) bucket.maxY = y
      if (z > bucket.maxZ) bucket.maxZ = z
    }
    const segments = Math.floor(ref.floatCount / 3) - 1
    if (segments > 0) {
      bucket.refs.push(ref)
      bucket.floats += segments * 6
    }
  }

  const entities: AcTrEntity[] = []
  for (const bucket of buckets.values()) {
    if (bucket.floats < 6) {
      continue
    }
    const originX = (bucket.minX + bucket.maxX) * 0.5
    const originY = (bucket.minY + bucket.maxY) * 0.5
    const originZ = (bucket.minZ + bucket.maxZ) * 0.5
    const positions = new Float32Array(bucket.floats)
    let p = 0
    for (let r = 0; r < bucket.refs.length; r++) {
      const ref = bucket.refs[r]
      const data = ref.builder.buffer
      const end = ref.offset + ref.floatCount
      for (let i = ref.offset; i + 5 < end; i += 3) {
        positions[p++] = data[i] - originX
        positions[p++] = data[i + 1] - originY
        positions[p++] = data[i + 2] - originZ
        positions[p++] = data[i + 3] - originX
        positions[p++] = data[i + 4] - originY
        positions[p++] = data[i + 5] - originZ
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.LineSegments(geometry, bucket.material)
    line.position.set(originX, originY, originZ)
    if (bucket.material instanceof THREE.ShaderMaterial) {
      AcTrBufferGeometryUtil.computeLineDistances(line)
    }
    const entity = new AcTrEntity(context)
    entity.layerName = bucket.layerName
    entity.visible = bucket.visible
    // Leave wcsBbox empty so the group does not index one giant box with an
    // empty id. Per-line boxes are attached separately.
    entity.add(line)
    entities.push(entity)
  }

  return { entities, boxes }
}

export function isFatLineMaterial(material: THREE.Material): boolean {
  return material instanceof LineMaterial
}
