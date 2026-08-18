/** Unit tests for toolbar item resolution and open-mode visibility filtering. */
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curDocument: undefined
    }
  },
  /** Minimal mock used by {@link createDefaultToolbarItems} markup visibility toggle. */
  isMarkupVisible: () => true,
  isMeasurementVisible: () => true,
  AcEdOpenMode: {
    Read: 0,
    Review: 4,
    Write: 8
  }
}))

import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import { createDefaultToolbarItems } from '../src/config/defaultToolbarItems'
import {
  filterVisibleToolbarItems,
  isToolbarItemVisible,
  resolveEffectiveToolbarItem,
  resolveParentToolbarDisplay,
  resolveSelectedChildItem,
  resolveToolbarItems
} from '../src/config/resolveToolbarItems'
import { createToolbarSeparator } from '../src/config/toolbarItemUtils'

describe('resolveToolbarItems', () => {
  it('returns default items when items is default', () => {
    const items = resolveToolbarItems({ items: 'default' })
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].id).toBe('select')
  })

  it('appends custom items after defaults', () => {
    const items = resolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'custom', command: 'test' }]
    })
    expect(items.some(item => item.id === 'custom')).toBe(true)
    expect(items[items.length - 1].id).toBe('custom')
  })

  it('inserts appendItems after a root toolbar item id', () => {
    const items = resolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsAfter: 'layer'
    })
    const layerIndex = items.findIndex(item => item.id === 'layer')
    expect(items[layerIndex + 1]?.id).toBe('agent')
  })

  it('inserts appendItems before a root toolbar item id', () => {
    const items = resolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsBefore: 'measure'
    })
    const measureIndex = items.findIndex(item => item.id === 'measure')
    expect(items[measureIndex - 1]?.id).toBe('agent')
  })

  it('prefers appendItemsBefore over appendItemsAfter', () => {
    const items = resolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsAfter: 'select',
      appendItemsBefore: 'measure'
    })
    const measureIndex = items.findIndex(item => item.id === 'measure')
    expect(items[measureIndex - 1]?.id).toBe('agent')
    expect(items.findIndex(item => item.id === 'select') + 1).not.toBe(
      items.findIndex(item => item.id === 'agent')
    )
  })

  it('falls back to the end when the append anchor is missing', () => {
    const items = resolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'custom', command: 'test' }],
      appendItemsAfter: 'missing-item'
    })
    expect(items[items.length - 1].id).toBe('custom')
  })

  it('uses custom item list when provided', () => {
    const items = resolveToolbarItems({
      items: [{ id: 'only', command: 'only' }]
    })
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('only')
  })
})

describe('toolbar visibility', () => {
  it('hides review-only items in read mode', () => {
    const defaults = createDefaultToolbarItems()
    const visible = filterVisibleToolbarItems(defaults, AcEdOpenMode.Read)
    expect(visible.some(item => item.id === 'annotation')).toBe(false)
    expect(visible.some(item => item.id === 'switch-bg')).toBe(true)
    expect(visible.some(item => item.id === 'select')).toBe(true)
  })

  it('shows review-only items in review mode', () => {
    const defaults = createDefaultToolbarItems()
    const visible = filterVisibleToolbarItems(defaults, AcEdOpenMode.Review)
    expect(visible.some(item => item.id === 'annotation')).toBe(true)
    expect(visible.some(item => item.id === 'switch-bg')).toBe(true)
  })

  it('respects minOpenMode on individual items', () => {
    expect(
      isToolbarItemVisible(
        { id: 'x', minOpenMode: AcEdOpenMode.Review },
        AcEdOpenMode.Read
      )
    ).toBe(false)
    expect(
      isToolbarItemVisible(
        { id: 'x', minOpenMode: AcEdOpenMode.Review },
        AcEdOpenMode.Write
      )
    ).toBe(true)
  })

  it('filters nested submenu children by open mode', () => {
    const items = [
      {
        id: 'parent',
        children: [
          { id: 'read-child', command: 'a' },
          {
            id: 'review-child',
            command: 'b',
            minOpenMode: AcEdOpenMode.Review
          }
        ]
      }
    ]
    const visible = filterVisibleToolbarItems(items, AcEdOpenMode.Read)
    expect(visible[0].children?.map(child => child.id)).toEqual(['read-child'])
  })
})

