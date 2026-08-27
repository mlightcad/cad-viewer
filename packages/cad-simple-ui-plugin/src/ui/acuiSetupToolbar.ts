/**
 * Config-driven toolbar mount for standalone hosts (e.g. HTML export viewer).
 *
 * Mirrors the `layout` / `toolbar` / `layouts` options of
 * {@link acuiRegisterSimpleUiPlugin} without loading the full SimpleUiPlugin.
 */

import {
  acuiResolveLayoutToolbarConfig,
  acuiResolveToolbarItemsFromPresets
} from '../config/toolbarConfig'
import type {
  AcUiLayoutKind,
  AcUiLayoutOptions,
  AcUiToolbarConfig,
  AcUiToolbarItem,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement
} from '../config/types'
import {
  AcUiToolbar,
  type AcUiToolbarDocState,
  type AcUiToolbarI18n
} from './AcUiToolbar'
import {
  acuiGetLayoutKind,
  ML_EX_UI_COMPACT_MEDIA_QUERY,
  ML_EX_UI_MOBILE_MEDIA_QUERY
} from './uiLayout'

/** Aligns with `AcEdOpenMode.Write` for offline hosts. */
const DEFAULT_OFFLINE_OPEN_MODE = 8

/** Handles returned by {@link acuiSetupToolbar}. */
export interface AcUiSetupToolbarController {
  /** Underlying toolbar instance. */
  toolbar: AcUiToolbar
  /** Rebuilds items for the current layout (locale / toggle state changes). */
  refresh: () => void
  /** Tears down media listeners and the toolbar DOM. */
  destroy: () => void
  /** Current dock-edge inset in px. */
  getEdgeOffset: () => number
  /** Sets dock-edge inset (clamped to >= 0) and reclamps layout. */
  setEdgeOffset: (offset: number) => void
  /** Current overflow strategy. */
  getOverflow: () => AcUiToolbarOverflow
  /** Sets overflow to `'menu'` (⋯) or `'scroll'`. */
  setOverflow: (overflow: AcUiToolbarOverflow) => void
  /** Current edge placement. */
  getPlacement: () => AcUiToolbarPlacement
  /** Moves the toolbar to another edge. */
  setPlacement: (placement: AcUiToolbarPlacement) => void
  /** Layout kind currently applied. */
  getLayoutKind: () => AcUiLayoutKind
}

/** Options for {@link acuiSetupToolbar}. */
export interface AcUiSetupToolbarOptions {
  /** Element that receives the absolutely positioned toolbar. */
  host: HTMLElement
  /** Theme / dropdown host; defaults to {@link host}. */
  themeHost?: HTMLElement
  /** i18n helper for labels and tooltips. */
  i18n: AcUiToolbarI18n
  /** Invoked when a leaf item with a `command` is activated. */
  onCommand: (command: string) => void
  /** Invoked when the toolbar collapses. */
  onCollapse?: () => void
  /** Invoked after the toolbar DOM is rebuilt. */
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
   * {@link AcUiSimpleUiPluginOptions.toolbar}.
   */
  toolbar?: AcUiToolbarConfig
  /** Per-device toolbar overrides. */
  layouts?: {
    mobile?: AcUiLayoutOptions
    pad?: AcUiLayoutOptions
    desktop?: AcUiLayoutOptions
  }
  /**
   * Built-in defaults per layout kind.
   * Required for meaningful item lists; HTML hosts pass
   * `getAcExHtmlBuiltInToolbarConfig`.
   */
  getBuiltInDefaults: (kind: AcUiLayoutKind) => AcUiToolbarConfig
  /**
   * Preset map used to expand `{ preset: '…' }` refs.
   * May be a factory so live toggles stay fresh on refresh.
   */
  presets:
    | Map<string, AcUiToolbarItem>
    | ((kind: AcUiLayoutKind) => Map<string, AcUiToolbarItem>)
  /**
   * When true, bind to a document manager bridge.
   * Offline hosts should leave this false (the default) and optionally set
   * {@link documentState}.
   * @default false
   */
  docBinding?: boolean
  /** Document state when {@link docBinding} is false. */
  documentState?: AcUiToolbarDocState
  /** Layout mode for the toolbar root. @default 'absolute' */
  positioning?: 'absolute' | 'static'
  /**
   * Called after items are resolved for a layout, **before**
   * {@link AcUiToolbar.updateItems}, so the host can seed submenu selections
   * (e.g. locale child id) that must be in place when buttons re-render.
   */
  onAfterResolve?: (
    toolbar: AcUiToolbar,
    kind: AcUiLayoutKind,
    items: AcUiToolbarItem[]
  ) => void
}

function chromeFallback(
  kind: AcUiLayoutKind,
  config: AcUiToolbarConfig
): Required<
  Pick<
    AcUiToolbarConfig,
    | 'placement'
    | 'collapsible'
    | 'edgeOffset'
    | 'overflow'
    | 'contentWidth'
    | 'itemDistribution'
    | 'showItemLabels'
  >
> {
  const isMobile = kind === 'mobile'
  return {
    placement: config.placement ?? (isMobile ? 'bottom' : 'right'),
    collapsible: config.collapsible ?? !isMobile,
    edgeOffset: config.edgeOffset ?? (isMobile ? 0 : 8),
    overflow: config.overflow ?? 'menu',
    contentWidth: config.contentWidth ?? (isMobile ? 'full' : 'hug'),
    itemDistribution:
      config.itemDistribution ?? (isMobile ? 'evenly' : 'start'),
    showItemLabels: config.showItemLabels ?? isMobile
  }
}

