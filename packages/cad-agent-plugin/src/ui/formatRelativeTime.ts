/**
 * Compact relative-time labels for chat message footers (Cursor-style).
 *
 * Callers supply localized templates so this stays locale-agnostic.
 */
export interface RelativeTimeLabels {
  justNow: string
  /** e.g. `{n}s ago` */
  seconds: string
  /** e.g. `{n}m ago` */
  minutes: string
  /** e.g. `{n}h ago` */
  hours: string
  /** e.g. `{n}d ago` */
  days: string
}

/**
 * Formats how long ago `thenMs` was relative to `nowMs`.
 *
 * @param thenMs - Event timestamp in milliseconds.
 * @param labels - Localized templates; `{n}` is replaced with the count.
 * @param nowMs - Reference "now"; defaults to `Date.now()`.
 */
export function formatRelativeTime(
  thenMs: number,
  labels: RelativeTimeLabels,
  nowMs: number = Date.now()
): string {
  const deltaMs = Math.max(0, nowMs - thenMs)
  const seconds = Math.floor(deltaMs / 1000)
  if (seconds < 45) return labels.justNow
  if (seconds < 60) return labels.seconds.replace('{n}', String(seconds))
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return labels.minutes.replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return labels.hours.replace('{n}', String(hours))
  const days = Math.floor(hours / 24)
  return labels.days.replace('{n}', String(Math.max(1, days)))
}
