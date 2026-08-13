/** Canonical precision values shown in Drawing Units and the Measurement ribbon. */
export const DRAWING_UNIT_PRECISION_VALUES = [0, 1, 2, 3, 4, 6] as const

/** One option in a length/angle precision dropdown. */
export interface DrawingUnitPrecisionOption {
  value: number
  label: string
}

/**
 * Label for a LUPREC / AUPREC integer: 0, 0.1, 0.01, 0.001, …
 */
export function drawingUnitPrecisionLabel(precision: number): string {
  const n = Math.trunc(Number(precision))
  if (!Number.isFinite(n) || n <= 0) return '0'
  return `0.${'0'.repeat(n - 1)}1`
}

/**
 * Precision dropdown options. Always includes the six canonical values, plus
 * `current` when a drawing stores a value outside that set so the control
 * still matches Drawing Units.
 */
export function drawingUnitPrecisionOptions(
  current?: number
): DrawingUnitPrecisionOption[] {
  const values = new Set<number>(DRAWING_UNIT_PRECISION_VALUES)
  if (current != null && Number.isFinite(current)) {
    values.add(Math.trunc(current))
  }
  return [...values]
    .filter(value => value >= 0)
    .sort((a, b) => a - b)
    .map(value => ({
      value,
      label: drawingUnitPrecisionLabel(value)
    }))
}
