import {
  ACEX_MAX_COMPRESSED_BYTES,
  ACEX_MAX_DECOMPRESSED_BYTES,
  ACEX_SNAPSHOT_COMPRESSION,
  compressSnapshotBinary,
  decompressSnapshotBinary
} from '../src/AcExSnapshotCompression'

describe('AcExSnapshotCompression', () => {
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
})
