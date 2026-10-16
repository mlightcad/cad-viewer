import { gzip, gzipSync } from 'node:zlib'

import { setAcExSnapshotCompressor } from '@mlightcad/cad-html-core'

let installed = false

/**
 * Installs Node `zlib` as the ACEX gzip codec.
 *
 * `gzip` runs on the libuv thread pool, so parallel chunk encodes overlap in
 * native code. Sync `gzipSync` covers the monolithic single-file snapshot.
 */
export function installNodeSnapshotCompressor(): void {
  if (installed) return
  installed = true
  setAcExSnapshotCompressor({
    gzipSync(data) {
      return toUint8Array(gzipSync(data))
    },
    gzip(data) {
      return new Promise((resolve, reject) => {
        gzip(data, (error, result) => {
          if (error) reject(error)
          else resolve(toUint8Array(result))
        })
      })
    }
  })
}

function toUint8Array(data: Buffer): Uint8Array {
  // Copy out of the Node buffer pool. zlib may return a pooled view, and
  // parallel chunk gzip would otherwise overwrite earlier payloads.
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy
}
