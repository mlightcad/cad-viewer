/**
 * Self-contained HTML with embedded progressive ACEX chunks.
 *
 * Small drawings stay on a monolithic `#mlcad-snapshot`. Large drawings embed
 * the same ACEC/ACEO chunks used by multi-file packages so the offline viewer
 * can inflate and paint one chunk at a time. Password protection encrypts the
 * manifest and each chunk independently (shared PBKDF2 salt / AES-GCM key).
 */

import {
  type AcExHtmlAccessManifest,
  acexHtmlBase64ToBytes,
  acexHtmlBuildAccessManifest,
  acexHtmlBytesToBase64,
  acexHtmlCreateAccessKey,
  acexHtmlDecryptBytes,
  acexHtmlEncryptBytes
} from './AcExHtmlAccess'
import {
  acexHtmlEstimateLineBatchBytes,
  acexHtmlEstimateMeshBatchBytes
} from './AcExHtmlBatchBinaryCodec'
import {
  type AcExHtmlBinaryEncoding,
  acexHtmlBytesToText,
  acexHtmlParseBinaryEncoding,
  acexHtmlTextToBytes} from './AcExHtmlBinaryText'
import { acexHtmlResolveLocale } from './AcExHtmlI18n'
import { acexHtmlEstimateOsnapPrimitiveBytes } from './AcExHtmlOsnapCatalogCodec'
import {
  ACEX_DEFAULT_MANIFEST_FILE,
  ACEX_PACKAGE_DIRECTORY_ORIGIN
} from './AcExHtmlPackageBootstrap'
import {
  acexHtmlBuildPackageDataAsync,
  type AcExHtmlBuildPackageDataOptions} from './AcExHtmlPackageBuilder'
import { acexHtmlParsePackageManifest } from './AcExHtmlPackageLoader'
import {
  ACEX_EMBEDDED_CHUNK_MAX_BYTES,
  ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES,
  ACEX_EMBEDDED_OSNAP_CHUNK_MAX_BYTES,
  type AcExHtmlPackageFile,
  type AcExHtmlPackageManifest
} from './AcExHtmlPackageTypes'
import { ACEX_HTML_SHELL_CSS, acexHtmlBuildShellBody } from './AcExHtmlShell'
import type { AcExHtmlSnapshot } from './AcExHtmlSnapshotTypes'

/** MIME type for embedded chunk `<script>` bodies (base85 gzip ACEC/ACEO). */
export const ACEX_EMBEDDED_CHUNK_MIME =
  'application/vnd.mlightcad.acex-chunk;base85'

/** Legacy MIME type kept for reading older self-contained HTML exports. */
export const ACEX_EMBEDDED_CHUNK_MIME_BASE64 =
  'application/vnd.mlightcad.acex-chunk;base64'

/** MIME type when each chunk body is AES-GCM wrapped (`iv||ciphertext` base85). */
export const ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME =
  'application/vnd.mlightcad.acex-chunk+aes-gcm;base85'

/** Legacy encrypted MIME type (base64 body). */
export const ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME_BASE64 =
  'application/vnd.mlightcad.acex-chunk+aes-gcm;base64'

/** Attribute that maps an embedded script to a package-relative chunk href. */
export const ACEX_EMBEDDED_CHUNK_HREF_ATTR = 'data-acex-href'

/**
 * `#mlcad-package` config when geometry is embedded for progressive paint.
 */
export type AcExHtmlEmbeddedPackageConfig =
  | {
      mode: 'embedded'
      encrypted?: false
      manifest: AcExHtmlPackageManifest
    }
  | {
      mode: 'embedded'
      encrypted: true
      /** Base64 AES-GCM (`iv||ciphertext`) of UTF-8 manifest JSON. */
      encryptedManifest: string
    }

export interface AcExHtmlPackHtmlEmbeddedOptions {
  title?: string
  viewerRuntime: string
  expiresAt?: number | null
  password?: string
  maxChunkBytes?: number
  maxBatchBytes?: number
  maxOsnapChunkBytes?: number
}

/**
 * Rough uncompressed geometry + OSNAP size used to decide monolithic vs chunked.
 */
export function acexHtmlEstimateSnapshotGeometryBytes(
  snapshot: AcExHtmlSnapshot
): number {
  let total = 0
  for (const layout of snapshot.layouts) {
    for (const batch of layout.lineBatches) {
      total += acexHtmlEstimateLineBatchBytes(batch)
    }
    for (const batch of layout.meshBatches) {
      total += acexHtmlEstimateMeshBatchBytes(batch)
    }
    const primitives = layout.osnap?.primitives
    if (primitives) {
      for (const primitive of primitives) {
        total += acexHtmlEstimateOsnapPrimitiveBytes(primitive)
      }
    }
  }
  return total
}

