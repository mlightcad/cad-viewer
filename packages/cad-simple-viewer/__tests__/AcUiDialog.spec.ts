/** @jest-environment jsdom */

import { AcUiDialog } from '../src/ui/AcUiDialog'

describe('AcUiDialog', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById(AcUiDialog.styleId)?.remove()
  })

  it('uses session-panel width by default and full viewport on phone', () => {
    const dialog = new AcUiDialog({ title: 'Test' })
    const panel = document.querySelector('.ml-ui-dialog') as HTMLElement
    expect(panel.classList.contains(AcUiDialog.compactClass)).toBe(false)

    const css = document.getElementById(AcUiDialog.styleId)?.textContent
    expect(css).toContain('width: 440px')
    expect(css).toContain('max-width: calc(100vw - 24px)')
    expect(css).toMatch(
      /@media \(max-width: 600px\) \{[\s\S]*width: 100%;/
    )

    dialog.close()
  })

  it('opts out of layout width with layoutWidth: false', () => {
    const dialog = new AcUiDialog({ title: 'Compact', layoutWidth: false })
    const panel = document.querySelector('.ml-ui-dialog') as HTMLElement
    expect(panel.classList.contains(AcUiDialog.compactClass)).toBe(true)
    dialog.close()
  })
})
