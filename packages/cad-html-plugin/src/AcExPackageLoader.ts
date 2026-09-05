import { decodeChunkGzip } from './AcExChunkBinaryCodec'
import { decodeOsnapCatalogGzip } from './AcExOsnapCatalogCodec'
import type { AcExOsnapPrimitive } from './AcExOsnapPrimitiveTypes'
import {
  ACEX_PACKAGE_VERSION,
  ACEX_SNAPSHOT_VERSION,
  type AcExPackageChunkRef,
  type AcExPackageManifest,
  type AcExPackageOsnapChunkRef
} from './AcExPackageTypes'
import { ACEX_MAX_COMPRESSED_BYTES } from './AcExSnapshotCompression'
import type {
  AcExLayoutSnapshot,
  AcExLineBatch,
  AcExMeshBatch,
  AcExSnapshot
} from './AcExSnapshotTypes'

export interface AcExPackageLoadProgress {
  loadedChunks: number
  totalChunks: number
  layoutBtrId: string
  chunkId: string
}

export interface AcExPackageLoaderOptions {
  /** Absolute or relative URL of the `*.acex.json` manifest. */
  manifestUrl: string
  /** Optional fetch implementation (defaults to global `fetch`). */
  fetchImpl?: typeof fetch
  /** Called after each geometry chunk is decoded. */
  onChunk?: (
    layout: AcExLayoutSnapshot,
    chunk: AcExPackageChunkRef,
    progress: AcExPackageLoadProgress
  ) => void | Promise<void>
  /**
   * When `false`, skip OSNAP sidecars (geometry only). Defaults to `true`.
   * Viewers that paint first should load geometry with this `false`, then call
   * {@link loadAcExPackageLayoutOsnap} after first paint.
   */
  loadOsnap?: boolean
  /** When set, only these layout BTR ids are fetched (others stay empty). */
  layoutFilter?: ReadonlySet<string> | string[]
}

export interface AcExPackageOsnapLoadOptions {
  fetchImpl?: typeof fetch
  /**
   * Called after each OSNAP chunk is decoded (before the next decode).
   * Use to update status UI and yield for paint.
   */
  onChunk?: (
    progress: AcExPackageLoadProgress
  ) => void | Promise<void>
  /** Yield between decode steps so the canvas stays responsive. */
  yieldFn?: () => Promise<void>
}

const SAFE_PACKAGE_HREF =
  /^(?:\.[/\\])?[A-Za-z0-9._-]+(?:[/\\][A-Za-z0-9._-]+)*$/

/**
 * Returns true when `href` is a relative package path (no scheme, `..`, or
 * absolute URL). Used for manifest chunk refs and package `manifestUrl`.
 */
export function isSafePackageHref(href: string): boolean {
  const trimmed = href.trim()
  if (!trimmed || trimmed !== href) {
    return false
  }
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    trimmed.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return false
  }
  if (trimmed.includes('..') || trimmed.includes('\\')) {
    return false
  }
  return SAFE_PACKAGE_HREF.test(trimmed)
}

function assertSafePackageHref(href: string, label: string): void {
  if (!isSafePackageHref(href)) {
    throw new Error(`Invalid ${label}: must be a relative package path`)
  }
}

/**
 * Parses and validates a package manifest JSON value.
 */
