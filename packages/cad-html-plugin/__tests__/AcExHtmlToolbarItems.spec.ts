import {
  createAcExHtmlToolbarItems,
  getAcExHtmlBuiltInToolbarConfig,
  resolveAcExHtmlToolbarConfig
} from '../src/AcExHtmlToolbarItems'

describe('createAcExHtmlToolbarItems', () => {
  const baseCtx = {
    viewerMode: 'measure' as const,
    exportLayouts: true,
    getLayouts: () => [
      { btrId: '1', name: 'Model' },
      { btrId: '2', name: 'Layout1' }
    ],
    getActiveLayoutBtrId: () => '1',
    getLocale: () => 'en' as const,
    getOrtho: () => false,
    getPolar: () => false,
    isMeasureVisible: () => true,
    isMarkupVisible: () => true
  }

  it('builds navigation, measure, markup, snap, and locale items in measure mode', () => {
    const items = createAcExHtmlToolbarItems(baseCtx)
    const ids = items.map(item => ('id' in item ? item.id : undefined))

    expect(ids).toEqual(
      expect.arrayContaining([
        'select',
        'pan',
        'zoom',
        'measure',
        'markup',
        'layer',
        'layout',
        'snap',
        'locale'
      ])
    )

    const zoom = items.find(item => 'id' in item && item.id === 'zoom') as {
      children?: Array<{ id: string; command?: string }>
      childIcon?: string
    }
    expect(zoom.childIcon).toBe('selected')
    expect(zoom.children?.map(c => c.command)).toEqual([
      'html:zoom-fit',
      'html:zoom-window',
      'html:zoom-original'
    ])

    const measure = items.find(item => 'id' in item && item.id === 'measure') as {
      childrenUi?: string
      children?: Array<{ command?: string }>
    }
    expect(measure.childrenUi).toBe('sticky-toolbar')
    expect(measure.children?.some(c => c.command === 'html:measure:distance')).toBe(
      true
    )
  })

  it('omits measure/markup/snap in view mode', () => {
    const items = createAcExHtmlToolbarItems({
      ...baseCtx,
      viewerMode: 'view'
    })
    const ids = items.map(item => ('id' in item ? item.id : undefined))

    expect(ids).toContain('select')
    expect(ids).toContain('layer')
    expect(ids).toContain('locale')
    expect(ids).not.toContain('measure')
    expect(ids).not.toContain('markup')
    expect(ids).not.toContain('snap')
  })

  it('omits layout when exportLayouts is false', () => {
    const items = createAcExHtmlToolbarItems({
      ...baseCtx,
      exportLayouts: false
    })
    const ids = items.map(item => ('id' in item ? item.id : undefined))
    expect(ids).not.toContain('layout')
  })

  it('marks the active layout via toggle.getValue', () => {
    const items = createAcExHtmlToolbarItems(baseCtx)
    const layout = items.find(item => 'id' in item && item.id === 'layout') as {
      children?: Array<{
        id: string
        toggle?: { getValue: () => boolean }
      }>
    }

    expect(layout.children?.map(child => child.id)).toEqual([
      'layout-1',
      'layout-2'
    ])
    expect(layout.children?.[0].toggle?.getValue()).toBe(true)
    expect(layout.children?.[1].toggle?.getValue()).toBe(false)
  })

  it('builds a compact mobile toolbar from presets', () => {
    const config = getAcExHtmlBuiltInToolbarConfig('mobile', baseCtx)
    expect(config.placement).toBe('bottom')
    expect(config.edgeOffset).toBe(0)
    expect(config.collapsible).toBe(false)
    expect(config.contentWidth).toBe('full')
    expect(config.itemDistribution).toBe('evenly')
    expect(config.showItemLabels).toBe(true)

    const items = resolveAcExHtmlToolbarConfig(config, baseCtx)
    expect(items.map(item => item.id)).toEqual([
      'zoom',
      'measure',
      'markup',
      'layer',
      'layout',
      'settings'
    ])
    const settings = items.find(item => item.id === 'settings')
    expect(settings?.children?.map(child => child.id)).toEqual([
      'locale',
      'snap'
    ])
  })
})
