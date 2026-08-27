import { acuiNormalizePluginOptions } from '../src/config/normalizePluginOptions'

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

  it('defaults toolbar edge offset', () => {
    const resolved = acuiNormalizePluginOptions({})
    expect(resolved.toolbar.edgeOffset).toBe(8)
  })
})
