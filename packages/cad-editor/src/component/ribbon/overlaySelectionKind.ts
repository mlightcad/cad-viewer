/** Markup HTML overlay layer name (`MARKUP_LAYER` in cad-simple-viewer). */
const MARKUP_LAYER = 'markup'

/** Measurement HTML overlay layer name (`MEASUREMENT_LAYER` in cad-simple-viewer). */
const MEASUREMENT_LAYER = 'measurement'

/**
 * Homogeneous overlay selection used to decide whether the ribbon should
 * switch to Review or Measurement.
 *
 * `'mixed'` covers markup + measurement, CAD entities + overlay, and any
 * other combination of distinct kinds.
 */
export type OverlaySelectionKind = 'markup' | 'measurement' | 'mixed' | 'none'

/** Minimal selection snapshot so classification does not touch the live view. */
export interface OverlaySelectionSnapshot {
  /** HTML overlay groups currently selected (markup, measurement, or other). */
  selectedGroups?: { layer?: string }[]
  /** Count of selected drawing entities in the CAD selection set. */
  cadEntityCount?: number
  /** Markup store selection id, used when group list is empty. */
  markupSelectedId?: string
  /** Whether a measurement is selected in the measurement store. */
  measurementSelected?: boolean
}

/**
 * Classifies the current CAD + overlay selection into one exclusive kind.
 *
 * @param snapshot - Selected overlay groups, CAD entity count, and store flags.
 * @returns Exclusive overlay kind, `'mixed'` when more than one kind is present,
 *   or `'none'` when nothing relevant is selected.
 */
export function classifyOverlaySelection(
  snapshot: OverlaySelectionSnapshot
): OverlaySelectionKind {
  let hasMarkup = false
  let hasMeasurement = false
  let hasOtherOverlay = false

  for (const group of snapshot.selectedGroups ?? []) {
    if (group.layer === MARKUP_LAYER) hasMarkup = true
    else if (group.layer === MEASUREMENT_LAYER) hasMeasurement = true
    else hasOtherOverlay = true
  }

  if (!hasMarkup && snapshot.markupSelectedId) hasMarkup = true
  if (!hasMeasurement && snapshot.measurementSelected) hasMeasurement = true

  const hasCadEntities = (snapshot.cadEntityCount ?? 0) > 0
  const kindCount = [
    hasMarkup,
    hasMeasurement,
    hasOtherOverlay,
    hasCadEntities
  ].filter(Boolean).length

  if (kindCount > 1) return 'mixed'
  if (hasMarkup) return 'markup'
  if (hasMeasurement) return 'measurement'
  return 'none'
}
