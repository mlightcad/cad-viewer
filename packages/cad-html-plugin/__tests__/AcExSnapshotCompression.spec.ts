import { gzip, gzipSync } from 'node:zlib'

import {
  ACEX_MAX_COMPRESSED_BYTES,
  ACEX_MAX_DECOMPRESSED_BYTES,
  ACEX_SNAPSHOT_COMPRESSION,
  compressSnapshotBinary,
  compressSnapshotBinaryAsync,
  decompressSnapshotBinary,
  setAcExSnapshotCompressor
} from '@mlightcad/cad-html-core'

describe('AcExSnapshotCompression', () => {
  afterEach(() => {
    setAcExSnapshotCompressor(null)
  })

  it('compresses exports with gzip', () => {
    const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const compressed = compressSnapshotBinary(input)
    expect(compressed.compression).toBe(ACEX_SNAPSHOT_COMPRESSION)
    expect(Array.from(decompressSnapshotBinary(compressed.bytes))).toEqual(
      Array.from(input)
    )
  })

  it('rejects compressed input above the hard cap without inflating', () => {
    const oversized = new Uint8Array(ACEX_MAX_COMPRESSED_BYTES + 1)
    expect(() => decompressSnapshotBinary(oversized)).toThrow(
      'Compressed payload exceeds size limit'
    )
  })

  it('allows CAD-scale decompressed snapshots below the hard cap', () => {
    // ~80 MiB was a common failure mode under the former 64 MiB ceiling.
    expect(ACEX_MAX_DECOMPRESSED_BYTES).toBeGreaterThan(80 * 1024 * 1024)
    expect(ACEX_MAX_COMPRESSED_BYTES).toBeGreaterThan(40 * 1024 * 1024)
  })

  it('round-trips an installed node zlib compressor', async () => {
    const input = new Uint8Array(64 * 1024)
    for (let i = 0; i < input.length; i++) input[i] = i & 0xff
    setAcExSnapshotCompressor({
      gzipSync: data => gzipSync(data),
      gzip: data =>
        new Promise((resolve, reject) => {
          gzip(data, (error, result) => {
            if (error) reject(error)
            else resolve(result)
          })
        })
    })

    const sync = compressSnapshotBinary(input)
    expect(Array.from(decompressSnapshotBinary(sync.bytes))).toEqual(
      Array.from(input)
    )
    const asyncResult = await compressSnapshotBinaryAsync(input)
    expect(Array.from(decompressSnapshotBinary(asyncResult.bytes))).toEqual(
      Array.from(input)
    )
  })
})
