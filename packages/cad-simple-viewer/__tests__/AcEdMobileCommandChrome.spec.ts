/** @jest-environment jsdom */

jest.mock('../src/i18n/AcApI18n', () => ({
  AcApI18n: {
    t: (key: string) => key,
    currentLocale: 'en',
    events: {
      localeChanged: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    }
  }
}))

jest.mock('../src/app/AcApDocsUrl', () => ({
  ACAP_DOCS_PATH_MAGNIFIER: 'guide/magnifier.html',
  acapDocsUrl: jest.fn(() => 'https://example.com/docs/guide/magnifier.html')
}))

jest.mock('../src/ui/AcUiHelpPanel', () => ({
  AcUiHelpPanel: jest.fn().mockImplementation(() => ({
    showDocs: jest.fn(),
    setLabels: jest.fn(),
    dispose: jest.fn(),
    isOpen: false
  }))
}))

import {
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MEDIA_QUERY,
  ML_UI_SESSION_PANEL_WIDTH
} from '../src/editor/global/AcEdUiLayout'
import { AcEdMobileCommandChrome } from '../src/editor/input/ui/AcEdMobileCommandChrome'

function installMatchMedia(matches: (query: string) => boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    })
  })
  return {
    restore() {
      if (descriptor) {
        Object.defineProperty(window, 'matchMedia', descriptor)
      }
    }
  }
}

