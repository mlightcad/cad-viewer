/**
 * Resolves where a generic multi-file viewer.html should load its package
 * (`drawing.acex.json` + chunks) from: query param, sibling default file,
 * remote URL, or a local directory index.
 *
 * @packageDocumentation
 */

import {
  parseAcExPackageManifest,
  resolvePackageManifestUrl
} from './AcExPackageLoader'
import type { AcExPackageManifest } from './AcExPackageTypes'

/** Canonical package manifest file name next to `viewer.html`. */
export const ACEX_DEFAULT_MANIFEST_FILE = 'drawing.acex.json'

/** Relative href used when no query / config override is present. */
export const ACEX_DEFAULT_MANIFEST_HREF = `./${ACEX_DEFAULT_MANIFEST_FILE}`

/**
 * Query parameter names that may carry a `drawing.acex.json` URL.
 * First match wins (`manifest` preferred).
 */
export const ACEX_MANIFEST_QUERY_KEYS = ['manifest', 'acex'] as const

/** Virtual origin used by {@link createPackageDirectoryFetch}. */
export const ACEX_PACKAGE_DIRECTORY_ORIGIN = 'https://acex-package.invalid/'

/**
 * `window.fetch` wrapped so it is safe to store and call as `fetchImpl(...)`.
 * Passing the bare `fetch` function loses the Window receiver and throws
 * `TypeError: Illegal invocation` in browsers.
 */
export const acexGlobalFetch: typeof fetch = (input, init) =>
  globalThis.fetch(input, init)

/**
 * Which local-folder APIs the current browser exposes for opening an ACEX
 * package directory.
 */
export interface AcExLocalFolderOpenSupport {
  /** File System Access API `showDirectoryPicker` (secure contexts). */
  directoryPicker: boolean
  /** Legacy `<input webkitdirectory>` / `directory` file input. */
  webkitDirectory: boolean
}

/** True when at least one local-folder selection path is available. */
export function canOpenLocalPackageFolder(
  support: AcExLocalFolderOpenSupport
): boolean {
  return support.directoryPicker || support.webkitDirectory
}

/**
 * Detects local folder open support for the package source gate.
 *
 * @param env - Optional stubs for unit tests (defaults to the current window / DOM).
 */
export function detectLocalFolderOpenSupport(env?: {
  hasDirectoryPicker?: boolean
  isSecureContext?: boolean
  supportsWebkitDirectoryAttribute?: boolean
}): AcExLocalFolderOpenSupport {
  const hasDirectoryPicker =
    env?.hasDirectoryPicker ??
    typeof (
      globalThis as { showDirectoryPicker?: unknown }
    ).showDirectoryPicker === 'function'
  const isSecureContext =
    env?.isSecureContext ??
    (typeof globalThis.isSecureContext === 'boolean'
      ? globalThis.isSecureContext
      : true)

  let supportsWebkitDirectoryAttribute =
    env?.supportsWebkitDirectoryAttribute
  if (supportsWebkitDirectoryAttribute == null) {
    supportsWebkitDirectoryAttribute = false
    if (typeof document !== 'undefined') {
      const input = document.createElement('input')
      input.type = 'file'
      supportsWebkitDirectoryAttribute =
        'webkitdirectory' in input || 'directory' in input
    }
  }

  return {
    // showDirectoryPicker is defined in some engines outside secure contexts
    // but rejects on call — only advertise it when the context is secure.
    directoryPicker: hasDirectoryPicker && isSecureContext,
    webkitDirectory: supportsWebkitDirectoryAttribute
  }
}

export type AcExManifestProbeFailureReason =
  | 'not-found'
  | 'invalid'
  | 'network'

export type AcExManifestProbeResult =
  | { ok: true; manifest: AcExPackageManifest }
  | { ok: false; reason: AcExManifestProbeFailureReason; error: Error }

/**
 * Reads a manifest URL from `location.search` / a search string.
 * Accepts absolute `http(s)` URLs or relative package paths.
 */
export function readManifestUrlFromSearchParams(
  search: string
): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return null
  let params: URLSearchParams
  try {
    params = new URLSearchParams(raw)
  } catch {
    return null
  }
  for (const key of ACEX_MANIFEST_QUERY_KEYS) {
    const value = params.get(key)?.trim()
    if (value) return value
  }
  return null
}

/**
 * Chooses the initial manifest href before probing.
 *
 * Priority: query param → `#mlcad-package` config → sibling default.
 */
export function chooseInitialManifestHref(options: {
  search?: string
  configManifestUrl?: string | null
}): { href: string; fromQuery: boolean } {
  const fromQuery = readManifestUrlFromSearchParams(options.search ?? '')
  if (fromQuery) {
    return { href: fromQuery, fromQuery: true }
  }
  const fromConfig = options.configManifestUrl?.trim()
  if (fromConfig) {
    return { href: fromConfig, fromQuery: false }
  }
  return { href: ACEX_DEFAULT_MANIFEST_HREF, fromQuery: false }
}

/** Returns true for absolute `http:` / `https:` URLs. */
export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/**
 * Resolves a viewer manifest href against the page URL.
 *
 * Absolute `http(s)` URLs (query / user paste) are accepted as-is.
 * Relative paths stay same-origin via {@link resolvePackageManifestUrl}.
 */
