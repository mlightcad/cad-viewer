/**
 * Toolbar config merge / preset expansion without default item factories.
 *
 * Kept separate from {@link resolveToolbarItems} so the `/toolbar` entry can
 * expand host presets without pulling `defaultToolbarItems` → cad-simple-viewer.
 */

import {
  acuiExpandToolbarItemConfigs,
  acuiInsertToolbarItemsAt
} from './toolbarItemUtils'
import type {
  AcUiLayoutKind,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarConfig,
  AcUiToolbarItem
} from './types'

/**
 * Resolves toolbar items using an explicit preset map (for offline / HTML hosts).
 *
 * When `items` is `'default'` or omitted, uses {@link fallbackDefaultItems} if
 * provided; otherwise returns an empty list.
 */
export function acuiResolveToolbarItemsFromPresets(
  options: AcUiToolbarConfig | undefined,
  presets: Map<string, AcUiToolbarItem>,
  fallbackDefaultItems?: () => AcUiToolbarItem[]
): AcUiToolbarItem[] {
  const toolbar = options ?? {}
  let items: AcUiToolbarItem[]

  if (toolbar.items === 'default' || toolbar.items == null) {
    items = fallbackDefaultItems?.() ?? []
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

/** Shallow-merges toolbar config layers (later wins for defined fields). */
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
    if (layer.contentWidth !== undefined) result.contentWidth = layer.contentWidth
    if (layer.itemDistribution !== undefined) {
      result.itemDistribution = layer.itemDistribution
    }
    if (layer.showItemLabels !== undefined) {
      result.showItemLabels = layer.showItemLabels
    }
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
  options: Pick<AcUiSimpleUiPluginOptions, 'toolbar' | 'layouts'>,
  kind: AcUiLayoutKind,
  getBuiltInDefaults: (kind: AcUiLayoutKind) => AcUiToolbarConfig
): AcUiToolbarConfig {
  const builtIn = getBuiltInDefaults(kind)
  const topLevel = kind === 'mobile' ? undefined : options.toolbar
  const layoutOverride = options.layouts?.[kind]?.toolbar
  return acuiMergeToolbarConfigs(builtIn, topLevel, layoutOverride)
}
