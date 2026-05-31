/** Measurable quantity category aggregated in the idle status bar. */
export type AcExMeasureQuantity = 'length' | 'area'

/** One committed measurement value included in idle totals. */
export interface AcExMeasureQuantityEntry {
  quantity: AcExMeasureQuantity
  value: number
}

/** Aggregated length and area totals in drawing units. */
export interface AcExMeasureTotals {
  length: number
  area: number
}

/**
 * Sums length and area values from the given measurement entries.
 */
export function sumMeasureQuantities(
  entries: readonly AcExMeasureQuantityEntry[]
): AcExMeasureTotals {
  let length = 0
  let area = 0
  for (const entry of entries) {
    if (entry.quantity === 'length') length += entry.value
    else area += entry.value
  }
  return { length, area }
}
