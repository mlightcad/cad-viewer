import { strFromU8, zipSync } from 'fflate'

import { buildAcExPackage, splitLayoutIntoSlices } from '../src/AcExPackageBuilder'
import {
  decodeChunkGzip,
  encodeChunkGzip
} from '../src/AcExChunkBinaryCodec'
import {
  isSafePackageHref,
  loadAcExPackage,
  parseAcExPackageManifest,
  resolveChunkUrl,
  resolvePackageManifestUrl,
  snapshotSkeletonFromManifest
} from '../src/AcExPackageLoader'
import {
  unzipAcExPackageFiles,
  zipAcExPackageFiles
} from '../src/AcExPackageZip'
import { ACEX_SNAPSHOT_VERSION } from '../src/AcExSnapshotTypes'
import type { AcExSnapshot } from '../src/AcExSnapshotTypes'

function f32(values: number[]): Float32Array {
  return Float32Array.from(values)
}

function makeSnapshot(): AcExSnapshot {
  return {
    version: ACEX_SNAPSHOT_VERSION,
    meta: {
      title: 'demo',
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
        lineBatches: [
          {
            layer: '0',
            color: 0xff0000,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 10, 0, 0])
          },
          {
            layer: '0',
            color: 0x00ff00,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 0, 10, 0])
          }
        ],
        meshBatches: [
          {
            layer: '0',
            color: 0x0000ff,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 1, 0, 0, 0, 1, 0]),
            indices: Uint32Array.from([0, 1, 2])
          }
        ]
      },
      {
        btrId: 'ps',
        name: 'Layout1',
        isModelSpace: false,
        lineBatches: [
          {
            layer: '0',
            color: 0xffffff,
            offset: [0, 0, 0],
            positions: f32([0, 0, 0, 5, 5, 0])
          }
        ],
        meshBatches: []
      }
    ],
    activeLayoutBtrId: 'ms'
  }
}

