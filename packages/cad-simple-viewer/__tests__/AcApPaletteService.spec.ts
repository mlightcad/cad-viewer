/**
 * @jest-environment jsdom
 */
import {
  acapCoveredInsets,
  type AcApPaletteHost,
  AcApPaletteService
} from '../src/app/AcApPaletteService'

function content(id = 'demo') {
  const element = document.createElement('div')
  element.textContent = 'panel'
  return { id, title: 'Demo', element }
}

describe('AcApPaletteService', () => {
  afterEach(() => AcApPaletteService.setHost(undefined))

  it('docks the panel in the container when no host is registered', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const panel = content()
    const handle = AcApPaletteService.open(panel, { container })

    const root = container.querySelector('.ml-palette-fallback')
    expect(root).not.toBeNull()
    expect(root?.contains(panel.element)).toBe(true)

    const closed = jest.fn()
    handle.onClosed(closed)
    // The × button closes the panel as the user.
    root
      ?.querySelector<HTMLButtonElement>('.ml-palette-fallback__close')
      ?.click()
    expect(closed).toHaveBeenCalledTimes(1)
    expect(handle.closed).toBe(true)
    expect(container.querySelector('.ml-palette-fallback')).toBeNull()
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

  it('falls back to the built-in panel when the host declines', () => {
    AcApPaletteService.setHost({ show: () => undefined })
    const container = document.createElement('div')
    const handle = AcApPaletteService.open(content(), { container })
    expect(container.querySelector('.ml-palette-fallback')).not.toBeNull()
    handle.close()
    expect(container.querySelector('.ml-palette-fallback')).toBeNull()
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