/**
 * Returns true when self-contained HTML should embed progressive chunks.
 */
export function acexHtmlShouldEmbedChunks(
  snapshot: AcExHtmlSnapshot,
  thresholdBytes: number = ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES
): boolean {
  return acexHtmlEstimateSnapshotGeometryBytes(snapshot) >= thresholdBytes
}

/**
 * Builds a self-contained HTML document with an embedded progressive package.
 * Chunks use a larger size budget than hosted multi-file packages.
 */
export async function acexHtmlPackHtmlEmbeddedPackage(
  snapshot: AcExHtmlSnapshot,
  options: AcExHtmlPackHtmlEmbeddedOptions
): Promise<string> {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const runtime = options.viewerRuntime
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = acexHtmlResolveLocale(snapshot.meta.locale) ?? 'en'
  const viewerMode = snapshot.meta.viewerMode ?? 'measure'
  const exportLayouts = snapshot.meta.exportLayouts !== false
  const expiresAt = options.expiresAt ?? null
  const password = options.password?.trim() || undefined

  const dataOptions: AcExHtmlBuildPackageDataOptions = {
    maxChunkBytes: options.maxChunkBytes ?? ACEX_EMBEDDED_CHUNK_MAX_BYTES,
    maxBatchBytes:
      options.maxBatchBytes ??
      options.maxChunkBytes ??
      ACEX_EMBEDDED_CHUNK_MAX_BYTES,
    maxOsnapChunkBytes:
      options.maxOsnapChunkBytes ?? ACEX_EMBEDDED_OSNAP_CHUNK_MAX_BYTES
  }
  const pkg = await acexHtmlBuildPackageDataAsync(snapshot, dataOptions)

  let accessManifest: AcExHtmlAccessManifest | undefined
  let packageConfig: AcExHtmlEmbeddedPackageConfig
  let chunkScripts: string

  if (password) {
    const { key, salt } = await acexHtmlCreateAccessKey(password)
    accessManifest = acexHtmlBuildAccessManifest({
      expiresAt,
      password,
      salt
    })
    const manifestPlain = new TextEncoder().encode(
      `${JSON.stringify(pkg.manifest)}\n`
    )
    const encryptedManifest = await acexHtmlEncryptBytes(key, manifestPlain)
    packageConfig = {
      mode: 'embedded',
      encrypted: true,
      encryptedManifest: acexHtmlBytesToBase64(encryptedManifest)
    }
    chunkScripts = await buildEncryptedChunkScripts(pkg.files, key)
  } else {
    accessManifest = acexHtmlBuildAccessManifest({ expiresAt })
    packageConfig = {
      mode: 'embedded',
      manifest: pkg.manifest
    }
    chunkScripts = buildPlainChunkScripts(pkg.files)
  }

  const accessScript = accessManifest
    ? `  <script id="mlcad-access" type="application/json">${escapeInlineJson(
        JSON.stringify(accessManifest)
      )}</script>\n`
    : ''

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="mlightcad-cad-html-plugin" />
  <title>${escapeHtml(title)}</title>
  <style>${ACEX_HTML_SHELL_CSS}</style>
</head>
<body>
${acexHtmlBuildShellBody(loadingBg, viewerMode, exportLayouts)}
${accessScript}  <script id="mlcad-package" type="application/json">${escapeInlineJson(
    JSON.stringify(packageConfig)
  )}</script>
${chunkScripts}  <script>${escapeInlineScript(runtime)}</script>
</body>
</html>`
}

function buildPlainChunkScripts(files: AcExHtmlPackageFile[]): string {
  const parts: string[] = []
  for (const file of files) {
    if (file.path === ACEX_DEFAULT_MANIFEST_FILE) continue
    parts.push(
      `  <script type="${ACEX_EMBEDDED_CHUNK_MIME}" ${ACEX_EMBEDDED_CHUNK_HREF_ATTR}="${escapeHtmlAttr(
        file.path
      )}">${acexHtmlBytesToText(file.bytes, 'base85')}</script>\n`
    )
  }
  return parts.join('')
}

