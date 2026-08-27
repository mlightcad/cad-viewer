import type { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import {
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarSeparatorItem
} from './toolbarItemUtils'
import type { AcUiToolbarItem } from './types'

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
        acuiIsToolbarSeparatorItem(item) || acuiIsToolbarItemVisible(item, openMode)
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