describe('resolveEffectiveToolbarItem', () => {
  it('uses off branch when toggle value is false', () => {
    const item = resolveEffectiveToolbarItem({
      id: 'toggle',
      toggle: {
        getValue: () => false,
        on: { label: 'on-label', command: 'on-cmd' },
        off: { label: 'off-label', command: 'off-cmd' }
      }
    })
    expect(item.label).toBe('off-label')
    expect(item.command).toBe('off-cmd')
  })
})

describe('default toolbar items', () => {
  it('includes export submenu, theme toggle and locale picker', () => {
    const items = createDefaultToolbarItems()
    const exportItem = items.find(item => item.id === 'export')
    expect(exportItem?.children?.map(child => child.command)).toEqual([
      'chtml',
      'cpdf',
      'csvg'
    ])
    expect(items.some(item => item.id === 'theme')).toBe(true)
    expect(items.some(item => item.id === 'locale')).toBe(true)
    expect(items.some(item => item.id === 'toolbar-placement')).toBe(true)
  })

  it('places toolbar placement button before theme', () => {
    const items = createDefaultToolbarItems()
    const themeIndex = items.findIndex(item => item.id === 'theme')
    expect(items[themeIndex - 1]?.id).toBe('toolbar-placement')
  })

  it('places switch background next to the layer manager', () => {
    const items = createDefaultToolbarItems()
    const layerIndex = items.findIndex(item => item.id === 'layer')
    expect(items[layerIndex + 1]?.id).toBe('switch-bg')
  })

  it('includes a separator before settings buttons', () => {
    const items = createDefaultToolbarItems()
    const placementIndex = items.findIndex(
      item => item.id === 'toolbar-placement'
    )
    expect(placementIndex).toBeGreaterThan(0)
    expect(items[placementIndex - 1]).toEqual({
      type: 'separator',
      id: 'sep-settings'
    })
  })

  it('uses selected child icon for toolbar placement and locale', () => {
    const items = createDefaultToolbarItems()
    expect(items.find(item => item.id === 'export')?.childIcon).toBeUndefined()
    expect(
      items.find(item => item.id === 'annotation')?.childIcon
    ).toBeUndefined()
    expect(items.find(item => item.id === 'toolbar-placement')?.childIcon).toBe(
      'selected'
    )
    expect(items.find(item => item.id === 'locale')?.childIcon).toBe('selected')
    expect(items.find(item => item.id === 'measure')?.childIcon).toBeUndefined()
  })

  it('uses markup commands from the review panel in the annotation submenu', () => {
    const items = createDefaultToolbarItems()
    const annotation = items.find(item => item.id === 'annotation')
    expect(
      annotation?.children?.map(child =>
        child.type === 'separator'
          ? 'separator'
          : (child.command ?? child.toggle?.on.command)
      )
    ).toEqual([
      'markupcloud',
      'markupcallout',
      'markuptext',
      'markuprect',
      'markupcircle',
      'markuparrow',
      'markupstamp',
      'markuppanel',
      'markupvis',
      'clearmarkups',
      'separator',
      'markupimport',
      'markupexport'
    ])
    expect(items.some(item => item.id === 'markup-vis')).toBe(false)
    expect(items.some(item => item.id === 'markup-panel')).toBe(false)
    expect(
      annotation?.children?.find(child => child.id === 'markup-vis')?.toggle
    ).toBeDefined()
  })

  it('places measurement visibility in the measure submenu', () => {
    const items = createDefaultToolbarItems()
    const measure = items.find(item => item.id === 'measure')
    expect(
      measure?.children?.map(child =>
        child.type === 'separator'
          ? 'separator'
          : (child.command ?? child.toggle?.on.command)
      )
    ).toEqual([
      'measuredistance',
      'measureangle',
      'measurearea',
      'measurearc',
      'measurepoint',
      'measurementvis',
      'clearmeasurements',
      'separator',
      'measurementimport',
      'measurementexport'
    ])
    expect(
      measure?.children?.find(child => child.id === 'measurement-vis')?.toggle
    ).toBeDefined()
  })

  it('places review tools after measure and export after review', () => {
    const items = createDefaultToolbarItems()
    const measureIndex = items.findIndex(item => item.id === 'measure')
    expect(items[measureIndex + 1]?.id).toBe('annotation')
    expect(items[measureIndex + 2]?.id).toBe('export')
  })

  it('uses sticky sub-toolbars for measure and review, dismissible for export and placement', () => {
    const items = createDefaultToolbarItems()
    expect(items.find(item => item.id === 'measure')?.childrenUi).toBe(
      'sticky-toolbar'
    )
    expect(items.find(item => item.id === 'annotation')?.childrenUi).toBe(
      'sticky-toolbar'
    )
    expect(items.find(item => item.id === 'export')?.childrenUi).toBe('toolbar')
    expect(items.find(item => item.id === 'toolbar-placement')?.childrenUi).toBe(
      'toolbar'
    )
    expect(items.find(item => item.id === 'locale')?.childrenUi).toBe('toolbar')
  })

  it('uses the same export parent icon as cad-viewer toolbar and ribbon', () => {
    const items = createDefaultToolbarItems()
    expect(items.find(item => item.id === 'export')?.icon).toContain(
      'M15.5 2H9.1L4.5 6.6'
    )
    expect(items.find(item => item.id === 'annotation')?.icon).toContain(
      'M12.4 3.25H5.5'
    )
  })

  it('uses the same review submenu icons as cad-viewer', () => {
    const items = createDefaultToolbarItems()
    const annotation = items.find(item => item.id === 'annotation')
    const iconOf = (id: string) =>
      annotation?.children?.find(child => child.id === id)?.icon

    expect(iconOf('markup-cloud')).toContain('viewBox="0 0 40 40"')
    expect(iconOf('markup-callout')).toContain('273.536 736')
    expect(iconOf('markup-text')).toContain('m199.04 672.64')
    expect(iconOf('markup-rect')).toContain('1.666717529296875,15.833333')
    expect(iconOf('markup-circle')).toContain(
      '17.366041494140624,8.13321261171875'
    )
    expect(iconOf('markup-arrow')).toContain('M754.752 480H160')
    expect(iconOf('markup-stamp')).toContain('M624 475.968V640h144')
    expect(iconOf('markup-panel')).toContain('M6.5 9.5h7M6.5 12h7')
    expect(iconOf('markup-import')).toContain('M4.5 2h6.4L15.5 6.6')
    expect(iconOf('markup-export')).toContain('M15.5 2H9.1L4.5 6.6')
    expect(iconOf('clear-markups')).toContain(
      'M160 256H96a32 32 0 0 1 0-64h256'
    )
    expect(
      annotation?.children?.find(child => child.id === 'markup-vis')?.toggle?.on
        .icon
    ).toContain('M512 160c320 0 512 352')
  })

  it('uses the same measurement submenu icons as cad-viewer', () => {
    const items = createDefaultToolbarItems()
    const measure = items.find(item => item.id === 'measure')
    const iconOf = (id: string) =>
      measure?.children?.find(child => child.id === id)?.icon

    expect(iconOf('measure-distance')).toContain('M3.75 9.25h12.5v1.5H3.75')
    expect(iconOf('measure-angle')).toContain('5.74 7.13 7 9.5 4.15 7.72')
    expect(iconOf('measure-area')).toContain('M4 4h12v12H4V4Zm1.5 1.5v9h9v-9h-9Z')
    expect(iconOf('measure-arc')).toContain('M2 16A10 10 0 0 0 18 16')
    expect(iconOf('measure-point')).toContain('M9.25 2h1.5v5.25H16v1.5h-5.25V16')
    expect(iconOf('clear-measurements')).toContain(
      'M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6'
    )
    expect(iconOf('measurement-import')).toContain('M4.5 2h6.4L15.5 6.6')
    expect(iconOf('measurement-export')).toContain('M15.5 2H9.1L4.5 6.6')
    expect(
      measure?.children?.find(child => child.id === 'measurement-vis')?.toggle
        ?.on.icon
    ).toContain('M512 160c320 0 512 352')
  })

  it('offers all supported locales in a dismissible language sub-toolbar', () => {
    const items = createDefaultToolbarItems({
      getTheme: () => 'light',
      setTheme: () => undefined,
      getLocale: () => 'cs',
      setLocale: () => undefined,
      getPlacement: () => 'right',
      setPlacement: () => undefined
    })
    const locale = items.find(item => item.id === 'locale')
    expect(locale?.toggle).toBeUndefined()
    expect(locale?.childrenUi).toBe('toolbar')
    expect(locale?.selectedChildId).toBe('locale-cs')
    expect(locale?.children?.map(child => child.id)).toEqual([
      'locale-en',
      'locale-zh',
      'locale-cs',
      'locale-tr'
    ])
  })
})

