import type { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import {
  isDynamicToolbarChildren,
  isToolbarSeparatorItem
} from './toolbarItemUtils'
import type { AcExToolbarItem } from './types'

/**
 * Returns whether a toolbar item should be shown for the given document open mode.
 *
 * @param item - Toolbar item to test.
 * @param openMode - Current document open mode.
 */
export function isToolbarItemVisible(
  item: AcExToolbarItem,
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
export function resolveEffectiveToolbarItem(
  item: AcExToolbarItem
): AcExToolbarItem {
  if (isToolbarSeparatorItem(item)) return item
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
export function resolveSelectedChildItem(
  item: AcExToolbarItem,
  activeChildId?: string
): AcExToolbarItem | undefined {
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
 * When {@link AcExToolbarItem.childIcon} is `'selected'`, the parent icon is
 * taken from the active submenu child while the parent label is unchanged.
 *
 * @param item - Parent toolbar item (may include `children`).
 * @param activeChildId - Runtime-selected child id, if any.
 */
export function resolveParentToolbarDisplay(
  item: AcExToolbarItem,
  activeChildId?: string
): AcExToolbarItem {
  const effective = resolveEffectiveToolbarItem(item)
  if (effective.childIcon !== 'selected' || !effective.children?.length) {
    return effective
  }

  const child = resolveSelectedChildItem(effective, activeChildId)
  if (!child) return effective

  const resolvedChild = resolveEffectiveToolbarItem(child)
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
export function itemRequiresDocument(item: AcExToolbarItem): boolean {
  if (isToolbarSeparatorItem(item)) return false
  if (item.requiresDocument != null) return item.requiresDocument
  return Boolean(item.command || item.anchorAction)
}

/**
 * Evaluates the disabled state of a toolbar item.
 *
 * @param item - Toolbar item with optional static or dynamic `disabled`.
 */
export function isToolbarItemDisabled(item: AcExToolbarItem): boolean {
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
export function filterVisibleToolbarItems(
  items: AcExToolbarItem[],
  openMode: AcEdOpenMode
): AcExToolbarItem[] {
  return items
    .filter(
      item =>
        isToolbarSeparatorItem(item) || isToolbarItemVisible(item, openMode)
    )
    .map(item => {
      if (
        isToolbarSeparatorItem(item) ||
        isDynamicToolbarChildren(item) ||
        !item.children?.length
      ) {
        return item
      }
      const children = filterVisibleToolbarItems(item.children, openMode)
      return { ...item, children }
    })
    .filter(item => {
      if (isToolbarSeparatorItem(item)) return true
      return (
        isDynamicToolbarChildren(item) ||
        !item.children ||
        item.children.length > 0 ||
        item.command ||
        item.action ||
        item.anchorAction ||
        item.toggle
      )
    })
}
