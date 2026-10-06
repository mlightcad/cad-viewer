import { strToU8 } from 'fflate'

import {
  ACEX_DEFAULT_MANIFEST_FILE,
  ACEX_DEFAULT_MANIFEST_HREF,
  ACEX_PACKAGE_DIRECTORY_ORIGIN,
  acexGlobalFetch,
  buildPackageDirectoryFileMap,
  canOpenLocalPackageFolder,
  chooseInitialManifestHref,
  createPackageDirectoryFetch,
  detectLocalFolderOpenSupport,
  detectSharedDirectoryRoot,
  isAbsoluteHttpUrl,
  normalizePackageDirectoryPath,
  probePackageManifest,
  readManifestUrlFromSearchParams,
  resolveViewerManifestUrl
} from '../src/AcExHtmlPackageBootstrap'
import { ACEX_PACKAGE_VERSION } from '../src/AcExPackageTypes'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'

function validManifestJson(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    format: 'acex-package',
    packageVersion: ACEX_PACKAGE_VERSION,
    snapshotVersion: ACEX_SNAPSHOT_VERSION,
    meta: {
      title: 'demo',
      createdAt: '2026-01-01T00:00:00.000Z',
      extents: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      viewExtents: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
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
    activeLayoutBtrId: 'ms',
    layouts: [
      {
        btrId: 'ms',
        name: '*Model_Space',
        isModelSpace: true,
        chunkIds: []
      }
    ],
    chunks: [],
    ...overrides
  })
}

