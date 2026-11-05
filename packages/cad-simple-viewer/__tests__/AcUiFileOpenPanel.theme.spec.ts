/**
 * @jest-environment jsdom
 */

import { acedApplyUiTheme } from '../src/editor/global/AcEdUiTheme'
import { AcUiFileOpenPanel } from '../src/ui/AcUiFileOpenPanel'

describe('AcUiFileOpenPanel theme', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.documentElement.removeAttribute('data-ml-ui-theme')
    document.documentElement.className = ''
  })

  it('applies an isolated dark palette when theme is dark', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const panel = new AcUiFileOpenPanel({ host, theme: 'dark' })

    expect(panel.theme).toBe('dark')
    expect(panel.element.getAttribute('data-ml-ui-theme')).toBe('dark')
    expect(panel.element.style.getPropertyValue('--ml-ui-bg')).toBe('#1d1e1f')

    panel.dispose()
  })

  it('switches palette through setTheme', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const panel = new AcUiFileOpenPanel({ host, theme: 'light' })

    panel.setTheme('dark')
    expect(panel.theme).toBe('dark')
    expect(panel.element.getAttribute('data-ml-ui-theme')).toBe('dark')
    expect(panel.element.style.getPropertyValue('--ml-ui-bg')).toBe('#1d1e1f')

    panel.setTheme('light')
    expect(panel.theme).toBe('light')
    expect(panel.element.getAttribute('data-ml-ui-theme')).toBe('light')
    expect(panel.element.style.getPropertyValue('--ml-ui-bg')).toBe('#ffffff')

    panel.dispose()
  })

  it('follows document theme when options.theme is omitted', () => {
    acedApplyUiTheme('dark', document.documentElement, { isolated: true })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const panel = new AcUiFileOpenPanel({ host })

    expect(panel.theme).toBe('dark')
    expect(panel.element.getAttribute('data-ml-ui-theme')).toBe('dark')
    expect(panel.element.style.getPropertyValue('--ml-ui-bg')).toBe('#1d1e1f')

    acedApplyUiTheme('light', document.documentElement, { isolated: true })
    expect(panel.theme).toBe('light')
    expect(panel.element.getAttribute('data-ml-ui-theme')).toBe('light')
    expect(panel.element.style.getPropertyValue('--ml-ui-bg')).toBe('#ffffff')

    panel.dispose()
  })
})
