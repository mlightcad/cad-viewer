import type { AcEdUiLayoutKind } from '@mlightcad/cad-simple-viewer'
import {
  acuiExpandToolbarItemConfigs,
  acuiFilterVisibleToolbarItems,
  acuiIndexToolbarItems,
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarItemDisabled,
  acuiIsToolbarItemVisible,
  acuiIsToolbarSeparatorItem,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem,
  type AcUiToolbarItem,
  type AcUiToolbarOptions
} from '@mlightcad/cad-simple-viewer'

import {
  acuiCreateDefaultToolbarItems,
  acuiCreatePhoneToolbarItems
} from './defaultToolbarItems'
import type { AcUiDefaultToolbarContext } from './types'

export {
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemDisabled,
  acuiIsToolbarItemVisible,
  acuiItemRequiresDocument,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem
}

/**
 * Indexes items that are not already in the preset map (and nested children).
 * Used so phone-only ids such as `zoom` / `settings` resolve on desktop/pad
 * without replacing shared desktop presets like `layer`.
 */
function acuiIndexMissingToolbarItems(
  items: AcUiToolbarItem[],
  map: Map<string, AcUiToolbarItem>
): void {
  for (const item of items) {
    if (acuiIsToolbarSeparatorItem(item)) continue
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
    if (!acuiIsDynamicToolbarChildren(item) && item.children?.length) {
      acuiIndexMissingToolbarItems(item.children, map)
    }
  }
}

/**
 * Builds a lookup map of built-in toolbar items keyed by id (includes nested submenu entries).
 *
 * Indexes desktop/pad defaults first so shared ids (`layer`, `annotation`) keep
 * desktop variants. Phone items overwrite those ids only when {@link layout} is
 * `'phone'`. On desktop/pad, phone-only ids (`zoom`, `settings`) are added when
 * missing so custom lists can still reference them.
 *
 * @param context - Context for theme/locale/placement presets.
 * @param layout - Layout whose shared-id variants should win for overlapping presets.
 */
export function acuiCreateDefaultToolbarPresetMap(
  context?: AcUiDefaultToolbarContext,
  layout: AcEdUiLayoutKind = 'desktop'
): Map<string, AcUiToolbarItem> {
  const map = new Map<string, AcUiToolbarItem>()
  acuiIndexToolbarItems(acuiCreateDefaultToolbarItems(context), map)
  const phoneItems = acuiCreatePhoneToolbarItems(context)
  if (layout === 'phone') {
    acuiIndexToolbarItems(phoneItems, map)
  } else {
    acuiIndexMissingToolbarItems(phoneItems, map)
  }
  return map
}

/**
 * Inserts toolbar items at the configured position relative to a root item id.
 *
 * @param items - Base toolbar items.
 * @param toInsert - Items to insert from `appendItems`.
 * @param position - Optional anchor id (`after` or `before`); omitted means end.
 * @returns New item array with `toInsert` merged in.
 */
export function acuiInsertToolbarItemsAt(
  items: AcUiToolbarItem[],
  toInsert: AcUiToolbarItem[],
  position?: { after?: string; before?: string }
): AcUiToolbarItem[] {
  if (!toInsert.length) return items

  const anchorId = position?.before ?? position?.after
  if (!anchorId) {
    return [...items, ...toInsert]
  }

  const anchorIndex = items.findIndex(item => item.id === anchorId)
  if (anchorIndex === -1) {
    return [...items, ...toInsert]
  }

  const insertAt = position?.before ? anchorIndex : anchorIndex + 1
  return [...items.slice(0, insertAt), ...toInsert, ...items.slice(insertAt)]
}

/**
 * Resolves the final toolbar item list from plugin options.
 *
 * Uses the default set when `items` is `'default'` or omitted, then merges
 * `appendItems` when present. Use `appendItemsAfter` or `appendItemsBefore` to
 * control insertion; otherwise items are appended at the end. When both anchor
 * options are set, `appendItemsBefore` takes precedence. Preset references
 * in custom lists are expanded from the built-in item map. Root items whose
 * ids appear in {@link AcUiToolbarOptions.excludeItems} are then dropped.
 *
 * @param options - Toolbar subsection of plugin options.
 * @param context - Context for default theme/locale/placement items.
 * @param layout - When `'phone'`, `'default'` resolves to the phone item set.
 * @returns Resolved toolbar items ready for {@link AcUiToolbar}.
 */
export function acuiResolveToolbarItems(
  options: AcUiToolbarOptions | undefined,
  context?: AcUiDefaultToolbarContext,
  layout: AcEdUiLayoutKind = 'desktop'
): AcUiToolbarItem[] {
  const toolbar = options ?? {}
  const presets = acuiCreateDefaultToolbarPresetMap(context, layout)
  let items: AcUiToolbarItem[]

  if (toolbar.items === 'default' || toolbar.items == null) {
    items =
      layout === 'phone'
        ? acuiCreatePhoneToolbarItems(context)
        : acuiCreateDefaultToolbarItems(context)
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

  if (toolbar.excludeItems?.length) {
    const excluded = new Set(toolbar.excludeItems)
    items = items.filter(item => !item.id || !excluded.has(item.id))
  }

  return items
}
