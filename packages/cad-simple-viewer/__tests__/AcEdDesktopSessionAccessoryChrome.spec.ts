/** @jest-environment jsdom */

import { AcEdDesktopSessionAccessoryChrome } from '../src/editor/input/ui/AcEdDesktopSessionAccessoryChrome'

describe('AcEdDesktopSessionAccessoryChrome', () => {
  let host: HTMLDivElement

  beforeEach(() => {
    document.body.innerHTML = ''
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  it('exposes a mount host and toggles shell visibility', () => {
    const chrome = new AcEdDesktopSessionAccessoryChrome(host)
    expect(chrome.host.classList.contains('ml-desktop-session-accessory__slot')).toBe(
      true
    )

    chrome.prepare()
    const root = host.querySelector('.ml-desktop-session-accessory') as HTMLElement
    expect(root.hidden).toBe(false)
    expect(root.classList.contains('is-visible')).toBe(true)

    chrome.host.appendChild(document.createElement('span'))
    chrome.clear()
    expect(root.hidden).toBe(true)
    expect(root.classList.contains('is-visible')).toBe(false)
    expect(chrome.host.childElementCount).toBe(0)
    chrome.dispose()
  })
})
