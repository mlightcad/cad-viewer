import type {
  AcApLocale,
  AcEdOpenMode,
  AcEdUiLayoutKind,
  AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

/** Toolbar edge placement relative to the viewer host element. */
export type AcUiToolbarPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * Overflow behavior when toolbar buttons exceed the host bounds.
 *
 * - `'menu'`: show a ⋯ button; overflow items open in a dropdown menu.
 * - `'wrap'`: continue on additional rows (horizontal) or columns (vertical).
 */
export type AcUiToolbarOverflow = 'menu' | 'wrap'

/**
 * Sizing along the toolbar layout axis: width for horizontal bars, height for vertical bars.
 *
 * - `'auto'`: natural size from button content (default).
 * - `'stretch'`: fill the available host width or height and space buttons evenly.
 */
export type AcUiToolbarSize = 'auto' | 'stretch'

/**
 * How a sub-toolbar aligns along the parent toolbar's main axis.
 *
 * - `'front'`: first sub-toolbar button aligns with the first toolbar button
 *   (default)
 * - `'end'`: last sub-toolbar button aligns with the last toolbar button
 * - `'center'`: centers the sub-toolbar on the parent toolbar
 * - `'auto'`: align to the parent button
 *
 * Ignored when the sub-toolbar {@link AcUiToolbarChromeOptions.size} is
 * `'stretch'`.
 */
export type AcUiSubToolbarPosition = 'front' | 'end' | 'center' | 'auto'

/**
 * Shared layout and chrome options for the main toolbar and sub-toolbars.
 *
 * Sub-toolbars inherit unset fields from the main toolbar unless overridden via
 * {@link AcUiToolbarOptions.subToolbar}.
 */
export interface AcUiToolbarChromeOptions {
  /**
   * Inset from the host edge where the toolbar is anchored in px.
   * Top/bottom placement uses top or bottom; left/right uses left or right.
   * @default 8
   */
  edgeOffset?: number
  /**
   * Minimum inset from the host edges orthogonal to {@link edgeOffset} in px.
   *
   * - Horizontal toolbar (top/bottom): spacing from the top and bottom edges.
   * - Vertical toolbar (left/right): spacing from the left and right edges.
   *
   * Used when the toolbar is at its maximum cross-axis size (for example wrap
   * overflow) and for cross-axis positioning clamps.
   * @default 0
   */
  sideOffset?: number
  /** When true, render button labels below icons on icon toolbars. */
  showLabels?: boolean
  /**
   * Sizing along the toolbar layout axis: width for horizontal bars, height for
   * vertical bars.
   * @default 'auto'
   */
  size?: AcUiToolbarSize
  /** Overflow behavior when buttons exceed the host bounds. */
  overflow?: AcUiToolbarOverflow
  /**
   * When false, hides the toolbar container border line.
   * @default true
   */
  showBorder?: boolean
  /**
   * When true, each toolbar button draws a permanent outer border.
   * When false, buttons stay frameless until hover / active.
   * @default false
   */
  showButtonBorder?: boolean
  /**
   * When false, omits visual separators between toolbar button groups.
   * @default true
   */
  showSeparators?: boolean
  /**
   * When true, parent buttons with children show a small corner triangle.
   * Phone layouts typically set this to false.
   * @default true
   */
  showChildrenIndicator?: boolean
}

/**
 * Sub-toolbar overrides: chrome fields plus optional axis alignment.
 *
 * Unset chrome fields inherit from the main toolbar.
 */
export interface AcUiSubToolbarOptions extends Partial<AcUiToolbarChromeOptions> {
  /**
   * Aligns the strip along the parent toolbar axis.
   * @default 'front'
   */
  position?: AcUiSubToolbarPosition
  /**
   * When true, opening a nested sub-toolbar hides the ancestor strip so only
   * the new strip is visible (saves vertical space on phone). When false,
   * nested strips stack beside/above the ancestor (pad/desktop).
   *
   * Also, when true, layers / measurements / review dock panels, sub-toolbars,
   * and menus are mutually exclusive: opening one closes the others.
   * @default false
   */
  replaceOnNested?: boolean
}

/** Dock panel edge placement relative to the viewer host element. */
export type AcUiDockPanelSide = 'top' | 'bottom' | 'left' | 'right'

/** Supported UI locale codes for plugin strings. */
export type AcUiLocale = 'en' | 'zh' | 'cs' | 'tr'

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
 * - `'toolbar'`: icon sub-toolbar beside the parent. Closes when a child button
 *   is clicked, or on canvas / outside click.
 * - `'sticky-toolbar'`: icon sub-toolbar that stays open until the parent button
 *   is clicked again, or another parent opens a different strip. Child and
 *   canvas clicks do not dismiss it.
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
   * Built-in Measure, Review, Export, Toolbar Position, and Language use
   * `'toolbar'`.
   */
  childrenUi?: AcUiToolbarChildrenUi
  /**
   * When the button has `children`, controls whether the parent icon follows the
   * selected submenu item. Defaults to `'fixed'`.
   */
  childIcon?: AcUiToolbarChildIconMode
  /** Initial submenu selection when {@link childIcon} is `'selected'`. */
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
 * Standalone toolbar configuration shared by the plugin and (later) HTML export.
 *
 * Built-in defaults per layout kind come from
 * {@link acuiBuiltinToolbarOptionsForLayout}; callers merge via
 * {@link acuiMergeToolbarOptionsForLayout}.
 */
export interface AcUiToolbarOptions extends AcUiToolbarChromeOptions {
  /** When false, the toolbar is not created. */
  enabled?: boolean
  /** Edge placement relative to `host`. */
  placement?: AcUiToolbarPlacement
  /** Toolbar items, `'default'`, or a custom list (may include presets and separators). */
  items?: AcUiToolbarItemConfig[] | 'default'
  /**
   * Root toolbar item ids to omit after resolving {@link items} and
   * {@link appendItems}. Does not recurse into submenu children.
   *
   * Pad built-in defaults use `['select', 'pan']` because touch already pans
   * on drag and box-selects after a long-press. Restore those buttons with
   * `layouts.pad.toolbar.excludeItems: []`.
   */
  excludeItems?: string[]
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
  /**
   * When true, the toolbar is laid out as a flex sibling of the canvas inside
   * the canvas parent (the same mount target as the dock panel) instead of
   * floating over the drawing. {@link placement} still selects which edge;
   * {@link edgeOffset} and {@link sideOffset} remain insets.
   *
   * @default false
   */
  inCanvasParent?: boolean
  /**
   * Sub-toolbar chrome and position overrides. Unset chrome fields inherit from
   * the main toolbar. {@link AcUiSubToolbarOptions.position} defaults to
   * `'front'`.
   */
  subToolbar?: AcUiSubToolbarOptions
}

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
