import { ICON_TOOLBAR_PLACEMENT } from '../assets/icons'
import type { AcExToolbarItem } from './types'

/** One selectable entry in a toolbar layout switcher submenu. */
export interface AcExToolbarLayoutPreset {
  /** Stable preset identifier. */
  id: string
  /** Display label for the submenu entry. */
  label: string
}

/** Options for {@link createToolbarLayoutSwitcher}. */
export interface AcExToolbarLayoutSwitcherOptions {
  /** Presets shown in the submenu. */
  presets: AcExToolbarLayoutPreset[]
  /** Id of the currently active preset. */
  currentId: string
  /** Invoked when the user selects a preset. */
  onSelect: (presetId: string) => void
  /** Toolbar button id. @default 'toolbar-layout-switcher' */
  id?: string
  /** Button tooltip / aria label. @default 'Toolbar Layout' */
  label?: string
  /** Inline SVG icon string. */
  icon?: string
}

/**
 * Creates a submenu button that switches between fully custom toolbar layouts.
 *
 * Pair with {@link AcApSimpleUiPlugin.setToolbarItems} so each preset replaces the
 * entire toolbar `items` list rather than using `appendItems`.
 *
 * @param options - Presets, current selection, and selection handler.
 */
export function createToolbarLayoutSwitcher(
  options: AcExToolbarLayoutSwitcherOptions
): AcExToolbarItem {
  const id = options.id ?? 'toolbar-layout-switcher'
  const selectedChildId = `layout-${options.currentId}`

  return {
    id,
    label: options.label ?? 'Toolbar Layout',
    icon: options.icon ?? ICON_TOOLBAR_PLACEMENT,
    requiresDocument: false,
    childIcon: 'selected',
    selectedChildId,
    children: options.presets.map(preset => ({
      id: `layout-${preset.id}`,
      label: preset.label,
      action: () => options.onSelect(preset.id)
    }))
  }
}

/**
 * Prepends a layout switcher and separator before a fully custom toolbar item list.
 *
 * @param items - Toolbar items for the active preset (not including the switcher).
 * @param switcher - Layout switcher button from {@link createToolbarLayoutSwitcher}.
 */
export function prependToolbarLayoutSwitcher(
  items: AcExToolbarItem[],
  switcher: AcExToolbarItem
): AcExToolbarItem[] {
  return [
    switcher,
    { type: 'separator', id: 'toolbar-layout-switcher-separator' },
    ...items
  ]
}
