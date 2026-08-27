/**
 * @jest-environment jsdom
 */

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcEdOpenMode: { Write: 1, Review: 2 },
  ML_UI_MOBILE_MAX_WIDTH: 768,
  acedIsMobileUiLayout: () => false,
  ML_UI_MOBILE_MEDIA_QUERY: '(max-width: 768px)'
}))

const updateItems = jest.fn()
const setSelectedChild = jest.fn()
const destroy = jest.fn()
const setEdgeOffset = jest.fn()
const getEdgeOffset = jest.fn(() => 12)
const setOverflow = jest.fn()
const getOverflow = jest.fn(() => 'menu')
const setPlacement = jest.fn()

jest.mock('@mlightcad/cad-simple-ui-plugin/toolbar', () => {
  class AcUiToolbar {
    element = document.createElement('div')
    isCollapsed = false
    placement = 'left'
    updateItems = updateItems
    setSelectedChild = setSelectedChild
    destroy = destroy
    setEdgeOffset = setEdgeOffset
    getEdgeOffset = getEdgeOffset
    setOverflow = setOverflow
    getOverflow = getOverflow
    setPlacement = setPlacement
    setCollapsible = jest.fn()
    constructor(public options: Record<string, unknown>) {
      const host = options.host as HTMLElement
      host.appendChild(this.element)
    }
  }
  return {
    AcUiToolbar,
    acuiCreateToolbarSeparator: (id: string) => ({ type: 'separator', id }),
    acuiExpandToolbarItemConfigs: (items: unknown[]) => items,
    acuiInsertToolbarItemsAt: (items: unknown[]) => items,
    acuiToolbarPreset: (preset: string) => ({ preset }),
    acuiGetLayoutKind: () => 'desktop',
    ML_EX_UI_MOBILE_MEDIA_QUERY: '(max-width: 600px)',
    ML_EX_UI_COMPACT_MEDIA_QUERY: '(max-width: 960px)'
  }
})

import { setupAcExHtmlSimpleToolbar } from '../src/AcExHtmlSimpleToolbar'
import type { AcExHtmlI18n } from '../src/AcExHtmlI18n'

describe('setupAcExHtmlSimpleToolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    updateItems.mockClear()
    setSelectedChild.mockClear()
    destroy.mockClear()
    setEdgeOffset.mockClear()
    setOverflow.mockClear()
    setPlacement.mockClear()
  })

  it('mounts AcUiToolbar absolutely on the viewer root with edgeOffset and overflow', () => {
    const host = document.getElementById('root')!
    const onCommand = jest.fn()
    const onRender = jest.fn()
    const i18n = { t: (key: string) => key } as AcExHtmlI18n

    const controller = setupAcExHtmlSimpleToolbar({
      host,
      i18n,
      context: {
        viewerMode: 'view',
        exportLayouts: false,
        getLayouts: () => [],
        getActiveLayoutBtrId: () => '',
        getLocale: () => 'en',
        getOrtho: () => false,
        getPolar: () => false,
        isMeasureVisible: () => true,
        isMarkupVisible: () => true
      },
      onCommand,
      onRender
    })

    expect(host.contains(controller.toolbar.element)).toBe(true)
    expect(
      (controller.toolbar as unknown as { options: Record<string, unknown> })
        .options.positioning
    ).toBe('absolute')
    expect(
      (controller.toolbar as unknown as { options: Record<string, unknown> })
        .options.overflow
    ).toBe('menu')
    expect(
      (controller.toolbar as unknown as { options: Record<string, unknown> })
        .options.edgeOffset
    ).toBe(12)
    expect(
      (controller.toolbar as unknown as { options: Record<string, unknown> })
        .options.onRender
    ).toBe(onRender)
    expect(setSelectedChild).toHaveBeenCalledWith('locale', 'locale-en')

    controller.setEdgeOffset(0)
    expect(setEdgeOffset).toHaveBeenCalledWith(0)
    controller.setOverflow('scroll')
    expect(setOverflow).toHaveBeenCalledWith('scroll')
    controller.setPlacement('top')
    expect(setPlacement).toHaveBeenCalledWith('top')

    controller.destroy()
    expect(destroy).toHaveBeenCalled()
  })
})
