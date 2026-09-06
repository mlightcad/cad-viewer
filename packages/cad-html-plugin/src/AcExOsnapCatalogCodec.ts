import { AcExBinaryReader, AcExBinaryWriter } from './AcExBinaryIO'
import type {
  AcExOsnapCatalog,
  AcExOsnapPrimitive
} from './AcExOsnapPrimitiveTypes'
import {
  compressSnapshotBinary,
  decompressSnapshotBinary
} from './AcExSnapshotCompression'

/** Magic for ACEO osnap catalog payloads (`ACEO` little-endian). */
export const ACEO_OSNAP_MAGIC = 0x4f454341

/**
 * Current ACEO payload schema version.
 *
 * Kind `7` (`path`) is included in version 1; the format has not had a formal
 * release, so adding a kind does not require a version bump.
 */
export const ACEO_OSNAP_VERSION = 1 as const

/** Hard cap on primitives inside one ACEO chunk. */
export const ACEX_MAX_OSNAP_PRIMITIVES_PER_CHUNK = 500_000

/** Hard cap on layer dictionary entries inside one ACEO chunk. */
export const ACEX_MAX_OSNAP_LAYERS_PER_CHUNK = 100_000

const KIND_LINE = 1
const KIND_CIRCLE = 2
const KIND_ARC = 3
const KIND_ELLIPSE = 4
const KIND_SPLINE = 5
const KIND_POINT = 6
const KIND_PATH = 7

/**
 * Rough uncompressed ACEO size estimate for one primitive (used when splitting
 * catalogs into downloadable chunks). Prefer slightly overestimating.
 */
export function estimateOsnapPrimitiveBytes(
  primitive: AcExOsnapPrimitive
): number {
  // kind(1) + layerIndex(4) + payload; ignore shared layer-dictionary overhead.
  switch (primitive.kind) {
    case 'line':
      return 1 + 4 + 32
    case 'circle':
      return 1 + 4 + 24 + 1
    case 'arc':
      return 1 + 4 + 40 + 1
    case 'ellipse':
      return 1 + 4 + 64 + 1 + 1
    case 'point':
      return 1 + 4 + 16
    case 'path':
      return 1 + 4 + 1 + 4 + primitive.vertices.length * 8
    case 'spline': {
      const floats =
        primitive.controlPoints.length +
        primitive.knots.length +
        primitive.weights.length +
        (primitive.fitPoints?.length ?? 0)
      return 1 + 4 + 4 + 1 + floats * 8 + 16
    }
    default: {
      const _exhaustive: never = primitive
      return _exhaustive
    }
  }
}

/**
 * Splits OSNAP primitives into slices that stay under `maxChunkBytes` (estimate).
 */
export function splitOsnapPrimitives(
  primitives: AcExOsnapPrimitive[],
  maxChunkBytes: number
): AcExOsnapPrimitive[][] {
  if (primitives.length === 0) {
    return []
  }
  const slices: AcExOsnapPrimitive[][] = []
  let current: AcExOsnapPrimitive[] = []
  let estimated = 64

  const flush = () => {
    if (current.length === 0) return
    slices.push(current)
    current = []
    estimated = 64
  }

  for (const primitive of primitives) {
    const size = estimateOsnapPrimitiveBytes(primitive)
    if (
      current.length > 0 &&
      estimated + size > maxChunkBytes
    ) {
      flush()
    }
    current.push(primitive)
    estimated += size
  }
  flush()
  return slices
}

/**
 * Encodes an analytic OSNAP catalog to uncompressed ACEO bytes.
 * Coordinates stay float64; layer names are dictionary-compressed.
 */
export function encodeOsnapCatalogBinary(
  catalog: AcExOsnapCatalog
): Uint8Array {
  const writer = new AcExBinaryWriter()
  writer.writeU32(ACEO_OSNAP_MAGIC)
  writer.writeU8(ACEO_OSNAP_VERSION)
  writer.writeU8(0)
  writer.writeU8(0)
  writer.writeU8(0)

  const layers: string[] = []
  const layerIndex = new Map<string, number>()
  const layerId = (name: string): number => {
    const existing = layerIndex.get(name)
    if (existing != null) return existing
    const id = layers.length
    layers.push(name)
    layerIndex.set(name, id)
    return id
  }

  // First pass collects layers in encounter order so encode is deterministic.
  for (const primitive of catalog.primitives) {
    layerId(primitive.layer)
  }

  writer.writeU32(layers.length)
  for (const layer of layers) {
    writer.writeString(layer)
  }

  writer.writeU32(catalog.primitives.length)
  for (const primitive of catalog.primitives) {
    writePrimitive(writer, primitive, layerId(primitive.layer))
  }

  return writer.toUint8Array()
}

