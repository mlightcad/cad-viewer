import {
  acuiCreateDefaultToolbarItems,
  acuiCreateSettingsToolbarItem,
  acuiCreateZoomToolbarItem,
  MOBILE_DEFAULT_TOOLBAR_ITEMS
} from './defaultToolbarItems'
import {
  acuiExpandToolbarItemConfigs,
  acuiIndexToolbarItems,
  acuiInsertToolbarItemsAt
} from './toolbarItemUtils'
import type {
  AcUiDefaultToolbarContext,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarConfig,
  AcUiToolbarItem,
  AcUiLayoutKind
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
    [acuiCreateZoomToolbarItem(context), acuiCreateSettingsToolbarItem(context)],
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
  const toolbar = options ?? {}
  const presets = acuiCreateDefaultToolbarPresetMap(context)
  let items: AcUiToolbarItem[]

  if (toolbar.items === 'default' || toolbar.items == null) {
    items = acuiCreateDefaultToolbarItems(context)
  } else {
    items = acuiExpandToolbarItemConfigs(toolbar.items, presets)
  }

  if (toolbar.appendItems?.length) {
    items = acuiInsertToolbarItemsAt(
      items,
      acuiExpandToolbarItemConfigs(toolbar.appendItems, presets),
      {
        after: toolbar.appendItemsAfter,
        before: toolbar.appendItemsBefore
      }
    )
  }

  return items
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
      overflow: 'menu'
    }
  }
  return {
    enabled: true,
    placement: 'right',
    items: 'default',
    collapsible: false,
    defaultCollapsed: false,
    edgeOffset: 8,
    overflow: 'menu'
  }
}

/**
 * Shallow-merges toolbar config layers (later wins for defined fields).
 */
export function acuiMergeToolbarConfigs(
  ...layers: Array<AcUiToolbarConfig | undefined>
): AcUiToolbarConfig {
  const result: AcUiToolbarConfig = {}
  for (const layer of layers) {
    if (!layer) continue
    if (layer.enabled !== undefined) result.enabled = layer.enabled
    if (layer.placement !== undefined) result.placement = layer.placement
    if (layer.items !== undefined) result.items = layer.items
    if (layer.appendItems !== undefined) result.appendItems = layer.appendItems
    if (layer.appendItemsAfter !== undefined) {
      result.appendItemsAfter = layer.appendItemsAfter
    }
    if (layer.appendItemsBefore !== undefined) {
      result.appendItemsBefore = layer.appendItemsBefore
    }
    if (layer.collapsible !== undefined) result.collapsible = layer.collapsible
    if (layer.defaultCollapsed !== undefined) {
      result.defaultCollapsed = layer.defaultCollapsed
    }
    if (layer.mountTarget !== undefined) result.mountTarget = layer.mountTarget
    if (layer.edgeOffset !== undefined) result.edgeOffset = layer.edgeOffset
    if (layer.overflow !== undefined) result.overflow = layer.overflow
  }
  return result
}

/**
 * Resolves the effective toolbar config for a layout kind.
 *
 * Merge order: built-in defaults → top-level `toolbar` (pad/desktop only) →
 * `layouts.<kind>.toolbar`.
 */
export function acuiResolveLayoutToolbarConfig(
  options: AcUiSimpleUiPluginOptions,
  kind: AcUiLayoutKind
): AcUiToolbarConfig {
  const builtIn = acuiGetBuiltInToolbarDefaults(kind)
  const topLevel = kind === 'mobile' ? undefined : options.toolbar
  const layoutOverride = options.layouts?.[kind]?.toolbar
  return acuiMergeToolbarConfigs(builtIn, topLevel, layoutOverride)
}
