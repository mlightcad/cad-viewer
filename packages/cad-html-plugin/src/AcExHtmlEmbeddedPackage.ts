/**
 * Self-contained HTML with embedded progressive ACEX chunks.
 *
 * Small drawings stay on a monolithic `#mlcad-snapshot`. Large drawings embed
 * the same ACEC/ACEO chunks used by multi-file packages so the offline viewer
 * can inflate and paint one chunk at a time. Password protection encrypts the
 * manifest and each chunk independently (shared PBKDF2 salt / AES-GCM key).
 */

import {
  estimateLineBatchBytes,
  estimateMeshBatchBytes
} from './AcExBatchBinaryCodec'
import {
  type AcExHtmlAccessManifest,
  acExHtmlBase64ToBytes,
  acExHtmlBytesToBase64,
  buildAcExHtmlAccessManifest,
  createAcExHtmlAccessKey,
  decryptAcExHtmlBytes,
  encryptAcExHtmlBytes
} from './AcExHtmlAccess'
import { resolveAcExHtmlLocale } from './AcExHtmlI18n'
import {
  ACEX_DEFAULT_MANIFEST_FILE,
  ACEX_PACKAGE_DIRECTORY_ORIGIN
} from './AcExHtmlPackageBootstrap'
import { ACEX_HTML_SHELL_CSS, buildAcExHtmlShellBody } from './AcExHtmlShell'
import { estimateOsnapPrimitiveBytes } from './AcExOsnapCatalogCodec'
import {
  type AcExBuildPackageDataOptions,
  buildAcExPackageData
} from './AcExPackageBuilder'
import { parseAcExPackageManifest } from './AcExPackageLoader'
import {
  ACEX_EMBEDDED_CHUNK_MAX_BYTES,
  ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES,
  ACEX_EMBEDDED_OSNAP_CHUNK_MAX_BYTES,
  type AcExPackageFile,
  type AcExPackageManifest
} from './AcExPackageTypes'
import type { AcExSnapshot } from './AcExSnapshotTypes'

/** MIME type for embedded chunk `<script>` bodies (base64 gzip ACEC/ACEO). */
export const ACEX_EMBEDDED_CHUNK_MIME =
  'application/vnd.mlightcad.acex-chunk;base64'

/** MIME type when each chunk body is AES-GCM wrapped (`iv||ciphertext` base64). */
export const ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME =
  'application/vnd.mlightcad.acex-chunk+aes-gcm;base64'

/** Attribute that maps an embedded script to a package-relative chunk href. */
export const ACEX_EMBEDDED_CHUNK_HREF_ATTR = 'data-acex-href'

/**
 * `#mlcad-package` config when geometry is embedded for progressive paint.
 */
export type AcExEmbeddedPackageConfig =
  | {
      mode: 'embedded'
      encrypted?: false
      manifest: AcExPackageManifest
    }
  | {
      mode: 'embedded'
      encrypted: true
      /** Base64 AES-GCM (`iv||ciphertext`) of UTF-8 manifest JSON. */
      encryptedManifest: string
    }

export interface AcExPackHtmlEmbeddedOptions {
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
export function estimateAcExSnapshotGeometryBytes(
  snapshot: AcExSnapshot
): number {
  let total = 0
  for (const layout of snapshot.layouts) {
    for (const batch of layout.lineBatches) {
      total += estimateLineBatchBytes(batch)
    }
    for (const batch of layout.meshBatches) {
      total += estimateMeshBatchBytes(batch)
    }
    const primitives = layout.osnap?.primitives
    if (primitives) {
      for (const primitive of primitives) {
        total += estimateOsnapPrimitiveBytes(primitive)
      }
    }
  }
  return total
}

/**
 * Returns true when self-contained HTML should embed progressive chunks.
 */
export function shouldEmbedAcExChunks(
  snapshot: AcExSnapshot,
  thresholdBytes: number = ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES
): boolean {
  return estimateAcExSnapshotGeometryBytes(snapshot) >= thresholdBytes
}

/**
 * Builds a self-contained HTML document with an embedded progressive package.
 * Chunks use a larger size budget than hosted multi-file packages.
 */
export async function packHtmlEmbeddedPackage(
  snapshot: AcExSnapshot,
  options: AcExPackHtmlEmbeddedOptions
): Promise<string> {
  const title = options.title ?? snapshot.meta.title ?? 'CAD Drawing'
  const runtime = options.viewerRuntime
  const loadingBg = `#${snapshot.meta.background.toString(16).padStart(6, '0')}`
  const htmlLang = resolveAcExHtmlLocale(snapshot.meta.locale) ?? 'en'
  const viewerMode = snapshot.meta.viewerMode ?? 'measure'
  const exportLayouts = snapshot.meta.exportLayouts !== false
  const expiresAt = options.expiresAt ?? null
  const password = options.password?.trim() || undefined

  const dataOptions: AcExBuildPackageDataOptions = {
    maxChunkBytes: options.maxChunkBytes ?? ACEX_EMBEDDED_CHUNK_MAX_BYTES,
    maxBatchBytes:
      options.maxBatchBytes ??
      options.maxChunkBytes ??
      ACEX_EMBEDDED_CHUNK_MAX_BYTES,
    maxOsnapChunkBytes:
      options.maxOsnapChunkBytes ?? ACEX_EMBEDDED_OSNAP_CHUNK_MAX_BYTES
  }
  const pkg = buildAcExPackageData(snapshot, dataOptions)

  let accessManifest: AcExHtmlAccessManifest | undefined
  let packageConfig: AcExEmbeddedPackageConfig
  let chunkScripts: string

  if (password) {
    const { key, salt } = await createAcExHtmlAccessKey(password)
    accessManifest = buildAcExHtmlAccessManifest({
      expiresAt,
      password,
      salt
    })
    const manifestPlain = new TextEncoder().encode(
      `${JSON.stringify(pkg.manifest)}\n`
    )
    const encryptedManifest = await encryptAcExHtmlBytes(key, manifestPlain)
    packageConfig = {
      mode: 'embedded',
      encrypted: true,
      encryptedManifest: acExHtmlBytesToBase64(encryptedManifest)
    }
    chunkScripts = await buildEncryptedChunkScripts(pkg.files, key)
  } else {
    accessManifest = buildAcExHtmlAccessManifest({ expiresAt })
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
${buildAcExHtmlShellBody(loadingBg, viewerMode, exportLayouts)}
${accessScript}  <script id="mlcad-package" type="application/json">${escapeInlineJson(
    JSON.stringify(packageConfig)
  )}</script>
${chunkScripts}  <script>${escapeInlineScript(runtime)}</script>
</body>
</html>`
}

function buildPlainChunkScripts(files: AcExPackageFile[]): string {
  const parts: string[] = []
  for (const file of files) {
    if (file.path === ACEX_DEFAULT_MANIFEST_FILE) continue
    parts.push(
      `  <script type="${ACEX_EMBEDDED_CHUNK_MIME}" ${ACEX_EMBEDDED_CHUNK_HREF_ATTR}="${escapeHtmlAttr(
        file.path
      )}">${acExHtmlBytesToBase64(file.bytes)}</script>\n`
    )
  }
  return parts.join('')
}

