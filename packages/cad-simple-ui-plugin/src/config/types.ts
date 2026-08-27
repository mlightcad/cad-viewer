import type {
  AcApLocale,
  AcEdOpenMode,
  AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

/** Toolbar edge placement relative to the viewer host element. */
export type AcUiToolbarPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * How the toolbar shows items that do not fit along the docked edge.
 *
 * - `'menu'`: hide overflowing items behind a "more" (⋯) button that opens a popup.
 * - `'scroll'`: keep all items in a scrollable strip (horizontal or vertical).
 */
export type AcUiToolbarOverflow = 'menu' | 'scroll'

/** Dock panel edge placement relative to the viewer host element. */
export type AcUiDockPanelSide = 'top' | 'bottom' | 'left' | 'right'

/** Supported UI locale codes for plugin strings. */
export type AcUiLocale = 'en' | 'zh' | 'cs' | 'tr'

/**
 * Device-oriented UI layout kind for toolbars.
 *
 * Mirrors viewer {@link AcEdUiLayoutKind}.
 */
export type AcUiLayoutKind = 'mobile' | 'pad' | 'desktop'

/**
 * Controls how a parent button icon relates to its submenu selection.
 *
 * - `'fixed'`: parent keeps its own `icon` (default).
 * - `'selected'`: parent shows the selected child's `icon`.
 */
export type AcUiToolbarChildIconMode = 'fixed' | 'selected'

/**
 * How nested `children` are presented when the parent button is clicked.
 *
 * - `'menu'`: popover dropdown with icon + label (default). Closes on outside click.
 * - `'toolbar'`: icon sub-toolbar beside the parent. Closes on canvas / outside click.
 * - `'sticky-toolbar'`: icon sub-toolbar that stays open until the parent button
 *   is clicked again. Canvas clicks do not dismiss it.
 */
export type AcUiToolbarChildrenUi = 'menu' | 'toolbar' | 'sticky-toolbar'

/** Visual separator between toolbar button groups. */
export interface AcUiToolbarSeparator {
  type: 'separator'
  /** Optional stable id for debugging. */
  id?: string
}

/** Reference to a built-in toolbar button when composing a custom layout. */
export interface AcUiToolbarPresetRef {
  preset: string
}

/**
 * Configuration for a single toolbar button or submenu entry.
 */
export interface AcUiToolbarItem {
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
   * Popover-style click handler that receives the anchor button element.
   * When set, takes precedence over `command` and `action`.
   */
  anchorAction?: (anchor: HTMLElement) => void
  /**
   * When false, the button stays enabled without an open document.
   * Defaults to true when `command` is set, otherwise false.
   */
  requiresDocument?: boolean
  /** Minimum open mode required to show this item (Review shows in Review+Write). */
  minOpenMode?: AcEdOpenMode
  /** Static or dynamic disabled state evaluated at render time. */
  disabled?: boolean | (() => boolean)
  /** Nested submenu items shown when the button is clicked.
   * May be a live getter so the list can depend on the active document. */
  children?: AcUiToolbarItem[]
  /**
   * Presentation of {@link children}. Defaults to `'menu'` (popover dropdown).
   * Built-in Measure / Review use `'sticky-toolbar'`; Export, Toolbar
   * Position, and Language use `'toolbar'`.
   */
  childrenUi?: AcUiToolbarChildrenUi
  /**
   * When the button has `children`, controls whether the parent icon follows the
   * selected submenu item. Defaults to `'fixed'`.
   */
  childIcon?: AcUiToolbarChildIconMode
  /**
   * Initial submenu selection when {@link childIcon} is `'selected'`.
   * Applied once when the parent first appears; later item-list updates do not
   * overwrite a runtime selection.
   */
  selectedChildId?: string
  /** Two-state button that merges `on` or `off` branch fields based on `getValue`. */
  toggle?: {
    /** Returns whether the toggle is in the "on" branch. */
    getValue: () => boolean
    /** Fields applied when `getValue` returns true. */
    on: Partial<AcUiToolbarItem>
    /** Fields applied when `getValue` returns false. */
    off: Partial<AcUiToolbarItem>
  }
}

/** Resolved toolbar entry: button, separator, or preset reference in config. */
export type AcUiToolbarItemConfig =
  | AcUiToolbarItem
  | AcUiToolbarSeparator
  | AcUiToolbarPresetRef

/** Toolbar item list passed to {@link AcApSimpleUiPlugin.setToolbarItems}. */
export type AcUiToolbarItemsInput = AcUiToolbarItemConfig[] | 'default'

/**
 * Reusable toolbar chrome configuration (placement, items, collapse, overflow).
 *
 * Shared by {@link AcUiSimpleUiPluginOptions} and HTML export viewer setup so both
 * hosts can compose toolbars from the same shape (including preset refs).
 */
export interface AcUiToolbarConfig {
  /** When false, the toolbar is not created. */
  enabled?: boolean
  /** Edge placement relative to `host`. */
  placement?: AcUiToolbarPlacement
  /** Toolbar items, `'default'`, or a custom list (may include presets and separators). */
  items?: AcUiToolbarItemConfig[] | 'default'
  /** Extra items merged into `items` (default: appended at the end). */
  appendItems?: AcUiToolbarItemConfig[]
  /**
   * Insert `appendItems` after the root toolbar item with this id.
   * Ignored when {@link appendItemsBefore} is set.
   */
  appendItemsAfter?: string
  /**
   * Insert `appendItems` before the root toolbar item with this id.
   * Takes precedence over {@link appendItemsAfter}.
   */
  appendItemsBefore?: string
  /** When true, show a collapse/expand toggle at the end of the toolbar. */
  collapsible?: boolean
  /** Initial collapsed state when {@link collapsible} is true. */
  defaultCollapsed?: boolean
  /**
   * Canvas element that receives the floating toolbar.
   * Defaults to the active view container when it is inside `host`.
   */
  mountTarget?: HTMLElement
  /** Inset from the docked canvas edge in px. @default 8 */
  edgeOffset?: number
  /**
   * How overflowing toolbar items are shown when the host is too small.
   * @default 'menu'
   */
  overflow?: AcUiToolbarOverflow
}

/**
 * Per-device-layout options under {@link AcUiSimpleUiPluginOptions.layouts}.
 */
export interface AcUiLayoutOptions {
  /** Toolbar configuration for this layout kind. */
  toolbar?: AcUiToolbarConfig
}

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
  /**
   * Restores the view captured when the current document was activated
   * ("original viewport"). Used by the mobile zoom submenu.
   */
  restoreOriginalView?: () => void
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
   * How device layouts are chosen.
   *
   * - `'auto'` (default): follow viewport via {@link acedGetUiLayoutKind}.
   * - `'mobile' | 'pad' | 'desktop'`: lock to that layout.
   */
  layout?: 'auto' | AcUiLayoutKind
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
   * Toolbar configuration. Enabled by default.
   *
   * When {@link layouts} is used, this top-level block is merged only into
   * **pad** and **desktop** layouts (not mobile) for backward compatibility.
   */
  toolbar?: AcUiToolbarConfig
  /**
   * Per-device toolbar (and future chrome) overrides.
   *
   * Merge order for each kind: built-in defaults → top-level {@link toolbar}
   * (pad/desktop only) → `layouts.<kind>.toolbar`.
   */
  layouts?: {
    mobile?: AcUiLayoutOptions
    pad?: AcUiLayoutOptions
    desktop?: AcUiLayoutOptions
  }
}

/** Plugin identifier registered with {@link AcApPluginManager}. */
export const SIMPLE_UI_PLUGIN_NAME = 'SimpleUiPlugin'

