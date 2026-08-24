import {
  ACEX_HTML_EXPIRY_COUNTDOWN_MS,
  formatAcExHtmlCountdown,
  formatAcExHtmlExpiresAt
} from './AcExHtmlAccess'
import { showAcExHtmlAccessExpired } from './AcExHtmlAccessGate'
import type { AcExHtmlI18n } from './AcExHtmlI18n'

/**
 * Options for {@link setupAcExHtmlExpiryMonitor}.
 */
export interface AcExHtmlExpiryMonitorOptions {
  /** Absolute expiry timestamp in milliseconds. */
  expiresAt: number
  /** Localized message provider. */
  i18n: AcExHtmlI18n
  /** Called once when the file expires while the viewer is open. */
  onExpire?: () => void
}

/**
 * Controller returned by {@link setupAcExHtmlExpiryMonitor}.
 */
export interface AcExHtmlExpiryMonitor {
  /** Stops the timer and removes the badge. */
  dispose: () => void
  /** Re-renders badge text after a locale change. */
  refreshLabels: () => void
}

/**
 * Shows the top-right expiry badge and starts the near-expiry countdown.
 */
export function setupAcExHtmlExpiryMonitor(
  options: AcExHtmlExpiryMonitorOptions
): AcExHtmlExpiryMonitor {
  const { expiresAt, i18n, onExpire } = options
  const badge = ensureExpiryBadge()
  let timerId = 0
  let expired = false

  const refresh = () => {
    if (expired) {
      return
    }
    const now = Date.now()
    if (now > expiresAt) {
      expired = true
      window.clearInterval(timerId)
      badge.hidden = true
      showAcExHtmlAccessExpired(i18n, expiresAt)
      onExpire?.()
      return
    }

    const remaining = expiresAt - now
    const timeLabel = formatAcExHtmlExpiresAt(expiresAt, i18n.locale)
    if (remaining <= ACEX_HTML_EXPIRY_COUNTDOWN_MS) {
      badge.classList.add('mlcad-expiry-countdown')
      badge.textContent = i18n.t('access.badgeCountdown', {
        time: formatAcExHtmlCountdown(remaining)
      })
    } else {
      badge.classList.remove('mlcad-expiry-countdown')
      badge.textContent = i18n.t('access.badgeExpires', { time: timeLabel })
    }
    badge.hidden = false
  }

  refresh()
  timerId = window.setInterval(refresh, 1000)

  return {
    dispose: () => {
      window.clearInterval(timerId)
      badge.remove()
    },
    refreshLabels: refresh
  }
}

function ensureExpiryBadge(): HTMLElement {
  let badge = document.getElementById('mlcad-expiry-badge')
  if (!badge) {
    badge = document.createElement('div')
    badge.id = 'mlcad-expiry-badge'
    badge.className = 'mlcad-expiry-badge'
    badge.hidden = true
    document.body.appendChild(badge)
  }
  return badge
}