async function buildEncryptedChunkScripts(
  files: AcExHtmlPackageFile[],
  key: CryptoKey
): Promise<string> {
  const parts: string[] = []
  for (const file of files) {
    if (file.path === ACEX_DEFAULT_MANIFEST_FILE) continue
    const encrypted = await acexHtmlEncryptBytes(key, file.bytes)
    parts.push(
      `  <script type="${ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME}" ${ACEX_EMBEDDED_CHUNK_HREF_ATTR}="${escapeHtmlAttr(
        file.path
      )}">${acexHtmlBytesToText(encrypted, 'base85')}</script>\n`
    )
  }
  return parts.join('')
}

function decodeEmbeddedChunkScript(script: Element): Uint8Array | undefined {
  const raw = script.textContent ?? ''
  if (raw.length === 0) return undefined
  const payload =
    raw.charCodeAt(0) <= 32 || raw.charCodeAt(raw.length - 1) <= 32
      ? raw.trim()
      : raw
  if (payload.length === 0) return undefined
  const encoding: AcExHtmlBinaryEncoding = acexHtmlParseBinaryEncoding(
    script.getAttribute('type')
  )
  return acexHtmlTextToBytes(payload, encoding)
}

/**
 * Parses `#mlcad-package` JSON as an embedded progressive package config.
 */
export function acexHtmlParseEmbeddedPackageConfig(
  raw: string | null | undefined
): AcExHtmlEmbeddedPackageConfig | null {
  const text = raw?.trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as Partial<AcExHtmlEmbeddedPackageConfig>
    if (parsed?.mode !== 'embedded') return null
    if (parsed.encrypted === true) {
      if (
        typeof (parsed as { encryptedManifest?: unknown }).encryptedManifest !==
        'string'
      ) {
        return null
      }
      return parsed as AcExHtmlEmbeddedPackageConfig
    }
    if (!(parsed as { manifest?: unknown }).manifest) return null
    return {
      mode: 'embedded',
      manifest: acexHtmlParsePackageManifest(
        (parsed as { manifest: unknown }).manifest
      )
    }
  } catch {
    return null
  }
}

/**
 * Collects embedded chunk script payloads into a path → bytes map.
 * Bytes are still ciphertext when scripts use the encrypted MIME type.
 *
 * Prefer {@link acexHtmlReadEmbeddedChunkFromDom} for the offline viewer so large
 * drawings do not decode every chunk into a resident Map at open time.
 */
export function acexHtmlCollectEmbeddedChunkBytes(
  root: ParentNode = document
): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>()
  const scripts = root.querySelectorAll(
    `script[${ACEX_EMBEDDED_CHUNK_HREF_ATTR}]`
  )
  scripts.forEach(script => {
    const href = script.getAttribute(ACEX_EMBEDDED_CHUNK_HREF_ATTR)?.trim()
    if (!href) return
    const bytes = decodeEmbeddedChunkScript(script)
    if (!bytes) return
    out.set(href, bytes)
  })
  return out
}

/**
 * Decodes one embedded chunk from an HTML `<script data-acex-href>` node.
 * Used for on-demand reload without keeping every gzip payload in a JS Map.
 */
export function acexHtmlReadEmbeddedChunkFromDom(
  href: string,
  root: ParentNode = document
): Uint8Array | undefined {
  const scripts = root.querySelectorAll(
    `script[${ACEX_EMBEDDED_CHUNK_HREF_ATTR}]`
  )
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]!
    const scriptHref = script.getAttribute(ACEX_EMBEDDED_CHUNK_HREF_ATTR)?.trim()
    if (scriptHref !== href) continue
    return decodeEmbeddedChunkScript(script)
  }
  return undefined
}

/**
 * Decodes one embedded chunk from `<script data-acex-href>` and removes the
 * script node from the DOM so its multi-megabyte text payload can be GC'd.
 *
 * The decoded bytes are returned for the caller to cache. Re-reading the same
 * href afterwards returns `undefined` because the node is gone — callers must
 * cache the bytes themselves (see {@link acexHtmlCreateDomEmbeddedPackageFetch}).
 */
export function acexHtmlConsumeEmbeddedChunkFromDom(
  href: string,
  root: ParentNode = document
): Uint8Array | undefined {
  const scripts = root.querySelectorAll(
    `script[${ACEX_EMBEDDED_CHUNK_HREF_ATTR}]`
  )
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]!
    const scriptHref = script.getAttribute(ACEX_EMBEDDED_CHUNK_HREF_ATTR)?.trim()
    if (scriptHref !== href) continue
    const bytes = decodeEmbeddedChunkScript(script)
    if (!bytes) return undefined
    // Detach the script node after decoding so a decode failure leaves the
    // node in the DOM for inspection or retry.
    script.remove()
    return bytes
  }
  return undefined
}

