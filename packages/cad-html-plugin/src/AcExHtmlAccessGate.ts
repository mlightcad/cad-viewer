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
  errorKey?: Extract<AcExHtmlMessageKey, 'access.wrongPassword'>
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

  i18n.applyToDocument()
  gate.hidden = false
  loading?.classList.add('mlcad-loading--gate')

  input.value = ''
  if (errorEl) {
    if (errorKey) {
      errorEl.hidden = false
      errorEl.textContent = i18n.t(errorKey)
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
