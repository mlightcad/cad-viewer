/** @jest-environment jsdom */

import {
  ACEX_HTML_MAX_PASSWORD_ATTEMPTS,
  lockAcExHtmlAccessGate,
  promptAcExHtmlAccessPassword,
  showAcExHtmlAccessExpired
} from '../src/AcExHtmlAccessGate'
import { AcExHtmlI18n } from '../src/AcExHtmlI18n'

describe('AcExHtmlAccessGate', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mlcad-loading">
        <div id="mlcad-access-gate" hidden>
          <form id="mlcad-access-form">
            <h2 class="mlcad-access-title" data-i18n-key="access.title" data-i18n-text>Protected drawing</h2>
            <p class="mlcad-access-hint" data-i18n-key="access.passwordPrompt" data-i18n-text>Enter the password to open this file.</p>
            <p id="mlcad-access-expiry" class="mlcad-access-expiry" hidden></p>
            <div class="mlcad-access-field">
              <input id="mlcad-access-password" type="password" />
            </div>
            <button type="submit" class="mlcad-access-submit">Unlock</button>
            <p id="mlcad-access-error" hidden></p>
          </form>
        </div>
      </div>
    `
  })

  it('locks the gate after too many failed attempts', () => {
    const i18n = new AcExHtmlI18n('en')
    lockAcExHtmlAccessGate(i18n)

    const gate = document.getElementById('mlcad-access-gate')
    const input = document.getElementById(
      'mlcad-access-password'
    ) as HTMLInputElement
    const submit = document.querySelector<HTMLButtonElement>(
      '.mlcad-access-submit'
    )
    const errorEl = document.getElementById('mlcad-access-error')

    expect(gate?.hidden).toBe(false)
    expect(gate?.classList.contains('mlcad-access-gate--locked')).toBe(true)
    expect(input.disabled).toBe(true)
    expect(submit?.disabled).toBe(true)
    expect(errorEl?.textContent).toContain('Refresh the page')
  })

  it('shows expiry info and a wrong-password error on the next prompt', async () => {
    const i18n = new AcExHtmlI18n('zh')
    const expiresAt = Date.UTC(2026, 5, 1, 12, 0, 0)
    const promptPromise = promptAcExHtmlAccessPassword(i18n, {
      errorKey: 'access.wrongPassword',
      expiresAt
    })

    const errorEl = document.getElementById('mlcad-access-error')
    const expiryEl = document.getElementById('mlcad-access-expiry')
    expect(errorEl?.hidden).toBe(false)
    expect(errorEl?.textContent).toBe('密码错误，请重试。')
    expect(expiryEl?.hidden).toBe(false)
    expect(expiryEl?.textContent).toContain('有效期至')

    const input = document.getElementById(
      'mlcad-access-password'
    ) as HTMLInputElement
    input.value = 'secret'
    document.getElementById('mlcad-access-form')?.dispatchEvent(
      new Event('submit', { cancelable: true })
    )

    await expect(promptPromise).resolves.toBe('secret')
  })

  it('shows an expired unlock page without the password form', () => {
    const i18n = new AcExHtmlI18n('en')
    const expiresAt = Date.UTC(2026, 0, 1, 8, 0, 0)
    showAcExHtmlAccessExpired(i18n, expiresAt)

    const gate = document.getElementById('mlcad-access-gate')
    const field = document.querySelector<HTMLElement>('.mlcad-access-field')
    const submit = document.querySelector<HTMLElement>('.mlcad-access-submit')
    const input = document.getElementById(
      'mlcad-access-password'
    ) as HTMLInputElement
    const title = document.querySelector('.mlcad-access-title')
    const hint = document.querySelector('.mlcad-access-hint')

    expect(gate?.hidden).toBe(false)
    expect(gate?.classList.contains('mlcad-access-gate--expired')).toBe(true)
    expect(field?.hidden).toBe(true)
    expect(submit?.hidden).toBe(true)
    expect(input.disabled).toBe(true)
    expect(title?.textContent).toBe('File expired')
    expect(hint?.textContent).toContain('expired on')
  })

  it('exports a three-attempt limit constant', () => {
    expect(ACEX_HTML_MAX_PASSWORD_ATTEMPTS).toBe(3)
  })
})
