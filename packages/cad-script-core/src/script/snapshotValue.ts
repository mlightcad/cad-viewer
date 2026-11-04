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
 * Copies an entity color, keeping ByLayer / ByBlock / ACI information.
 *
 * A ByLayer or ByBlock color has no RGB components but still describes how the
 * entity is displayed. Scripts need those flags to classify geometry, so this
 * helper always returns an object when the input looks like a color.
 *
 * @param color - `AcCmColor` or another object with color accessors.
 * @returns Plain color, or `undefined` when the value is not a color.
 */
export function toSnapshotEntityColor(
  color: object
): Record<string, unknown> | undefined {
  const value = color as {
    red?: number
    green?: number
    blue?: number
    colorIndex?: number
    hexColor?: string
    isByColor?: boolean
    isByACI?: boolean
    isByLayer?: boolean
    isByBlock?: boolean
    isForeground?: boolean
  }
  // `AcCmColor.RGB` returns the raw stored value for ByLayer / ByBlock, which
  // turns ACI 256 into a bogus `0x000100` RGB. Those colors have no RGB of
  // their own, so only read the components when the color is explicit.
  const inheritsColor = value.isByLayer === true || value.isByBlock === true
  const hasRGB =
    !inheritsColor &&
    typeof value.red === 'number' &&
    typeof value.green === 'number'
  const hasFlag =
    value.isByColor === true ||
    value.isByACI === true ||
    value.isByLayer === true ||
    value.isByBlock === true ||
    typeof value.colorIndex === 'number'
  if (!hasRGB && !hasFlag) return undefined
  const result: Record<string, unknown> = {
    isByColor: value.isByColor === true,
    isByACI: value.isByACI === true,
    isByLayer: value.isByLayer === true,
    isByBlock: value.isByBlock === true,
    isForeground: value.isForeground === true
  }
  if (hasRGB) {
    result.red = value.red
    result.green = value.green
    result.blue = value.blue
    if (typeof value.hexColor === 'string') result.hex = value.hexColor
  }
  // ByLayer / ByBlock report 256 / 0 through `colorIndex`; keep the ACI index
  // only for a real palette color so `colorIndex` never contradicts `hex`.
  if (typeof value.colorIndex === 'number' && value.isByACI === true) {
    result.colorIndex = value.colorIndex
  }
  return result
}

/**
 * Copies an entity transparency into JSON.
 *
 * @param transparency - `AcCmTransparency` or a lookalike object.
 * @returns Plain transparency, or `undefined` when the value is not one.
 */
export function toSnapshotTransparency(
  transparency: object
): Record<string, unknown> | undefined {
  const value = transparency as {
    method?: number
    alpha?: number
    percentage?: number
    isByAlpha?: boolean
    isByLayer?: boolean
    isByBlock?: boolean
  }
  if (typeof value.method !== 'number' && typeof value.alpha !== 'number') {
    return undefined
  }
  const result: Record<string, unknown> = {
    isByAlpha: value.isByAlpha === true,
    isByLayer: value.isByLayer === true,
    isByBlock: value.isByBlock === true
  }
  if (typeof value.method === 'number') result.method = value.method
  if (typeof value.alpha === 'number') result.alpha = value.alpha
  if (typeof value.percentage === 'number') {
    result.percentage = value.percentage
  }
  return result
}

/**
 * Copies a transformation matrix into an array of 16 numbers.
 *
 * `AcGeMatrix3d.elements` is column-major, the same order THREE.js uses, so the
 * translation lives at indexes 12-14. Scripts should treat the result as
 * `elements` rather than as row-major rows.
 *
 * @param matrix - `AcGeMatrix3d` or an object exposing `elements`.
 * @returns 16 numbers in column-major order, or `undefined` when unreadable.
 */
export function toSnapshotMatrix(matrix: object): number[] | undefined {
  const elements = (matrix as { elements?: unknown }).elements
  if (!Array.isArray(elements) || elements.length !== 16) return undefined
  const values = elements.map(value =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined
  )
  if (values.some(value => value === undefined)) return undefined
  return values as number[]
}

/**
 * Reads one property without throwing.
 *
 * Some entity getters throw before the drawing is fully resolved, so a
 * snapshot omits the field instead of failing the whole entity.
 *
 * @param source - Live database object.
 * @param name - Property name.
 * @returns The property value, or `undefined` when it cannot be read.
 */
export function readOptionalProperty(source: object, name: string): unknown {
  try {
    return (source as Record<string, unknown>)[name]
  } catch {
    return undefined
  }
}

/**
 * Reads one numeric property without throwing.
 *
 * @param source - Live database object.
 * @param name - Property name.
 * @returns A finite number, or `undefined`.
 */
export function readOptionalNumber(
  source: object,
  name: string
): number | undefined {
  const value = readOptionalProperty(source, name)
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Reads one boolean property without throwing.
 *
 * @param source - Live database object.
 * @param name - Property name.
 * @returns A boolean, or `undefined`.
 */
export function readOptionalBoolean(
  source: object,
  name: string
): boolean | undefined {
  const value = readOptionalProperty(source, name)
  return typeof value === 'boolean' ? value : undefined
}

/**
 * Reads one point or vector property without throwing.
 *
 * @param source - Live database object.
 * @param name - Property name.
 * @returns A JSON point, or `undefined`.
 */
export function readOptionalPoint(
  source: object,
  name: string
): SnapshotPoint | undefined {
  const value = readOptionalProperty(source, name) as
    | { x?: unknown; y?: unknown; z?: unknown }
    | undefined
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number') {
    return undefined
  }
  return toSnapshotPoint(value as { x: number; y: number; z?: number })
}

/**
 * Reads one value and converts it to JSON.
 *
 * @param source - Live database object.
 * @param name - Property name.
 * @returns A JSON value, or `undefined`.
 */
export function readOptionalJson(source: object, name: string): unknown {
  return toJsonValue(readOptionalProperty(source, name))
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
    method?: number
    isByColor?: boolean
    isByACI?: boolean
    isByLayer?: boolean
    isByBlock?: boolean
  }
  if (typeof record.x === 'number' && typeof record.y === 'number') {
    return toSnapshotPoint(record as { x: number; y: number; z?: number })
  }
  const color = toSnapshotEntityColor(value)
  if (color) return color
  if (typeof record.method === 'number') {
    return toSnapshotTransparency(value)
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
