/** @jest-environment jsdom */

import { AcEdDesktopSessionAccessoryChrome } from '../src/editor/input/ui/AcEdDesktopSessionAccessoryChrome'

describe('AcEdDesktopSessionAccessoryChrome', () => {
  let host: HTMLDivElement

  beforeEach(() => {
    document.body.innerHTML = ''
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  it('mounts and unmounts accessories by id', () => {
    const chrome = new AcEdDesktopSessionAccessoryChrome(host)
    const mount = jest.fn((slot: HTMLElement) => {
      slot.appendChild(document.createElement('span'))
    })
    const unmount = jest.fn()

    chrome.setAccessory({ id: 'draw-style', mount, unmount })
    const root = host.querySelector('.ml-desktop-session-accessory') as HTMLElement
    expect(root.hidden).toBe(false)
    expect(root.classList.contains('is-visible')).toBe(true)
    expect(mount).toHaveBeenCalledTimes(1)
    expect(
      root.querySelector('.ml-desktop-session-accessory__slot')?.firstElementChild
        ?.tagName
    ).toBe('SPAN')

    chrome.setAccessory(null)
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(root.hidden).toBe(true)
    expect(root.classList.contains('is-visible')).toBe(false)
    chrome.dispose()
  })

  it('skips remounting when the same accessory id is already active', () => {
    const chrome = new AcEdDesktopSessionAccessoryChrome(host)
    const mount = jest.fn()
    const unmount = jest.fn()
    const accessory = { id: 'draw-style', mount, unmount }

    chrome.setAccessory(accessory)
    chrome.setAccessory({ id: 'draw-style', mount: jest.fn(), unmount: jest.fn() })
    expect(mount).toHaveBeenCalledTimes(1)
    expect(unmount).not.toHaveBeenCalled()
    chrome.dispose()
  })

  it('replaces accessories with different ids', () => {
    const chrome = new AcEdDesktopSessionAccessoryChrome(host)
    const firstUnmount = jest.fn()
    const secondMount = jest.fn()

    chrome.setAccessory({
      id: 'draw-style',
      mount: jest.fn(),
      unmount: firstUnmount
    })
    chrome.setAccessory({
      id: 'other',
      mount: secondMount,
      unmount: jest.fn()
    })

    expect(firstUnmount).toHaveBeenCalledTimes(1)
    expect(secondMount).toHaveBeenCalledTimes(1)
    chrome.dispose()
  })
})
