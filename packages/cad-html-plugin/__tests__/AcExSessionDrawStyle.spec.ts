/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'

import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'

Object.assign(globalThis, { TextDecoder, TextEncoder })

jest.mock('../src/AcExHtmlSimpleViewerUi', () => {
  const colorDialog = jest.requireActual(
    '../../cad-simple-viewer/src/ui/AcUiAciColorDialog.ts'
  )
  return {
    ...colorDialog,
    createIconElement: (icon: unknown) => {
      const wrap = document.createElement('span')
      wrap.className = 'ml-ex-ui-icon'
      wrap.innerHTML = typeof icon === 'string' ? icon : ''
      return wrap
    },
    ICON_TEXT_HEIGHT: '<svg></svg>',
    AcUiTextHeightDialog: {
      open: async () => null
    }
  }
})

// Value import after the polyfill: `@mlightcad/data-model` needs TextDecoder in jsdom.
import { setupAcExSessionDrawStyle } from '../src/AcExSessionDrawStyle'

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
    document.getElementById('ml-ui-dialog-styles')?.remove()
  })

  it('mounts color and text-height controls into the session host, not a canvas overlay', () => {
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
    expect(host.querySelector('.mlcad-session-style__text-height')).toBeTruthy()
    expect(host.querySelector('.ml-aci-stacks')).toBeNull()
    expect(host.querySelector('.mlcad-session-style__select')).toBeNull()
    expect(canvasRoot.childElementCount).toBe(0)
    expect(document.querySelector('.ml-draw-style-toolbar')).toBeNull()

    accessory.unmount()
    expect(host.querySelector('.mlcad-session-style')).toBeNull()
    expect(canvasRoot.childElementCount).toBe(0)

    controller.dispose()
  })

  it('opens the shared ACI color dialog when the swatch is clicked', async () => {
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
    accessory.mount(host)

    const swatch = host.querySelector(
      '.mlcad-session-style__swatch'
    ) as HTMLButtonElement
    swatch.click()
    await Promise.resolve()

    const dialog = document.querySelector(
      '.ml-ui-aci-color-dialog'
    ) as HTMLElement
    expect(dialog).toBeTruthy()
    expect(dialog.querySelector('.ml-aci-preview-box')).toBeTruthy()
    expect(dialog.querySelector('.ml-aci-input-row input')).toBeTruthy()
    expect(
      [...dialog.querySelectorAll('button')].map(b => b.textContent)
    ).not.toEqual(expect.arrayContaining(['ByLayer', 'ByBlock']))

    const cell = dialog.querySelector(
      '.ml-aci-cell[data-aci="18"]'
    ) as HTMLButtonElement
    cell.click()
    const ok = [...dialog.querySelectorAll('button')].find(
      b => b.textContent === 'drawStyle.ok'
    )
    expect(ok).toBeTruthy()
    ok?.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(applyStyle).toHaveBeenCalledWith(
      'measure',
      expect.objectContaining({ color: expect.any(String) })
    )

    accessory.unmount()
    controller.dispose()
  })
})
