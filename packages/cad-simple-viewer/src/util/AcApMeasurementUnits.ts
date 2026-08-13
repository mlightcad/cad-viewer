import type { AcDbDatabase, AcDbFormatterOptions } from '@mlightcad/data-model'

/** Linear/angular unit settings used when formatting measurement labels. */
export interface AcApMeasurementUnits {
  /** Linear display format (LUNITS). */
  lunits: number
  /** Linear display precision (LUPREC). */
  luprec: number
  /** Angular display format (AUNITS). */
  aunits: number
  /** Angular display precision (AUPREC). */
  auprec: number
}

/** Numeric value stored on a committed measurement so its badge can be reformatted. */
export type AcApMeasurementValue =
  | { kind: 'length'; value: number }
  | { kind: 'area'; value: number }
  | { kind: 'angle'; radians: number }
  | { kind: 'coordinate'; x: number; y: number }

/** Display flags for length / area / coordinate measurement labels. */
export const MEASUREMENT_LENGTH_FORMAT_OPTIONS: AcDbFormatterOptions = {
  showUnits: true,
  showApproximate: true
}

/** Display flags for included-angle measurement labels. */
export const MEASUREMENT_ANGLE_FORMAT_OPTIONS: AcDbFormatterOptions = {
  showUnits: true,
  showApproximate: true,
  applyAngbaseAngdir: false
}

/**
 * Session overrides for measurement display units. `undefined` fields follow
 * the current drawing (LUNITS / LUPREC / AUNITS / AUPREC).
 */
let measurementUnitOverride: Partial<AcApMeasurementUnits> = {}

/** Header fields the formatter reads on each `formatLength` / `formatAngle` call. */
interface AcDbUnitHeader {
  _lunits: number
  _luprec: number
  _aunits: number
  _auprec: number
}

function asUnitHeader(db: AcDbDatabase): AcDbUnitHeader {
  return db as unknown as AcDbUnitHeader
}

/**
 * Effective measurement units: session override when the user changed a ribbon
 * control, otherwise the current drawing units.
 */
export function getEffectiveMeasurementUnits(
  db: AcDbDatabase
): AcApMeasurementUnits {
  return {
    lunits: measurementUnitOverride.lunits ?? db.lunits,
    luprec: measurementUnitOverride.luprec ?? db.luprec,
    aunits: measurementUnitOverride.aunits ?? db.aunits,
    auprec: measurementUnitOverride.auprec ?? db.auprec
  }
}

/** Fields the user has overridden on the Measurement ribbon unit panels. */
export function getMeasurementUnitOverride(): Partial<AcApMeasurementUnits> {
  return { ...measurementUnitOverride }
}

/**
 * Record a user override for one or more measurement unit fields.
 * Does not change drawing system variables.
 */
export function setMeasurementUnitOverride(
  patch: Partial<AcApMeasurementUnits>
): void {
  if (patch.lunits != null) measurementUnitOverride.lunits = patch.lunits
  if (patch.luprec != null) measurementUnitOverride.luprec = patch.luprec
  if (patch.aunits != null) measurementUnitOverride.aunits = patch.aunits
  if (patch.auprec != null) measurementUnitOverride.auprec = patch.auprec
}

/** Clear session measurement unit overrides (document open / tests). */
export function resetMeasurementUnitOverride(): void {
  measurementUnitOverride = {}
}

/**
 * True when a ribbon override differs from the drawing header. Formatting then
 * patches private header fields for the duration of one formatter call and
 * restores them — it never writes LUNITS / LUPREC / AUNITS / AUPREC sysvars.
 */
function hasEffectiveUnitOverride(db: AcDbDatabase): boolean {
  const units = getEffectiveMeasurementUnits(db)
  return (
    units.lunits !== db.lunits ||
    units.luprec !== db.luprec ||
    units.aunits !== db.aunits ||
    units.auprec !== db.auprec
  )
}

/**
 * Run `fn` with the formatter reading effective measurement units.
 * Drawing system variables are not changed.
 */
function withMeasurementFormatContext<T>(db: AcDbDatabase, fn: () => T): T {
  if (!hasEffectiveUnitOverride(db)) return fn()

  const units = getEffectiveMeasurementUnits(db)
  const header = asUnitHeader(db)
  const prev = {
    lunits: header._lunits,
    luprec: header._luprec,
    aunits: header._aunits,
    auprec: header._auprec
  }
  header._lunits = units.lunits
  header._luprec = units.luprec
  header._aunits = units.aunits
  header._auprec = units.auprec
  try {
    return fn()
  } finally {
    header._lunits = prev.lunits
    header._luprec = prev.luprec
    header._aunits = prev.aunits
    header._auprec = prev.auprec
  }
}

/** Format a linear distance using effective measurement units. */
export function formatMeasurementLength(
  db: AcDbDatabase,
  value: number,
  options: AcDbFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS
): string {
  return withMeasurementFormatContext(db, () =>
    db.formatter.formatLength(value, options)
  )
}

/** Format an angle in radians using effective measurement units. */
export function formatMeasurementAngle(
  db: AcDbDatabase,
  radians: number,
  options: AcDbFormatterOptions = MEASUREMENT_ANGLE_FORMAT_OPTIONS
): string {
  return withMeasurementFormatContext(db, () =>
    db.formatter.formatAngle(radians, options)
  )
}

/** Format a stored measurement value for a badge label. */
export function formatMeasurementValue(
  db: AcDbDatabase,
  value: AcApMeasurementValue
): string {
  switch (value.kind) {
    case 'length':
      return formatMeasurementLength(db, value.value)
    case 'area':
      return `${formatMeasurementLength(db, value.value)}²`
    case 'angle':
      return formatMeasurementAngle(db, value.radians)
    case 'coordinate': {
      const x = formatMeasurementLength(db, value.x)
      const y = formatMeasurementLength(db, value.y)
      return `X ${x}  Y ${y}`
    }
  }
}