describe('AcEdMobileCommandChrome', () => {
  let host: HTMLElement
  let chrome: AcEdMobileCommandChrome

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    chrome = new AcEdMobileCommandChrome(host)
  })

  afterEach(() => {
    chrome.dispose()
    host.remove()
  })

  it('stays hidden on desktop layouts', () => {
    const media = installMatchMedia(() => false)
    const onConfirm = jest.fn()
    chrome.show(
      {
        prompt: 'Specify first point:',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm, onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    expect(chrome.isOpen).toBe(false)
    expect((host.querySelector('.ml-mobile-cmd') as HTMLElement).hidden).toBe(
      true
    )
    expect(onConfirm).not.toHaveBeenCalled()
    media.restore()
  })

  it('shows the in-panel prompt, disables ✓ when allowNone is false, and maps × to cancel', () => {
    const media = installMatchMedia(
      query =>
        query === ML_UI_MOBILE_MEDIA_QUERY ||
        query === ML_UI_COMPACT_MEDIA_QUERY
    )
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    chrome.show(
      {
        prompt: 'Specify next point:',
        keywords: [{ displayName: 'Undo', globalName: 'Undo', enabled: true }],
        allowNone: false,
        showMetrics: true
      },
      { onConfirm, onCancel, onKeyword: jest.fn() }
    )

    expect(chrome.isOpen).toBe(true)
    expect(host.classList.contains('ml-mobile-cmd-active')).toBe(true)
    expect(host.querySelector('.ml-mobile-cmd-prompt')?.textContent).toBe(
      'Specify next point'
    )
    const panel = host.querySelector('.ml-mobile-cmd-panel') as HTMLElement
    expect(
      panel.querySelector('.ml-mobile-cmd-accessory')
    ).toBeTruthy()
    expect(
      (panel.querySelector('.ml-mobile-cmd-accessory') as HTMLElement).hidden
    ).toBe(false)
    expect(panel.querySelector('.ml-mobile-cmd-help')).toBeTruthy()
    expect(panel.querySelector('.ml-mobile-cmd-collapse')).toBeTruthy()
    expect(panel.querySelector('.ml-mobile-cmd-prompt-row')).toBeTruthy()
    expect(panel.querySelector('.ml-mobile-cmd-chip')?.textContent).toBe('Undo')

    const confirm = host.querySelector(
      '.ml-mobile-cmd-confirm'
    ) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    confirm.click()
    expect(onConfirm).not.toHaveBeenCalled()

    host.querySelector('.ml-mobile-cmd-cancel')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(onCancel).toHaveBeenCalledTimes(1)

    const abs = host.querySelector('.ml-mobile-cmd-group-abs') as HTMLElement
    expect(abs.hidden).toBe(false)
    expect(abs.querySelector('[data-metric="x"]')).toBeTruthy()
    expect(abs.querySelector('[data-metric="y"]')).toBeTruthy()
    expect(abs.querySelector('.ml-mobile-cmd-cancel')).toBeTruthy()
    expect(abs.querySelector('.ml-mobile-cmd-confirm')).toBeTruthy()
    expect(
      (host.querySelector('.ml-mobile-cmd-group-polar') as HTMLElement).hidden
    ).toBe(true)

    chrome.setMetrics(
      {
        hasBasePoint: true,
        length: 10,
        angleDeg: 0,
        dx: 10,
        dy: 0,
        x: 10,
        y: 0
      },
      {
        length: '10',
        angle: '0',
        dx: '10',
        dy: '0',
        x: '10',
        y: '0'
      }
    )
    const polar = host.querySelector(
      '.ml-mobile-cmd-group-polar'
    ) as HTMLElement
    expect(polar.hidden).toBe(false)
    expect(polar.querySelector('[data-metric="length"]')).toBeTruthy()
    expect(polar.querySelector('.ml-mobile-cmd-cancel')).toBeTruthy()
    expect(
      host
        .querySelector('.ml-mobile-cmd-group-delta')
        ?.querySelector('.ml-mobile-cmd-confirm')
    ).toBeTruthy()
    expect(abs.hidden).toBe(true)
    media.restore()
  })

  it('keeps cancel and confirm together in the pad session card', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )
    chrome.show(
      {
        prompt: 'Specify next point:',
        keywords: [],
        allowNone: false,
        showMetrics: true
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    chrome.setMetrics(
      {
        hasBasePoint: true,
        length: 10,
        angleDeg: 0,
        dx: 10,
        dy: 0,
        x: 10,
        y: 0
      },
      {
        length: '10',
        angle: '0',
        dx: '10',
        dy: '0',
        x: '10',
        y: '0'
      }
    )
    const shared = host.querySelector(
      '.ml-mobile-cmd-actions-shared'
    ) as HTMLElement
    expect(shared.querySelector('.ml-mobile-cmd-cancel')).toBeTruthy()
    expect(shared.querySelector('.ml-mobile-cmd-confirm')).toBeTruthy()
    expect(
      host
        .querySelector('.ml-mobile-cmd-group-polar')
        ?.querySelector('.ml-mobile-cmd-cancel')
    ).toBeNull()
    expect(
      (host.querySelector('.ml-mobile-cmd-group-polar') as HTMLElement).hidden
    ).toBe(false)
    media.restore()
  })

  it('enables ✓ for allowNone and fires onConfirm', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    const onConfirm = jest.fn()
    chrome.show(
      {
        prompt: 'Select objects',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm, onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    const confirm = host.querySelector(
      '.ml-mobile-cmd-confirm'
    ) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    confirm.click()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    media.restore()
  })

  it('lets accessory children receive pointerdown while sinking bubbles to the host', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    const childHit = jest.fn()
    const hostHit = jest.fn()
    host.addEventListener('pointerdown', hostHit)

    chrome.show(
      {
        prompt: 'Specify point',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    chrome.prepareAccessory()
    const mountHost = chrome.accessoryHost
    const child = document.createElement('button')
    child.type = 'button'
    child.addEventListener('pointerdown', childHit)
    mountHost.appendChild(child)

    child.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(childHit).toHaveBeenCalledTimes(1)
    expect(hostHit).not.toHaveBeenCalled()
    host.removeEventListener('pointerdown', hostHit)
    media.restore()
  })

  it('hides the overlay and clears the host class', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    chrome.show(
      {
        prompt: 'Specify point',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    chrome.hide()
    expect(chrome.isOpen).toBe(false)
    expect(host.classList.contains('ml-mobile-cmd-active')).toBe(false)
    expect((host.querySelector('.ml-mobile-cmd') as HTMLElement).hidden).toBe(
      true
    )
    media.restore()
  })

  it('keeps the last metric readout after hide/show until new live values arrive', () => {
    const media = installMatchMedia(
      query =>
        query === ML_UI_MOBILE_MEDIA_QUERY ||
        query === ML_UI_COMPACT_MEDIA_QUERY
    )
    const show = (prompt: string) =>
      chrome.show(
        {
          prompt,
          keywords: [],
          allowNone: false,
          showMetrics: true
        },
        { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
      )
    show('Specify first point:')
    chrome.setMetrics(
      {
        hasBasePoint: true,
        length: 25,
        angleDeg: 45,
        dx: 10,
        dy: 10,
        x: 10,
        y: 10
      },
      {
        length: '25',
        angle: '45',
        dx: '10',
        dy: '10',
        x: '10',
        y: '10'
      }
    )
    chrome.hide()
    show('Specify next point:')
    const panel = host.querySelector('.ml-mobile-cmd-panel') as HTMLElement
    expect(
      panel.querySelector('[data-metric="length"] .ml-mobile-cmd-metric-value')
        ?.textContent
    ).toBe('25')
    expect(
      panel.querySelector('[data-metric="angle"] .ml-mobile-cmd-metric-value')
        ?.textContent
    ).toBe('45')
    expect(
      panel.querySelector('[data-metric="dx"] .ml-mobile-cmd-metric-value')
        ?.textContent
    ).toBe('10')
    expect(
      (host.querySelector('.ml-mobile-cmd-group-polar') as HTMLElement).hidden
    ).toBe(false)
    media.restore()
  })

  it('exposes an accessory host and clears it on hide', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    chrome.show(
      {
        prompt: 'Specify point',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    chrome.prepareAccessory()
    const row = host.querySelector('.ml-mobile-cmd-accessory') as HTMLElement
    const content = chrome.accessoryHost
    expect(row.hidden).toBe(false)
    expect(row.querySelector('.ml-mobile-cmd-help')).toBeTruthy()
    content.appendChild(document.createElement('span'))
    expect(content.firstElementChild?.tagName).toBe('SPAN')

    chrome.hide()
    expect(row.hidden).toBe(true)
    expect(content.childElementCount).toBe(0)
    expect(row.querySelector('.ml-mobile-cmd-help')).toBeTruthy()
    media.restore()
  })

  it('collapses to a compact bar that keeps prompt and confirm/cancel', () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    chrome.show(
      {
        prompt: 'Specify next point:',
        keywords: [],
        allowNone: true,
        showMetrics: true
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    const panel = host.querySelector('.ml-mobile-cmd-panel') as HTMLElement
    // Empty accessory → prompt (+ chips) live in the title cluster.
    expect(panel.classList.contains('is-prompt-in-title')).toBe(true)
    expect(
      host.querySelector('.ml-mobile-cmd-accessory .ml-mobile-cmd-prompt-row.is-in-title')
    ).toBeTruthy()
    expect(
      host.querySelector('.ml-mobile-cmd-accessory .ml-mobile-cmd-prompt')
        ?.textContent
    ).toBe('Specify next point')

    const collapseBtn = host.querySelector(
      '.ml-mobile-cmd-collapse'
    ) as HTMLButtonElement
    collapseBtn.click()
    expect(panel.classList.contains('is-collapsed')).toBe(true)
    expect(
      (host.querySelector('.ml-mobile-cmd-help') as HTMLButtonElement).hidden
    ).toBe(true)
    expect(
      (host.querySelector('.ml-mobile-cmd-group-abs') as HTMLElement).hidden
    ).toBe(true)
    expect(
      host.querySelector(
        '.ml-mobile-cmd-actions-compact .ml-mobile-cmd-confirm'
      )
    ).toBeTruthy()
    expect(
      host.querySelector('.ml-mobile-cmd-accessory .ml-mobile-cmd-prompt')
        ?.textContent
    ).toBe('Specify next point')
    collapseBtn.click()
    expect(panel.classList.contains('is-collapsed')).toBe(false)
    expect(
      (host.querySelector('.ml-mobile-cmd-help') as HTMLButtonElement).hidden
    ).toBe(false)
    media.restore()
  })

  it('keeps accessory widgets in compact mode and hides the prompt', async () => {
    const media = installMatchMedia(
      query => query === ML_UI_MOBILE_MEDIA_QUERY
    )
    chrome.show(
      {
        prompt: 'Specify next point:',
        keywords: [],
        allowNone: true,
        showMetrics: false
      },
      { onConfirm: jest.fn(), onCancel: jest.fn(), onKeyword: jest.fn() }
    )
    chrome.accessoryHost.appendChild(document.createElement('span'))
    await Promise.resolve()
    const panel = host.querySelector('.ml-mobile-cmd-panel') as HTMLElement
    expect(panel.classList.contains('is-prompt-in-title')).toBe(false)
    expect(
      host.querySelector('.ml-mobile-cmd-prompt-row.is-in-title')
    ).toBeNull()
    expect(
      (host.querySelector('.ml-mobile-cmd-prompt-row') as HTMLElement).hidden
    ).toBe(false)

    host.querySelector('.ml-mobile-cmd-collapse')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(panel.classList.contains('is-collapsed')).toBe(true)
    expect(
      host.querySelector('.ml-mobile-cmd-accessory-content')?.childElementCount
    ).toBe(1)
    expect(
      (host.querySelector('.ml-mobile-cmd-prompt') as HTMLElement).hidden
    ).toBe(true)
    expect(
      (host.querySelector('.ml-mobile-cmd-help') as HTMLButtonElement).hidden
    ).toBe(true)
    media.restore()
  })

  it('uses shared session panel styles with 440px metric-row breakpoint', () => {
    const css = document.getElementById('ml-mobile-cmd-styles')?.textContent ?? ''
    expect(css).toContain('flex: 0 0 36px')
    expect(css).toContain('width: 36px')
    expect(css).toContain('height: 36px')
    expect(css).toContain(`min-width: ${ML_UI_SESSION_PANEL_WIDTH}px`)
    expect(css).toContain('.ml-mobile-cmd-panel.is-collapsed')
    expect(css).toContain('.ml-mobile-cmd-prompt-row')
  })
})
