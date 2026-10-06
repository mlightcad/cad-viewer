import type { AcUiSimpleUiPluginOptions } from './types'

/** Resolved plugin options with explicit defaults for nested sections. */
export type AcUiNormalizedPluginOptions = Required<
  Omit<AcUiSimpleUiPluginOptions, 'host' | 'locale'>
> & {
  host?: HTMLElement
  /** Whether the dock panel shell should be created on load. */
  shouldCreateDockPanel: boolean
}

/**
 * Fills in default option values and derived flags for plugin initialization.
 *
 * Normalizes {@link AcUiSimpleUiPluginOptions.layout} to `'auto'` when omitted,
 * ensures `layouts` is an object, and applies toolbar defaults (including
 * optional {@link AcUiToolbarOptions.showLabels} and
 * {@link AcUiToolbarOptions.size}).
 *
 * @param options - Raw plugin options from the caller.
 * @returns Normalized options used during {@link AcApSimpleUiPlugin.onLoad}.
 */
export function acuiNormalizePluginOptions(
  options: AcUiSimpleUiPluginOptions = {}
): AcUiNormalizedPluginOptions {
  const dockPanelEnabled = options.dockPanel?.enabled === true

  return {
    host: options.host,
    layout: options.layout ?? 'auto',
    layouts: options.layouts ?? {},
    dockPanel: {
      enabled: dockPanelEnabled,
      defaultOpen: options.dockPanel?.defaultOpen ?? false,
      defaultSide: options.dockPanel?.defaultSide ?? 'left',
      defaultHeight: options.dockPanel?.defaultHeight ?? 240,
      defaultWidth: options.dockPanel?.defaultWidth ?? 280
    },
    toolbar: {
      enabled:
        options.toolbar?.enabled === false
          ? false
          : (options.toolbar?.enabled ?? true),
      placement: options.toolbar?.placement ?? 'right',
      items: options.toolbar?.items ?? 'default',
      ...(options.toolbar && 'excludeItems' in options.toolbar
        ? { excludeItems: options.toolbar.excludeItems }
        : {}),
      appendItems: options.toolbar?.appendItems,
      appendItemsAfter: options.toolbar?.appendItemsAfter,
      appendItemsBefore: options.toolbar?.appendItemsBefore,
      collapsible: options.toolbar?.collapsible ?? false,
      defaultCollapsed: options.toolbar?.defaultCollapsed ?? false,
      edgeOffset: options.toolbar?.edgeOffset ?? 8,
      sideOffset: options.toolbar?.sideOffset ?? 0,
      showLabels: options.toolbar?.showLabels,
      size: options.toolbar?.size,
      overflow: options.toolbar?.overflow,
      showBorder: options.toolbar?.showBorder ?? true,
      showButtonBorder: options.toolbar?.showButtonBorder ?? false,
      showSeparators: options.toolbar?.showSeparators ?? true,
      inCanvasParent: options.toolbar?.inCanvasParent === true,
      subToolbar: options.toolbar?.subToolbar
    },
    shouldCreateDockPanel: dockPanelEnabled
  }
}
