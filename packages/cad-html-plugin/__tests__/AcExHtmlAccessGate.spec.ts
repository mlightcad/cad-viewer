/** @jest-environment jsdom */

import {
  ACEX_HTML_MAX_PASSWORD_ATTEMPTS,
  lockAcExHtmlAccessGate,
  promptAcExHtmlAccessPassword
} from '../src/AcExHtmlAccessGate'
import { AcExHtmlI18n } from '../src/AcExHtmlI18n'

describe('AcExHtmlAccessGate', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="mlcad-loading">
        <div id="mlcad-access-gate" hidden>
          <form id="mlcad-access-form">
            <input id="mlcad-access-password" type="password" />
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

  it('shows a wrong-password error on the next prompt', async () => {
    const i18n = new AcExHtmlI18n('zh')
    const promptPromise = promptAcExHtmlAccessPassword(i18n, 'access.wrongPassword')

    const errorEl = document.getElementById('mlcad-access-error')
    expect(errorEl?.hidden).toBe(false)
    expect(errorEl?.textContent).toBe('密码错误，请重试。')

    const input = document.getElementById(
      'mlcad-access-password'
    ) as HTMLInputElement
    input.value = 'secret'
    document.getElementById('mlcad-access-form')?.dispatchEvent(
      new Event('submit', { cancelable: true })
    )

    await expect(promptPromise).resolves.toBe('secret')
  })

  it('exports a three-attempt limit constant', () => {
    expect(ACEX_HTML_MAX_PASSWORD_ATTEMPTS).toBe(3)
  })
})
