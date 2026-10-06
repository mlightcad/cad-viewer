/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'

Object.assign(globalThis, { TextDecoder, TextEncoder })

import { AcUiAciColorDialog } from '../src/ui/AcUiAciColorDialog'
import { AcUiDialog } from '../src/ui/AcUiDialog'

const LABELS = {
  title: 'Select Color',
  close: 'Close',
  ok: 'OK',
  cancel: 'Cancel',
  index: 'Color Index: ',
  rgb: 'RGB: ',
  input: 'Color',
  inputPlaceholder: '1-255'
}

describe('AcUiAciColorDialog', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('ml-ui-dialog-styles')?.remove()
    document.getElementById('ml-aci-palette-styles')?.remove()
    document.querySelectorAll('.ml-aci-loupe').forEach(el => el.remove())
  })

  it('confirms the selected ACI index and omits ByLayer / ByBlock', async () => {
    const opened = AcUiAciColorDialog.open({
      labels: LABELS,
      initialIndex: 7
    })

    const dialog = document.querySelector('.ml-ui-aci-color-dialog') as HTMLElement
    expect(dialog).toBeTruthy()
    expect(dialog.querySelector('.ml-aci-picker')).toBeTruthy()
    expect(dialog.querySelector('.ml-aci-preview-box')).toBeTruthy()
    expect(dialog.querySelector('.ml-aci-input-row input')).toBeTruthy()
    expect(
      [...dialog.querySelectorAll('button')].map(b => b.textContent)
    ).not.toEqual(expect.arrayContaining(['ByLayer', 'ByBlock']))

    const cell = dialog.querySelector(
      '.ml-aci-cell[data-aci="18"]'
    ) as HTMLButtonElement
    cell.click()

    const ok = [...dialog.querySelectorAll('button')].find(
      b => b.textContent === 'OK'
    )
    ok?.click()

    await expect(opened).resolves.toBe(18)
    expect(document.querySelector('.ml-ui-aci-color-dialog')).toBeNull()
  })

  it('resolves null when cancelled', async () => {
    const opened = AcUiAciColorDialog.open({
      labels: LABELS,
      initialIndex: 3
    })
    const cancel = [...document.querySelectorAll('button')].find(
      b => b.textContent === 'Cancel'
    )
    cancel?.click()
    await expect(opened).resolves.toBeNull()
  })

  it('uses the shared layout-width dialog styles', async () => {
    const opened = AcUiAciColorDialog.open({ labels: LABELS })
    const dialog = document.querySelector(
      '.ml-ui-aci-color-dialog'
    ) as HTMLElement
    expect(dialog.classList.contains(AcUiDialog.compactClass)).toBe(false)

    const css = document.getElementById(AcUiDialog.styleId)?.textContent
    expect(css).toContain('width: 440px')
    expect(css).toContain('max-width: calc(100vw - 24px)')
    expect(css).toContain('@media (max-width: 600px)')
    expect(css).toMatch(
      /@media \(max-width: 600px\) \{[\s\S]*width: 100%;/
    )

    const cancel = [...document.querySelectorAll('button')].find(
      b => b.textContent === 'Cancel'
    )
    cancel?.click()
    await opened
  })
})
