import { formatAcExHtmlExpiresAt } from './AcExHtmlAccess'
import type { AcExHtmlI18n, AcExHtmlMessageKey } from './AcExHtmlI18n'

/** Maximum wrong-password attempts before the access gate is locked. */
export const ACEX_HTML_MAX_PASSWORD_ATTEMPTS = 3

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
  if (errorEl) {
    errorEl.hidden = true
    errorEl.textContent = ''
  }
  if (expiryEl) {
    expiryEl.hidden = true
    expiryEl.textContent = ''
  }
}

/**
 * Updates the unlock-page expiry line under the password prompt.
 */
export function setAcExHtmlAccessExpiryInfo(
  i18n: AcExHtmlI18n,
  expiresAt: number | null
): void {
  const expiryEl = document.getElementById('mlcad-access-expiry')
  if (!expiryEl) {
    return
  }
  if (expiresAt == null) {
    expiryEl.hidden = true
    expiryEl.textContent = ''
    return
  }
  expiryEl.hidden = false
  expiryEl.textContent = i18n.t('access.expiresAt', {
    time: formatAcExHtmlExpiresAt(expiresAt, i18n.locale)
  })
}

function resetAcExHtmlAccessGateUi(): void {
  const gate = document.getElementById('mlcad-access-gate')
  const form = document.getElementById('mlcad-access-form')
  const field = form?.querySelector<HTMLElement>('.mlcad-access-field')
  const submit = form?.querySelector<HTMLButtonElement>('.mlcad-access-submit')
  const input = document.getElementById(
    'mlcad-access-password'
  ) as HTMLInputElement | null

  gate?.classList.remove('mlcad-access-gate--locked', 'mlcad-access-gate--expired')
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
