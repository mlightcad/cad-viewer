/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'

import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'

Object.assign(globalThis, { TextDecoder, TextEncoder })

jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual('../../cad-simple-viewer/src/ui/AcApAciPaletteUi.ts')
)

// Value import after the polyfill: `@mlightcad/data-model` needs TextDecoder in jsdom.
const { setupAcExSessionDrawStyle } =
  require('../src/AcExSessionDrawStyle') as typeof import('../src/AcExSessionDrawStyle')

function fakeI18n(): AcExHtmlI18n {
  return {
    t: (key: string) => key
  } as AcExHtmlI18n
}

describe('setupAcExSessionDrawStyle', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById('mlcad-session-style-styles')?.remove()
    document.getElementById('ml-aci-palette-styles')?.remove()
  })

  it('mounts color and font-size controls into the session host, not a canvas overlay', () => {
    const canvasRoot = document.createElement('div')
    canvasRoot.id = 'mlcad-canvas-host'
    document.body.appendChild(canvasRoot)
    const host = document.createElement('div')
    document.body.appendChild(host)

    const applyStyle = jest.fn()
    const controller = setupAcExSessionDrawStyle({
      i18n: fakeI18n(),
      getKind: () => 'measure',
      getStyle: () => ({ color: '#ff0000', fontSize: 16 }),
      applyStyle
    })

    const accessory = controller.createSessionAccessory()
    expect(accessory.id).toBe('draw-style')
    accessory.mount(host)

    expect(host.querySelector('.mlcad-session-style')).toBeTruthy()
    expect(host.querySelector('.mlcad-session-style__swatch')).toBeTruthy()
    expect(host.querySelector('.ml-aci-stacks')).toBeTruthy()
    expect(
      (host.querySelector('.mlcad-session-style__select') as HTMLSelectElement)
        .value
    ).toBe('16')
    expect(canvasRoot.childElementCount).toBe(0)
    expect(document.querySelector('.ml-draw-style-toolbar')).toBeNull()

    const select = host.querySelector(
      '.mlcad-session-style__select'
    ) as HTMLSelectElement
    select.value = '20'
    select.dispatchEvent(new Event('change'))
    expect(applyStyle).toHaveBeenCalledWith('measure', { fontSize: 20 })

    accessory.unmount()
    expect(host.querySelector('.mlcad-session-style')).toBeNull()
    expect(canvasRoot.childElementCount).toBe(0)

    controller.dispose()
  })
})