/**
 * Creates a fetch for an embedded package that reads each chunk from the HTML
 * document once, decodes it, caches the bytes, and removes the `<script>` node
 * so the multi-megabyte text payload can be garbage collected.
 *
 * Subsequent reads (layout switches, OSNAP rebuilds) are served from the
 * in-memory byte cache, so progressive rendering and re-fetch on layout
 * switch keep working without keeping the DOM text alive.
 */
export function acexHtmlCreateDomEmbeddedPackageFetch(options: {
  manifest: AcExHtmlPackageManifest
  decryptKey?: CryptoKey | null
  root?: ParentNode
}): { manifestUrl: string; fetchImpl: typeof fetch } {
  const root = options.root ?? document
  const chunkBytesCache = new Map<string, Uint8Array>()
  return acexHtmlCreateEmbeddedPackageFetch({
    manifest: options.manifest,
    decryptKey: options.decryptKey,
    getChunk: async href => {
      const cached = chunkBytesCache.get(href)
      if (cached) return cached
      const bytes = acexHtmlConsumeEmbeddedChunkFromDom(href, root)
      if (bytes) chunkBytesCache.set(href, bytes)
      return bytes
    }
  })
}

/**
 * Creates an in-memory (or getter-backed) fetch for an embedded package.
 * When `decryptKey` is set, chunk bodies are decrypted on each fetch.
 *
 * Prefer {@link acexHtmlCreateDomEmbeddedPackageFetch} in the offline viewer.
 * The `chunkBytes` Map path remains for tests.
 */
export function acexHtmlCreateEmbeddedPackageFetch(options: {
  manifest: AcExHtmlPackageManifest
  chunkBytes?: Map<string, Uint8Array>
  /**
   * Async chunk resolver. When set, takes precedence over {@link chunkBytes}.
   */
  getChunk?: (href: string) => Promise<Uint8Array | undefined>
  decryptKey?: CryptoKey | null
  /**
   * When using {@link chunkBytes}, delete each entry after a successful read.
   * Defaults to `true`.
   */
  consumeOnFetch?: boolean
}): { manifestUrl: string; fetchImpl: typeof fetch } {
  const manifestFileName = ACEX_DEFAULT_MANIFEST_FILE
  const manifestUrl = new URL(
    manifestFileName,
    ACEX_PACKAGE_DIRECTORY_ORIGIN
  ).toString()
  const origin = new URL(ACEX_PACKAGE_DIRECTORY_ORIGIN).origin
  const manifestText = `${JSON.stringify(options.manifest)}\n`
  const decryptKey = options.decryptKey ?? null
  const consumeOnFetch = options.consumeOnFetch !== false
  const chunkBytes = options.chunkBytes
  const getChunk = options.getChunk

  const fetchImpl: typeof fetch = async input => {
    const url = new URL(String(input))
    if (url.origin !== origin) {
      return new Response(null, { status: 404 })
    }
    const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    if (rel === manifestFileName) {
      return new Response(manifestText, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let stored: Uint8Array | undefined
    if (getChunk) {
      stored = await getChunk(rel)
    } else if (chunkBytes) {
      stored = chunkBytes.get(rel)
    }
    if (!stored) {
      return new Response(null, { status: 404 })
    }

    const bytes = decryptKey
      ? await acexHtmlDecryptBytes(decryptKey, stored)
      : stored
    if (consumeOnFetch && chunkBytes) {
      chunkBytes.delete(rel)
    }
    return new Response(bytes as BlobPart, { status: 200 })
  }

  return { manifestUrl, fetchImpl }
}

/**
 * Decrypts an embedded encrypted manifest with the derived access key.
 */
export async function acexHtmlDecryptEmbeddedManifest(
  encryptedManifestBase64: string,
  key: CryptoKey
): Promise<AcExHtmlPackageManifest> {
  const plain = await acexHtmlDecryptBytes(
    key,
    acexHtmlBase64ToBytes(encryptedManifestBase64)
  )
  const text = new TextDecoder().decode(plain)
  return acexHtmlParsePackageManifest(JSON.parse(text))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtmlAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function escapeInlineScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

function escapeInlineJson(json: string): string {
  return json.replace(/</g, '\\u003c')
}
