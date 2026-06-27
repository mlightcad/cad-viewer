import type {
  AcExToolbarItem,
  AcExToolbarItemConfig,
  AcExToolbarPresetRef,
  AcExToolbarSeparator
} from './types'

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

/** Registers button items (and nested children) in a preset lookup map. */
export function indexToolbarItems(
  items: AcExToolbarItem[],
  map: Map<string, AcExToolbarItem>
): void {
  for (const item of items) {
    if (isToolbarSeparatorItem(item)) continue
    map.set(item.id, item)
    if (item.children?.length) {
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
  if (!item.children?.length) {
    return { ...item }
  }
  return {
    ...item,
    children: item.children.map(child => cloneToolbarItem(child))
  }
}