export function resolveViewerManifestUrl(
  href: string,
  pageUrl: string
): string {
  const trimmed = href.trim()
  if (!trimmed) {
    throw new Error('Missing manifest URL')
  }
  if (isAbsoluteHttpUrl(trimmed)) {
    try {
      return new URL(trimmed).toString()
    } catch {
      throw new Error('Invalid manifest URL')
    }
  }
  return resolvePackageManifestUrl(trimmed, pageUrl)
}

/**
 * Fetches and validates a package manifest. Distinguishes missing files from
 * unsupported versions / malformed JSON so the UI can react accordingly.
 */
export async function probePackageManifest(
  manifestUrl: string,
  fetchImpl: typeof fetch = acexGlobalFetch
): Promise<AcExManifestProbeResult> {
  let response: Response
  try {
    response = await fetchImpl(manifestUrl)
  } catch (error) {
    return {
      ok: false,
      reason: 'network',
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
  if (response.status === 404 || response.status === 410) {
    return {
      ok: false,
      reason: 'not-found',
      error: new Error(
        `Failed to load package manifest (${response.status})`
      )
    }
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: 'network',
      error: new Error(
        `Failed to load package manifest (${response.status})`
      )
    }
  }

  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid',
      error:
        error instanceof Error
          ? error
          : new Error('Invalid package manifest JSON')
    }
  }

  try {
    return { ok: true, manifest: parseAcExPackageManifest(data) }
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid',
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Normalizes directory entry paths so `drawing.acex.json` and `chunks/…`
 * sit at the package root (strips a shared top-level folder from
 * `webkitdirectory` / folder-picker listings).
 */
export function normalizePackageDirectoryPath(
  relativePath: string,
  stripRootPrefix?: string | null
): string {
  let path = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (stripRootPrefix) {
    const prefix = stripRootPrefix.replace(/\\/g, '/').replace(/\/+$/, '')
    if (path === prefix) {
      path = ''
    } else if (path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length + 1)
    }
  }
  return path.replace(/^\.\//, '')
}

/**
 * Detects a shared root folder when every path starts with the same segment
 * (typical of `<input webkitdirectory>` FileList entries).
 */
export function detectSharedDirectoryRoot(
  relativePaths: Iterable<string>
): string | null {
  const normalized = [...relativePaths]
    .map(p => p.replace(/\\/g, '/').replace(/^\/+/, ''))
    .filter(Boolean)
  if (normalized.length === 0) return null
  const firstSeg = normalized[0]!.split('/')[0]
  if (!firstSeg || firstSeg === ACEX_DEFAULT_MANIFEST_FILE) return null
  const allShare = normalized.every(p => {
    const seg = p.split('/')[0]
    return seg === firstSeg
  })
  if (!allShare) return null
  // Only strip when the root is a directory prefix (paths have nested files).
  const hasNested = normalized.some(p => p.includes('/'))
  return hasNested ? firstSeg : null
}

/**
 * Builds a path → bytes map for local package loading.
 */
export function buildPackageDirectoryFileMap(
  entries: Iterable<{ relativePath: string; bytes: Uint8Array }>
): Map<string, Uint8Array> {
  const list = [...entries]
  const root = detectSharedDirectoryRoot(list.map(e => e.relativePath))
  const out = new Map<string, Uint8Array>()
  for (const entry of list) {
    const path = normalizePackageDirectoryPath(entry.relativePath, root)
    if (!path || path.endsWith('/')) continue
    out.set(path, entry.bytes)
  }
  return out
}

/**
 * Creates a `fetch` implementation that serves package files from an in-memory
 * directory map. `manifestUrl` is a virtual absolute URL so
 * {@link resolveChunkUrl} can resolve relative chunk hrefs.
 */
export function createPackageDirectoryFetch(
  files: ReadonlyMap<string, Uint8Array>,
  options?: { manifestFileName?: string }
): { manifestUrl: string; fetchImpl: typeof fetch } {
  const manifestFileName =
    options?.manifestFileName ?? ACEX_DEFAULT_MANIFEST_FILE
  if (!files.has(manifestFileName)) {
    throw new Error(`Missing ${manifestFileName} in selected folder`)
  }
  const manifestUrl = new URL(
    manifestFileName,
    ACEX_PACKAGE_DIRECTORY_ORIGIN
  ).toString()
  const origin = new URL(ACEX_PACKAGE_DIRECTORY_ORIGIN).origin

  const fetchImpl: typeof fetch = async input => {
    const url = new URL(String(input))
    if (url.origin !== origin) {
      return new Response(null, { status: 404 })
    }
    const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    const bytes = files.get(rel)
    if (!bytes) {
      return new Response(null, { status: 404 })
    }
    if (rel.endsWith('.json')) {
      const text = new TextDecoder().decode(bytes)
      return new Response(text, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    return new Response(copy, { status: 200 })
  }

  return { manifestUrl, fetchImpl }
}

/**
 * Locates `drawing.acex.json` in a directory file map (root only).
 */
export function findDefaultManifestInDirectory(
  files: ReadonlyMap<string, Uint8Array>
): string | null {
  if (files.has(ACEX_DEFAULT_MANIFEST_FILE)) {
    return ACEX_DEFAULT_MANIFEST_FILE
  }
  return null
}
