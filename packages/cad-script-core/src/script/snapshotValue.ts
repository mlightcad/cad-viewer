/** JSON point copied from geometry so scripts cannot hold live objects. */
export interface SnapshotPoint {
  x: number
  y: number
  z: number
}

/**
 * Copies a point or vector into a plain `{ x, y, z }`.
 *
 * @param point - Geometry point or vector.
 * @returns A JSON point. Missing `z` becomes `0`.
 */
export function toSnapshotPoint(point: {
  x: number
  y: number
  z?: number
}): SnapshotPoint {
  return { x: point.x, y: point.y, z: point.z ?? 0 }
}

/**
 * Copies a color into RGB and ACI fields.
 *
 * @param color - `AcCmColor` or another object with red/green/blue.
 * @returns Plain color, or `undefined` when the value is not a color.
 */
export function toSnapshotColor(
  color: object
): Record<string, unknown> | undefined {
  const value = color as {
    red?: number
    green?: number
    blue?: number
    colorIndex?: number
    isByACI?: boolean
    isByLayer?: boolean
    isByBlock?: boolean
  }
  if (typeof value.red !== 'number' || typeof value.green !== 'number') {
    return undefined
  }
  return {
    red: value.red,
    green: value.green,
    blue: value.blue,
    colorIndex: value.colorIndex,
    isByACI: value.isByACI,
    isByLayer: value.isByLayer,
    isByBlock: value.isByBlock
  }
}

/**
 * Converts one property into JSON.
 *
 * Live database objects, functions, and binary buffers are dropped.
 *
 * @param value - Property read from a table record or entity.
 * @returns A JSON value, or `undefined` when it cannot be copied.
 */
export function toJsonValue(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value
      .map(item => toJsonValue(item))
      .filter(item => item !== undefined)
  }
  if (typeof value !== 'object') return undefined
  if (ArrayBuffer.isView(value)) return undefined
  const record = value as {
    x?: number
    y?: number
    z?: number
    red?: number
    green?: number
  }
  if (typeof record.x === 'number' && typeof record.y === 'number') {
    return toSnapshotPoint(record as { x: number; y: number; z?: number })
  }
  if (typeof record.red === 'number' && typeof record.green === 'number') {
    return toSnapshotColor(value)
  }
  return undefined
}

/**
 * Copies named properties into a plain object.
 *
 * A getter that throws, or a value that is not JSON, is skipped.
 *
 * @param source - Live table record.
 * @param names - Property names to copy.
 * @returns Copied fields.
 */
export function readJsonFields(
  source: object,
  names: readonly string[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const name of names) {
    try {
      const value = toJsonValue((source as Record<string, unknown>)[name])
      if (value !== undefined) fields[name] = value
    } catch {
      // Some records cannot report every property until the drawing is complete.
    }
  }
  return fields
}
