import type {
  AcUiToolbarChildrenUi,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator
} from './types'

/**
 * Resolves how nested children are presented. Defaults to `'menu'`.
 *
 * @param item - Parent toolbar item.
 */
export function acuiResolveToolbarChildrenUi(
  item: AcUiToolbarItem
): AcUiToolbarChildrenUi {
  return item.childrenUi ?? 'menu'
}

/** Returns whether {@link childrenUi} is an icon sub-toolbar (sticky or dismissible). */
export function acuiIsToolbarChildrenStrip(
  childrenUi: AcUiToolbarChildrenUi
): boolean {
  return childrenUi === 'toolbar' || childrenUi === 'sticky-toolbar'
}

/** Returns whether a toolbar config entry is a visual separator. */
export function acuiIsToolbarSeparatorItem(
  item: AcUiToolbarItemConfig
): item is AcUiToolbarSeparator {
  return 'type' in item && item.type === 'separator'
}

/** Returns whether a toolbar config entry references a built-in preset button. */
export function acuiIsToolbarPresetRef(
  item: AcUiToolbarItemConfig
): item is AcUiToolbarPresetRef {
  return 'preset' in item && typeof item.preset === 'string'
}

/**
 * Returns whether {@link children} is supplied by a getter rather than a static array.
 *
 * Dynamic children (for example drawing layouts) must not be snapshotted when
 * cloning or expanding toolbar items.
 *
 * @param item - Toolbar item to inspect.
 */
export function acuiIsDynamicToolbarChildren(item: AcUiToolbarItem): boolean {
  return (
    typeof Object.getOwnPropertyDescriptor(item, 'children')?.get === 'function'
  )
}

/**
 * Attaches a getter that rebuilds submenu children each time they are read.
 *
 * @param item - Parent toolbar item.
 * @param getChildren - Factory invoked on each `children` access.
 * @returns `item` with a live `children` getter.
 */
export function acuiCopyDynamicToolbarChildren(
  item: AcUiToolbarItem,
  getChildren: () => AcUiToolbarItem[]
): AcUiToolbarItem {
  Object.defineProperty(item, 'children', {
    configurable: true,
    enumerable: true,
    get: getChildren
  })
  return item
}

/**
 * Copies a live `children` getter from `source` onto `target` when present.
 *
 * @param target - Clone that should keep dynamic children.
 * @param source - Original item that may define a children getter.
 * @returns Whether a getter was copied.
 */
export function acuiPreserveDynamicToolbarChildren(
  target: AcUiToolbarItem,
  source: AcUiToolbarItem
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(source, 'children')
  if (typeof descriptor?.get !== 'function') return false
  acuiCopyDynamicToolbarChildren(target, descriptor.get)
  return true
}

/**
 * Creates a toolbar separator entry.
 *
 * @param id - Optional stable id for debugging.
 */
export function acuiCreateToolbarSeparator(id?: string): AcUiToolbarSeparator {
  return { type: 'separator', id }
}

/**
 * References a built-in toolbar button by id when composing a custom layout.
 *
 * @param preset - Preset id such as `'pan'` or `'measure'`.
 */
export function acuiToolbarPreset(preset: string): AcUiToolbarPresetRef {
  return { preset }
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

/** Returns whether a resolved toolbar item list includes the given button id. */
export function acuiToolbarItemsIncludeItem(
  items: AcUiToolbarItem[],
  itemId: string
): boolean {
  return items.some(item => {
    if (acuiIsToolbarSeparatorItem(item)) return false
    if (item.id === itemId) return true
    return item.children
      ? acuiToolbarItemsIncludeItem(item.children, itemId)
      : false
  })
}

/** Registers button items (and nested children) in a preset lookup map. */
export function acuiIndexToolbarItems(
  items: AcUiToolbarItem[],
  map: Map<string, AcUiToolbarItem>
): void {
  for (const item of items) {
    if (acuiIsToolbarSeparatorItem(item)) continue
    map.set(item.id, item)
    if (!acuiIsDynamicToolbarChildren(item) && item.children?.length) {
      acuiIndexToolbarItems(item.children, map)
    }
  }
}

/**
 * Resolves preset references and nested children in a toolbar config list.
 *
 * @param items - Raw toolbar configuration entries.
 * @param presets - Built-in items keyed by id.
 */
export function acuiExpandToolbarItemConfigs(
  items: AcUiToolbarItemConfig[],
  presets: Map<string, AcUiToolbarItem>
): AcUiToolbarItem[] {
  return items.flatMap(item => {
    const expanded = expandToolbarItemConfig(item, presets)
    return expanded ? [expanded] : []
  })
}

function expandToolbarItemConfig(
  item: AcUiToolbarItemConfig,
  presets: Map<string, AcUiToolbarItem>
): AcUiToolbarItem | null {
  if (acuiIsToolbarSeparatorItem(item)) {
    return {
      type: 'separator',
      id: item.id ?? `separator-${Math.random().toString(36).slice(2, 9)}`
    }
  }

  if (acuiIsToolbarPresetRef(item)) {
    const preset = presets.get(item.preset)
    if (!preset) {
      console.warn(
        `[cad-simple-ui-plugin] Unknown toolbar preset "${item.preset}".`
      )
      return null
    }
    return cloneToolbarItem(preset)
  }

  const buttonItem = item as AcUiToolbarItem
  if (acuiIsDynamicToolbarChildren(buttonItem)) {
    return cloneToolbarItem(buttonItem)
  }
  if (buttonItem.children?.length) {
    return {
      ...buttonItem,
      children: acuiExpandToolbarItemConfigs(
        buttonItem.children as AcUiToolbarItemConfig[],
        presets
      )
    }
  }

  return buttonItem
}

function cloneToolbarItem(item: AcUiToolbarItem): AcUiToolbarItem {
  const clone: AcUiToolbarItem = { ...item, children: item.children }
  if (acuiPreserveDynamicToolbarChildren(clone, item)) {
    return clone
  }
  if (!item.children?.length) {
    return clone
  }
  return {
    ...clone,
    children: item.children.map(child => cloneToolbarItem(child))
  }
}
