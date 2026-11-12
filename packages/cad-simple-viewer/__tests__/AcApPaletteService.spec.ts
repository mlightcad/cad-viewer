/**
 * @jest-environment jsdom
 */
import {
  acapCoveredInsets,
  type AcApPaletteHost,
  AcApPaletteService
} from '../src/app/AcApPaletteService'

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
})

jest.mock('../src/i18n/AcApI18n', () => ({
  AcApI18n: {
    t: (key: string) => key,
    mergeLocaleMessage: jest.fn(),
    events: {
      localeChanged: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    },
    currentLocale: 'en'
  }
}))

function content(id = 'demo') {
  const element = document.createElement('div')
  element.textContent = 'panel'
  return { id, title: 'Demo', element }
}

describe('AcApPaletteService', () => {
  afterEach(() => {
    // Drain any queued named-tab opens before clearing the host.
    AcApPaletteService.setHost({
      show: () => undefined,
      openNamedTab: () => true
    })
    AcApPaletteService.setHost(undefined)
    document.body.replaceChildren()
    document.getElementById('ml-ui-dock-panel-styles')?.remove()
  })

  it('docks the panel in the container when no host is registered', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const panel = content()
    const handle = AcApPaletteService.open(panel, { container })

    const root = container.querySelector('.ml-ex-ui-dock-panel')
    expect(root).not.toBeNull()
    expect(root?.contains(panel.element)).toBe(true)
    expect(root?.getAttribute('data-open')).toBe('true')

    const closed = jest.fn()
    handle.onClosed(closed)
    root
      ?.querySelector<HTMLButtonElement>('.ml-ex-ui-dock-action-btn:last-child')
      ?.click()
    expect(closed).toHaveBeenCalledTimes(1)
    expect(handle.closed).toBe(true)
    expect(container.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
    container.remove()
  })

  it('shows panels through the registered host', () => {
    const hostClose = jest.fn()
    let userClose: (() => void) | undefined
    const host: AcApPaletteHost = {
      show: jest.fn((_content, onUserClose) => {
        userClose = onUserClose
        return { close: hostClose }
      })
    }
    AcApPaletteService.setHost(host)
    expect(AcApPaletteService.hasHost).toBe(true)

    const handle = AcApPaletteService.open(content())
    expect(host.show).toHaveBeenCalledTimes(1)
    const closed = jest.fn()
    handle.onClosed(closed)

    userClose?.()
    expect(closed).toHaveBeenCalledTimes(1)
    expect(hostClose).toHaveBeenCalledTimes(1)
    // Closing again is a no-op.
    handle.close()
    expect(hostClose).toHaveBeenCalledTimes(1)
  })

  it('falls back to the built-in dock when the host declines', () => {
    AcApPaletteService.setHost({ show: () => undefined })
    const container = document.createElement('div')
    document.body.append(container)
    const handle = AcApPaletteService.open(content(), { container })
    expect(container.querySelector('.ml-ex-ui-dock-panel')).not.toBeNull()
    handle.close()
    expect(container.querySelector('.ml-ex-ui-dock-panel')).toBeNull()
  })

  it('openNamedTab delegates to the host when implemented', () => {
    const openNamedTab = jest.fn(() => true)
    AcApPaletteService.setHost({
      show: () => undefined,
      openNamedTab
    })
    expect(AcApPaletteService.openNamedTab('layers')).toBe(true)
    expect(openNamedTab).toHaveBeenCalledWith('layers')
  })

  it('openNamedTab queues until a host with openNamedTab is set', () => {
    expect(AcApPaletteService.openNamedTab('layers')).toBe(true)
    const openNamedTab = jest.fn(() => true)
    AcApPaletteService.setHost({
      show: () => undefined,
      openNamedTab
    })
    expect(openNamedTab).toHaveBeenCalledWith('layers')
  })

  it('openNamedTab returns false when the host omits openNamedTab', () => {
    AcApPaletteService.setHost({ show: () => undefined })
    expect(AcApPaletteService.openNamedTab('layers')).toBe(false)
  })
})

describe('acapCoveredInsets', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    }) as DOMRect

  it('reports the side a docked panel covers', () => {
    const canvas = document.createElement('div')
    const panel = document.createElement('div')
    canvas.getBoundingClientRect = () => rect(0, 0, 1000, 600)
    panel.getBoundingClientRect = () => rect(700, 0, 300, 600)
    expect(acapCoveredInsets(canvas, panel)).toEqual({ right: 300 })

    panel.getBoundingClientRect = () => rect(0, 400, 1000, 200)
    expect(acapCoveredInsets(canvas, panel)).toEqual({ bottom: 200 })
  })

  it('ignores a panel outside the canvas', () => {
    const canvas = document.createElement('div')
    const panel = document.createElement('div')
    canvas.getBoundingClientRect = () => rect(0, 0, 1000, 600)
    panel.getBoundingClientRect = () => rect(1000, 0, 300, 600)
    expect(acapCoveredInsets(canvas, panel)).toBeUndefined()
  })
})
