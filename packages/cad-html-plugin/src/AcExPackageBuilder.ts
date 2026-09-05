import { strToU8 } from 'fflate'

import {
  estimateLineBatchBytes,
  estimateMeshBatchBytes
} from './AcExBatchBinaryCodec'
import {
  type AcExGeometryChunk,
  encodeChunkGzip} from './AcExChunkBinaryCodec'
import { packHtmlPackage } from './AcExHtmlPackager'
import {
  encodeOsnapCatalogGzip,
  splitOsnapPrimitives
} from './AcExOsnapCatalogCodec'
import {
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES,
  ACEX_PACKAGE_VERSION,
  ACEX_SNAPSHOT_VERSION,
  type AcExPackageChunkRef,
  type AcExPackageFiles,
  type AcExPackageLayoutRef,
  type AcExPackageManifest,
  type AcExPackageOsnapChunkRef
} from './AcExPackageTypes'
import type {
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch,
  AcExSnapshot
} from './AcExSnapshotTypes'

export interface AcExBuildPackageOptions {
  /** Inline viewer runtime IIFE source. */
  viewerRuntime: string
  /** Base name for files (no extension), e.g. `drawing`. */
  baseName?: string
  /** Max uncompressed ACEC bytes per geometry chunk. */
  maxChunkBytes?: number
  /** Max estimated uncompressed ACEO bytes per OSNAP chunk. */
  maxOsnapChunkBytes?: number
  /**
   * Relative or absolute manifest URL embedded in the shell HTML.
   * Defaults to `./{baseName}.acex.json`.
   */
  manifestUrl?: string
}

interface GeometrySlice {
  lineBatches: AcExLineBatch[]
  meshBatches: AcExMeshBatch[]
  estimatedBytes: number
}

/**
 * Splits a layout's batches into slices that stay under `maxChunkBytes`.
 * Empty layouts still produce one empty slice so the layout remains addressable.
 */
export function splitLayoutIntoSlices(
  layout: AcExLayoutSnapshot,
  maxChunkBytes: number
): GeometrySlice[] {
  const slices: GeometrySlice[] = []
  let current: GeometrySlice = {
    lineBatches: [],
    meshBatches: [],
    estimatedBytes: 64
  }

  const flush = () => {
    if (
      current.lineBatches.length === 0 &&
      current.meshBatches.length === 0 &&
      slices.length > 0
    ) {
      return
    }
    slices.push(current)
    current = { lineBatches: [], meshBatches: [], estimatedBytes: 64 }
  }

  const pushLine = (batch: AcExLineBatch) => {
    const size = estimateLineBatchBytes(batch)
    if (
      current.estimatedBytes + size > maxChunkBytes &&
      (current.lineBatches.length > 0 || current.meshBatches.length > 0)
    ) {
      flush()
    }
    current.lineBatches.push(batch)
    current.estimatedBytes += size
  }

  const pushMesh = (batch: AcExMeshBatch) => {
    const size = estimateMeshBatchBytes(batch)
    if (
      current.estimatedBytes + size > maxChunkBytes &&
      (current.lineBatches.length > 0 || current.meshBatches.length > 0)
    ) {
      flush()
    }
    current.meshBatches.push(batch)
    current.estimatedBytes += size
  }

  for (const batch of layout.lineBatches) {
    pushLine(batch)
  }
  for (const batch of layout.meshBatches) {
    pushMesh(batch)
  }

  if (
    slices.length === 0 ||
    current.lineBatches.length > 0 ||
    current.meshBatches.length > 0
  ) {
    flush()
  }

  if (slices.length === 0) {
    slices.push({ lineBatches: [], meshBatches: [], estimatedBytes: 64 })
  }

  return slices
}

/**
 * Builds a multi-file ACEX package from an in-memory {@link AcExSnapshot}.
 * Active layout chunks are listed first so hosts can prioritize first paint.
 */
