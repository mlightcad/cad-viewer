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
  /** Length display unit (INSUNITS code) or {@link MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING}. */
  lengthUnit: number
}

/** Sentinel length unit meaning "follow the drawing units" (no conversion). */
export const MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING = -1

/** AutoCAD INSUNITS code → scale factor expressed in millimeters. */
const ACAD_UNIT_TO_MM: Readonly<Record<number, number>> = {
  0: 1,
  1: 25.4,
  2: 304.8,
  3: 1609344,
  4: 1,
  5: 10,
  6: 1000,
  7: 1000000,
  8: 0.0000254,
  9: 0.0254,
  10: 914.4,
  11: 0.0000001,
  12: 0.000001,
  13: 0.001,
  14: 100,
  15: 10000,
  16: 100000,
  17: 1000000000000,
  18: 149597870700000,
  19: 9.4607304725808e18,
  20: 3.085677581491367e19,
  21: 304.80060960121926,
  22: 25.400050800101603,
  23: 914.4018288036576,
  24: 1609347.2186944375
}

/** Short Latin suffixes shown after converted measurement lengths. */
const ACAD_UNIT_SYMBOLS: Readonly<Record<number, string>> = {
  1: 'in',
  2: 'ft',
  4: 'mm',
  5: 'cm',
  6: 'm',
  7: 'km',
  10: 'yd'
}

function acapUnitToMm(unit: number): number {
  if (!Number.isFinite(unit)) return 1
  return ACAD_UNIT_TO_MM[Math.trunc(unit)] ?? 1
}

/** Scale a value expressed in `fromUnit` so it is expressed in `toUnit`. */
export function convertLengthValue(
  value: number,
  fromUnit: number,
  toUnit: number
): number {
  const toMm = acapUnitToMm(toUnit)
  if (toMm === 0) return value
  return value * (acapUnitToMm(fromUnit) / toMm)
}

/** Scale an area expressed in `fromUnit` so it is expressed in `toUnit`. */
export function convertAreaValue(
  value: number,
  fromUnit: number,
  toUnit: number
): number {
  const factor = convertLengthValue(1, fromUnit, toUnit)
  return value * factor * factor
}

/** Short symbol for a length-unit code, or empty when unknown / follow-drawing. */
export function measurementLengthUnitSymbol(unit: number): string {
  return ACAD_UNIT_SYMBOLS[Math.trunc(unit)] ?? ''
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

/**
 * Display flags for a length already rescaled to another physical unit. The
 * formatter must not add the drawing suffix — the target unit symbol is
 * appended by the caller.
 */
const MEASUREMENT_CONVERTED_LENGTH_FORMAT_OPTIONS: AcDbFormatterOptions = {
  showUnits: false,
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
    auprec: measurementUnitOverride.auprec ?? db.auprec,
    lengthUnit:
      measurementUnitOverride.lengthUnit ??
      MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
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
  if (patch.lengthUnit != null)
    measurementUnitOverride.lengthUnit = patch.lengthUnit
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

/** Format a linear value without applying a physical-unit conversion. */
function formatMeasurementLengthRaw(
  db: AcDbDatabase,
  value: number,
  options: AcDbFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS
): string {
  return withMeasurementFormatContext(db, () =>
    db.formatter.formatLength(value, options)
  )
}

/**
 * Length unit code to convert measurement values to, or `undefined` when labels
 * should stay in drawing units (no override selected, the override equals the
 * drawing's INSUNITS, or the follow-drawing sentinel is active).
 */
function convertedLengthUnit(db: AcDbDatabase): number | undefined {
  const target = measurementUnitOverride.lengthUnit
  if (
    target == null ||
    target === db.insunits ||
    target === MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
  )
    return undefined
  return target
}

/** Format a linear distance using effective measurement units. */
export function formatMeasurementLength(
  db: AcDbDatabase,
  value: number,
  options: AcDbFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS
): string {
  const target = convertedLengthUnit(db)
  if (target == null) {
    return formatMeasurementLengthRaw(db, value, options)
  }

  const scaled = convertLengthValue(value, db.insunits ?? 0, target)
  const text = formatMeasurementLengthRaw(
    db,
    scaled,
    MEASUREMENT_CONVERTED_LENGTH_FORMAT_OPTIONS
  )
  const symbol = measurementLengthUnitSymbol(target)
  return symbol ? `${text} ${symbol}` : text
}

/** Format an area using effective measurement units (length unit squared). */
export function formatMeasurementArea(db: AcDbDatabase, value: number): string {
  const target = convertedLengthUnit(db)
  if (target == null) {
    return `${formatMeasurementLengthRaw(
      db,
      value,
      MEASUREMENT_LENGTH_FORMAT_OPTIONS
    )}²`
  }

  const scaled = convertAreaValue(value, db.insunits ?? 0, target)
  const text = formatMeasurementLengthRaw(
    db,
    scaled,
    MEASUREMENT_CONVERTED_LENGTH_FORMAT_OPTIONS
  )
  const symbol = measurementLengthUnitSymbol(target)
  return symbol ? `${text} ${symbol}²` : `${text}²`
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
      return formatMeasurementArea(db, value.value)
    case 'angle':
      return formatMeasurementAngle(db, value.radians)
    case 'coordinate': {
      const x = formatMeasurementLength(db, value.x)
      const y = formatMeasurementLength(db, value.y)
      return `X ${x}  Y ${y}`
    }
  }
}
