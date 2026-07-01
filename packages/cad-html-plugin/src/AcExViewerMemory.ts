import * as THREE from 'three'

import type { AcExLayoutSnapshot, AcExSnapshot } from './AcExSnapshotTypes'

/**
 * Clears tessellated batch typed arrays on every snapshot layout.
 *
 * Call only after the THREE scene has uploaded geometry to the GPU and any
 * OSNAP index has been built from analytic primitives or tessellated segments.
 */
export function releaseSnapshotBatchBuffers(snapshot: AcExSnapshot): void {
  for (const layout of snapshot.layouts) {
    clearLayoutBatchBuffers(layout)
  }
}

/**
 * Drops {@link AcExLayoutSnapshot.osnap} from every layout after
 * {@link AcExOsnapIndex.rebuild}.
 *
 * Call only after the index has copied or retained the catalog's
 * `primitives` array (the runtime keeps that reference internally).
 * Inactive layout catalogs become fully reclaimable; the active layout
 * catalog wrapper is removed from the snapshot while primitive data
 * remains alive for nearest / intersection snap queries.
 */
export function releaseSnapshotOsnapCatalogs(snapshot: AcExSnapshot): void {
  for (const layout of snapshot.layouts) {
    layout.osnap = undefined
  }
}

/**
 * Removes the embedded snapshot script from the DOM after decode.
 *
 * The compressed/base64 payload is often the largest resident string in memory.
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
