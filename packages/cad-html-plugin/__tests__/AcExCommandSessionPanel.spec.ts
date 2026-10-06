/** @jest-environment jsdom */

jest.mock('../../cad-simple-viewer/src/ui/AcUiHelpPanel', () => ({
  AcUiHelpPanel: jest.fn().mockImplementation(() => ({
    showDocs: jest.fn(),
    hide: jest.fn(),
    setLabels: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../src/AcExHtmlSimpleViewerUi', () => {
  const actual = jest.requireActual(
    '../../cad-simple-viewer/src/ui/AcUiMobileSessionPanel'
  ) as typeof import('../../cad-simple-viewer/src/ui/AcUiMobileSessionPanel')
  return {
    AcUiHelpPanel: jest.fn().mockImplementation(() => ({
      showDocs: jest.fn(),
      hide: jest.fn(),
      setLabels: jest.fn(),
      dispose: jest.fn()
    })),
    AcUiMobileSessionPanel: actual.AcUiMobileSessionPanel
  }
})

import { AcExCommandSessionPanel } from '../src/AcExCommandSessionPanel'
import { AcExHtmlI18n } from '../src/AcExHtmlI18n'
import { ML_UI_MOBILE_MAX_WIDTH } from '../src/AcExHtmlShell'

function mountRoot(): HTMLElement {
  document.body.innerHTML = `<div id="mlcad-root"><div id="mlcad-canvas-host"></div><footer id="mlcad-status-bar"></footer></div>`
  return document.getElementById('mlcad-canvas-host') as HTMLElement
}

function mockPhone(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes(`${ML_UI_MOBILE_MAX_WIDTH}`) ? matches : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }) as unknown as MediaQueryList
}

describe('AcExCommandSessionPanel', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    document.body.replaceChildren()
    window.matchMedia = originalMatchMedia
  })

  it('hides when state is null and shows relative metrics when active', () => {
    mockPhone(true)
    const host = mountRoot()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const onChip = jest.fn()
    panel.setHandlers({ onConfirm, onCancel, onChip })

    expect(panel.isOpen).toBe(false)

    panel.setState({
      prompt: 'Specify next point',
      confirmEnabled: true,
      chips: [{ id: 'undo', label: 'Undo' }],
      metrics: {
        hasBasePoint: true,
        lengthText: '10',
        angleText: '0',
        dxText: '10',
        dyText: '0',
        xText: '10',
        yText: '0'
      }
    })

    expect(panel.isOpen).toBe(true)
    expect(
      document.getElementById('mlcad-root')?.classList.contains(
        'mlcad-session-active'
      )
    ).toBe(true)
    expect(host.querySelector('.ml-mobile-cmd-prompt')?.textContent).toBe(
      'Specify next point'
    )
    expect(
      host.querySelector(
        '[data-metric="length"] .ml-mobile-cmd-metric-value'
      )?.textContent
    ).toBe('10')
    const polar = host.querySelector(
      '.ml-mobile-cmd-group-polar'
    ) as HTMLElement
    expect(polar.hidden).toBe(false)
    expect(polar.querySelector('.ml-mobile-cmd-cancel')).toBeTruthy()
    expect(
      host
        .querySelector('.ml-mobile-cmd-group-delta')
        ?.querySelector('.ml-mobile-cmd-confirm')
    ).toBeTruthy()

    host.querySelector('.ml-mobile-cmd-confirm')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)

    host.querySelector('.ml-mobile-cmd-cancel')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
    expect(onCancel).toHaveBeenCalledTimes(1)

    panel.setState(null)
    expect(panel.isOpen).toBe(false)
    expect(
      document.getElementById('mlcad-root')?.classList.contains(
        'mlcad-session-active'
      )
    ).toBe(false)
    panel.dispose()
  })

  it('shows absolute metrics when there is no base point', () => {
    mockPhone(true)
    const host = mountRoot()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setHandlers({
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Specify first point',
      confirmEnabled: false,
      chips: [],
      metrics: {
        hasBasePoint: false,
        lengthText: '0',
        angleText: '0',
        dxText: '0',
        dyText: '0',
        xText: '12',
        yText: '8'
      }
    })
    const abs = host.querySelector('.ml-mobile-cmd-group-abs') as HTMLElement
    expect(abs.hidden).toBe(false)
    expect(
      abs.querySelector('[data-metric="x"] .ml-mobile-cmd-metric-value')
        ?.textContent
    ).toBe('12')
    expect(abs.querySelector('.ml-mobile-cmd-cancel')).toBeTruthy()
    expect(abs.querySelector('.ml-mobile-cmd-confirm')).toBeTruthy()
    expect(
      (host.querySelector('.ml-mobile-cmd-group-polar') as HTMLElement).hidden
    ).toBe(true)
    panel.dispose()
  })

  it('keeps cancel and confirm together in the pad session card', () => {
    mockPhone(false)
    const host = mountRoot()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setHandlers({
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      onChip: jest.fn()
    })
    panel.setState({
      prompt: 'Specify next point',
      confirmEnabled: true,
      chips: [],
      metrics: {
        hasBasePoint: true,
        lengthText: '10',
        angleText: '0',
        dxText: '10',
        dyText: '0',
        xText: '10',
        yText: '0'
      }
    })
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
    panel.dispose()
  })

  it('exposes an accessory host and clears it on hide', () => {
    mockPhone(true)
    const host = mountRoot()
    const panel = new AcExCommandSessionPanel(host, new AcExHtmlI18n('en'))
    panel.setState({
      prompt: 'Specify point',
      confirmEnabled: true,
      chips: [],
      metrics: null
    })
    const row = host.querySelector('.ml-mobile-cmd-accessory') as HTMLElement
    expect(row.hidden).toBe(false)
    expect(host.querySelector('.ml-mobile-cmd-help')).toBeTruthy()
    expect(host.querySelector('.ml-mobile-cmd-collapse')).toBeTruthy()

    panel.setAccessory({
      id: 'style',
      mount(slot) {
        slot.appendChild(document.createElement('span'))
      },
      unmount() {
        /* no-op */
      }
    })
    expect(
      host.querySelector('.ml-mobile-cmd-accessory-content')?.firstElementChild
        ?.tagName
    ).toBe('SPAN')

    panel.setState(null)
    expect(row.hidden).toBe(true)
    expect(
      host.querySelector('.ml-mobile-cmd-accessory-content')?.childElementCount
    ).toBe(0)
    panel.dispose()
  })
})