describe('parent toolbar display', () => {
  it('keeps parent icon when childIcon is fixed', () => {
    const parent = resolveParentToolbarDisplay({
      id: 'measure',
      icon: 'parent-icon',
      childIcon: 'fixed',
      children: [{ id: 'child', icon: 'child-icon', command: 'x' }]
    })
    expect(parent.icon).toBe('parent-icon')
  })

  it('uses selected child icon when childIcon is selected', () => {
    const parent = resolveParentToolbarDisplay(
      {
        id: 'export',
        label: 'toolbar.export',
        icon: 'parent-icon',
        childIcon: 'selected',
        selectedChildId: 'export-pdf',
        children: [
          { id: 'export-html', icon: 'html-icon', command: 'chtml' },
          { id: 'export-pdf', icon: 'pdf-icon', command: 'cpdf' }
        ]
      },
      'export-pdf'
    )
    expect(parent.icon).toBe('pdf-icon')
    expect(parent.label).toBe('toolbar.export')
  })

  it('resolves active child by runtime selection first', () => {
    const child = resolveSelectedChildItem(
      {
        id: 'export',
        selectedChildId: 'export-html',
        children: [
          { id: 'export-html', icon: 'html-icon' },
          { id: 'export-pdf', icon: 'pdf-icon' }
        ]
      },
      'export-pdf'
    )
    expect(child?.id).toBe('export-pdf')
  })
})

describe('toolbar presets and separators', () => {
  it('expands preset references in a custom layout', () => {
    const items = resolveToolbarItems({
      items: [
        { preset: 'select' },
        { preset: 'pan' },
        createToolbarSeparator('sep-tools'),
        { preset: 'measure' }
      ]
    })
    expect(
      items.map(item => ('preset' in item ? item.preset : item.id))
    ).toEqual(['select', 'pan', 'sep-tools', 'measure'])
    expect(items[3].children?.length).toBeGreaterThan(0)
  })

  it('keeps separators when filtering by open mode', () => {
    const items = resolveToolbarItems({
      items: [
        { preset: 'select' },
        createToolbarSeparator(),
        { preset: 'annotation' }
      ]
    })
    const visible = filterVisibleToolbarItems(items, AcEdOpenMode.Read)
    expect(visible.some(item => item.type === 'separator')).toBe(true)
    expect(visible.some(item => item.id === 'select')).toBe(true)
    expect(visible.some(item => item.id === 'annotation')).toBe(false)
  })
})
