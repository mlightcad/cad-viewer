import type { AcUiToolbarChromeOptions } from './types'

/** Resolved toolbar chrome with explicit defaults applied. */
export type AcUiResolvedToolbarChrome = Required<
  Pick<
    AcUiToolbarChromeOptions,
    | 'edgeOffset'
    | 'sideOffset'
    | 'showLabels'
    | 'size'
    | 'overflow'
    | 'showBorder'
    | 'showSeparators'
  >
>

/**
 * Merges toolbar chrome options and fills in defaults.
 *
 * @param base - Primary toolbar chrome (main toolbar mount options).
 * @param override - Optional sub-toolbar overrides.
 */
export function acuiResolveToolbarChrome(
  base: Partial<AcUiToolbarChromeOptions> = {},
  override?: Partial<AcUiToolbarChromeOptions>
): AcUiResolvedToolbarChrome {
  const merged = { ...base, ...override }
  return {
    edgeOffset: merged.edgeOffset ?? 8,
    sideOffset: merged.sideOffset ?? 0,
    showLabels: merged.showLabels ?? false,
    size: merged.size ?? 'auto',
    overflow: merged.overflow ?? 'menu',
    showBorder: merged.showBorder ?? true,
    showSeparators: merged.showSeparators ?? true
  }
}
