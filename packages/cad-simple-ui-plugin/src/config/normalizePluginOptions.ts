import type { AcExSimpleUiPluginOptions } from './types'

/** Resolved plugin options with explicit defaults for nested sections. */
export type AcExNormalizedPluginOptions = Required<
  Omit<AcExSimpleUiPluginOptions, 'host' | 'locale'>
> & {
  host?: HTMLElement
  shouldCreateDockPanel: boolean
}

/**
 * Fills in default option values and derived flags for plugin initialization.
 *
 * @param options - Raw plugin options from the caller.
 */
export function normalizePluginOptions(
  options: AcExSimpleUiPluginOptions = {}
): AcExNormalizedPluginOptions {
  const dockPanelEnabled = options.dockPanel?.enabled === true

  return {
    host: options.host,
    dockPanel: {
      enabled: dockPanelEnabled,
      defaultOpen: options.dockPanel?.defaultOpen ?? false,
      defaultSide: options.dockPanel?.defaultSide ?? 'left',
      defaultHeight: options.dockPanel?.defaultHeight ?? 240,
      defaultWidth: options.dockPanel?.defaultWidth ?? 280
    },
    toolbar: {
      enabled: options.toolbar?.enabled ?? true,
      placement: options.toolbar?.placement ?? 'right',
      items: options.toolbar?.items ?? 'default',
      appendItems: options.toolbar?.appendItems,
      appendItemsAfter: options.toolbar?.appendItemsAfter,
      appendItemsBefore: options.toolbar?.appendItemsBefore,
      collapsible: options.toolbar?.collapsible ?? false,
      defaultCollapsed: options.toolbar?.defaultCollapsed ?? false,
      edgeOffset: options.toolbar?.edgeOffset ?? 8
    },
    shouldCreateDockPanel: dockPanelEnabled
  }
}
