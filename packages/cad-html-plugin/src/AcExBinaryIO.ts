import { strFromU8, strToU8 } from 'fflate'

/** Hard cap for length-prefixed strings inside ACEX binary payloads. */
export const ACEX_MAX_BINARY_STRING_BYTES = 1 * 1024 * 1024

/**
 * Hard cap for a single length-prefixed typed-array payload (`Float32Array` /
 * `Uint32Array`). Large site plans can put tens of millions of vertices in one
 * line/mesh batch; keep this aligned with the ACEX decompressed payload ceiling
 * (`512 MiB`).
 */
export const ACEX_MAX_BINARY_ARRAY_BYTES = 512 * 1024 * 1024

/**
 * Little-endian binary writer used by ACEX snapshot and ACEC chunk codecs.
 * Geometry buffers are length-prefixed and 4-byte aligned.
 */
export class AcExBinaryWriter {
  private readonly chunks: Uint8Array[] = []
  private length = 0

  writeU8(value: number): void {
    const chunk = new Uint8Array(1)
    chunk[0] = value & 0xff
    this.chunks.push(chunk)
    this.length += 1
  }

  writeU32(value: number): void {
    const chunk = new Uint8Array(4)
    new DataView(chunk.buffer).setUint32(0, value >>> 0, true)
    this.chunks.push(chunk)
    this.length += 4
  }

  writeI32(value: number): void {
    const chunk = new Uint8Array(4)
    new DataView(chunk.buffer).setInt32(0, value | 0, true)
    this.chunks.push(chunk)
    this.length += 4
  }

  writeF32(value: number): void {
    const chunk = new Uint8Array(4)
    new DataView(chunk.buffer).setFloat32(0, value, true)
    this.chunks.push(chunk)
    this.length += 4
  }

  writeF64(value: number): void {
    const chunk = new Uint8Array(8)
    new DataView(chunk.buffer).setFloat64(0, value, true)
    this.chunks.push(chunk)
    this.length += 8
  }

  writeBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes)
    this.length += bytes.length
  }

  writeString(value: string): void {
    const bytes = strToU8(value)
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  writeJson(value: unknown): void {
    this.writeString(JSON.stringify(value))
  }

  writeFloat32Array(array: Float32Array): void {
    this.alignTo(4)
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    )
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  writeUint32Array(array: Uint32Array): void {
    this.alignTo(4)
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    )
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  private alignTo(alignment: number): void {
    const remainder = this.length % alignment
    if (remainder === 0) {
      return
    }
    const pad = alignment - remainder
    for (let i = 0; i < pad; i++) {
      this.writeU8(0)
    }
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.length)
    let offset = 0
    for (const chunk of this.chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }
}

/**
 * Little-endian binary reader paired with {@link AcExBinaryWriter}.
 */
export class AcExBinaryReader {
  private offset = 0

  constructor(private readonly bytes: Uint8Array) {}

  private ensureAvailable(byteCount: number): void {
    if (byteCount < 0 || !Number.isFinite(byteCount)) {
      throw new Error('Invalid binary length')
    }
    if (this.offset + byteCount > this.bytes.length) {
      throw new Error('Unexpected end of binary buffer')
    }
  }

  readU8(): number {
    this.ensureAvailable(1)
    return this.bytes[this.offset++]!
  }

  readU32(): number {
    this.ensureAvailable(4)
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4
    )
    const value = view.getUint32(0, true)
    this.offset += 4
    return value
  }

  readI32(): number {
    this.ensureAvailable(4)
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4
    )
    const value = view.getInt32(0, true)
    this.offset += 4
    return value
  }

  readF32(): number {
    this.ensureAvailable(4)
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      4
    )
    const value = view.getFloat32(0, true)
    this.offset += 4
    return value
  }

  readF64(): number {
    this.ensureAvailable(8)
    const view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset + this.offset,
      8
    )
    const value = view.getFloat64(0, true)
    this.offset += 8
    return value
  }

  readBytes(length: number): Uint8Array {
    this.ensureAvailable(length)
    const slice = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  readString(): string {
    const length = this.readU32()
    if (length === 0) {
      return ''
    }
    if (length > ACEX_MAX_BINARY_STRING_BYTES) {
      throw new Error('Binary string exceeds size limit')
    }
    return strFromU8(this.readBytes(length))
  }

  readJson<T>(): T {
    const text = this.readString()
    if (text.length === 0) {
      throw new Error('Expected JSON payload')
    }
    return JSON.parse(text) as T
  }

  private alignTo(alignment: number): void {
    const remainder = this.offset % alignment
    if (remainder === 0) {
      return
    }
    const pad = alignment - remainder
    this.ensureAvailable(pad)
    this.offset += pad
  }

  readFloat32Array(): Float32Array {
    this.alignTo(4)
    const byteLength = this.readU32()
    if (byteLength === 0) {
      return new Float32Array(0)
    }
    if (byteLength % 4 !== 0) {
      throw new Error('Invalid float32 buffer length')
    }
    if (byteLength > ACEX_MAX_BINARY_ARRAY_BYTES) {
      throw new Error('Float32 buffer exceeds size limit')
    }
    const bytes = this.readBytes(byteLength)
    if (bytes.byteOffset % 4 === 0) {
      return new Float32Array(bytes.buffer, bytes.byteOffset, byteLength / 4)
    }
    const copy = new ArrayBuffer(byteLength)
    new Uint8Array(copy).set(bytes)
    return new Float32Array(copy)
  }

  readUint32Array(): Uint32Array {
    this.alignTo(4)
    const byteLength = this.readU32()
    if (byteLength === 0) {
      return new Uint32Array(0)
    }
    if (byteLength % 4 !== 0) {
      throw new Error('Invalid uint32 buffer length')
    }
    if (byteLength > ACEX_MAX_BINARY_ARRAY_BYTES) {
      throw new Error('Uint32 buffer exceeds size limit')
    }
    const bytes = this.readBytes(byteLength)
    if (bytes.byteOffset % 4 === 0) {
      return new Uint32Array(bytes.buffer, bytes.byteOffset, byteLength / 4)
    }
    const copy = new ArrayBuffer(byteLength)
    new Uint8Array(copy).set(bytes)
    return new Uint32Array(copy)
  }
}
