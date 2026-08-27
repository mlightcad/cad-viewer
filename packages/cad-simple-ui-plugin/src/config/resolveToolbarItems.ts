import {
  acuiCreateDefaultToolbarItems,
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem,
  MOBILE_DEFAULT_TOOLBAR_ITEMS
} from './defaultToolbarItems'
import {
  acuiResolveLayoutToolbarConfig as acuiResolveLayoutToolbarConfigCore,
  acuiResolveToolbarItemsFromPresets
} from './toolbarConfig'
import { acuiIndexToolbarItems } from './toolbarItemUtils'
import type {
  AcUiDefaultToolbarContext,
  AcUiLayoutKind,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarConfig,
  AcUiToolbarItem
} from './types'

export {
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemDisabled,
  acuiIsToolbarItemVisible,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem
} from './toolbarItemDisplay'

export { acuiInsertToolbarItemsAt } from './toolbarItemUtils'

export {
  acuiMergeToolbarConfigs,
  acuiResolveToolbarItemsFromPresets
} from './toolbarConfig'

/**
 * Builds a lookup map of built-in toolbar items keyed by id (includes nested submenu entries).
 *
 * Also registers mobile-oriented presets (`zoom`, `settings`) that are not part of the
 * pad/desktop root list.
 *
 * @param context - Context for theme/locale/placement/zoom presets.
 */
export function acuiCreateDefaultToolbarPresetMap(
  context?: AcUiDefaultToolbarContext
): Map<string, AcUiToolbarItem> {
  const map = new Map<string, AcUiToolbarItem>()
  acuiIndexToolbarItems(acuiCreateDefaultToolbarItems(context), map)
  acuiIndexToolbarItems(
    [
      acuiCreateZoomToolbarItem(context),
      acuiCreateSettingsToolbarItem(context)
    ],
    map
  )
  return map
}

/**
 * Resolves the final toolbar item list from a toolbar config section.
 *
 * Uses the default set when `items` is `'default'` or omitted, then merges
 * `appendItems` when present. Use `appendItemsAfter` or `appendItemsBefore` to
 * control insertion; otherwise items are appended at the end. When both anchor
 * options are set, `appendItemsBefore` takes precedence. Preset references
 * in custom lists are expanded from the built-in item map.
 *
 * @param options - Toolbar subsection of plugin options.
 * @param context - Context for default theme/locale/placement items.
 * @returns Resolved toolbar items ready for {@link AcUiToolbar}.
 */
export function acuiResolveToolbarItems(
  options: AcUiToolbarConfig | undefined,
  context?: AcUiDefaultToolbarContext
): AcUiToolbarItem[] {
  return acuiResolveToolbarItemsFromPresets(
    options,
    acuiCreateDefaultToolbarPresetMap(context),
    () => acuiCreateDefaultToolbarItems(context)
  )
}

/** Built-in toolbar defaults per device layout kind. */
export function acuiGetBuiltInToolbarDefaults(
  kind: AcUiLayoutKind
): Required<
  Pick<
    AcUiToolbarConfig,
    | 'enabled'
    | 'placement'
    | 'items'
    | 'collapsible'
    | 'defaultCollapsed'
    | 'edgeOffset'
    | 'overflow'
    | 'contentWidth'
    | 'itemDistribution'
    | 'showItemLabels'
  >
> {
  if (kind === 'mobile') {
    return {
      enabled: true,
      placement: 'bottom',
      items: MOBILE_DEFAULT_TOOLBAR_ITEMS,
      collapsible: false,
      defaultCollapsed: false,
      edgeOffset: 0,
      overflow: 'menu',
      contentWidth: 'full',
      itemDistribution: 'evenly',
      showItemLabels: true
    }
  }
  return {
    enabled: true,
    placement: 'right',
    items: 'default',
    collapsible: false,
    defaultCollapsed: false,
    edgeOffset: 8,
    overflow: 'menu',
    contentWidth: 'hug',
    itemDistribution: 'start',
    showItemLabels: false
  }
}

/**
 * Resolves the effective toolbar config for a layout kind.
 *
 * Merge order: built-in defaults → top-level `toolbar` (pad/desktop only) →
 * `layouts.<kind>.toolbar`.
 */
export function acuiResolveLayoutToolbarConfig(
  options: Pick<AcUiSimpleUiPluginOptions, 'toolbar' | 'layouts'>,
  kind: AcUiLayoutKind,
  getBuiltInDefaults: (
    kind: AcUiLayoutKind
  ) => AcUiToolbarConfig = acuiGetBuiltInToolbarDefaults
): AcUiToolbarConfig {
  return acuiResolveLayoutToolbarConfigCore(
    options,
    kind,
    getBuiltInDefaults
  )
}
