import {
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
})
