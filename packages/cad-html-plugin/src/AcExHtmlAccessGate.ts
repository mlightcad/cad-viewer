import {
  ACEX_HTML_EXPIRY_COUNTDOWN_MS,
  formatAcExHtmlCountdown,
  formatAcExHtmlExpiresAt
} from './AcExHtmlAccess'
import type { AcExHtmlI18n, AcExHtmlMessageKey } from './AcExHtmlI18n'

/** Maximum wrong-password attempts before the access gate is locked. */
export const ACEX_HTML_MAX_PASSWORD_ATTEMPTS = 3

/** Interval handle for unlock-page expiry countdown updates. */
let accessExpiryTimerId = 0

/**
 * Shows the password gate overlay and resolves when the user submits a password.
 *
 * @throws When the user dismisses the gate without submitting.
 */
export function promptAcExHtmlAccessPassword(
  i18n: AcExHtmlI18n,
  options?: {
    errorKey?: Extract<AcExHtmlMessageKey, 'access.wrongPassword'>
    expiresAt?: number | null
  }
): Promise<string> {
  const gate = document.getElementById('mlcad-access-gate')
  const form = document.getElementById('mlcad-access-form')
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null
  const errorEl = document.getElementById('mlcad-access-error')
  const loading = document.getElementById('mlcad-loading')

  if (!gate || !form || !input) {
    return Promise.reject(new Error('Access gate is not available.'))
  }

  resetAcExHtmlAccessGateUi()
  i18n.applyToDocument()
  setAcExHtmlAccessExpiryInfo(i18n, options?.expiresAt ?? null)
  gate.hidden = false
  loading?.classList.add('mlcad-loading--gate')

  input.value = ''
  if (errorEl) {
    if (options?.errorKey) {
      errorEl.hidden = false
      errorEl.textContent = i18n.t(options.errorKey)
    } else {
      errorEl.hidden = true
      errorEl.textContent = ''
    }
  }

  return new Promise((resolve, reject) => {
    const onSubmit = (event: Event) => {
      event.preventDefault()
      const password = input.value
      if (!password) {
        if (errorEl) {
          errorEl.hidden = false
          errorEl.textContent = i18n.t('access.passwordRequired')
        }
        return
      }
      cleanup()
      resolve(password)
    }

    const cleanup = () => {
      form.removeEventListener('submit', onSubmit)
      stopAcExHtmlAccessExpiryTimer()
      gate.hidden = true
      loading?.classList.remove('mlcad-loading--gate')
    }

    form.addEventListener('submit', onSubmit)
    window.setTimeout(() => input.focus(), 0)

    gate.addEventListener(
      'mlcad-access-cancel',
      () => {
        cleanup()
        reject(new Error('Access cancelled.'))
      },
      { once: true }
    )
  })
}

/**
 * Displays a password error on the access gate and re-prompts the user.
 */
export function showAcExHtmlAccessPasswordError(
  i18n: AcExHtmlI18n,
  messageKey: 'access.wrongPassword' = 'access.wrongPassword'
): void {
  const errorEl = document.getElementById('mlcad-access-error')
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null
  if (errorEl) {
    errorEl.hidden = false
    errorEl.textContent = i18n.t(messageKey)
  }
  input?.focus()
  input?.select()
}

/**
 * Locks the password gate after too many failed attempts.
 *
 * The form is disabled until the user refreshes the page.
 */
export function lockAcExHtmlAccessGate(i18n: AcExHtmlI18n): void {
  const gate = document.getElementById('mlcad-access-gate')
  const form = document.getElementById('mlcad-access-form')
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null
  const submit = form?.querySelector<HTMLButtonElement>('.mlcad-access-submit')
  const errorEl = document.getElementById('mlcad-access-error')
  const loading = document.getElementById('mlcad-loading')

  stopAcExHtmlAccessExpiryTimer()
  resetAcExHtmlAccessGateUi()
  i18n.applyToDocument()
  gate?.classList.add('mlcad-access-gate--locked')
  if (gate) {
    gate.hidden = false
  }
  loading?.classList.add('mlcad-loading--gate')

  if (input) {
    input.disabled = true
    input.value = ''
  }
  submit?.setAttribute('disabled', 'disabled')

  if (errorEl) {
    errorEl.hidden = false
    errorEl.textContent = i18n.t('access.tooManyAttempts')
  }
}

/**
 * Shows the access gate in an expired state (no unlock form).
 */