async function buildEncryptedChunkScripts(
  files: AcExPackageFile[],
  key: CryptoKey
): Promise<string> {
  const parts: string[] = []
  for (const file of files) {
    if (file.path === ACEX_DEFAULT_MANIFEST_FILE) continue
    const encrypted = await encryptAcExHtmlBytes(key, file.bytes)
    parts.push(
      `  <script type="${ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME}" ${ACEX_EMBEDDED_CHUNK_HREF_ATTR}="${escapeHtmlAttr(
        file.path
      )}">${acExHtmlBytesToBase64(encrypted)}</script>\n`
    )
  }
  return parts.join('')
}

/**
 * Parses `#mlcad-package` JSON as an embedded progressive package config.
 */
export function parseAcExEmbeddedPackageConfig(
  raw: string | null | undefined
): AcExEmbeddedPackageConfig | null {
  const text = raw?.trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as Partial<AcExEmbeddedPackageConfig>
    if (parsed?.mode !== 'embedded') return null
    if (parsed.encrypted === true) {
      if (
        typeof (parsed as { encryptedManifest?: unknown }).encryptedManifest !==
        'string'
      ) {
        return null
      }
      return parsed as AcExEmbeddedPackageConfig
    }
    if (!(parsed as { manifest?: unknown }).manifest) return null
    return {
      mode: 'embedded',
      manifest: parseAcExPackageManifest(
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
 */
export function collectAcExEmbeddedChunkBytes(
  root: ParentNode = document
): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>()
  const scripts = root.querySelectorAll(
    `script[${ACEX_EMBEDDED_CHUNK_HREF_ATTR}]`
  )
  scripts.forEach(script => {
    const href = script.getAttribute(ACEX_EMBEDDED_CHUNK_HREF_ATTR)?.trim()
    if (!href) return
    const payload = script.textContent?.trim() ?? ''
    if (!payload) return
    out.set(href, acExHtmlBase64ToBytes(payload))
  })
  return out
}

/**
 * Creates an in-memory fetch for an embedded package.
 * When `decryptKey` is set, chunk bodies are decrypted on each fetch.
 *
 * Pass a mutable {@link Map} for `chunkBytes`. When `consumeOnFetch` is true
 * (default), each successful chunk read is removed from the map so compressed
 * payloads do not stay resident after decode. Keep `consumeOnFetch: false`
 * when the viewer may unload and reload layouts (multi-layout switching).
 */
export function createAcExEmbeddedPackageFetch(options: {
  manifest: AcExPackageManifest
  chunkBytes: Map<string, Uint8Array>
  decryptKey?: CryptoKey | null
  /**
   * When true, delete each chunk from `chunkBytes` after a successful read.
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
    const stored = chunkBytes.get(rel)
    if (!stored) {
      return new Response(null, { status: 404 })
    }
    // Decrypt yields a fresh buffer; otherwise reuse the map entry and avoid
    // an extra full-chunk copy on the progressive-load hot path.
    const bytes = decryptKey
      ? await decryptAcExHtmlBytes(decryptKey, stored)
      : stored
    if (consumeOnFetch) {
      chunkBytes.delete(rel)
    }
    return new Response(bytes as BlobPart, { status: 200 })
  }

  return { manifestUrl, fetchImpl }
}

/**
 * Decrypts an embedded encrypted manifest with the derived access key.
 */
export async function decryptAcExEmbeddedManifest(
  encryptedManifestBase64: string,
  key: CryptoKey
): Promise<AcExPackageManifest> {
  const plain = await decryptAcExHtmlBytes(
    key,
    acExHtmlBase64ToBytes(encryptedManifestBase64)
  )
  const text = new TextDecoder().decode(plain)
  return parseAcExPackageManifest(JSON.parse(text))
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
