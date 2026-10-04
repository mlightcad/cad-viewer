import { strToU8 } from 'fflate'

import {
  estimateLineBatchBytes,
  estimateMeshBatchBytes
} from './AcExBatchBinaryCodec'
import {
  type AcExGeometryChunk,
  encodeChunkGzip,
  encodeChunkGzipAsync
} from './AcExChunkBinaryCodec'
import { splitLineBatch, splitMeshBatch } from './AcExGeometryBatchSplit'
import { ACEX_DEFAULT_MANIFEST_FILE } from './AcExHtmlPackageBootstrap'
import { packHtmlPackage } from './AcExHtmlPackager'
import {
  encodeOsnapCatalogGzip,
  encodeOsnapCatalogGzipAsync,
  splitOsnapPrimitives
} from './AcExOsnapCatalogCodec'
import {
  ACEX_DEFAULT_CHUNK_MAX_BYTES,
  ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES,
  ACEX_MAX_GEOMETRY_BATCH_BYTES,
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
  /**
   * Optional stem retained for API compatibility. Multi-file packages always
   * write {@link ACEX_DEFAULT_MANIFEST_FILE} so `viewer.html` stays generic.
   */
  baseName?: string
  /** Max uncompressed ACEC bytes per geometry chunk. */
  maxChunkBytes?: number
  /**
   * Max uncompressed bytes of one line/mesh batch piece.
   * Oversized layer batches are split so chunks can paint progressively.
   * Defaults to {@link ACEX_MAX_GEOMETRY_BATCH_BYTES}.
   */
  maxBatchBytes?: number
  /** Max estimated uncompressed ACEO bytes per OSNAP chunk. */
  maxOsnapChunkBytes?: number
  /**
   * Optional relative or absolute manifest URL embedded in the shell HTML.
   * When omitted, the shell stays generic and probes
   * `./drawing.acex.json` at runtime.
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
 *
 * Oversized single-layer batches are first cut at `maxBatchBytes` so a busy
 * layer can download, inflate, and paint in pieces instead of one long task.
 * Empty layouts still produce one empty slice so the layout remains addressable.
 */
export function splitLayoutIntoSlices(
  layout: AcExLayoutSnapshot,
  maxChunkBytes: number,
  maxBatchBytes: number = ACEX_MAX_GEOMETRY_BATCH_BYTES
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

  const batchBudget = Math.min(maxChunkBytes, maxBatchBytes)

  for (const batch of layout.lineBatches) {
    for (const piece of splitLineBatch(batch, batchBudget)) {
      pushLine(piece)
    }
  }
  for (const batch of layout.meshBatches) {
    for (const piece of splitMeshBatch(batch, batchBudget)) {
      pushMesh(piece)
    }
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

export type AcExBuildPackageDataOptions = Omit<
  AcExBuildPackageOptions,
  'viewerRuntime' | 'manifestUrl'
>

type GzipJob =
  | {
      kind: 'geometry'
      id: string
      href: string
      layoutBtrId: string
      lineBatchCount: number
      meshBatchCount: number
      chunk: AcExGeometryChunk
    }
  | {
      kind: 'osnap'
      id: string
      href: string
      layoutBtrId: string
      primitiveCount: number
      primitives: NonNullable<AcExLayoutSnapshot['osnap']>['primitives']
    }

function collectPackageJobs(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageDataOptions
): {
  jobs: GzipJob[]
  layoutRefs: AcExPackageLayoutRef[]
  layoutIndexByBtrId: Map<string, number>
  manifestFileName: string
} {
  if (snapshot.version !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }

  const maxChunkBytes = options.maxChunkBytes ?? ACEX_DEFAULT_CHUNK_MAX_BYTES
  const maxBatchBytes = options.maxBatchBytes ?? ACEX_MAX_GEOMETRY_BATCH_BYTES
  const maxOsnapChunkBytes =
    options.maxOsnapChunkBytes ?? ACEX_DEFAULT_OSNAP_CHUNK_MAX_BYTES
  const manifestFileName = ACEX_DEFAULT_MANIFEST_FILE

  const orderedLayouts = orderLayoutsForExport(
    snapshot.layouts,
    snapshot.activeLayoutBtrId
  )

  const jobs: GzipJob[] = []
  const layoutRefs: AcExPackageLayoutRef[] = []
  const layoutIndexByBtrId = new Map<string, number>()

  orderedLayouts.forEach((layout, layoutIndex) => {
    layoutIndexByBtrId.set(layout.btrId, layoutIndex)
    const slices = splitLayoutIntoSlices(layout, maxChunkBytes, maxBatchBytes)
    const chunkIds: string[] = []

    slices.forEach((slice, sliceIndex) => {
      const id = `L${layoutIndex}-${String(sliceIndex).padStart(3, '0')}`
      const href = `chunks/${id}.acex.gz`
      chunkIds.push(id)
      jobs.push({
        kind: 'geometry',
        id,
        href,
        layoutBtrId: layout.btrId,
        lineBatchCount: slice.lineBatches.length,
        meshBatchCount: slice.meshBatches.length,
        chunk: {
          version: ACEX_SNAPSHOT_VERSION,
          layoutBtrId: layout.btrId,
          lineBatches: slice.lineBatches,
          meshBatches: slice.meshBatches
        }
      })
    })

    const layoutRef: AcExPackageLayoutRef = {
      btrId: layout.btrId,
      name: layout.name,
      isModelSpace: layout.isModelSpace,
      viewports: layout.viewports,
      ...(layout.savedView ? { savedView: layout.savedView } : {}),
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
        osnapChunkIds.push(id)
        jobs.push({
          kind: 'osnap',
          id,
          href,
          layoutBtrId: layout.btrId,
          primitiveCount: primitives.length,
          primitives
        })
      })
      layoutRef.osnapChunkIds = osnapChunkIds
    }

    layoutRefs.push(layoutRef)
  })

  return { jobs, layoutRefs, layoutIndexByBtrId, manifestFileName }
}

function assemblePackageData(
  snapshot: AcExSnapshot,
  layoutRefs: AcExPackageLayoutRef[],
  layoutIndexByBtrId: Map<string, number>,
  manifestFileName: string,
  encoded: Array<{
    job: GzipJob
    uncompressed: Uint8Array
    compressed: Uint8Array
  }>
): Omit<AcExPackageFiles, 'html'> {
  const chunkRefs: AcExPackageChunkRef[] = []
  const osnapChunkRefs: AcExPackageOsnapChunkRef[] = []
  const files: AcExPackageFiles['files'] = []

  for (const entry of encoded) {
    const { job, uncompressed, compressed } = entry
    files.push({ path: job.href, bytes: compressed })
    if (job.kind === 'geometry') {
      chunkRefs.push({
        id: job.id,
        href: job.href,
        layoutBtrId: job.layoutBtrId,
        byteLength: uncompressed.byteLength,
        compressedByteLength: compressed.byteLength,
        lineBatchCount: job.lineBatchCount,
        meshBatchCount: job.meshBatchCount
      })
    } else {
      osnapChunkRefs.push({
        id: job.id,
        href: job.href,
        layoutBtrId: job.layoutBtrId,
        byteLength: uncompressed.byteLength,
        compressedByteLength: compressed.byteLength,
        primitiveCount: job.primitiveCount
      })
    }
  }

  const layoutsInOriginalOrder = snapshot.layouts.map(layout => {
    const index = layoutIndexByBtrId.get(layout.btrId)!
    return layoutRefs[index]!
  })

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

  return {
    manifest,
    manifestFileName,
    files
  }
}

/**
 * Builds package manifest + chunk files (no HTML shell).
 * Used by multi-file zip export and self-contained embedded progressive HTML.
 */
export function buildAcExPackageData(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageDataOptions = {}
): Omit<AcExPackageFiles, 'html'> {
  const { jobs, layoutRefs, layoutIndexByBtrId, manifestFileName } =
    collectPackageJobs(snapshot, options)
  const encoded = jobs.map(job => {
    if (job.kind === 'geometry') {
      const { uncompressed, compressed } = encodeChunkGzip(job.chunk)
      return { job, uncompressed, compressed }
    }
    const { uncompressed, compressed } = encodeOsnapCatalogGzip({
      primitives: job.primitives
    })
    return { job, uncompressed, compressed }
  })
  return assemblePackageData(
    snapshot,
    layoutRefs,
    layoutIndexByBtrId,
    manifestFileName,
    encoded
  )
}

/**
 * Async package data build that gzip-encodes chunks in parallel.
 */
export async function buildAcExPackageDataAsync(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageDataOptions = {}
): Promise<Omit<AcExPackageFiles, 'html'>> {
  const { jobs, layoutRefs, layoutIndexByBtrId, manifestFileName } =
    collectPackageJobs(snapshot, options)
  const encoded = await Promise.all(
    jobs.map(async job => {
      if (job.kind === 'geometry') {
        const { uncompressed, compressed } = await encodeChunkGzipAsync(
          job.chunk
        )
        return { job, uncompressed, compressed }
      }
      const { uncompressed, compressed } = await encodeOsnapCatalogGzipAsync({
        primitives: job.primitives
      })
      return { job, uncompressed, compressed }
    })
  )
  return assemblePackageData(
    snapshot,
    layoutRefs,
    layoutIndexByBtrId,
    manifestFileName,
    encoded
  )
}

/**
 * Builds a multi-file ACEX package from an in-memory {@link AcExSnapshot}.
 * Active layout chunks are listed first so hosts can prioritize first paint.
 */
export function buildAcExPackage(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageOptions
): AcExPackageFiles {
  const data = buildAcExPackageData(snapshot, options)
  const html = packHtmlPackage(snapshot, {
    title: snapshot.meta.title,
    viewerRuntime: options.viewerRuntime,
    ...(options.manifestUrl ? { manifestUrl: options.manifestUrl } : {})
  })
  return {
    html,
    manifest: data.manifest,
    manifestFileName: data.manifestFileName,
    files: [{ path: 'viewer.html', bytes: strToU8(html) }, ...data.files]
  }
}

/**
 * Async multi-file package build with parallel chunk gzip.
 */
export async function buildAcExPackageAsync(
  snapshot: AcExSnapshot,
  options: AcExBuildPackageOptions
): Promise<AcExPackageFiles> {
  const data = await buildAcExPackageDataAsync(snapshot, options)
  const html = packHtmlPackage(snapshot, {
    title: snapshot.meta.title,
    viewerRuntime: options.viewerRuntime,
    ...(options.manifestUrl ? { manifestUrl: options.manifestUrl } : {})
  })
  return {
    html,
    manifest: data.manifest,
    manifestFileName: data.manifestFileName,
    files: [{ path: 'viewer.html', bytes: strToU8(html) }, ...data.files]
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