/**
 * Decodes an uncompressed ACEO osnap catalog.
 */
export function decodeOsnapCatalogBinary(bytes: Uint8Array): AcExOsnapCatalog {
  const reader = new AcExBinaryReader(bytes)
  const magic = reader.readU32()
  if (magic !== ACEO_OSNAP_MAGIC) {
    throw new Error('Invalid osnap catalog magic')
  }
  const version = reader.readU8()
  reader.readU8()
  reader.readU8()
  reader.readU8()
  if (version !== ACEO_OSNAP_VERSION) {
    throw new Error(`Unsupported osnap catalog version: ${version}`)
  }

  const layerCount = reader.readU32()
  if (layerCount > ACEX_MAX_OSNAP_LAYERS_PER_CHUNK) {
    throw new Error('Osnap layer count exceeds limit')
  }
  const layers: string[] = []
  for (let i = 0; i < layerCount; i++) {
    layers.push(reader.readString())
  }

  const primitiveCount = reader.readU32()
  if (primitiveCount > ACEX_MAX_OSNAP_PRIMITIVES_PER_CHUNK) {
    throw new Error('Osnap primitive count exceeds limit')
  }
  const primitives: AcExOsnapPrimitive[] = []
  for (let i = 0; i < primitiveCount; i++) {
    primitives.push(readPrimitive(reader, layers))
  }

  return { primitives }
}

/** Encodes and gzip-compresses an OSNAP catalog (`.osnap.gz` payload). */
export function encodeOsnapCatalogGzip(catalog: AcExOsnapCatalog): {
  uncompressed: Uint8Array
  compressed: Uint8Array
} {
  const uncompressed = encodeOsnapCatalogBinary(catalog)
  const compressed = compressSnapshotBinary(uncompressed).bytes
  return { uncompressed, compressed }
}

/** Gunzips and decodes a `.osnap.gz` catalog payload. */
export function decodeOsnapCatalogGzip(
  compressed: Uint8Array
): AcExOsnapCatalog {
  return decodeOsnapCatalogBinary(decompressSnapshotBinary(compressed))
}

function writeNormalSign(writer: AcExBinaryWriter, sign: 1 | -1): void {
  writer.writeU8(sign < 0 ? 0 : 1)
}

function readNormalSign(reader: AcExBinaryReader): 1 | -1 {
  return reader.readU8() === 0 ? -1 : 1
}

function writeF64Array(writer: AcExBinaryWriter, values: number[]): void {
  writer.writeU32(values.length)
  for (const value of values) {
    writer.writeF64(value)
  }
}

function readF64Array(reader: AcExBinaryReader): number[] {
  const count = reader.readU32()
  if (count > ACEX_MAX_OSNAP_PRIMITIVES_PER_CHUNK) {
    throw new Error('Float64 array count exceeds limit')
  }
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    values.push(reader.readF64())
  }
  return values
}