export function parseAcExPackageManifest(data: unknown): AcExPackageManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid package manifest')
  }
  const manifest = data as AcExPackageManifest
  if (manifest.format !== 'acex-package') {
    throw new Error('Unsupported package format')
  }
  if (manifest.packageVersion !== ACEX_PACKAGE_VERSION) {
    throw new Error(
      `Unsupported package version: ${String(manifest.packageVersion)}`
    )
  }
  if (manifest.snapshotVersion !== ACEX_SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported snapshot version: ${String(manifest.snapshotVersion)}`
    )
  }
  if (!Array.isArray(manifest.layouts) || !Array.isArray(manifest.chunks)) {
    throw new Error('Invalid package manifest structure')
  }
  for (const chunk of manifest.chunks) {
    if (!chunk || typeof chunk !== 'object') {
      throw new Error('Invalid package chunk entry')
    }
    assertSafePackageHref(chunk.href, 'chunk href')
  }
  for (const chunk of manifest.osnapChunks ?? []) {
    if (!chunk || typeof chunk !== 'object') {
      throw new Error('Invalid package osnap chunk entry')
    }
    assertSafePackageHref(chunk.href, 'osnap chunk href')
  }
  return manifest
}

/**
 * Builds an empty {@link AcExSnapshot} skeleton from a manifest (no geometry yet).
 * OSNAP catalogs are loaded later via {@link loadAcExPackageLayoutOsnap}.
 */
export function snapshotSkeletonFromManifest(
  manifest: AcExPackageManifest
): AcExSnapshot {
  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta: manifest.meta,
    layers: manifest.layers,
    activeLayoutBtrId: manifest.activeLayoutBtrId,
    layouts: manifest.layouts.map(layout => ({
      btrId: layout.btrId,
      name: layout.name,
      isModelSpace: layout.isModelSpace,
      lineBatches: [],
      meshBatches: [],
      viewports: layout.viewports
    }))
  }
}

/**
 * Resolves a chunk href against the manifest URL.
 * Only relative package paths under the manifest directory are allowed.
 */
export function resolveChunkUrl(manifestUrl: string, href: string): string {
  assertSafePackageHref(href, 'chunk href')
  let resolved: URL
  let manifest: URL
  try {
    resolved = new URL(href, manifestUrl)
    manifest = new URL(manifestUrl)
  } catch {
    throw new Error('Invalid chunk or manifest URL')
  }
  if (resolved.protocol !== manifest.protocol || resolved.host !== manifest.host) {
    throw new Error('Chunk URL must share the manifest origin')
  }
  const basePath = manifest.pathname.replace(/[^/]*$/, '')
  const resolvedPath = resolved.pathname
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Chunk URL escapes package directory')
  }
  // Reject encoded `..` segments after URL normalization.
  if (resolvedPath.split('/').includes('..')) {
    throw new Error('Chunk URL escapes package directory')
  }
  return resolved.toString()
}

/**
 * Resolves a package `manifestUrl` from viewer.html config against the page URL.
 * Absolute and cross-origin URLs are rejected.
 */
export function resolvePackageManifestUrl(
  manifestUrl: string,
  pageUrl: string
): string {
  assertSafePackageHref(manifestUrl, 'manifestUrl')
  let resolved: URL
  let page: URL
  try {
    resolved = new URL(manifestUrl, pageUrl)
    page = new URL(pageUrl)
  } catch {
    throw new Error('Invalid manifestUrl')
  }
  if (resolved.protocol !== page.protocol || resolved.host !== page.host) {
    throw new Error('manifestUrl must be same-origin')
  }
  return resolved.toString()
}

async function fetchCompressedBytes(
  fetchImpl: typeof fetch,
  url: string,
  label: string
): Promise<Uint8Array> {
  const response = await fetchImpl(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${label} (${response.status})`)
  }
  const contentLength = response.headers.get('content-length')
  if (contentLength != null) {
    const declared = Number(contentLength)
    if (Number.isFinite(declared) && declared > ACEX_MAX_COMPRESSED_BYTES) {
      throw new Error(`${label} exceeds size limit`)
    }
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > ACEX_MAX_COMPRESSED_BYTES) {
    throw new Error(`${label} exceeds size limit`)
  }
  return new Uint8Array(buffer)
}

/**
 * Fetches the package manifest, then progressively downloads geometry chunks.
 * OSNAP sidecars load afterward (unless {@link AcExPackageLoaderOptions.loadOsnap}
 * is `false`) so display data is not blocked by snap catalogs.
 */
export async function loadAcExPackage(
  options: AcExPackageLoaderOptions
): Promise<AcExSnapshot> {
  const fetchImpl = options.fetchImpl ?? fetch
  const loadOsnap = options.loadOsnap !== false
  const manifestResponse = await fetchImpl(options.manifestUrl)
  if (!manifestResponse.ok) {
    throw new Error(
      `Failed to load package manifest (${manifestResponse.status})`
    )
  }
  const manifest = parseAcExPackageManifest(await manifestResponse.json())
  const snapshot = snapshotSkeletonFromManifest(manifest)

  const layoutById = new Map(
    snapshot.layouts.map(layout => [layout.btrId, layout])
  )

  const filter =
    options.layoutFilter == null
      ? null
      : options.layoutFilter instanceof Set
        ? options.layoutFilter
        : new Set(options.layoutFilter)

  const chunksToLoad = manifest.chunks.filter(
    chunk => filter == null || filter.has(chunk.layoutBtrId)
  )

  let loadedChunks = 0
  for (const chunkRef of chunksToLoad) {
    const layout = layoutById.get(chunkRef.layoutBtrId)
    if (!layout) {
      throw new Error('Unknown layout for package chunk')
    }

    const url = resolveChunkUrl(options.manifestUrl, chunkRef.href)
    const compressed = await fetchCompressedBytes(
      fetchImpl,
      url,
      'geometry chunk'
    )
    const decoded = decodeChunkGzip(compressed)
    if (decoded.layoutBtrId !== chunkRef.layoutBtrId) {
      throw new Error('Chunk layout mismatch')
    }

    appendBatches(layout, decoded.lineBatches, decoded.meshBatches)
    loadedChunks += 1

    await options.onChunk?.(layout, chunkRef, {
      loadedChunks,
      totalChunks: chunksToLoad.length,
      layoutBtrId: chunkRef.layoutBtrId,
      chunkId: chunkRef.id
    })
  }

  if (loadOsnap) {
    for (const layoutRef of manifest.layouts) {
      if (filter != null && !filter.has(layoutRef.btrId)) {
        continue
      }
      const layout = layoutById.get(layoutRef.btrId)
      if (!layout) {
        continue
      }
      await loadAcExPackageLayoutOsnap(
        manifest,
        options.manifestUrl,
        layoutRef.btrId,
        layout,
        { fetchImpl }
      )
    }
  }

  return snapshot
}

