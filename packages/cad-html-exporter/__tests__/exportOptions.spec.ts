import { resolveAcExHtmlPackageBuildOptions } from '../src/exportOptions'

describe('resolveAcExHtmlPackageBuildOptions', () => {
  it('defaults chunks to 10 MiB and gzip', () => {
    const build = resolveAcExHtmlPackageBuildOptions()
    expect(build.maxChunkBytes).toBe(10 * 1024 * 1024)
    expect(build.maxBatchBytes).toBe(build.maxChunkBytes)
    expect(build.maxOsnapChunkBytes).toBe(build.maxChunkBytes)
    expect(build.compressChunks).toBe(true)
  })

  it('honors chunk size and uncompressed chunks', () => {
    const build = resolveAcExHtmlPackageBuildOptions({
      maxChunkBytes: 4 * 1024 * 1024,
      compressChunks: false
    })
    expect(build.maxChunkBytes).toBe(4 * 1024 * 1024)
    expect(build.maxBatchBytes).toBe(4 * 1024 * 1024)
    expect(build.maxOsnapChunkBytes).toBe(4 * 1024 * 1024)
    expect(build.compressChunks).toBe(false)
  })

  it('clamps chunk size to 1–64 MiB', () => {
    expect(
      resolveAcExHtmlPackageBuildOptions({ maxChunkBytes: 100 }).maxChunkBytes
    ).toBe(1024 * 1024)
    expect(
      resolveAcExHtmlPackageBuildOptions({
        maxChunkBytes: 128 * 1024 * 1024
      }).maxChunkBytes
    ).toBe(64 * 1024 * 1024)
  })
})
