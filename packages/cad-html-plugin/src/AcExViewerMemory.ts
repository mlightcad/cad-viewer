import * as THREE from 'three'

import type { AcExLayoutSnapshot, AcExSnapshot } from './AcExSnapshotTypes'

/** Returns a shallow copy of a float vertex buffer. */
export function copyFloat32Buffer(source: Float32Array): Float32Array {
  return new Float32Array(source)
}

/** Returns a shallow copy of an index buffer. */
export function copyUint32Buffer(source: Uint32Array): Uint32Array {
  return new Uint32Array(source)
}

/**
 * Whether tessellated batch buffers on the active layout can be dropped after
 * the THREE scene is built.
 *
 * When an analytic OSNAP catalog exists, layer visibility toggles filter
 * primitives only and never re-read {@link AcExLayoutSnapshot.lineBatches}.
 */
export function canReleaseActiveLayoutBatches(
  layout: AcExLayoutSnapshot
): boolean {
  return (layout.osnap?.primitives.length ?? 0) > 0
}

/**
 * Clears tessellated batch typed arrays on snapshot layouts to reclaim CPU memory.
 *
 * Inactive layouts are always cleared. The active layout is cleared only when
 * {@link canReleaseActiveLayoutBatches} is true so OSNAP can still fall back to
 * tessellated segments when no analytic catalog was exported.
 */
export function releaseSnapshotBatchBuffers(
  snapshot: AcExSnapshot,
  activeLayoutBtrId: string
): void {
  for (const layout of snapshot.layouts) {
    const isActive = layout.btrId === activeLayoutBtrId
    if (!isActive || canReleaseActiveLayoutBatches(layout)) {
      clearLayoutBatchBuffers(layout)
    }
  }
}

/**
 * Removes the embedded snapshot script from the DOM after decode.
 *
 * The gzip/base64 payload is often the largest resident string in memory.
 */
export function removeSnapshotElement(element: HTMLElement): void {
  element.textContent = ''
  element.remove()
}

/**
 * Drops CPU-side typed arrays for static CAD geometry after the first GPU upload.
 *
 * Only traverses layer groups (not measurement overlays). WebGL buffer objects
 * retain the uploaded data; static display geometry never updates CPU buffers again.
 */
export function releaseLayerGroupsGeometryCpuArrays(
  layerGroups: Map<string, THREE.Group>
): void {
  for (const group of layerGroups.values()) {
    group.traverse(object => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        releaseBufferGeometryCpuArrays(object.geometry)
      }
    })
  }
}

function clearLayoutBatchBuffers(layout: AcExLayoutSnapshot): void {
  for (const batch of layout.lineBatches) {
    batch.positions = new Float32Array(0)
    if (batch.indices) batch.indices = new Uint32Array(0)
    if (batch.lineDistances) batch.lineDistances = new Float32Array(0)
  }
  layout.lineBatches.length = 0

  for (const batch of layout.meshBatches) {
    batch.positions = new Float32Array(0)
    if (batch.indices) batch.indices = new Uint32Array(0)
    if (batch.gradientPositions) batch.gradientPositions = new Float32Array(0)
  }
  layout.meshBatches.length = 0
}

function releaseBufferGeometryCpuArrays(geometry: THREE.BufferGeometry): void {
  const releasedInterleaved = new Set<THREE.InterleavedBuffer>()
  for (const key in geometry.attributes) {
    releaseAttributeCpuArray(geometry.attributes[key], releasedInterleaved)
  }

  const index = geometry.getIndex()
  if (index) {
    releaseAttributeCpuArray(index, releasedInterleaved)
  }
}

type AcExCpuReleasableAttribute =
  | THREE.BufferAttribute
  | THREE.InterleavedBufferAttribute

function releaseAttributeCpuArray(
  attr: AcExCpuReleasableAttribute,
  releasedInterleaved: Set<THREE.InterleavedBuffer>
): void {
  const candidate = attr as THREE.InterleavedBufferAttribute & {
    isInterleavedBufferAttribute?: boolean
    isBufferAttribute?: boolean
  }
  if (candidate.isInterleavedBufferAttribute === true) {
    const data = candidate.data
    if (data && !releasedInterleaved.has(data)) {
      releasedInterleaved.add(data)
      data.array = new Float32Array(0)
      data.needsUpdate = false
    }
    candidate.needsUpdate = false
    return
  }

  if (candidate.isBufferAttribute !== true) {
    return
  }

  const bufferAttr = candidate as unknown as THREE.BufferAttribute
  bufferAttr.array = new Float32Array(0) as typeof bufferAttr.array
  bufferAttr.clearUpdateRanges()
  bufferAttr.needsUpdate = false
}
