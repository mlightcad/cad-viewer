/**
 * Ones-digit row order used by AutoCAD's ACI color dialog for indices 10–249.
 * Even digits descend (8→0), then odd digits ascend (1→9).
 */
const ACI_LARGE_ONES_ORDER = [8, 6, 4, 2, 0, 1, 3, 5, 7, 9] as const

/**
 * Builds ACI indices 10–249 in AutoCAD Color dialog order.
 *
 * Layout is 10 rows × 24 columns: each column is a decade group (10, 20, …,
 * 240); each row uses ones digits `8, 6, 4, 2, 0, 1, 3, 5, 7, 9`.
 *
 * @returns 240 indices suitable for a `grid-template-columns: repeat(24, …)` palette.
 */
function buildAciLargePaletteIndices(): number[] {
  const indices: number[] = []
  for (const ones of ACI_LARGE_ONES_ORDER) {
    for (let decade = 1; decade <= 24; decade++) {
      indices.push(decade * 10 + ones)
    }
  }
  return indices
}

/** ACI indices 1–9 (standard small palette). */
export const ACI_SMALL_PALETTE_INDICES = Array.from(
  { length: 9 },
  (_, i) => i + 1
)

/** ACI indices 10–249 in AutoCAD dialog order (see {@link buildAciLargePaletteIndices}). */
export const ACI_LARGE_PALETTE_INDICES = buildAciLargePaletteIndices()

/** ACI indices 250–255 (gray ramp). */
export const ACI_GRAY_PALETTE_INDICES = Array.from(
  { length: 6 },
  (_, i) => i + 250
)