/**
 * Mounts a floating toolbar from the same config shape as SimpleUiPlugin.
 *
 * @param options - Host, i18n, layout config, and optional host-specific presets.
 */
export function acuiSetupToolbar(
  options: AcUiSetupToolbarOptions
): AcUiSetupToolbarController {
  const layoutMode = options.layout ?? 'auto'
  const getBuiltInDefaults = options.getBuiltInDefaults
  let currentKind: AcUiLayoutKind =
    layoutMode === 'auto' ? acuiGetLayoutKind() : layoutMode

  const resolvePresets = (kind: AcUiLayoutKind) => {
    return typeof options.presets === 'function'
      ? options.presets(kind)
      : options.presets
  }

  const buildConfig = (kind: AcUiLayoutKind) =>
    acuiResolveLayoutToolbarConfig(
      { toolbar: options.toolbar, layouts: options.layouts },
      kind,
      getBuiltInDefaults
    )

  const resolveItems = (
    kind: AcUiLayoutKind,
    config: AcUiToolbarConfig
  ): AcUiToolbarItem[] => {
    if (config.enabled === false) return []
    const presets = resolvePresets(kind)
    return acuiResolveToolbarItemsFromPresets(config, presets, () => {
      const builtIn = getBuiltInDefaults(kind)
      if (builtIn.items && builtIn.items !== 'default') {
        return acuiResolveToolbarItemsFromPresets(
          { items: builtIn.items },
          presets
        )
      }
      return []
    })
  }

  let config = buildConfig(currentKind)
  const chrome = chromeFallback(currentKind, config)
  const initialItems = resolveItems(currentKind, config)

  const toolbar = new AcUiToolbar({
    host: options.host,
    themeHost: options.themeHost ?? options.host,
    placement: chrome.placement,
    positioning: options.positioning ?? 'absolute',
    collapsible: chrome.collapsible,
    defaultCollapsed: config.defaultCollapsed ?? false,
    overflow: chrome.overflow,
    edgeOffset: chrome.edgeOffset,
    contentWidth: chrome.contentWidth,
    itemDistribution: chrome.itemDistribution,
    showItemLabels: chrome.showItemLabels,
    docBinding: options.docBinding === true,
    documentState: options.documentState ?? {
      hasDocument: true,
      openMode: DEFAULT_OFFLINE_OPEN_MODE
    },
    items: initialItems,
    i18n: options.i18n,
    onCommand: options.onCommand,
    onCollapse: options.onCollapse,
    onRender: options.onRender
  })

  // Seed after construct: setSelectedChild alone does not re-render, but the
  // constructor already painted from selectedChildId; this keeps runtime map
  // aligned for hosts that always set locale (and similar) selections.
  options.onAfterResolve?.(toolbar, currentKind, initialItems)

  const applyChrome = (kind: AcUiLayoutKind, next: AcUiToolbarConfig) => {
    const c = chromeFallback(kind, next)
    toolbar.setPlacement(c.placement)
    toolbar.setEdgeOffset(c.edgeOffset)
    toolbar.setOverflow(c.overflow)
    toolbar.setContentWidth(c.contentWidth)
    toolbar.setItemDistribution(c.itemDistribution)
    toolbar.setShowItemLabels(c.showItemLabels)
    toolbar.setCollapsible(c.collapsible)
    toolbar.setVisible(next.enabled !== false)
  }

  const applyKind = (kind: AcUiLayoutKind) => {
    if (kind === currentKind) return
    currentKind = kind
    config = buildConfig(kind)
    const items = resolveItems(kind, config)
    applyChrome(kind, config)
    // Must run before updateItems so setSelectedChild affects the re-render
    // (seedSelectedChildren keeps existing runtime selections).
    options.onAfterResolve?.(toolbar, kind, items)
    toolbar.updateItems(items)
  }

  const layoutMqls: MediaQueryList[] = []
  const handleLayoutChange = () => {
    if (layoutMode !== 'auto') return
    applyKind(acuiGetLayoutKind())
  }
  if (layoutMode === 'auto' && typeof window.matchMedia === 'function') {
    for (const query of [
      ML_EX_UI_MOBILE_MEDIA_QUERY,
      ML_EX_UI_COMPACT_MEDIA_QUERY
    ]) {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', handleLayoutChange)
      layoutMqls.push(mql)
    }
  }

  return {
    toolbar,
    refresh: () => {
      config = buildConfig(currentKind)
      const items = resolveItems(currentKind, config)
      // Must run before updateItems so setSelectedChild affects the re-render
      // (seedSelectedChildren keeps existing runtime selections).
      options.onAfterResolve?.(toolbar, currentKind, items)
      toolbar.updateItems(items)
    },
    destroy: () => {
      for (const mql of layoutMqls) {
        mql.removeEventListener('change', handleLayoutChange)
      }
      toolbar.destroy()
    },
    getEdgeOffset: () => toolbar.getEdgeOffset(),
    setEdgeOffset: offset => toolbar.setEdgeOffset(offset),
    getOverflow: () => toolbar.getOverflow(),
    setOverflow: overflow => toolbar.setOverflow(overflow),
    getPlacement: () => toolbar.placement,
    setPlacement: placement => toolbar.setPlacement(placement),
    getLayoutKind: () => currentKind
  }
}