function writePrimitive(
  writer: AcExBinaryWriter,
  primitive: AcExOsnapPrimitive,
  layer: number
): void {
  switch (primitive.kind) {
    case 'line':
      writer.writeU8(KIND_LINE)
      writer.writeU32(layer)
      writer.writeF64(primitive.x0)
      writer.writeF64(primitive.y0)
      writer.writeF64(primitive.x1)
      writer.writeF64(primitive.y1)
      return
    case 'circle':
      writer.writeU8(KIND_CIRCLE)
      writer.writeU32(layer)
      writer.writeF64(primitive.cx)
      writer.writeF64(primitive.cy)
      writer.writeF64(primitive.r)
      writeNormalSign(writer, primitive.normalSign)
      return
    case 'arc':
      writer.writeU8(KIND_ARC)
      writer.writeU32(layer)
      writer.writeF64(primitive.cx)
      writer.writeF64(primitive.cy)
      writer.writeF64(primitive.r)
      writer.writeF64(primitive.startAngle)
      writer.writeF64(primitive.endAngle)
      writeNormalSign(writer, primitive.normalSign)
      return
    case 'ellipse':
      writer.writeU8(KIND_ELLIPSE)
      writer.writeU32(layer)
      writer.writeF64(primitive.cx)
      writer.writeF64(primitive.cy)
      writer.writeF64(primitive.majorX)
      writer.writeF64(primitive.majorY)
      writer.writeF64(primitive.majorR)
      writer.writeF64(primitive.minorR)
      writer.writeF64(primitive.startAngle)
      writer.writeF64(primitive.endAngle)
      writer.writeU8(primitive.closed ? 1 : 0)
      writeNormalSign(writer, primitive.normalSign ?? 1)
      return
    case 'spline':
      writer.writeU8(KIND_SPLINE)
      writer.writeU32(layer)
      writeF64Array(writer, primitive.controlPoints)
      writer.writeU32(primitive.degree)
      writeF64Array(writer, primitive.knots)
      writeF64Array(writer, primitive.weights)
      writer.writeU8(primitive.closed ? 1 : 0)
      writeF64Array(writer, primitive.fitPoints ?? [])
      return
    case 'point':
      writer.writeU8(KIND_POINT)
      writer.writeU32(layer)
      writer.writeF64(primitive.x)
      writer.writeF64(primitive.y)
      return
    case 'path':
      writer.writeU8(KIND_PATH)
      writer.writeU32(layer)
      writer.writeU8(primitive.closed ? 1 : 0)
      writeF64Array(writer, primitive.vertices)
      return
    default: {
      const _exhaustive: never = primitive
      throw new Error(`Unsupported osnap primitive: ${String(_exhaustive)}`)
    }
  }
}

function readPrimitive(
  reader: AcExBinaryReader,
  layers: string[]
): AcExOsnapPrimitive {
  const kind = reader.readU8()
  const layerIdx = reader.readU32()
  const layer = layers[layerIdx]
  if (layer == null) {
    throw new Error(`Invalid osnap layer index: ${layerIdx}`)
  }

  switch (kind) {
    case KIND_LINE:
      return {
        kind: 'line',
        layer,
        x0: reader.readF64(),
        y0: reader.readF64(),
        x1: reader.readF64(),
        y1: reader.readF64()
      }
    case KIND_CIRCLE:
      return {
        kind: 'circle',
        layer,
        cx: reader.readF64(),
        cy: reader.readF64(),
        r: reader.readF64(),
        normalSign: readNormalSign(reader)
      }
    case KIND_ARC:
      return {
        kind: 'arc',
        layer,
        cx: reader.readF64(),
        cy: reader.readF64(),
        r: reader.readF64(),
        startAngle: reader.readF64(),
        endAngle: reader.readF64(),
        normalSign: readNormalSign(reader)
      }
    case KIND_ELLIPSE:
      return {
        kind: 'ellipse',
        layer,
        cx: reader.readF64(),
        cy: reader.readF64(),
        majorX: reader.readF64(),
        majorY: reader.readF64(),
        majorR: reader.readF64(),
        minorR: reader.readF64(),
        startAngle: reader.readF64(),
        endAngle: reader.readF64(),
        closed: reader.readU8() !== 0,
        normalSign: readNormalSign(reader)
      }
    case KIND_SPLINE: {
      const controlPoints = readF64Array(reader)
      const degree = reader.readU32()
      const knots = readF64Array(reader)
      const weights = readF64Array(reader)
      const closed = reader.readU8() !== 0
      const fitPoints = readF64Array(reader)
      return {
        kind: 'spline',
        layer,
        controlPoints,
        degree,
        knots,
        weights,
        closed,
        ...(fitPoints.length > 0 ? { fitPoints } : {})
      }
    }
    case KIND_POINT:
      return {
        kind: 'point',
        layer,
        x: reader.readF64(),
        y: reader.readF64()
      }
    case KIND_PATH: {
      const closed = reader.readU8() !== 0
      const vertices = readF64Array(reader)
      return {
        kind: 'path',
        layer,
        closed,
        vertices
      }
    }
    default:
      throw new Error(`Unsupported osnap primitive kind: ${kind}`)
  }
}
