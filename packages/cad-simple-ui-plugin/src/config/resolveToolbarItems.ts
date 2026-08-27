import { createDefaultToolbarItems } from './defaultToolbarItems'
import {
  expandToolbarItemConfigs,
  indexToolbarItems
} from './toolbarItemUtils'
import type {
  AcExDefaultToolbarContext,
  AcExSimpleUiPluginOptions,
  AcExToolbarItem
} from './types'

export {
  filterVisibleToolbarItems,
  isToolbarItemDisabled,
  isToolbarItemVisible,
  itemRequiresDocument,
  resolveEffectiveToolbarItem,
  resolveParentToolbarDisplay,
  resolveSelectedChildItem
} from './toolbarItemDisplay'

/**
 * Builds a lookup map of built-in toolbar items keyed by id (includes nested submenu entries).
 *
 * @param context - Context for theme/locale/placement presets.
 */
export function createDefaultToolbarPresetMap(
  context?: AcExDefaultToolbarContext
): Map<string, AcExToolbarItem> {
  const map = new Map<string, AcExToolbarItem>()
  indexToolbarItems(createDefaultToolbarItems(context), map)
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
export function insertToolbarItemsAt(
  items: AcExToolbarItem[],
  toInsert: AcExToolbarItem[],
  position?: { after?: string; before?: string }
): AcExToolbarItem[] {
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
 * in custom lists are expanded from the built-in item map.
 *
 * @param options - Toolbar subsection of plugin options.
 * @param context - Context for default theme/locale/placement items.
 * @returns Resolved toolbar items ready for {@link AcExToolbar}.
 */
export function resolveToolbarItems(
  options: AcExSimpleUiPluginOptions['toolbar'],
  context?: AcExDefaultToolbarContext
): AcExToolbarItem[] {
  const toolbar = options ?? {}
  const presets = createDefaultToolbarPresetMap(context)
  let items: AcExToolbarItem[]

  if (toolbar.items === 'default' || toolbar.items == null) {
    items = createDefaultToolbarItems(context)
  } else {
    items = expandToolbarItemConfigs(toolbar.items, presets)
  }

  if (toolbar.appendItems?.length) {
    items = insertToolbarItemsAt(
      items,
      expandToolbarItemConfigs(toolbar.appendItems, presets),
      {
        after: toolbar.appendItemsAfter,
        before: toolbar.appendItemsBefore
      }
    )
  }

  return items
}