describe('AcExHtmlPackageBootstrap', () => {
  it('exposes a fetch wrapper that can be called without a Window receiver', async () => {
    const original = globalThis.fetch
    const calls: unknown[] = []
    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(String(input))
      return Promise.resolve(new Response('ok', { status: 200 }))
    }) as typeof fetch
    try {
      const detached = acexGlobalFetch
      const response = await detached('https://cdn.example/drawing.acex.json')
      expect(response.status).toBe(200)
      expect(calls).toEqual(['https://cdn.example/drawing.acex.json'])
    } finally {
      globalThis.fetch = original
    }
  })

  it('detects local folder open support with secure-context and webkitdirectory fallbacks', () => {
    expect(
      detectLocalFolderOpenSupport({
        hasDirectoryPicker: true,
        isSecureContext: true,
        supportsWebkitDirectoryAttribute: false
      })
    ).toEqual({ directoryPicker: true, webkitDirectory: false })

    expect(
      detectLocalFolderOpenSupport({
        hasDirectoryPicker: true,
        isSecureContext: false,
        supportsWebkitDirectoryAttribute: true
      })
    ).toEqual({ directoryPicker: false, webkitDirectory: true })

    expect(
      detectLocalFolderOpenSupport({
        hasDirectoryPicker: false,
        isSecureContext: true,
        supportsWebkitDirectoryAttribute: false
      })
    ).toEqual({ directoryPicker: false, webkitDirectory: false })

    expect(
      canOpenLocalPackageFolder({
        directoryPicker: false,
        webkitDirectory: true
      })
    ).toBe(true)
    expect(
      canOpenLocalPackageFolder({
        directoryPicker: false,
        webkitDirectory: false
      })
    ).toBe(false)
  })

  it('reads manifest URL from query parameters', () => {
    expect(
      readManifestUrlFromSearchParams(
        '?manifest=https://cdn.example/pkg/drawing.acex.json'
      )
    ).toBe('https://cdn.example/pkg/drawing.acex.json')
    expect(
      readManifestUrlFromSearchParams('?acex=./other.acex.json&x=1')
    ).toBe('./other.acex.json')
    expect(readManifestUrlFromSearchParams('?foo=bar')).toBeNull()
  })

  it('prefers query over config over sibling default', () => {
    expect(
      chooseInitialManifestHref({
        search: '?manifest=https://cdn.example/a.acex.json',
        configManifestUrl: './legacy.acex.json'
      })
    ).toEqual({
      href: 'https://cdn.example/a.acex.json',
      fromQuery: true
    })
    expect(
      chooseInitialManifestHref({
        search: '',
        configManifestUrl: './legacy.acex.json'
      })
    ).toEqual({ href: './legacy.acex.json', fromQuery: false })
    expect(chooseInitialManifestHref({})).toEqual({
      href: ACEX_DEFAULT_MANIFEST_HREF,
      fromQuery: false
    })
  })

  it('resolves absolute and relative viewer manifest URLs', () => {
    expect(isAbsoluteHttpUrl('https://cdn.example/drawing.acex.json')).toBe(
      true
    )
    expect(
      resolveViewerManifestUrl(
        'https://cdn.example/pkg/drawing.acex.json',
        'https://viewer.example/app/viewer.html'
      )
    ).toBe('https://cdn.example/pkg/drawing.acex.json')
    expect(
      resolveViewerManifestUrl(
        ACEX_DEFAULT_MANIFEST_HREF,
        'https://cdn.example/pkg/viewer.html'
      )
    ).toBe('https://cdn.example/pkg/drawing.acex.json')
    expect(() =>
      resolveViewerManifestUrl(
        'https://evil.example/x',
        'https://cdn.example/pkg/viewer.html'
      )
    ).not.toThrow()
  })

  it('probes manifest success, not-found, and unsupported version', async () => {
    const okFetch: typeof fetch = async () =>
      new Response(validManifestJson(), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    const ok = await probePackageManifest(
      'https://cdn.example/drawing.acex.json',
      okFetch
    )
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.manifest.format).toBe('acex-package')
    }

    const missing = await probePackageManifest(
      'https://cdn.example/drawing.acex.json',
      async () => new Response(null, { status: 404 })
    )
    expect(missing).toMatchObject({ ok: false, reason: 'not-found' })

    const badVersion = await probePackageManifest(
      'https://cdn.example/drawing.acex.json',
      async () =>
        new Response(validManifestJson({ packageVersion: 999 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
    )
    expect(badVersion).toMatchObject({ ok: false, reason: 'invalid' })
    if (!badVersion.ok) {
      expect(badVersion.error.message).toMatch(/package version/i)
    }
  })

  it('normalizes webkitdirectory paths and serves via directory fetch', async () => {
    expect(
      detectSharedDirectoryRoot([
        'canteen/drawing.acex.json',
        'canteen/chunks/L0-000.acex.gz'
      ])
    ).toBe('canteen')
    expect(
      normalizePackageDirectoryPath(
        'canteen/chunks/L0-000.acex.gz',
        'canteen'
      )
    ).toBe('chunks/L0-000.acex.gz')

    const files = buildPackageDirectoryFileMap([
      {
        relativePath: 'pkg/drawing.acex.json',
        bytes: strToU8(validManifestJson())
      },
      {
        relativePath: 'pkg/chunks/L0-000.acex.gz',
        bytes: new Uint8Array([1, 2, 3])
      }
    ])
    expect(files.has(ACEX_DEFAULT_MANIFEST_FILE)).toBe(true)
    expect(files.has('chunks/L0-000.acex.gz')).toBe(true)

    const { manifestUrl, fetchImpl } = createPackageDirectoryFetch(files)
    expect(manifestUrl.startsWith(ACEX_PACKAGE_DIRECTORY_ORIGIN)).toBe(true)

    const probed = await probePackageManifest(manifestUrl, fetchImpl)
    expect(probed.ok).toBe(true)

    const chunk = await fetchImpl(
      new URL('chunks/L0-000.acex.gz', ACEX_PACKAGE_DIRECTORY_ORIGIN).toString()
    )
    expect(chunk.status).toBe(200)
    expect(new Uint8Array(await chunk.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    )
  })

  it('rejects a folder map without drawing.acex.json', () => {
    expect(() =>
      createPackageDirectoryFetch(
        new Map([['readme.txt', strToU8('hi')]])
      )
    ).toThrow(/drawing\.acex\.json/)
  })
})
