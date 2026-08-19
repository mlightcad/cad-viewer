import type {
  AcExToolbarChildrenUi,
  AcExToolbarItem,
  AcExToolbarItemConfig,
  AcExToolbarPresetRef,
  AcExToolbarSeparator
} from './types'

/**
 * Resolves how nested children are presented. Defaults to `'menu'`.
 *
 * @param item - Parent toolbar item.
 */
export function resolveToolbarChildrenUi(
  item: AcExToolbarItem
): AcExToolbarChildrenUi {
  return item.childrenUi ?? 'menu'
}

/** Returns whether {@link childrenUi} is an icon sub-toolbar (sticky or dismissible). */
export function isToolbarChildrenStrip(
  childrenUi: AcExToolbarChildrenUi
): boolean {
  return childrenUi === 'toolbar' || childrenUi === 'sticky-toolbar'
}

/** Returns whether a toolbar config entry is a visual separator. */
export function isToolbarSeparatorItem(
  item: AcExToolbarItemConfig
): item is AcExToolbarSeparator {
  return 'type' in item && item.type === 'separator'
}

/** Returns whether a toolbar config entry references a built-in preset button. */
export function isToolbarPresetRef(
  item: AcExToolbarItemConfig
): item is AcExToolbarPresetRef {
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
export function isDynamicToolbarChildren(item: AcExToolbarItem): boolean {
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
export function copyDynamicToolbarChildren(
  item: AcExToolbarItem,
  getChildren: () => AcExToolbarItem[]
): AcExToolbarItem {
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
export function preserveDynamicToolbarChildren(
  target: AcExToolbarItem,
  source: AcExToolbarItem
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(source, 'children')
  if (typeof descriptor?.get !== 'function') return false
  copyDynamicToolbarChildren(target, descriptor.get)
  return true
}

/**
 * Creates a toolbar separator entry.
 *
 * @param id - Optional stable id for debugging.
 */
export function createToolbarSeparator(id?: string): AcExToolbarSeparator {
  return { type: 'separator', id }
}

/**
 * References a built-in toolbar button by id when composing a custom layout.
 *
 * @param preset - Preset id such as `'pan'` or `'measure'`.
 */
export function toolbarPreset(preset: string): AcExToolbarPresetRef {
  return { preset }
}

/** Returns whether a resolved toolbar item list includes the given button id. */
export function toolbarItemsIncludeItem(
  items: AcExToolbarItem[],
  itemId: string
): boolean {
  return items.some(item => {
    if (isToolbarSeparatorItem(item)) return false
    if (item.id === itemId) return true
    return item.children
      ? toolbarItemsIncludeItem(item.children, itemId)
      : false
  })
}

/** Registers button items (and nested children) in a preset lookup map. */
export function indexToolbarItems(
  items: AcExToolbarItem[],
  map: Map<string, AcExToolbarItem>
): void {
  for (const item of items) {
    if (isToolbarSeparatorItem(item)) continue
    map.set(item.id, item)
    if (!isDynamicToolbarChildren(item) && item.children?.length) {
      indexToolbarItems(item.children, map)
    }
  }
}

/**
 * Resolves preset references and nested children in a toolbar config list.
 *
 * @param items - Raw toolbar configuration entries.
 * @param presets - Built-in items keyed by id.
 */
export function expandToolbarItemConfigs(
  items: AcExToolbarItemConfig[],
  presets: Map<string, AcExToolbarItem>
): AcExToolbarItem[] {
  return items.flatMap(item => {
    const expanded = expandToolbarItemConfig(item, presets)
    return expanded ? [expanded] : []
  })
}

function expandToolbarItemConfig(
  item: AcExToolbarItemConfig,
  presets: Map<string, AcExToolbarItem>
): AcExToolbarItem | null {
  if (isToolbarSeparatorItem(item)) {
    return {
      type: 'separator',
      id: item.id ?? `separator-${Math.random().toString(36).slice(2, 9)}`
    }
  }

  if (isToolbarPresetRef(item)) {
    const preset = presets.get(item.preset)
    if (!preset) {
      console.warn(
        `[cad-simple-ui-plugin] Unknown toolbar preset "${item.preset}".`
      )
      return null
    }
    return cloneToolbarItem(preset)
  }

  const buttonItem = item as AcExToolbarItem
  if (isDynamicToolbarChildren(buttonItem)) {
    return cloneToolbarItem(buttonItem)
  }
  if (buttonItem.children?.length) {
    return {
      ...buttonItem,
      children: expandToolbarItemConfigs(
        buttonItem.children as AcExToolbarItemConfig[],
        presets
      )
    }
  }

  return buttonItem
}

function cloneToolbarItem(item: AcExToolbarItem): AcExToolbarItem {
  const clone: AcExToolbarItem = { ...item, children: item.children }
  if (preserveDynamicToolbarChildren(clone, item)) {
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
