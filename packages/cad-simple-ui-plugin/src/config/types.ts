import type { AcEdOpenMode, AcEdUiTheme } from '@mlightcad/cad-simple-viewer'

/** Toolbar edge placement relative to the viewer host element. */
export type AcExToolbarPlacement = 'top' | 'bottom' | 'left' | 'right'

/** Supported UI locale codes for plugin strings. */
export type AcExLocale = 'en' | 'zh'

/**
 * Controls how a parent button icon relates to its submenu selection.
 *
 * - `'fixed'`: parent keeps its own `icon` (default).
 * - `'selected'`: parent shows the selected child's `icon`.
 */
export type AcExToolbarChildIconMode = 'fixed' | 'selected'

/** Visual separator between toolbar button groups. */
export interface AcExToolbarSeparator {
  type: 'separator'
  /** Optional stable id for debugging. */
  id?: string
}

/** Reference to a built-in toolbar button when composing a custom layout. */
export interface AcExToolbarPresetRef {
  preset: string
}

/**
 * Configuration for a single toolbar button or submenu entry.
 */
export interface AcExToolbarItem {
  /** Stable identifier used for DOM attributes and debugging. */
  id: string
  /** When `'separator'`, renders a divider instead of a button. */
  type?: 'button' | 'separator'
  /** i18n key under the `simpleUi` namespace (for example `toolbar.select`). */
  label?: string
  /** Inline SVG string, DOM element, or factory that produces an icon element. */
  icon?: string | HTMLElement | (() => HTMLElement)
  /** CAD command string sent to {@link AcApDocManager.sendStringToExecute}. */
  command?: string
  /** Custom click handler. Used when no command is set (e.g. theme toggle). */
  action?: () => void
  /**
   * When false, the button stays enabled without an open document.
   * Defaults to true when `command` is set, otherwise false.
   */
  requiresDocument?: boolean
  /** Minimum open mode required to show this item (Review shows in Review+Write). */
  minOpenMode?: AcEdOpenMode
  /** Static or dynamic disabled state evaluated at render time. */
  disabled?: boolean | (() => boolean)
  /** Nested submenu items shown in a dropdown when the button is clicked. */
  children?: AcExToolbarItem[]
  /**
   * When the button has `children`, controls whether the parent icon follows the
   * selected submenu item. Defaults to `'fixed'`.
   */
  childIcon?: AcExToolbarChildIconMode
  /** Initial submenu selection when {@link childIcon} is `'selected'`. */
  selectedChildId?: string
  /** Two-state button that merges `on` or `off` branch fields based on `getValue`. */
  toggle?: {
    /** Returns whether the toggle is in the "on" branch. */
    getValue: () => boolean
    /** Fields applied when `getValue` returns true. */
    on: Partial<AcExToolbarItem>
    /** Fields applied when `getValue` returns false. */
    off: Partial<AcExToolbarItem>
  }
}

/** Resolved toolbar entry: button, separator, or preset reference in config. */
export type AcExToolbarItemConfig =
  | AcExToolbarItem
  | AcExToolbarSeparator
  | AcExToolbarPresetRef

/**
 * Callbacks supplied when building the default toolbar (theme and locale toggles).
 */
export interface AcExDefaultToolbarContext {
  /** Returns the current UI theme. */
  getTheme: () => AcEdUiTheme
  /** Applies a UI theme change. */
  setTheme: (theme: AcEdUiTheme) => void
  /** Returns the active application locale. */
  getLocale: () => 'en' | 'zh'
  /** Switches between English and Chinese. */
  toggleLocale: () => void
  /** Returns the current toolbar edge placement. */
  getPlacement: () => AcExToolbarPlacement
  /** Moves the toolbar to the given host edge. */
  setPlacement: (placement: AcExToolbarPlacement) => void
}

/**
 * Options passed to {@link createSimpleUiPlugin} and {@link registerSimpleUiPlugin}.
 */
export interface AcExSimpleUiPluginOptions {
  /** Viewer host element; defaults to the active view container or `document.body`. */
  host?: HTMLElement
  /** @deprecated Locale follows {@link AcApI18n.currentLocale} automatically. */
  locale?: AcExLocale
  /** Toolbar configuration. Enabled by default. */
  toolbar?: {
    /** When false, the toolbar is not created. */
    enabled?: boolean
    /** Edge placement relative to `host`. */
    placement?: AcExToolbarPlacement
    /** Toolbar items, `'default'`, or a custom list (may include presets and separators). */
    items?: AcExToolbarItemConfig[] | 'default'
    /** Extra items appended after `items`. */
    appendItems?: AcExToolbarItemConfig[]
  }
  /** Layer manager panel configuration. Enabled by default. */
  layerManager?: {
    /** When false, the layer manager and `layer` command are not registered. */
    enabled?: boolean
    /** When false (default), the panel is clamped inside `host`. */
    allowMoveOutsideCanvas?: boolean
  }
}

/** Plugin identifier registered with {@link AcApPluginManager}. */
export const SIMPLE_UI_PLUGIN_NAME = 'SimpleUiPlugin'
