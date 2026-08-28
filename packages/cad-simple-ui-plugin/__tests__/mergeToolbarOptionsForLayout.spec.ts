import { acuiMergeToolbarOptionsForLayout } from '../src/config/mergeToolbarOptionsForLayout'

describe('acuiMergeToolbarOptionsForLayout', () => {
  it('uses phone built-in defaults', () => {
    const merged = acuiMergeToolbarOptionsForLayout('phone', undefined, undefined)
    expect(merged.placement).toBe('bottom')
    expect(merged.edgeOffset).toBe(0)
    expect(merged.sideOffset).toBe(0)
    expect(merged.showBorder).toBe(true)
    expect(merged.collapsible).toBe(false)
    expect(merged.showLabels).toBe(true)
    expect(merged.size).toBe('stretch')
    expect(merged.overflow).toBe('menu')
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

  it('inherits mountTarget, enabled, and inCanvasParent on phone from top-level toolbar', () => {
    const mountTarget = {} as HTMLElement
    const merged = acuiMergeToolbarOptionsForLayout(
      'phone',
      {
        enabled: true,
        mountTarget,
        inCanvasParent: true,
        appendItems: [{ id: 'agent', command: 'agent' }]
      },
      undefined
    )
    expect(merged.mountTarget).toBe(mountTarget)
    expect(merged.enabled).toBe(true)
    expect(merged.inCanvasParent).toBe(true)
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
})
