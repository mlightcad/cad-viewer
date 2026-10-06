import type {
  AcApLocale,
  AcEdUiLayoutKind,
  AcEdUiTheme,
  AcUiToolbarItemConfig,
  AcUiToolbarOptions,
  AcUiToolbarPlacement
} from '@mlightcad/cad-simple-viewer'

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
  AcUiToolbarSize
} from '@mlightcad/cad-simple-viewer'

/** Toolbar item list passed to {@link AcApSimpleUiPlugin.setToolbarItems}. */
export type AcUiToolbarItemsInput = AcUiToolbarItemConfig[] | 'default'

/** Dock panel edge placement relative to the viewer host element. */
export type AcUiDockPanelSide = 'top' | 'bottom' | 'left' | 'right'

/** Supported UI locale codes for plugin strings. */
export type AcUiLocale = 'en' | 'zh' | 'cs' | 'tr'

/**
 * Per-layout overrides for {@link AcUiSimpleUiPluginOptions.layouts}.
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
 * How the plugin chooses among phone / pad / desktop chrome.
 *
 * - `'auto'`: follow viewport width via {@link acedGetUiLayout}
 * - `'phone' | 'pad' | 'desktop'`: force a layout kind regardless of viewport
 */
export type AcUiPluginLayoutMode = 'auto' | AcEdUiLayoutKind

/**
 * Callbacks supplied when building the default toolbar (theme, locale, and placement).
 */
export interface AcUiDefaultToolbarContext {
  /** Returns the current UI theme. */
  getTheme: () => AcEdUiTheme
  /** Applies a UI theme change. */
  setTheme: (theme: AcEdUiTheme) => void
  /** Returns the active application locale. */
  getLocale: () => AcApLocale
  /** Sets the application locale. */
  setLocale: (locale: AcApLocale) => void
  /** Returns the current toolbar edge placement. */
  getPlacement: () => AcUiToolbarPlacement
  /** Moves the toolbar to the given host edge. */
  setPlacement: (placement: AcUiToolbarPlacement) => void
}

/**
 * Options passed to {@link acuiCreateSimpleUiPlugin} and {@link acuiRegisterSimpleUiPlugin}.
 */
export interface AcUiSimpleUiPluginOptions {
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
    /** Overrides when {@link AcApSimpleUiPlugin.getLayout} resolves to phone. */
    phone?: AcUiLayoutOptions
    /** Overrides when {@link AcApSimpleUiPlugin.getLayout} resolves to pad. */
    pad?: AcUiLayoutOptions
    /** Overrides when {@link AcApSimpleUiPlugin.getLayout} resolves to desktop. */
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

/** Plugin identifier registered with {@link AcApPluginManager}. */
export const SIMPLE_UI_PLUGIN_NAME = 'SimpleUiPlugin'