/**
 * Loads geometry chunks for a single layout into an existing snapshot skeleton.
 * Does not load OSNAP — call {@link loadAcExPackageLayoutOsnap} after paint.
 */
export async function loadAcExPackageLayout(
  manifest: AcExPackageManifest,
  manifestUrl: string,
  layoutBtrId: string,
  layout: AcExLayoutSnapshot,
  options: Pick<AcExPackageLoaderOptions, 'fetchImpl' | 'onChunk'> = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch
  const layoutRef = manifest.layouts.find(l => l.btrId === layoutBtrId)
  if (!layoutRef) {
    throw new Error(`Layout not found: ${layoutBtrId}`)
  }
  const chunkById = new Map(manifest.chunks.map(c => [c.id, c]))
  const chunks = layoutRef.chunkIds
    .map(id => chunkById.get(id))
    .filter((c): c is AcExPackageChunkRef => c != null)

  let loadedChunks = 0
  for (const chunkRef of chunks) {
    const url = resolveChunkUrl(manifestUrl, chunkRef.href)
    const compressed = await fetchCompressedBytes(
      fetchImpl,
      url,
      'geometry chunk'
    )
    const decoded = decodeChunkGzip(compressed)
    appendBatches(layout, decoded.lineBatches, decoded.meshBatches)
    loadedChunks += 1
    await options.onChunk?.(layout, chunkRef, {
      loadedChunks,
      totalChunks: chunks.length,
      layoutBtrId,
      chunkId: chunkRef.id
    })
  }
}

/**
 * Loads OSNAP ACEO chunks for one layout (no-op when absent).
 *
 * Prefetches the next compressed chunk while decoding the current one, but
 * never gunzips/decodes more than one chunk at a time — parallel decode of
 * dozens of ~500 KiB ACEO payloads freezes the main thread on large drawings.
 */
export async function loadAcExPackageLayoutOsnap(
  manifest: AcExPackageManifest,
  manifestUrl: string,
  layoutBtrId: string,
  layout: AcExLayoutSnapshot,
  options: AcExPackageOsnapLoadOptions = {}
): Promise<void> {
  if (layout.osnap) {
    return
  }
  const layoutRef = manifest.layouts.find(l => l.btrId === layoutBtrId)
  if (!layoutRef) {
    return
  }
  const ids = layoutRef.osnapChunkIds
  if (!ids || ids.length === 0) {
    return
  }
  const osnapById = new Map(
    (manifest.osnapChunks ?? []).map(chunk => [chunk.id, chunk])
  )
  const refs = ids
    .map(id => osnapById.get(id))
    .filter((c): c is AcExPackageOsnapChunkRef => c != null)
  if (refs.length === 0) {
    return
  }

  const fetchImpl = options.fetchImpl ?? fetch
  const yieldFn =
    options.yieldFn ??
    (() =>
      new Promise<void>(resolve => {
        setTimeout(resolve, 0)
      }))

  const totalPrimitives = refs.reduce((sum, ref) => sum + ref.primitiveCount, 0)
  const primitives: AcExOsnapPrimitive[] =
    totalPrimitives > 0 ? new Array(totalPrimitives) : []
  let writeOffset = 0

  const fetchCompressed = async (
    chunkRef: AcExPackageOsnapChunkRef
  ): Promise<Uint8Array> => {
    const url = resolveChunkUrl(manifestUrl, chunkRef.href)
    return fetchCompressedBytes(fetchImpl, url, 'osnap chunk')
  }

  let nextFetch =
    refs.length > 0 ? fetchCompressed(refs[0]!) : Promise.resolve(null)

  for (let i = 0; i < refs.length; i++) {
    const chunkRef = refs[i]!
    const compressed = await nextFetch
    nextFetch =
      i + 1 < refs.length
        ? fetchCompressed(refs[i + 1]!)
        : Promise.resolve(null)

    if (!compressed) {
      throw new Error('Missing osnap chunk bytes')
    }

    const decoded = decodeOsnapCatalogGzip(compressed)
    const slice = decoded.primitives
    if (totalPrimitives > 0) {
      for (let p = 0; p < slice.length; p++) {
        primitives[writeOffset++] = slice[p]!
      }
    } else {
      for (const primitive of slice) {
        primitives.push(primitive)
      }
    }

    await options.onChunk?.({
      loadedChunks: i + 1,
      totalChunks: refs.length,
      layoutBtrId,
      chunkId: chunkRef.id
    })
    await yieldFn()
  }

  if (totalPrimitives > 0 && writeOffset !== totalPrimitives) {
    primitives.length = writeOffset
  }
  layout.osnap = { primitives }
}

function appendBatches(
  layout: AcExLayoutSnapshot,
  lineBatches: AcExLineBatch[],
  meshBatches: AcExMeshBatch[]
): void {
  layout.lineBatches.push(...lineBatches)
  layout.meshBatches.push(...meshBatches)
}
