/** @jest-environment jsdom */

import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'
import { setupAcExHtmlNavTools } from '../src/AcExHtmlNavTools'

function mountToolbar() {
  document.body.innerHTML = `
    <div id="mlcad-root"></div>
    <nav id="mlcad-toolbar">
      <button type="button" data-action="select"></button>
      <button type="button" data-action="pan" aria-pressed="true"></button>
      <button type="button" data-action="zoom-window"></button>
    </nav>
  `
}

function fakeI18n(): AcExHtmlI18n {
  return {
    t: (key: string) => key
  } as AcExHtmlI18n
}

describe('setupAcExHtmlNavTools', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('defaults to pan and exits drawing tools when select / pan / zoom-window are activated', () => {
    mountToolbar()
    const exitDrawingTools = jest.fn()
    const nav = setupAcExHtmlNavTools({
      root: document.getElementById('mlcad-root') as HTMLElement,
      i18n: fakeI18n(),
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents: jest.fn(),
      exitDrawingTools,
      isDrawingActive: () => false
    })

    expect(nav.getMode()).toBe('pan')
    expect(
      document
        .querySelector('[data-action="pan"]')
        ?.classList.contains('active')
    ).toBe(true)

    nav.setMode('select')
    expect(exitDrawingTools).toHaveBeenCalledTimes(1)
    expect(nav.getMode()).toBe('select')
    expect(nav.isPanEnabled()).toBe(false)
    expect(
      document
        .querySelector('[data-action="select"]')
        ?.classList.contains('active')
    ).toBe(true)
    expect(
      document
        .querySelector('[data-action="pan"]')
        ?.classList.contains('active')
    ).toBe(false)

    nav.setMode('zoom-window')
    expect(exitDrawingTools).toHaveBeenCalledTimes(2)
    expect(nav.getMode()).toBe('zoom-window')
  })

  it('does not highlight nav buttons while a drawing tool is active', () => {
    mountToolbar()
    let drawing = true
    const nav = setupAcExHtmlNavTools({
      root: document.getElementById('mlcad-root') as HTMLElement,
      i18n: fakeI18n(),
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents: jest.fn(),
      exitDrawingTools: jest.fn(),
      isDrawingActive: () => drawing
    })
    nav.syncButtons()

    expect(
      document
        .querySelector('[data-action="pan"]')
        ?.classList.contains('active')
    ).toBe(false)

    drawing = false
    nav.syncButtons()
    expect(
      document
        .querySelector('[data-action="pan"]')
        ?.classList.contains('active')
    ).toBe(true)
  })

  it('zooms to the clicked window then returns to the previous idle tool', () => {
    mountToolbar()
    const zoomToExtents = jest.fn()
    const nav = setupAcExHtmlNavTools({
      root: document.getElementById('mlcad-root') as HTMLElement,
      i18n: fakeI18n(),
      screenToWcs: (x, y) => ({ x, y }),
      zoomToExtents,
      exitDrawingTools: jest.fn(),
      isDrawingActive: () => false
    })

    nav.setMode('select')
    nav.setMode('zoom-window')
    expect(nav.handlePointerDown(10, 20)).toBe(true)
    nav.handlePointerMove(40, 80)
    expect(nav.handlePointerDown(40, 80)).toBe(true)
    expect(zoomToExtents).toHaveBeenCalledWith({
      minX: 10,
      minY: 20,
      maxX: 40,
      maxY: 80
    })
    expect(nav.getMode()).toBe('select')
  })
})
