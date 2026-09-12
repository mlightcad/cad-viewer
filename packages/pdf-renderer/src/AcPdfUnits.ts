/**
 * INSUNITS → millimetres. Unitless (0) is treated as millimetres so FitExtents
 * pages stay printable. Matches AutoCAD's common default for metric drawings.
 */
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

/** PDF user units are points (1/72 inch). */
export const PDF_POINTS_PER_MM = 72 / 25.4

/** Adobe's practical MediaBox limit in user units. */
export const PDF_MAX_PAGE_SIZE = 14400

export function mmPerDrawingUnit(insunits: number): number {
  if (!Number.isFinite(insunits)) {
    return 1
  }
  return ACAD_UNIT_TO_MM[Math.trunc(insunits)] ?? 1
}

/**
 * Scale that maps one drawing unit into PDF points, honouring INSUNITS.
 */
export function drawingUnitsToPdfPoints(insunits: number): number {
  return mmPerDrawingUnit(insunits) * PDF_POINTS_PER_MM
}

/**
 * Converts an AutoCAD lineweight (0.01 mm) into drawing units so a CTM that
 * maps drawing units → points yields a physically correct stroke.
 */
export function lineWeightToDrawingUnits(
  lineWeight: number,
  insunits: number
): number {
  const mm = Math.max(0.01, lineWeight / 100)
  const perUnit = mmPerDrawingUnit(insunits)
  if (perUnit <= 0) {
    return mm
  }
  return mm / perUnit
}

export function mmToPdfPoints(mm: number): number {
  return mm * PDF_POINTS_PER_MM
}

export function clampPageSize(size: number): number {
  if (!Number.isFinite(size) || size <= 0) {
    return 1
  }
  return Math.min(size, PDF_MAX_PAGE_SIZE)
}