export function showAcExHtmlAccessExpired(
  i18n: AcExHtmlI18n,
  expiresAt: number | null
): void {
  const gate = document.getElementById('mlcad-access-gate')
  const form = document.getElementById('mlcad-access-form')
  const loading = document.getElementById('mlcad-loading')
  const title = form?.querySelector<HTMLElement>('.mlcad-access-title')
  const hint = form?.querySelector<HTMLElement>('.mlcad-access-hint')
  const field = form?.querySelector<HTMLElement>('.mlcad-access-field')
  const submit = form?.querySelector<HTMLElement>('.mlcad-access-submit')
  const errorEl = document.getElementById('mlcad-access-error')
  const expiryEl = document.getElementById('mlcad-access-expiry')

  stopAcExHtmlAccessExpiryTimer()
  i18n.applyToDocument()
  if (gate) {
    gate.hidden = false
    gate.classList.add('mlcad-access-gate--expired')
    gate.classList.remove('mlcad-access-gate--locked')
  }
  loading?.classList.add('mlcad-loading--gate')
  loading?.classList.remove('mlcad-loading--done')
  loading?.removeAttribute('aria-hidden')

  if (title) {
    title.textContent = i18n.t('access.expiredTitle')
  }
  if (hint) {
    hint.textContent =
      expiresAt != null
        ? i18n.t('access.expiredDetail', {
            time: formatAcExHtmlExpiresAt(expiresAt, i18n.locale)
          })
        : i18n.t('access.expired')
  }
  if (field) {
    field.hidden = true
  }
  if (submit) {
    submit.hidden = true
  }
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null
  if (input) {
    input.disabled = true
    input.value = ''
    input.blur()
  }
  if (errorEl) {
    errorEl.hidden = true
    errorEl.textContent = ''
  }
  if (expiryEl) {
    expiryEl.hidden = true
    expiryEl.textContent = ''
    expiryEl.classList.remove('mlcad-expiry-countdown')
  }
}

/**
 * Updates the unlock-page expiry line under the password prompt.
 *
 * Within the last {@link ACEX_HTML_EXPIRY_COUNTDOWN_MS}, switches to a live
 * countdown using the same warning colors as the post-open expiry badge.
 */
export function setAcExHtmlAccessExpiryInfo(
  i18n: AcExHtmlI18n,
  expiresAt: number | null
): void {
  const expiryEl = document.getElementById('mlcad-access-expiry')
  if (!expiryEl) {
    return
  }

  stopAcExHtmlAccessExpiryTimer()

  if (expiresAt == null) {
    expiryEl.hidden = true
    expiryEl.textContent = ''
    expiryEl.classList.remove('mlcad-expiry-countdown')
    return
  }

  const refresh = () => {
    const now = Date.now()
    if (now > expiresAt) {
      showAcExHtmlAccessExpired(i18n, expiresAt)
      return
    }

    const remaining = expiresAt - now
    expiryEl.hidden = false
    if (remaining <= ACEX_HTML_EXPIRY_COUNTDOWN_MS) {
      expiryEl.classList.add('mlcad-expiry-countdown')
      expiryEl.textContent = i18n.t('access.badgeCountdown', {
        time: formatAcExHtmlCountdown(remaining)
      })
    } else {
      expiryEl.classList.remove('mlcad-expiry-countdown')
      expiryEl.textContent = i18n.t('access.expiresAt', {
        time: formatAcExHtmlExpiresAt(expiresAt, i18n.locale)
      })
    }
  }

  refresh()
  if (
    !document
      .getElementById('mlcad-access-gate')
      ?.classList.contains('mlcad-access-gate--expired')
  ) {
    accessExpiryTimerId = window.setInterval(refresh, 1000)
  }
}

function stopAcExHtmlAccessExpiryTimer(): void {
  if (accessExpiryTimerId) {
    window.clearInterval(accessExpiryTimerId)
    accessExpiryTimerId = 0
  }
}

function resetAcExHtmlAccessGateUi(): void {
  const gate = document.getElementById('mlcad-access-gate')
  const form = document.getElementById('mlcad-access-form')
  const field = form?.querySelector<HTMLElement>('.mlcad-access-field')
  const submit = form?.querySelector<HTMLButtonElement>('.mlcad-access-submit')
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null
  const expiryEl = document.getElementById('mlcad-access-expiry')

  stopAcExHtmlAccessExpiryTimer()
  gate?.classList.remove('mlcad-access-gate--locked', 'mlcad-access-gate--expired')
  expiryEl?.classList.remove('mlcad-expiry-countdown')
  if (field) {
    field.hidden = false
  }
  if (submit) {
    submit.hidden = false
    submit.removeAttribute('disabled')
  }
  if (input) {
    input.disabled = false
  }
}
