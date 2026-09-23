import { decodeChunkGzip } from './AcExChunkBinaryCodec'
import { acexGlobalFetch } from './AcExHtmlPackageBootstrap'
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
  /**
   * Maximum geometry chunk fetches launched ahead of the ordered
   * inflate/paint loop. Defaults to
   * {@link ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY}. Decoding and `onChunk`
   * callbacks still run one at a time in manifest order. Pass `1` for
   * non-network fetch backends (embedded / local directory packages).
   */
  fetchConcurrency?: number
}

export interface AcExPackageOsnapLoadOptions {
  fetchImpl?: typeof fetch
  /**
   * Called after each OSNAP chunk is decoded (before the next decode).
   * Use to update status UI and yield for paint.
   */
  onChunk?: (progress: AcExPackageLoadProgress) => void | Promise<void>
  /** Yield between decode steps so the canvas stays responsive. */
  yieldFn?: () => Promise<void>
  /**
   * Maximum OSNAP chunk fetches in flight. Defaults to
   * {@link ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY}. Decodes stay serial so
   * parallel ACEO gunzips cannot freeze the main thread.
   */
  fetchConcurrency?: number
}

/**
 * Default chunk download window for remote (HTTP) packages.
 *
 * Matches the common per-origin HTTP/1.1 connection budget and stays polite
 * on HTTP/2. Only compressed bytes are buffered, so the window costs little
 * memory; inflate/paint remains strictly serial and ordered.
 */
export const ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY = 6

/** One ordered entry handed back by {@link createAcExOrderedBytePrefetcher}. */
export interface AcExOrderedPrefetchedItem<T> {
  item: T
  index: number
  bytes: Uint8Array
}

/**
 * Sliding-window prefetcher over an ordered item list.
 *
 * Up to `concurrency` byte fetches are in flight at once, but `next()` always
 * resolves strictly in input order: an item downloaded out of order waits as
 * compressed bytes until earlier items are consumed. This lets hosted packages
 * download chunks in parallel while decode / GPU upload / paint happen one
 * chunk at a time (progressive rendering, no main-thread decode burst).
 */
export interface AcExOrderedBytePrefetcher<T> {
  next(): Promise<AcExOrderedPrefetchedItem<T> | null>
}

/**
 * Creates {@link AcExOrderedBytePrefetcher}. The first fetch window starts
 * immediately; a new fetch is launched each time the consumer takes an item,
 * keeping the pipeline full until every item has been requested.
 */
