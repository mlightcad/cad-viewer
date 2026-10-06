import type { AcEdUiLayoutKind } from '@mlightcad/cad-simple-viewer'

import type { AcUiToolbarOptions } from './types'

/** Pad default: hide select/pan; touch drag pans and long-press box-selects. */
const PAD_DEFAULT_EXCLUDE_ITEMS = ['select', 'pan']

/**
 * Built-in toolbar chrome defaults for each layout kind.
 *
 * Phone: bottom bar, full width, labels, no collapse, `edgeOffset: 0`.
 * Pad/desktop: right-side bar with standard floating chrome. Pad also
 * omits `select` and `pan` via {@link AcUiToolbarOptions.excludeItems}.
 *
 * @param layout - Layout kind to resolve defaults for.
 * @returns Default {@link AcUiToolbarOptions} before caller overrides.
 */
export function acuiBuiltinToolbarOptionsForLayout(
  layout: AcEdUiLayoutKind
): AcUiToolbarOptions {
  if (layout === 'phone') {
    return {
      enabled: true,
      placement: 'bottom',
      items: 'default',
      collapsible: false,
      defaultCollapsed: false,
      edgeOffset: 0,
      sideOffset: 0,
      showLabels: true,
      size: 'stretch',
      overflow: 'menu',
      showBorder: true,
      showButtonBorder: false,
      showSeparators: true,
      showChildrenIndicator: false,
      subToolbar: {
        showLabels: true,
        showSeparators: false,
        size: 'stretch',
        overflow: 'wrap',
        replaceOnNested: true
      }
    }
  }

  const desktopPad: AcUiToolbarOptions = {
    enabled: true,
    placement: 'right',
    items: 'default',
    collapsible: false,
    defaultCollapsed: false,
    edgeOffset: 8,
    sideOffset: 0,
    showLabels: false,
    size: 'auto',
    overflow: 'menu',
    showBorder: true,
    showButtonBorder: false,
    showSeparators: true,
    showChildrenIndicator: true,
    subToolbar: {
      replaceOnNested: false
    }
  }

  if (layout === 'pad') {
    return {
      ...desktopPad,
      excludeItems: [...PAD_DEFAULT_EXCLUDE_ITEMS]
    }
  }

  return desktopPad
}

/**
 * Fields from the top-level `toolbar` option that phone layouts inherit.
 *
 * Phone chrome (placement, labels, full width, collapsible) comes from built-in
 * defaults and optional `layouts.phone.toolbar`. Append-item customizations are
 * desktop/pad-only so phone keeps the built-in phone item set.
 * Button-frame chrome is inherited so a top-level `showButtonBorder` applies on
 * the phone bottom bar as well.
 */
const PHONE_INHERITED_TOP_LEVEL_KEYS: (keyof AcUiToolbarOptions)[] = [
  'mountTarget',
  'enabled',
  'inCanvasParent',
  'showButtonBorder'
]

/**
 * Merges built-in defaults, top-level toolbar baseline, and per-layout overrides.
 *
 * Priority (high wins): `layouts[kind].toolbar` > top-level baseline > built-in.
 *
 * @param layout - Active layout kind.
 * @param topLevel - Plugin-level `toolbar` option.
 * @param layoutOverride - Optional `layouts[kind].toolbar` override.
 * @returns Merged toolbar options for the given layout kind.
 */
export function acuiMergeToolbarOptionsForLayout(
  layout: AcEdUiLayoutKind,
  topLevel: AcUiToolbarOptions | undefined,
  layoutOverride: AcUiToolbarOptions | undefined
): AcUiToolbarOptions {
  const builtin = acuiBuiltinToolbarOptionsForLayout(layout)
  const baseline: AcUiToolbarOptions = {}

  if (topLevel) {
    if (layout === 'phone') {
      for (const key of PHONE_INHERITED_TOP_LEVEL_KEYS) {
        if (topLevel[key] !== undefined) {
          ;(baseline as Record<string, unknown>)[key] = topLevel[key]
        }
      }
    } else {
      Object.assign(baseline, topLevel)
    }
  }

  return {
    ...builtin,
    ...baseline,
    ...layoutOverride
  }
}
