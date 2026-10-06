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
    expect(css).toContain('border-radius: 10px')
    expect(css).not.toMatch(
      /@media \(max-width: 600px\) \{[\s\S]*border-radius:\s*0/
    )
    expect(css).toContain('position: absolute')
    expect(css).not.toContain('position: fixed')

    dialog.close()
  })

  it('centers within the host canvas box, not the full viewport', () => {
    const canvas = document.createElement('div')
    canvas.style.position = 'absolute'
    canvas.style.top = '80px'
    canvas.style.height = '400px'
    canvas.style.width = '600px'
    document.body.appendChild(canvas)

    const dialog = new AcUiDialog({ title: 'Canvas', host: canvas })
    const backdrop = canvas.querySelector(
      '.ml-ui-dialog-backdrop'
    ) as HTMLElement
    expect(backdrop.parentElement).toBe(canvas)
    expect(canvas.style.position).toBe('absolute')

    dialog.close()
  })

  it('makes a static host a containing block while open', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const dialog = new AcUiDialog({ title: 'Host', host })
    expect(host.style.position).toBe('relative')
    dialog.close()
    expect(host.style.position).toBe('')
  })

  it('opts out of layout width with layoutWidth: false', () => {
    const dialog = new AcUiDialog({ title: 'Compact', layoutWidth: false })
    const panel = document.querySelector('.ml-ui-dialog') as HTMLElement
    expect(panel.classList.contains(AcUiDialog.compactClass)).toBe(true)
    dialog.close()
  })

  it('can hide the header close button and center the title', () => {
    const dialog = new AcUiDialog({
      title: 'Centered',
      showCloseButton: false,
      titleAlign: 'center'
    })
    expect(document.querySelector('.ml-ui-dialog-close')).toBeNull()
    expect(
      document.querySelector('.ml-ui-dialog-header--center')
    ).not.toBeNull()
    dialog.close()
  })
})