export function createAcExOrderedBytePrefetcher<T>(
  items: readonly T[],
  concurrency: number,
  fetchBytes: (item: T, index: number) => Promise<Uint8Array>
): AcExOrderedBytePrefetcher<T> {
  const total = items.length
  // Never launch for an empty item list: the window must stay 0 so
  // `fetchBytes` is only ever invoked with a valid index.
  const windowSize =
    total > 0
      ? Math.max(
          1,
          Math.min(
            Number.isFinite(concurrency) ? Math.floor(concurrency) : 1,
            total
          )
        )
      : 0
  const inflight: Array<Promise<Uint8Array> | undefined> = new Array(total)
  let launched = 0
  let consumed = 0

  const launch = (index: number): void => {
    const promise = Promise.resolve().then(() =>
      fetchBytes(items[index]!, index)
    )
    // The consumer aborts on the first failure and never awaits trailing
    // window requests; attach a no-op handler so they do not surface as
    // unhandled promise rejections. The ordered await still receives the
    // rejection when that entry is consumed.
    promise.catch(() => {})
    inflight[index] = promise
    launched += 1
  }

  while (launched < windowSize) {
    launch(launched)
  }

  return {
    async next() {
      if (consumed >= total) {
        return null
      }
      const index = consumed
      consumed += 1
      const bytes = await inflight[index]!
      if (launched < total) {
        launch(launched)
      }
      return { item: items[index]!, index, bytes }
    }
  }
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
      viewports: layout.viewports,
      ...(layout.savedView ? { savedView: layout.savedView } : {})
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
  if (
    resolved.protocol !== manifest.protocol ||
    resolved.host !== manifest.host
  ) {
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
 *
 * Chunk bytes download through a bounded parallel window (see
 * {@link createAcExOrderedBytePrefetcher}), but gunzip, batch append, and the
 * `onChunk` paint callback run strictly one at a time in manifest order, so
 * progressive rendering is unchanged while network time is overlapped.
 * OSNAP sidecars load afterward (unless {@link AcExPackageLoaderOptions.loadOsnap}
 * is `false`) so display data is not blocked by snap catalogs.
 */
export async function loadAcExPackage(
  options: AcExPackageLoaderOptions
): Promise<AcExSnapshot> {
  const fetchImpl = options.fetchImpl ?? acexGlobalFetch
  const loadOsnap = options.loadOsnap !== false
  const concurrency =
    options.fetchConcurrency ?? ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY
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

  const prefetcher = createAcExOrderedBytePrefetcher(
    chunksToLoad,
    concurrency,
    chunkRef =>
      fetchCompressedBytes(
        fetchImpl,
        resolveChunkUrl(options.manifestUrl, chunkRef.href),
        'geometry chunk'
      )
  )

  let loadedChunks = 0
  for (;;) {
    const entry = await prefetcher.next()
    if (!entry) {
      break
    }
    const chunkRef = entry.item
    const layout = layoutById.get(chunkRef.layoutBtrId)
    if (!layout) {
      throw new Error('Unknown layout for package chunk')
    }

    const decoded = decodeChunkGzip(entry.bytes)
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
  options: Pick<
    AcExPackageLoaderOptions,
    'fetchImpl' | 'onChunk' | 'fetchConcurrency'
  > = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? acexGlobalFetch
  const concurrency =
    options.fetchConcurrency ?? ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY
  const layoutRef = manifest.layouts.find(l => l.btrId === layoutBtrId)
  if (!layoutRef) {
    throw new Error(`Layout not found: ${layoutBtrId}`)
  }
  const chunkById = new Map(manifest.chunks.map(c => [c.id, c]))
  const chunks = layoutRef.chunkIds
    .map(id => chunkById.get(id))
    .filter((c): c is AcExPackageChunkRef => c != null)

  const prefetcher = createAcExOrderedBytePrefetcher(
    chunks,
    concurrency,
    chunkRef =>
      fetchCompressedBytes(
        fetchImpl,
        resolveChunkUrl(manifestUrl, chunkRef.href),
        'geometry chunk'
      )
  )

  let loadedChunks = 0
  for (;;) {
    const entry = await prefetcher.next()
    if (!entry) {
      break
    }
    const chunkRef = entry.item
    const decoded = decodeChunkGzip(entry.bytes)
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
 * Compressed chunks download through a bounded parallel window
 * ({@link createAcExOrderedBytePrefetcher}), but gunzip/decode never runs on
 * more than one chunk at a time and primitives are assembled in
 * `osnapChunkIds` order — parallel decode of dozens of ~500 KiB ACEO payloads
 * would freeze the main thread on large drawings.
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

  const fetchImpl = options.fetchImpl ?? acexGlobalFetch
  const concurrency =
    options.fetchConcurrency ?? ACEX_GEOMETRY_CHUNK_FETCH_CONCURRENCY
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

  const prefetcher = createAcExOrderedBytePrefetcher(
    refs,
    concurrency,
    chunkRef =>
      fetchCompressedBytes(
        fetchImpl,
        resolveChunkUrl(manifestUrl, chunkRef.href),
        'osnap chunk'
      )
  )

  let loadedChunks = 0
  for (;;) {
    const entry = await prefetcher.next()
    if (!entry) {
      break
    }
    const chunkRef = entry.item

    const decoded = decodeOsnapCatalogGzip(entry.bytes)
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

    loadedChunks += 1
    await options.onChunk?.({
      loadedChunks,
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
