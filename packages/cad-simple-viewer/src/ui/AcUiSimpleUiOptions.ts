import type { AcEdUiLayoutKind, AcEdUiTheme } from '../editor'
import type { AcApLocale } from '../i18n'
import type { AcUiDockPanelSide } from './dock/AcUiDockPanel'
import type {
  AcUiToolbarItemConfig,
  AcUiToolbarOptions
} from './toolbar/types'

export type {
  AcUiSubToolbarOptions,
  AcUiSubToolbarPosition,
  AcUiToolbarChildIconMode,
  AcUiToolbarChildrenUi,
  AcUiToolbarChromeOptions,
  AcUiToolbarDocState,
  AcUiToolbarI18n,
  AcUiToolbarItem,
  AcUiToolbarItemConfig,
  AcUiToolbarOptions,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiToolbarPresetRef,
  AcUiToolbarSeparator,
  AcUiToolbarSize,
  AcUiDefaultToolbarContext
} from './toolbar/types'

/** Toolbar item list passed to {@link AcApSimpleUiChrome.setToolbarItems}. */
export type AcUiToolbarItemsInput = AcUiToolbarItemConfig[] | 'default'

/** Supported UI locale codes for chrome strings. */
export type AcUiLocale = 'en' | 'zh' | 'ja' | 'ko' | 'cs' | 'tr' | 'ar'

/**
 * Per-layout overrides for {@link AcUiSimpleUiOptions.layouts}.
 *
 * Each entry's `toolbar` is merged on top of built-in defaults and the top-level
 * {@link AcUiToolbarOptions} baseline (phone inherits only `enabled`,
 * `mountTarget`, `inCanvasParent`, and `showButtonBorder` from the top-level
 * toolbar — see {@link acuiMergeToolbarOptionsForLayout}).
 */
export interface AcUiLayoutOptions {
  /** Toolbar configuration for this layout kind. */
  toolbar?: AcUiToolbarOptions
}

/**
 * How the chrome chooses among phone / pad / desktop layouts.
 *
 * - `'auto'`: follow viewport width via {@link acedGetUiLayout}
 * - `'phone' | 'pad' | 'desktop'`: force a layout kind regardless of viewport
 */
export type AcUiPluginLayoutMode = 'auto' | AcEdUiLayoutKind

/**
 * Options passed to {@link AcApSimpleUiChrome}.
 */
export interface AcUiSimpleUiOptions {
  /** Viewer host element; defaults to the active view container or `document.body`. */
  host?: HTMLElement
  /** @deprecated Locale follows {@link AcApI18n.currentLocale} automatically. */
  locale?: AcUiLocale
  /**
   * Layout mode. `'auto'` follows viewport width; otherwise forces one kind.
   * @default 'auto'
   */
  layout?: AcUiPluginLayoutMode
  /**
   * Per-layout toolbar overrides. Merged on top of built-in defaults and the
   * top-level {@link toolbar} baseline.
   *
   * Keys match {@link AcEdUiLayoutKind}. Phone overrides replace phone built-ins;
   * pad/desktop overrides replace the full top-level toolbar for that kind.
   * Pad built-ins exclude `select` and `pan`; restore them with
   * `layouts.pad.toolbar.excludeItems: []`.
   */
  layouts?: {
    /** Overrides when {@link AcApSimpleUiChrome.getLayout} resolves to phone. */
    phone?: AcUiLayoutOptions
    /** Overrides when {@link AcApSimpleUiChrome.getLayout} resolves to pad. */
    pad?: AcUiLayoutOptions
    /** Overrides when {@link AcApSimpleUiChrome.getLayout} resolves to desktop. */
    desktop?: AcUiLayoutOptions
  }
  /** Chrome DevTools-style dock panel configuration. */
  dockPanel?: {
    /** Explicitly enable the dock panel container. */
    enabled?: boolean
    /** @default false */
    defaultOpen?: boolean
    /** @default 'left' */
    defaultSide?: AcUiDockPanelSide
    /** Bottom dock default height in px. @default 240 */
    defaultHeight?: number
    /** Left/right dock default width in px. @default 280 */
    defaultWidth?: number
    /**
     * Element that receives the dock panel and canvas shrink layout.
     * Defaults to the viewer canvas parent when it is inside `host`.
     */
    mountTarget?: HTMLElement
  }
  /**
   * Toolbar baseline configuration. Applied fully to pad/desktop. Phone inherits
   * only {@link AcUiToolbarOptions.mountTarget}, `enabled`,
   * {@link AcUiToolbarOptions.inCanvasParent}, and
   * {@link AcUiToolbarOptions.showButtonBorder} from this baseline; phone chrome
   * and items come from built-in phone defaults plus
   * {@link layouts.phone.toolbar} (append items are not inherited on phone).
   */
  toolbar?: AcUiToolbarOptions
}

// Keep theme type referenced for JSDoc consumers of setTheme callbacks.
export type { AcEdUiTheme, AcApLocale }
