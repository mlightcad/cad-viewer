/** Common POLARANG values shown in the status bar polar tracking menu. */
export const POLAR_TRACKING_INCREMENTS = [
  90, 45, 30, 22.5, 18, 15, 10, 5
] as const

export type PolarTrackingIncrement = (typeof POLAR_TRACKING_INCREMENTS)[number]

/**
 * Formats the preview label for a polar angle increment (e.g. `45, 90, 135, 180...`).
 * Matches AutoCAD status bar polar tracking menu text.
 */
export function formatPolarIncrementMenuLabel(increment: number): string {
  const preview = []
  for (let i = 1; i <= 4; i++) {
    preview.push(Math.round(i * increment))
  }
  return `${preview.join(', ')}...`
}

export function isSamePolarIncrement(
  current: number,
  increment: number
): boolean {
  return Math.abs(current - increment) < 0.001
}
