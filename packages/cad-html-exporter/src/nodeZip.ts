import { promisify } from 'node:util'
import { constants, deflateRaw } from 'node:zlib'

const deflateRawAsync = promisify(deflateRaw)

const ZIP_LOCAL = 0x04034b50
const ZIP_CENTRAL = 0x02014b50
const ZIP_EOCD = 0x06054b50
const ZIP32_MAX = 0xffffffff

export interface AcExZipEntry {
  path: string
  bytes: Uint8Array
}

/**
 * Writes a ZIP archive with Node `zlib` raw deflate.
 *
 * Already-gzipped chunk payloads (`.gz`) are stored. Text entries such as
 * `viewer.html` and the manifest are deflated on the libuv thread pool.
 */
export async function zipPackageEntries(
  files: AcExZipEntry[]
): Promise<Uint8Array> {
  const encoded = await Promise.all(files.map(encodeZipEntry))

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of encoded) {
    const local = Buffer.alloc(30)
    local.writeUInt32LE(ZIP_LOCAL, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(entry.method, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(entry.crc, 14)
    local.writeUInt32LE(entry.compressed.byteLength, 18)
    local.writeUInt32LE(entry.uncompressedSize, 22)
    local.writeUInt16LE(entry.name.byteLength, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, entry.name, entry.compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(ZIP_CENTRAL, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(entry.method, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0, 14)
    central.writeUInt32LE(entry.crc, 16)
    central.writeUInt32LE(entry.compressed.byteLength, 20)
    central.writeUInt32LE(entry.uncompressedSize, 24)
    central.writeUInt16LE(entry.name.byteLength, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, entry.name)

    offset += 30 + entry.name.byteLength + entry.compressed.byteLength
    assertZip32(offset, 'ZIP archive')
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.byteLength, 0)
  assertZip32(centralSize, 'ZIP central directory')
  assertZip32(offset + centralSize, 'ZIP archive')

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(ZIP_EOCD, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(encoded.length, 8)
  eocd.writeUInt16LE(encoded.length, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  return concatBytes([...locals, ...centrals, eocd])
}

interface EncodedZipEntry {
  name: Buffer
  crc: number
  method: 0 | 8
  compressed: Uint8Array
  uncompressedSize: number
}

async function encodeZipEntry(file: AcExZipEntry): Promise<EncodedZipEntry> {
  if (!isSafePackagePath(file.path)) {
    throw new Error(`Unsafe package path: ${file.path}`)
  }
  const name = Buffer.from(file.path, 'utf8')
  if (name.byteLength > 0xffff) {
    throw new Error(`ZIP name exceeds limit: ${file.path}`)
  }
  assertZip32(file.bytes.byteLength, file.path)

  const store = file.path.endsWith('.gz')
  const compressed = store
    ? file.bytes
    : await deflateRawAsync(file.bytes, {
        level: constants.Z_DEFAULT_COMPRESSION
      })
  assertZip32(compressed.byteLength, file.path)

  return {
    name,
    crc: crc32(file.bytes),
    method: store ? 0 : 8,
    compressed,
    uncompressedSize: file.bytes.byteLength
  }
}

/** Rejects absolute paths, backslashes, and `..` segments in package-relative names. */
export function isSafePackagePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
    return false
  }
  const parts = path.split('/')
  return parts.every(
    part =>
      part.length > 0 &&
      part !== '.' &&
      part !== '..' &&
      /^[A-Za-z0-9._-]+$/.test(part)
  )
}

function assertZip32(size: number, label: string): void {
  if (size > ZIP32_MAX) {
    throw new Error(`${label} exceeds ZIP32 limit`)
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const part of parts) total += part.byteLength
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}
