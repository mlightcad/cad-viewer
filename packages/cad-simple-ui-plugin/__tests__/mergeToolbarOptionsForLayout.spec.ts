import { acuiMergeToolbarOptionsForLayout } from '../src/config/mergeToolbarOptionsForLayout'

describe('acuiMergeToolbarOptionsForLayout', () => {
  it('uses phone built-in defaults', () => {
    const merged = acuiMergeToolbarOptionsForLayout('phone', undefined, undefined)
    expect(merged.placement).toBe('bottom')
    expect(merged.edgeOffset).toBe(0)
    expect(merged.sideOffset).toBe(0)
    expect(merged.showBorder).toBe(true)
    expect(merged.showButtonBorder).toBe(false)
    expect(merged.collapsible).toBe(false)
    expect(merged.showLabels).toBe(true)
    expect(merged.size).toBe('stretch')
    expect(merged.overflow).toBe('menu')
    expect(merged.showChildrenIndicator).toBe(false)
    expect(merged.subToolbar).toEqual({
      showLabels: true,
      showSeparators: false,
      size: 'stretch',
      overflow: 'wrap',
      replaceOnNested: true
    })
  })

  it('does not inherit appendItems on phone from top-level toolbar', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'phone',
      {
        placement: 'right',
        collapsible: true,
        edgeOffset: 12,
        appendItems: [{ id: 'agent', command: 'agent' }],
        appendItemsAfter: 'layout'
      },
      undefined
    )
    expect(merged.placement).toBe('bottom')
    expect(merged.collapsible).toBe(false)
    expect(merged.edgeOffset).toBe(0)
    expect(merged.appendItems).toBeUndefined()
    expect(merged.appendItemsAfter).toBeUndefined()
  })

  it('inherits mountTarget, enabled, inCanvasParent, and showButtonBorder on phone from top-level toolbar', () => {
    const mountTarget = {} as HTMLElement
    const merged = acuiMergeToolbarOptionsForLayout(
      'phone',
      {
        enabled: true,
        mountTarget,
        inCanvasParent: true,
        showButtonBorder: true,
        appendItems: [{ id: 'agent', command: 'agent' }]
      },
      undefined
    )
    expect(merged.mountTarget).toBe(mountTarget)
    expect(merged.enabled).toBe(true)
    expect(merged.inCanvasParent).toBe(true)
    expect(merged.showButtonBorder).toBe(true)
    expect(merged.appendItems).toBeUndefined()
  })

  it('inherits full top-level toolbar for desktop', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'desktop',
      {
        placement: 'left',
        collapsible: true,
        edgeOffset: 16
      },
      undefined
    )
    expect(merged.placement).toBe('left')
    expect(merged.collapsible).toBe(true)
    expect(merged.edgeOffset).toBe(16)
  })

  it('applies per-layout overrides last', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'pad',
      { placement: 'right', collapsible: true },
      { placement: 'top', showLabels: true }
    )
    expect(merged.placement).toBe('top')
    expect(merged.collapsible).toBe(true)
    expect(merged.showLabels).toBe(true)
  })

  it('excludes select and pan on pad by default', () => {
    const merged = acuiMergeToolbarOptionsForLayout('pad', undefined, undefined)
    expect(merged.excludeItems).toEqual(['select', 'pan'])
  })

  it('does not exclude select and pan on desktop', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'desktop',
      undefined,
      undefined
    )
    expect(merged.excludeItems).toBeUndefined()
  })

  it('lets pad layout restore select and pan via excludeItems', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'pad',
      undefined,
      { excludeItems: [] }
    )
    expect(merged.excludeItems).toEqual([])
  })

  it('keeps pad excludeItems when top-level toolbar omits them', () => {
    const merged = acuiMergeToolbarOptionsForLayout(
      'pad',
      { placement: 'left', items: 'default', appendItems: [{ id: 'agent', command: 'agent' }] },
      undefined
    )
    expect(merged.excludeItems).toEqual(['select', 'pan'])
    expect(merged.placement).toBe('left')
  })
})
