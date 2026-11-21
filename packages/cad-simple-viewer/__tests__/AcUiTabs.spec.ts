/**
 * @jest-environment jsdom
 */
import { acuiFormStack } from '../src/ui/acuiFormControls'
import { AcUiTabs } from '../src/ui/AcUiTabs'

describe('AcUiTabs', () => {
  it('shows only the selected panel when panels use display:flex', () => {
    const data = acuiFormStack()
    data.textContent = 'data'
    const display = acuiFormStack()
    display.textContent = 'display'
    const tabs = new AcUiTabs({
      tabs: [
        { id: 'data', label: 'Data', panel: data },
        { id: 'display', label: 'Display', panel: display }
      ],
      initialId: 'data'
    })
    document.body.append(tabs.root)

    expect(getComputedStyle(data).display).not.toBe('none')
    expect(getComputedStyle(display).display).toBe('none')

    tabs.select('display')
    expect(tabs.activeId()).toBe('display')
    expect(getComputedStyle(data).display).toBe('none')
    expect(getComputedStyle(display).display).not.toBe('none')

    tabs.root.remove()
  })

  it('moves off a tab when that tab is disabled', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    const tabs = new AcUiTabs({
      tabs: [
        { id: 'first', label: 'First', panel: first },
        { id: 'second', label: 'Second', panel: second }
      ],
      initialId: 'second'
    })
    tabs.setEnabled('second', false)
    expect(tabs.activeId()).toBe('first')
    expect(second.hidden).toBe(true)
  })
})
