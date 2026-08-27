/**
 * Mounts {@link AcUiToolbar} for the offline HTML export viewer.
 *
 * Thin wrapper around {@link acuiSetupToolbar}: pass the same `layout` /
 * `toolbar` / `layouts` config shape as {@link acuiRegisterSimpleUiPlugin},
 * plus HTML-specific presets and `html:*` command handling.
 */

import {
  acuiSetupToolbar,
  type AcUiSetupToolbarController
} from '@mlightcad/cad-simple-ui-plugin/setup-toolbar'
import type {
  AcUiLayoutKind,
  AcUiLayoutOptions,
  AcUiToolbarConfig
} from '@mlightcad/cad-simple-ui-plugin/toolbar'

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import {
  type AcExHtmlToolbarItemContext,
  adaptAcExHtmlToolbarI18n,
  createAcExHtmlToolbarPresetMap,
  getAcExHtmlBuiltInToolbarConfig
} from './AcExHtmlToolbarItems'

function toToolbarI18n(i18n: AcExHtmlI18n) {
  return adaptAcExHtmlToolbarI18n({
    t: (key, params) => i18n.t(key as never, params)
  })
}

/** Options for {@link setupAcExHtmlSimpleToolbar}. */
export interface AcExHtmlSimpleToolbarOptions {
  /**
   * Viewer canvas root that receives the absolutely positioned toolbar
   * (usually `#mlcad-root`).
   */
  host: HTMLElement
  /** Overlay host for sub-toolbars / dropdowns (defaults to {@link host}). */
  overlayHost?: HTMLElement
  i18n: AcExHtmlI18n
  /** Live getters for toggles and dynamic children. */
  context: AcExHtmlToolbarItemContext
  /** Handles `html:*` toolbar commands. */
  onCommand: (command: string) => void
  /** Called when the toolbar collapses (close drawers / polar panel). */
  onCollapse?: () => void
  /**
   * Called after the toolbar DOM is rebuilt so the host can restore nav /
   * measure / markup `active` classes.
   */
  onRender?: () => void
  /**
   * How device layouts are chosen.
   *
   * - `'auto'` (default): follow viewport via {@link acuiGetLayoutKind}.
   * - `'mobile' | 'pad' | 'desktop'`: lock to that layout.
   */
  layout?: 'auto' | AcUiLayoutKind
  /**
   * Toolbar overrides merged into pad/desktop defaults (not mobile), matching
   * simple-ui top-level `toolbar` semantics.
   */
  toolbar?: AcUiToolbarConfig
  /** Per-device toolbar overrides. */
  layouts?: {
    mobile?: AcUiLayoutOptions
    pad?: AcUiLayoutOptions
    desktop?: AcUiLayoutOptions
  }
}

/**
 * Creates the HTML export viewer toolbar using shared {@link acuiSetupToolbar}.
 */
export function setupAcExHtmlSimpleToolbar(
  options: AcExHtmlSimpleToolbarOptions
): AcUiSetupToolbarController {
  return acuiSetupToolbar({
    host: options.host,
    themeHost: options.overlayHost ?? options.host,
    i18n: toToolbarI18n(options.i18n),
    onCommand: options.onCommand,
    onCollapse: options.onCollapse,
    onRender: options.onRender,
    layout: options.layout,
    toolbar: options.toolbar,
    layouts: options.layouts,
    getBuiltInDefaults: kind =>
      getAcExHtmlBuiltInToolbarConfig(kind, options.context),
    presets: () => createAcExHtmlToolbarPresetMap(options.context),
    docBinding: false,
    onAfterResolve: toolbar => {
      toolbar.setSelectedChild(
        'locale',
        `locale-${options.context.getLocale()}`
      )
    }
  })
}
