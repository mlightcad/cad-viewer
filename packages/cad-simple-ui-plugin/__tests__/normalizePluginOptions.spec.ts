/** Unit tests for plugin option normalization and layout toolbar merge. */

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curDocument: undefined
    }
  },
  isMarkupVisible: () => true,
  isMeasurementVisible: () => true,
  AcEdOpenMode: {
    Read: 0,
    Review: 4,
    Write: 8
  }
}))

jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: jest.fn()
    }
  })
}))

import {
  acuiNormalizePluginOptions,
  acuiResolveLayoutToolbarConfig
} from '../src/config/normalizePluginOptions'
import { MOBILE_DEFAULT_TOOLBAR_ITEMS } from '../src/config/defaultToolbarItems'

describe('acuiNormalizePluginOptions', () => {
  it('does not create dock panel by default', () => {
    const resolved = acuiNormalizePluginOptions({})
    expect(resolved.shouldCreateDockPanel).toBe(false)
    expect(resolved.dockPanel.defaultSide).toBe('left')
    expect(resolved.dockPanel.defaultOpen).toBe(false)
    expect(resolved.dockPanel.defaultHeight).toBe(240)
    expect(resolved.dockPanel.defaultWidth).toBe(280)
  })

  it('creates dock panel when explicitly enabled', () => {
    const resolved = acuiNormalizePluginOptions({
      dockPanel: { enabled: true }
    })
    expect(resolved.shouldCreateDockPanel).toBe(true)
  })

  it('applies dock panel option overrides', () => {
    const resolved = acuiNormalizePluginOptions({
      dockPanel: {
        enabled: true,
        defaultOpen: true,
        defaultSide: 'right',
        defaultHeight: 300,
        defaultWidth: 320
      }
    })
    expect(resolved.dockPanel.defaultOpen).toBe(true)
    expect(resolved.dockPanel.defaultSide).toBe('right')
    expect(resolved.dockPanel.defaultHeight).toBe(300)
    expect(resolved.dockPanel.defaultWidth).toBe(320)
  })

  it('defaults toolbar edge offset and overflow for desktop snapshot', () => {
    const resolved = acuiNormalizePluginOptions({})
    expect(resolved.layout).toBe('auto')
    expect(resolved.toolbar.edgeOffset).toBe(8)
    expect(resolved.toolbar.overflow).toBe('menu')
    expect(resolved.toolbar.placement).toBe('right')
  })

  it('keeps mobile defaults when top-level toolbar is set', () => {
    const resolved = acuiNormalizePluginOptions({
      toolbar: {
        placement: 'left',
        collapsible: true,
        edgeOffset: 16
      }
    })
    expect(resolved.layoutToolbars.mobile.placement).toBe('bottom')
    expect(resolved.layoutToolbars.mobile.edgeOffset).toBe(0)
    expect(resolved.layoutToolbars.mobile.collapsible).toBe(false)
    expect(resolved.layoutToolbars.mobile.items).toEqual(
      MOBILE_DEFAULT_TOOLBAR_ITEMS
    )
    expect(resolved.layoutToolbars.desktop.placement).toBe('left')
    expect(resolved.layoutToolbars.desktop.collapsible).toBe(true)
    expect(resolved.layoutToolbars.desktop.edgeOffset).toBe(16)
    expect(resolved.layoutToolbars.pad.placement).toBe('left')
  })

  it('applies layouts.mobile overrides', () => {
    const resolved = acuiNormalizePluginOptions({
      layouts: {
        mobile: {
          toolbar: {
            edgeOffset: 4,
            placement: 'top'
          }
        }
      }
    })
    expect(resolved.layoutToolbars.mobile.edgeOffset).toBe(4)
    expect(resolved.layoutToolbars.mobile.placement).toBe('top')
  })

  it('locks layout when layout is forced', () => {
    const resolved = acuiNormalizePluginOptions({ layout: 'mobile' })
    expect(resolved.layout).toBe('mobile')
    expect(resolved.toolbar.placement).toBe('bottom')
    expect(resolved.toolbar.edgeOffset).toBe(0)
  })
})

describe('acuiResolveLayoutToolbarConfig', () => {
  it('does not merge top-level toolbar into mobile', () => {
    const config = acuiResolveLayoutToolbarConfig(
      {
        toolbar: { collapsible: true, placement: 'left' }
      },
      'mobile'
    )
    expect(config.collapsible).toBe(false)
    expect(config.placement).toBe('bottom')
  })
})
