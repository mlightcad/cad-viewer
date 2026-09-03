import type { AcEdUiLayoutKind } from '@mlightcad/cad-simple-viewer'
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import {
  acuiCreateDefaultToolbarItems,
  acuiCreatePhoneToolbarItems
} from './defaultToolbarItems'
import {
  acuiExpandToolbarItemConfigs,
  acuiIndexToolbarItems,
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarSeparatorItem
} from './toolbarItemUtils'
import type {
  AcUiDefaultToolbarContext,
  AcUiToolbarItem,
  AcUiToolbarOptions
} from './types'

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

/**
 * Returns whether a toolbar item should be shown for the given document open mode.
 *
 * @param item - Toolbar item to test.
 * @param openMode - Current document open mode.
 */
export function acuiIsToolbarItemVisible(
  item: AcUiToolbarItem,
  openMode: AcEdOpenMode
): boolean {
  if (item.minOpenMode == null) return true
  return openMode >= item.minOpenMode
}

/**
 * Merges toggle branch fields into a toolbar item for rendering.
 *
 * @param item - Item that may define a `toggle` configuration.
 * @returns Item with effective label, icon, command, and action from the active branch.
 */
export function acuiResolveEffectiveToolbarItem(
  item: AcUiToolbarItem
): AcUiToolbarItem {
  if (acuiIsToolbarSeparatorItem(item)) return item
  if (!item.toggle) return item
  const active = item.toggle.getValue()
  const branch = active ? item.toggle.on : item.toggle.off
  return {
    ...item,
    ...branch,
    id: item.id,
    toggle: item.toggle
  }
}

/**
 * Resolves the active submenu child for a parent toolbar item.
 *
 * @param item - Parent item with `children`.
 * @param activeChildId - Runtime-selected child id, if any.
 */
export function acuiResolveSelectedChildItem(
  item: AcUiToolbarItem,
  activeChildId?: string
): AcUiToolbarItem | undefined {
  if (!item.children?.length) return undefined

  const candidates = [activeChildId, item.selectedChildId].filter(
    (id): id is string => Boolean(id)
  )
  for (const id of candidates) {
    const match = item.children.find(child => child.id === id)
    if (match) return match
  }

  return item.children[0]
}

/**
 * Applies parent-button display fields for submenu parents.
 *
 * When {@link AcUiToolbarItem.childIcon} is `'selected'`, the parent icon is
 * taken from the active submenu child while the parent label is unchanged.
 *
 * @param item - Parent toolbar item (may include `children`).
 * @param activeChildId - Runtime-selected child id, if any.
 */
export function acuiResolveParentToolbarDisplay(
  item: AcUiToolbarItem,
  activeChildId?: string
): AcUiToolbarItem {
  const effective = acuiResolveEffectiveToolbarItem(item)
  if (effective.childIcon !== 'selected' || !effective.children?.length) {
    return effective
  }

  const child = acuiResolveSelectedChildItem(effective, activeChildId)
  if (!child) return effective

  const resolvedChild = acuiResolveEffectiveToolbarItem(child)
  return {
    ...effective,
    icon: resolvedChild.icon ?? effective.icon
  }
}

/**
 * Determines whether a toolbar item needs an open document to be enabled.
 *
 * @param item - Toolbar item to inspect.
 * @returns `requiresDocument` when set, otherwise `true` when `command` is set.
 */
export function acuiItemRequiresDocument(item: AcUiToolbarItem): boolean {
  if (acuiIsToolbarSeparatorItem(item)) return false
  if (item.requiresDocument != null) return item.requiresDocument
  return Boolean(item.command || item.anchorAction)
}

/**
 * Evaluates the disabled state of a toolbar item.
 *
 * @param item - Toolbar item with optional static or dynamic `disabled`.
 */
export function acuiIsToolbarItemDisabled(item: AcUiToolbarItem): boolean {
  if (item.disabled == null) return false
  return typeof item.disabled === 'function' ? item.disabled() : item.disabled
}

/**
 * Filters toolbar items (and nested children) by open mode visibility.
 *
 * Parent items with only hidden children are removed unless they have their
 * own command, action, or toggle.
 *
 * @param items - Root toolbar items.
 * @param openMode - Current document open mode.
 */
export function acuiFilterVisibleToolbarItems(
  items: AcUiToolbarItem[],
  openMode: AcEdOpenMode
): AcUiToolbarItem[] {
  return items
    .filter(
      item =>
        acuiIsToolbarSeparatorItem(item) ||
        acuiIsToolbarItemVisible(item, openMode)
    )
    .map(item => {
      if (
        acuiIsToolbarSeparatorItem(item) ||
        acuiIsDynamicToolbarChildren(item) ||
        !item.children?.length
      ) {
        return item
      }
      const children = acuiFilterVisibleToolbarItems(item.children, openMode)
      return { ...item, children }
    })
    .filter(item => {
      if (acuiIsToolbarSeparatorItem(item)) return true
      return (
        acuiIsDynamicToolbarChildren(item) ||
        !item.children ||
        item.children.length > 0 ||
        item.command ||
        item.action ||
        item.anchorAction ||
        item.toggle
      )
    })
}
