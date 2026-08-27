import type { AcUiSimpleUiPluginOptions, AcUiToolbarConfig, AcUiLayoutKind } from './types'
import {
  acuiGetBuiltInToolbarDefaults,
  acuiMergeToolbarConfigs,
  acuiResolveLayoutToolbarConfig
} from './resolveToolbarItems'

/** Resolved plugin options with explicit defaults for nested sections. */
export type AcUiNormalizedPluginOptions = {
  host?: HTMLElement
  layout: 'auto' | AcUiLayoutKind
  dockPanel: {
    enabled: boolean
    defaultOpen: boolean
    defaultSide: 'bottom' | 'left' | 'right' | 'top'
    defaultHeight: number
    defaultWidth: number
  }
  /** Effective toolbar for the initial layout kind (auto uses desktop defaults for host). */
  toolbar: AcUiToolbarConfig
  /** Per-kind resolved toolbar configs (built-in + merges already applied). */
  layoutToolbars: Record<AcUiLayoutKind, AcUiToolbarConfig>
  shouldCreateDockPanel: boolean
}

/**
 * Fills in default option values and derived flags for plugin initialization.
 *
 * @param options - Raw plugin options from the caller.
 */
export function acuiNormalizePluginOptions(
  options: AcUiSimpleUiPluginOptions = {}
): AcUiNormalizedPluginOptions {
  const dockPanelEnabled = options.dockPanel?.enabled === true
  const layout = options.layout ?? 'auto'

  const layoutToolbars: Record<AcUiLayoutKind, AcUiToolbarConfig> = {
    mobile: acuiResolveLayoutToolbarConfig(options, 'mobile'),
    pad: acuiResolveLayoutToolbarConfig(options, 'pad'),
    desktop: acuiResolveLayoutToolbarConfig(options, 'desktop')
  }

  // Initial toolbar snapshot: prefer desktop when auto (host may still switch).
  const initialKind: AcUiLayoutKind =
    layout === 'auto' ? 'desktop' : layout

  return {
    host: options.host,
    layout,
    dockPanel: {
      enabled: dockPanelEnabled,
      defaultOpen: options.dockPanel?.defaultOpen ?? false,
      defaultSide: options.dockPanel?.defaultSide ?? 'left',
      defaultHeight: options.dockPanel?.defaultHeight ?? 240,
      defaultWidth: options.dockPanel?.defaultWidth ?? 280
    },
    toolbar: layoutToolbars[initialKind],
    layoutToolbars,
    shouldCreateDockPanel: dockPanelEnabled
  }
}

export { acuiGetBuiltInToolbarDefaults, acuiMergeToolbarConfigs, acuiResolveLayoutToolbarConfig }