export function buildAcExPackage(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageOptions
): AcExPackageFiles {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }

  const baseName = sanitizeBaseName(
    options.baseName ?? snapshot.meta.title ?? 'drawing'
  )
  const maxChunkBytes = options.maxChunkBytes ?? ACEX_DEFAULT_CHUNK_MAX_BYTES
  const maxOsnapChunkBytes =
    options.maxOsnapChunkBytes ?? ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES
  const manifestFileName = `${baseName}.acex.json`
  const manifestUrl = options.manifestUrl ?? `./${manifestFileName}`

  const orderedLayouts = orderLayoutsForExport(
    snapshot.layouts,
    snapshot.activeLayoutBtrId
  )

  const chunkRefs: AcExPackageChunkRef[] = []
  const osnapChunkRefs: AcExPackageOsnapChunkRef[] = []
  const layoutRefs: AcExPackageLayoutRef[] = []
  const files: AcExPackageFiles['files'] = []
  const layoutIndexByBtrId = new Map<string, number>()

  orderedLayouts.forEach((layout, layoutIndex) => {
    layoutIndexByBtrId.set(layout.btrId, layoutIndex)
    const slices = splitLayoutIntoSlices(layout, maxChunkBytes)
    const chunkIds: string[] = []

    slices.forEach((slice, sliceIndex) => {
      const id = `L${layoutIndex}-${String(sliceIndex).padStart(3, '0')}`
      const href = `chunks/${id}.acex.gz`
      const geometry: AcExGeometryChunk = {
        version: ACEX_SNAPSHOT_VERSION,
        layoutBtrId: layout.btrId,
        lineBatches: slice.lineBatches,
        meshBatches: slice.meshBatches
      }
      const { uncompressed, compressed } = encodeChunkGzip(geometry)

      chunkIds.push(id)
      chunkRefs.push({
        id,
        href,
        layoutBtrId: layout.btrId,
        byteLength: uncompressed.byteLength,
        compressedByteLength: compressed.byteLength,
        lineBatchCount: slice.lineBatches.length,
        meshBatchCount: slice.meshBatches.length
      })
      files.push({ path: href, bytes: compressed })
    })

    const layoutRef: AcExPackageLayoutRef = {
      btrId: layout.btrId,
      name: layout.name,
      isModelSpace: layout.isModelSpace,
      viewports: layout.viewports,
      chunkIds
    }

    const osnapPrimitives = layout.osnap?.primitives
    if (osnapPrimitives && osnapPrimitives.length > 0) {
      const osnapSlices = splitOsnapPrimitives(
        osnapPrimitives,
        maxOsnapChunkBytes
      )
      const osnapChunkIds: string[] = []
      osnapSlices.forEach((primitives, sliceIndex) => {
        const id = `L${layoutIndex}-osnap-${String(sliceIndex).padStart(3, '0')}`
        const href = `chunks/${id}.osnap.gz`
        const { uncompressed, compressed } = encodeOsnapCatalogGzip({
          primitives
        })
        osnapChunkIds.push(id)
        osnapChunkRefs.push({
          id,
          href,
          layoutBtrId: layout.btrId,
          byteLength: uncompressed.byteLength,
          compressedByteLength: compressed.byteLength,
          primitiveCount: primitives.length
        })
        files.push({ path: href, bytes: compressed })
      })
      layoutRef.osnapChunkIds = osnapChunkIds
    }

    layoutRefs.push(layoutRef)
  })

  // Restore original layout order in the manifest (UI order), but chunk list
  // already prefers active layout because we encoded active first.
  const layoutsInOriginalOrder = snapshot.layouts.map(layout => {
    const index = layoutIndexByBtrId.get(layout.btrId)!
    return layoutRefs[index]!
  })

  // Reorder chunkRefs: active layout chunks first, then remaining in layout order.
  const activeChunkIds = new Set(
    layoutsInOriginalOrder.find(l => l.btrId === snapshot.activeLayoutBtrId)
      ?.chunkIds ?? []
  )
  const orderedChunks = [
    ...chunkRefs.filter(c => activeChunkIds.has(c.id)),
    ...chunkRefs.filter(c => !activeChunkIds.has(c.id))
  ]

  const activeOsnapIds = new Set(
    layoutsInOriginalOrder.find(l => l.btrId === snapshot.activeLayoutBtrId)
      ?.osnapChunkIds ?? []
  )
  const orderedOsnapChunks = [
    ...osnapChunkRefs.filter(c => activeOsnapIds.has(c.id)),
    ...osnapChunkRefs.filter(c => !activeOsnapIds.has(c.id))
  ]

  const manifest: AcExPackageManifest = {
    format: 'acex-package',
    packageVersion: ACEX_PACKAGE_VERSION,
    snapshotVersion: ACEX_SNAPSHOT_VERSION,
    meta: snapshot.meta,
    layers: snapshot.layers,
    activeLayoutBtrId: snapshot.activeLayoutBtrId,
    layouts: layoutsInOriginalOrder,
    chunks: orderedChunks,
    ...(orderedOsnapChunks.length > 0
      ? { osnapChunks: orderedOsnapChunks }
      : {})
  }

  const manifestJson = `${JSON.stringify(manifest)}\n`
  files.unshift({
    path: manifestFileName,
    bytes: strToU8(manifestJson)
  })

  const html = packHtmlPackage(snapshot, {
    title: snapshot.meta.title,
    viewerRuntime: options.viewerRuntime,
    manifestUrl
  })
  files.unshift({
    path: 'viewer.html',
    bytes: strToU8(html)
  })

  return {
    html,
    manifest,
    manifestFileName,
    files
  }
}

function orderLayoutsForExport(
  layouts: AcExLayoutSnapshot[],
  activeLayoutBtrId: string
): AcExLayoutSnapshot[] {
  const active = layouts.find(l => l.btrId === activeLayoutBtrId)
  const rest = layouts.filter(l => l.btrId !== activeLayoutBtrId)
  return active ? [active, ...rest] : [...layouts]
}

/**
 * File-name stem for package files (`{base}.acex.json`, zip-safe path segments).
 * Keeps only `[A-Za-z0-9._-]`; spaces, `+`, parentheses, and other punctuation
 * become underscores so {@link zipAcExPackageFiles} / package href checks pass.
 * The browser download name for the `.zip` itself may still use the original
 * drawing title via {@link resolveExportDownloadName}.
 */
function sanitizeBaseName(name: string): string {
  const trimmed = name.trim().replace(/\.(dwg|dxf|html|zip|acex\.json)$/i, '')
  const safe = trimmed
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_./-]+|[_./-]+$/g, '')
  return safe.length > 0 ? safe : 'drawing'
}
