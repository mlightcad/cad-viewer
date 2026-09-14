import { TextDecoder, TextEncoder } from 'node:util'

import { decodeChunkGzip } from '../src/AcExChunkBinaryCodec'
import {
  createAcExHtmlAccessKey,
  decryptAcExHtmlBytes
} from '../src/AcExHtmlAccess'
import {
  ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME,
  ACEX_EMBEDDED_CHUNK_HREF_ATTR,
  ACEX_EMBEDDED_CHUNK_MIME,
  createAcExEmbeddedPackageFetch,
  decryptAcExEmbeddedManifest,
  estimateAcExSnapshotGeometryBytes,
  packHtmlEmbeddedPackage,
  parseAcExEmbeddedPackageConfig,
  shouldEmbedAcExChunks
} from '../src/AcExHtmlEmbeddedPackage'
import { loadAcExPackage } from '../src/AcExPackageLoader'
import {
  ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES,
  ACEX_SNAPSHOT_VERSION
} from '../src/AcExPackageTypes'
import type { AcExSnapshot } from '../src/AcExSnapshotTypes'

// Node/Jest may omit Web Text* globals depending on the environment.
Object.assign(globalThis, { TextEncoder, TextDecoder })

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

function extractPackageConfig(html: string) {
  const match = html.match(
    /<script id="mlcad-package" type="application\/json">([\s\S]*?)<\/script>/
  )
  return parseAcExEmbeddedPackageConfig(match?.[1])
}

function extractAccessSalt(html: string): string {
  const match = html.match(
    /<script id="mlcad-access" type="application\/json">([\s\S]*?)<\/script>/
  )
  const access = JSON.parse(match?.[1] ?? '{}') as { salt?: string }
  if (!access.salt) {
    throw new Error('missing access salt')
  }
  return access.salt
}

function extractEmbeddedChunkBytes(html: string): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>()
  const re = new RegExp(
    `<script type="[^"]+" ${ACEX_EMBEDDED_CHUNK_HREF_ATTR}="([^"]+)">([A-Za-z0-9+/=\\s]+)<\\/script>`,
    'g'
  )
  for (const match of html.matchAll(re)) {
    const href = match[1]!
    const payload = match[2]!.replace(/\s+/g, '')
    const binary = Buffer.from(payload, 'base64')
    out.set(href, new Uint8Array(binary))
  }
  return out
}

function makeSnapshot(options?: {
  lineCount?: number
  positionsPerLine?: number
}): AcExSnapshot {
  const lineCount = options?.lineCount ?? 2
  const positionsPerLine = options?.positionsPerLine ?? 6
  const lineBatches = Array.from({ length: lineCount }, (_, i) => ({
    layer: '0',
    color: 0xff0000 + i,
    offset: [0, 0, 0] as [number, number, number],
    positions: f32(Array.from({ length: positionsPerLine }, (_, j) => j))
  }))

  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta: {
      title: 'embedded-demo',
      createdAt: '2026-01-01T00:00:00.000Z',
      extents: { minX: 0, minY: 0, maxX: 100, maxY: 50 },
      viewExtents: { minX: 0, minY: 0, maxX: 100, maxY: 50 },
      units: {
        insunits: 4,
        lunits: 2,
        luprec: 4,
        aunits: 0,
        auprec: 0,
        measurement: 1,
        ltscale: 1,
        angbase: 0,
        angdir: 0
      },
      background: 0,
      viewerMode: 'view',
      exportLayouts: true
    },
    layers: [{ name: '0', color: 0xffffff, visible: true }],
    layouts: [
      {
        btrId: 'ms',
        name: '*Model_Space',
        isModelSpace: true,
        lineBatches,
        meshBatches: []
      }
    ],
    activeLayoutBtrId: 'ms'
  }
}

