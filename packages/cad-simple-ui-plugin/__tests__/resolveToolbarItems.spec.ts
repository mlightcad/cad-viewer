/** Unit tests for toolbar item resolution and open-mode visibility filtering. */
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      curDocument: undefined
    }
  },
  /** Minimal mock used by {@link createDefaultToolbarItems} annotation visibility toggle. */
  AcApAnnotation: class {
    /** @returns Fixed annotation layer name for tests. */
    getAnnotationLayer() {
      return 'annotation'
    }
  },
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
    expect(visible.some(item => item.id === 'switch-bg')).toBe(false)
    expect(visible.some(item => item.id === 'select')).toBe(true)
  })

  it('shows review-only items in review mode', () => {
    const defaults = createDefaultToolbarItems()
    const visible = filterVisibleToolbarItems(defaults, AcEdOpenMode.Review)
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
  it('includes export submenu, theme and locale toggles', () => {
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

  it('includes a separator before settings buttons', () => {
    const items = createDefaultToolbarItems()
    const switchBgIndex = items.findIndex(item => item.id === 'switch-bg')
    expect(switchBgIndex).toBeGreaterThan(0)
    expect(items[switchBgIndex - 1]).toEqual({
      type: 'separator',
      id: 'sep-settings'
    })
  })

  it('uses selected child icon only for toolbar placement', () => {
    const items = createDefaultToolbarItems()
    expect(items.find(item => item.id === 'export')?.childIcon).toBeUndefined()
    expect(
      items.find(item => item.id === 'annotation')?.childIcon
    ).toBeUndefined()
    expect(items.find(item => item.id === 'toolbar-placement')?.childIcon).toBe(
      'selected'
    )
    expect(items.find(item => item.id === 'measure')?.childIcon).toBeUndefined()
  })

  it('uses dedicated parent icons for export and annotation', () => {
    const items = createDefaultToolbarItems()
    expect(items.find(item => item.id === 'export')?.icon).toContain(
      'M11 4h5v5'
    )
    expect(items.find(item => item.id === 'annotation')?.icon).toContain(
      'M7 14.5'
    )
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
        { preset: 'switch-bg' }
      ]
    })
    const visible = filterVisibleToolbarItems(items, AcEdOpenMode.Read)
    expect(visible.some(item => item.type === 'separator')).toBe(true)
    expect(visible.some(item => item.id === 'select')).toBe(true)
    expect(visible.some(item => item.id === 'switch-bg')).toBe(false)
  })
})
