import { formatRelativeTime } from '../src/ui/formatRelativeTime'

const labels = {
  justNow: 'just now',
  seconds: '{n}s ago',
  minutes: '{n}m ago',
  hours: '{n}h ago',
  days: '{n}d ago'
}

describe('formatRelativeTime', () => {
  const now = 1_700_000_000_000

  it('returns justNow for recent timestamps', () => {
    expect(formatRelativeTime(now - 10_000, labels, now)).toBe('just now')
    expect(formatRelativeTime(now, labels, now)).toBe('just now')
  })

  it('formats seconds, minutes, hours, and days', () => {
    expect(formatRelativeTime(now - 50_000, labels, now)).toBe('50s ago')
    expect(formatRelativeTime(now - 5 * 60_000, labels, now)).toBe('5m ago')
    expect(formatRelativeTime(now - 3 * 3_600_000, labels, now)).toBe('3h ago')
    expect(formatRelativeTime(now - 2 * 86_400_000, labels, now)).toBe('2d ago')
  })

  it('clamps future timestamps to justNow', () => {
    expect(formatRelativeTime(now + 60_000, labels, now)).toBe('just now')
  })
})