describe('AcEx package format', () => {
  it('round-trips a geometry chunk through gzip', () => {
    const chunk = {
      version: ACEX_SNAPSHOT_VERSION,
      layoutBtrId: 'ms',
      lineBatches: [
        {
          layer: '0',
          color: 1,
          offset: [1, 2, 3] as [number, number, number],
          positions: f32([0, 0, 0, 1, 1, 0])
        }
      ],
      meshBatches: []
    }
    const { compressed } = encodeChunkGzip(chunk)
    const decoded = decodeChunkGzip(compressed)
    expect(decoded.layoutBtrId).toBe('ms')
    expect(decoded.lineBatches[0]?.positions).toEqual(chunk.lineBatches[0]!.positions)
  })

  it('splits oversized layouts into multiple slices', () => {
    const layout = makeSnapshot().layouts[0]!
    const slices = splitLayoutIntoSlices(layout, 400)
    expect(slices.length).toBeGreaterThan(1)
    const lineCount = slices.reduce((n, s) => n + s.lineBatches.length, 0)
    const meshCount = slices.reduce((n, s) => n + s.meshBatches.length, 0)
    expect(lineCount).toBe(layout.lineBatches.length)
    expect(meshCount).toBe(layout.meshBatches.length)
  })

  it('builds a package and restores geometry via progressive fetch', async () => {
    const snapshot = makeSnapshot()
    const pkg = buildAcExPackage(snapshot, {
      viewerRuntime: '/* runtime */',
      baseName: 'demo',
      maxChunkBytes: 400
    })

    expect(pkg.manifest.format).toBe('acex-package')
    expect(pkg.manifest.packageVersion).toBe(1)
    expect(pkg.html).toContain('id="mlcad-package"')
    expect(pkg.html).toContain('demo.acex.json')
    expect(pkg.files.some(f => f.path === 'viewer.html')).toBe(true)
    expect(pkg.files.some(f => f.path === 'demo.acex.json')).toBe(true)
    expect(pkg.manifest.chunks.length).toBeGreaterThan(1)

    const fileMap = new Map(pkg.files.map(f => [f.path, f.bytes]))
    const fetchImpl: typeof fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      const path =
        [...fileMap.keys()].find(
          key => url === key || url.endsWith(`/${key}`) || url.endsWith(key)
        ) ?? null
      const bytes = path ? fileMap.get(path) : undefined
      if (!bytes || !path) {
        return new Response(null, { status: 404 })
      }
      if (path.endsWith('.json')) {
        return new Response(strFromU8(bytes), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      // Copy into a fresh ArrayBuffer so Response accepts the body type.
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return new Response(copy, { status: 200 })
    }

    const progresses: number[] = []
    const loaded = await loadAcExPackage({
      manifestUrl: 'https://cdn.example/demo.acex.json',
      fetchImpl,
      onChunk: (_layout, _chunk, progress) => {
        progresses.push(progress.loadedChunks)
      }
    })

    expect(progresses.length).toBe(pkg.manifest.chunks.length)
    expect(loaded.layouts[0]?.lineBatches.length).toBe(
      snapshot.layouts[0]!.lineBatches.length
    )
    expect(loaded.layouts[0]?.meshBatches.length).toBe(
      snapshot.layouts[0]!.meshBatches.length
    )
    expect(loaded.layouts[1]?.lineBatches.length).toBe(1)
  })

  it('zips and unzips package files without loss', () => {
    const pkg = buildAcExPackage(makeSnapshot(), {
      viewerRuntime: '/* runtime */',
      baseName: 'demo'
    })
    const zipped = zipAcExPackageFiles(pkg)
    const unzipped = unzipAcExPackageFiles(zipped)
    expect(unzipped.map(f => f.path).sort()).toEqual(
      pkg.files.map(f => f.path).sort()
    )
    for (const file of unzipped) {
      const original = pkg.files.find(f => f.path === file.path)!
      expect(Array.from(file.bytes)).toEqual(Array.from(original.bytes))
    }
  })

  it('parses manifest and builds an empty skeleton', () => {
    const pkg = buildAcExPackage(makeSnapshot(), {
      viewerRuntime: '/* runtime */',
      baseName: 'demo'
    })
    const manifest = parseAcExPackageManifest(pkg.manifest)
    const skeleton = snapshotSkeletonFromManifest(manifest)
    expect(skeleton.layouts[0]?.lineBatches).toEqual([])
    expect(skeleton.layouts[0]?.osnap).toBeUndefined()
    expect(skeleton.activeLayoutBtrId).toBe('ms')
  })

  it('sanitizes drawing titles with spaces and plus signs for zip-safe paths', () => {
    const pkg = buildAcExPackage(makeSnapshot(), {
      viewerRuntime: '/* runtime */',
      baseName: 'FJP-898E-G-_-V01 + 1'
    })
    expect(pkg.manifestFileName).toBe('FJP-898E-G-_-V01_1.acex.json')
    expect(isSafePackageHref(`./${pkg.manifestFileName}`)).toBe(true)
    expect(() => zipAcExPackageFiles(pkg)).not.toThrow()
  })

  it('rejects unsafe package hrefs and absolute chunk URLs', () => {
    expect(isSafePackageHref('./demo.acex.json')).toBe(true)
    expect(isSafePackageHref('chunks/L0-000.acex.gz')).toBe(true)
    expect(isSafePackageHref('https://evil.example/x')).toBe(false)
    expect(isSafePackageHref('../escape.acex.gz')).toBe(false)
    expect(isSafePackageHref('/abs.acex.gz')).toBe(false)

    expect(() =>
      resolveChunkUrl('https://cdn.example/pkg/demo.acex.json', 'chunks/a.acex.gz')
    ).not.toThrow()
    expect(() =>
      resolveChunkUrl(
        'https://cdn.example/pkg/demo.acex.json',
        'https://evil.example/x'
      )
    ).toThrow(/relative package path/)
    expect(() =>
      resolveChunkUrl('https://cdn.example/pkg/demo.acex.json', '../x.acex.gz')
    ).toThrow(/relative package path/)

    expect(
      resolvePackageManifestUrl('./demo.acex.json', 'https://cdn.example/pkg/viewer.html')
    ).toBe('https://cdn.example/pkg/demo.acex.json')
    expect(() =>
      resolvePackageManifestUrl(
        'https://evil.example/demo.acex.json',
        'https://cdn.example/pkg/viewer.html'
      )
    ).toThrow(/relative package path/)

    const pkg = buildAcExPackage(makeSnapshot(), {
      viewerRuntime: '/* runtime */',
      baseName: 'demo'
    })
    const evil = {
      ...pkg.manifest,
      chunks: [
        {
          ...pkg.manifest.chunks[0]!,
          href: 'https://evil.example/chunk.acex.gz'
        }
      ]
    }
    expect(() => parseAcExPackageManifest(evil)).toThrow(/chunk href/)
  })

  it('rejects zip-slip paths when unzipping', () => {
    const evil = zipSync({
      'chunks/ok.acex.gz': new Uint8Array([1, 2, 3]),
      '../escape.txt': new Uint8Array([4, 5, 6])
    })
    expect(() => unzipAcExPackageFiles(evil)).toThrow(/Unsafe path/)
  })

  it('stores OSNAP as multiple gzip ACEO chunks loaded after geometry', async () => {
    const snapshot = makeSnapshot()
    snapshot.meta.viewerMode = 'measure'
    snapshot.layouts[0]!.osnap = {
      primitives: Array.from({ length: 40 }, (_, i) => ({
        kind: 'circle' as const,
        layer: i % 2 === 0 ? '0' : 'A',
        cx: i,
        cy: 0,
        r: 1,
        normalSign: 1 as const
      }))
    }

    const pkg = buildAcExPackage(snapshot, {
      viewerRuntime: '/* runtime */',
      baseName: 'demo',
      // Force multiple OSNAP chunks.
      maxOsnapChunkBytes: 200
    })

    const layoutRef = pkg.manifest.layouts[0]!
    expect(layoutRef.osnapChunkIds!.length).toBeGreaterThan(1)
    expect(pkg.manifest.osnapChunks!.length).toBe(
      layoutRef.osnapChunkIds!.length
    )
    expect(JSON.stringify(pkg.manifest)).not.toContain('"primitives"')

    for (const id of layoutRef.osnapChunkIds!) {
      const ref = pkg.manifest.osnapChunks!.find(c => c.id === id)!
      const file = pkg.files.find(f => f.path === ref.href)!
      expect(file.bytes[0]).toBe(0x1f)
      expect(file.bytes[1]).toBe(0x8b)
    }

    const fileMap = new Map(pkg.files.map(f => [f.path, f.bytes]))
    const fetchImpl: typeof fetch = async (input: RequestInfo | URL) => {
      const url = String(input)
      const path =
        [...fileMap.keys()].find(
          key => url === key || url.endsWith(`/${key}`) || url.endsWith(key)
        ) ?? null
      const bytes = path ? fileMap.get(path) : undefined
      if (!bytes || !path) {
        return new Response(null, { status: 404 })
      }
      if (path.endsWith('.json')) {
        return new Response(strFromU8(bytes), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      return new Response(copy, { status: 200 })
    }

    const geometryOnly = await loadAcExPackage({
      manifestUrl: 'https://cdn.example/demo.acex.json',
      fetchImpl,
      loadOsnap: false
    })
    expect(geometryOnly.layouts[0]?.osnap).toBeUndefined()
    expect(geometryOnly.layouts[0]?.lineBatches.length).toBeGreaterThan(0)

    const loaded = await loadAcExPackage({
      manifestUrl: 'https://cdn.example/demo.acex.json',
      fetchImpl
    })
    expect(loaded.layouts[0]?.osnap?.primitives).toEqual(
      snapshot.layouts[0]!.osnap!.primitives
    )
  })
})