describe('AcExHtmlEmbeddedPackage', () => {
  it('keeps small drawings on the monolithic path by default', () => {
    const snapshot = makeSnapshot()
    expect(estimateAcExSnapshotGeometryBytes(snapshot)).toBeLessThan(
      ACEX_EMBEDDED_CHUNK_THRESHOLD_BYTES
    )
    expect(shouldEmbedAcExChunks(snapshot)).toBe(false)
  })

  it('switches to embedded chunks when geometry exceeds the threshold', () => {
    // ~9 MiB of float positions → over the 8 MiB threshold
    const positionsPerLine = Math.ceil((9 * 1024 * 1024) / 4)
    const snapshot = makeSnapshot({ lineCount: 1, positionsPerLine })
    expect(shouldEmbedAcExChunks(snapshot)).toBe(true)
  })

  it('packs embedded HTML and loads geometry progressively without a password', async () => {
    const snapshot = makeSnapshot({
      lineCount: 8,
      positionsPerLine: 6
    })
    const html = await packHtmlEmbeddedPackage(snapshot, {
      viewerRuntime: '/* runtime */',
      maxChunkBytes: 400,
      maxBatchBytes: 400
    })

    expect(html).toContain('id="mlcad-package"')
    expect(html).toContain('"mode":"embedded"')
    expect(html).toContain(ACEX_EMBEDDED_CHUNK_MIME)
    expect(html).toContain(ACEX_EMBEDDED_CHUNK_HREF_ATTR)
    expect(html).not.toContain('id="mlcad-snapshot"')

    const config = extractPackageConfig(html)
    expect(config?.mode).toBe('embedded')
    expect(config && !config.encrypted).toBe(true)
    if (!config || config.encrypted) {
      throw new Error('expected plaintext embedded config')
    }

    const chunkBytes = extractEmbeddedChunkBytes(html)
    expect(chunkBytes.size).toBeGreaterThan(1)
    expect(chunkBytes.size).toBe(config.manifest.chunks.length)

    const session = createAcExEmbeddedPackageFetch({
      manifest: config.manifest,
      chunkBytes
    })
    const loaded = await loadAcExPackage({
      manifestUrl: session.manifestUrl,
      fetchImpl: session.fetchImpl
    })
    expect(loaded.layouts[0]?.lineBatches.length).toBe(
      snapshot.layouts[0]!.lineBatches.length
    )
    // Default consumeOnFetch clears compressed payloads after progressive load.
    expect(chunkBytes.size).toBe(0)
  })

  it('keeps chunk bytes when consumeOnFetch is false for layout reload', async () => {
    const snapshot = makeSnapshot({
      lineCount: 4,
      positionsPerLine: 6
    })
    const html = await packHtmlEmbeddedPackage(snapshot, {
      viewerRuntime: '/* runtime */',
      maxChunkBytes: 400,
      maxBatchBytes: 400
    })
    const config = extractPackageConfig(html)
    if (!config || config.encrypted) {
      throw new Error('expected plaintext embedded config')
    }
    const chunkBytes = extractEmbeddedChunkBytes(html)
    const initialSize = chunkBytes.size
    expect(initialSize).toBeGreaterThan(0)

    const session = createAcExEmbeddedPackageFetch({
      manifest: config.manifest,
      chunkBytes,
      consumeOnFetch: false
    })
    await loadAcExPackage({
      manifestUrl: session.manifestUrl,
      fetchImpl: session.fetchImpl
    })
    expect(chunkBytes.size).toBe(initialSize)

    // Second load still works from the retained map.
    const again = await loadAcExPackage({
      manifestUrl: session.manifestUrl,
      fetchImpl: session.fetchImpl
    })
    expect(again.layouts[0]?.lineBatches.length).toBe(
      snapshot.layouts[0]!.lineBatches.length
    )
  })

  it('encrypts the manifest and each chunk independently', async () => {
    const snapshot = makeSnapshot({
      lineCount: 6,
      positionsPerLine: 6
    })
    const password = 'chunk-secret'
    const html = await packHtmlEmbeddedPackage(snapshot, {
      viewerRuntime: '/* runtime */',
      password,
      maxChunkBytes: 400,
      maxBatchBytes: 400
    })

    expect(html).toContain('id="mlcad-access"')
    expect(html).toContain('"encrypted":true')
    expect(html).toContain(ACEX_EMBEDDED_CHUNK_ENCRYPTED_MIME)
    expect(html).toContain('encryptedManifest')

    const config = extractPackageConfig(html)
    const salt = extractAccessSalt(html)
    expect(config?.encrypted).toBe(true)
    if (!config?.encrypted) {
      throw new Error('expected encrypted embedded config')
    }

    const { key } = await createAcExHtmlAccessKey(password, salt)
    const manifest = await decryptAcExEmbeddedManifest(
      config.encryptedManifest,
      key
    )
    expect(manifest.chunks.length).toBeGreaterThan(1)

    await expect(
      decryptAcExEmbeddedManifest(
        config.encryptedManifest,
        (await createAcExHtmlAccessKey('wrong', salt)).key
      )
    ).rejects.toThrow()

    const chunkBytes = extractEmbeddedChunkBytes(html)
    expect(chunkBytes.size).toBe(manifest.chunks.length)
    const firstHref = manifest.chunks[0]!.href
    const encrypted = chunkBytes.get(firstHref)!
    const plain = await decryptAcExHtmlBytes(key, encrypted)
    const decoded = decodeChunkGzip(plain)
    expect(decoded.layoutBtrId).toBe('ms')
    expect(decoded.lineBatches.length).toBeGreaterThan(0)

    const session = createAcExEmbeddedPackageFetch({
      manifest,
      chunkBytes,
      decryptKey: key
    })
    const loaded = await loadAcExPackage({
      manifestUrl: session.manifestUrl,
      fetchImpl: session.fetchImpl
    })
    expect(loaded.layouts[0]?.lineBatches.length).toBe(
      snapshot.layouts[0]!.lineBatches.length
    )
  })
})
