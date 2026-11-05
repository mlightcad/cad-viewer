import type {
  AcExHtmlLayoutSnapshot,
  AcExHtmlSnapshot
} from '@mlightcad/cad-html-core'
import * as THREE from 'three'

/**
 * True when a layout still holds tessellated CPU batches.
 */
export function layoutHasBatchGeometry(
  layout: AcExHtmlLayoutSnapshot
): boolean {
  return layout.lineBatches.length > 0 || layout.meshBatches.length > 0
}

/**
 * Copies geometry + OSNAP catalog from a freshly decoded layout onto a
 * skeleton / previously released layout (same `btrId`).
 */
export function assignLayoutGeometryFrom(
  target: AcExHtmlLayoutSnapshot,
  source: AcExHtmlLayoutSnapshot
): void {
  target.lineBatches = source.lineBatches
  target.meshBatches = source.meshBatches
  target.osnap = source.osnap
}

/**
 * Clears tessellated batch typed arrays on one layout so inactive package
 * layouts can be unloaded and re-fetched later.
 */
export function releaseLayoutBatchBuffers(
  layout: AcExHtmlLayoutSnapshot
): void {
  clearLayoutBatchBuffers(layout)
}

/**
 * Clears tessellated batch typed arrays on every snapshot layout.
 *
 * Call only after the THREE scene has uploaded geometry to the GPU and any
 * OSNAP index has been built from analytic primitives or tessellated segments.
 */
export function releaseSnapshotBatchBuffers(snapshot: AcExHtmlSnapshot): void {
  for (const layout of snapshot.layouts) {
    clearLayoutBatchBuffers(layout)
  }
}

/**
 * Clears CPU batches for every layout except the ones that must stay resident
 * until GPU upload / hybrid OSNAP finish (typically the active layout and
 * model space when paper viewports need it).
 */
export function releaseInactiveLayoutBatchBuffers(
  snapshot: AcExHtmlSnapshot,
  keepBtrIds: ReadonlySet<string>
): void {
  for (const layout of snapshot.layouts) {
    if (keepBtrIds.has(layout.btrId)) continue
    clearLayoutBatchBuffers(layout)
    layout.osnap = undefined
  }
}

/**
 * Drops {@link AcExHtmlLayoutSnapshot.osnap} from every layout after
 * {@link AcExOsnapIndex.rebuild}.
 *
 * Call only after the index has copied or retained the catalog's
 * `primitives` array (the runtime keeps that reference internally).
 * Inactive layout catalogs become fully reclaimable; the active layout
 * catalog wrapper is removed from the snapshot while primitive data
 * remains alive for nearest / intersection snap queries.
 */
export function releaseSnapshotOsnapCatalogs(snapshot: AcExHtmlSnapshot): void {
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
 * Runs `fn` with every layer group forced visible, then restores prior flags.
 *
 * THREE skips invisible objects during `render()`, so geometry on layers that
 * start off never reaches the GPU. Call this around the upload render that
 * precedes {@link releaseLayerGroupsGeometryCpuArrays}.
 */
export function acexHtmlWithAllLayerGroupsVisible(
  layerGroupMaps: Iterable<Map<string, THREE.Group>>,
  fn: () => void
): void {
  const restored: Array<[THREE.Group, boolean]> = []
  for (const groups of layerGroupMaps) {
    for (const group of groups.values()) {
      restored.push([group, group.visible])
      group.visible = true
    }
  }
  try {
    fn()
  } finally {
    for (const [group, visible] of restored) {
      group.visible = visible
    }
  }
}

/**
 * Drops CPU-side typed arrays for static CAD geometry after the first GPU upload.
 *
 * Only traverses layer groups (not measurement overlays). WebGL buffer objects
 * retain the uploaded data; static display geometry never updates CPU buffers again.
 *
 * Callers must GPU-upload geometry for layers that start invisible (see
 * {@link acexHtmlWithAllLayerGroupsVisible}) before invoking this — otherwise
 * toggling those layers on later shows empty meshes.
 */
export function releaseLayerGroupsGeometryCpuArrays(
  layerGroups: Map<string, THREE.Group>
): void {
  for (const group of layerGroups.values()) {
    group.traverse(object => {
      // Use Three.js type flags instead of instanceof: objects created by a
      // second copy of Three.js (or by the Jest LineSegments2 mock) may not
      // share constructors with the copy imported in this module.
      const drawable = object as THREE.Object3D & {
        isMesh?: boolean
        isLineSegments?: boolean
        isLine?: boolean
        isPoints?: boolean
        geometry?: THREE.BufferGeometry
      }
      if (
        (drawable.isMesh ||
          drawable.isLineSegments ||
          drawable.isLine ||
          drawable.isPoints) &&
        drawable.geometry?.isBufferGeometry === true
      ) {
        releaseBufferGeometryCpuArrays(drawable.geometry)
      }
    })
  }
}

function clearLayoutBatchBuffers(layout: AcExHtmlLayoutSnapshot): void {
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
    if (batch.uvs) batch.uvs = new Float32Array(0)
    if (batch.texture)
      batch.texture = { mimeType: '', bytes: new Uint8Array(0) }
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
