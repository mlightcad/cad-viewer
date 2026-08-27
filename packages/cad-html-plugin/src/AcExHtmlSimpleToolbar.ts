/**
 * Mounts {@link AcUiToolbar} for the offline HTML export viewer.
 *
 * Uses absolute docking on the viewer root (same model as simple-ui) so
 * edgeOffset, overflow menu/scroll, edge flush, and mobile sub-toolbars work.
 *
 * Supports mobile / pad / desktop layouts via {@link AcUiToolbarConfig}, with
 * automatic switching from viewport breakpoints unless {@link layout} is locked.
 */

import {
  acuiGetLayoutKind,
  type AcUiLayoutKind,
  type AcUiLayoutOptions,
  AcUiToolbar,
  type AcUiToolbarConfig,
  type AcUiToolbarItem,
  type AcUiToolbarOverflow,
  type AcUiToolbarPlacement,
  ML_EX_UI_COMPACT_MEDIA_QUERY,
  ML_EX_UI_MOBILE_MEDIA_QUERY
} from '@mlightcad/cad-simple-ui-plugin/toolbar'

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import {
  type AcExHtmlToolbarItemContext,
  adaptAcExHtmlToolbarI18n,
  getAcExHtmlBuiltInToolbarConfig,
  resolveAcExHtmlToolbarConfig
} from './AcExHtmlToolbarItems'

function toToolbarI18n(i18n: AcExHtmlI18n) {
  return adaptAcExHtmlToolbarI18n({
    t: (key, params) => i18n.t(key as never, params)
  })
}

/** Aligns with `AcEdOpenMode.Write` without importing cad-simple-viewer. */
const HTML_TOOLBAR_OPEN_MODE_WRITE = 8

/** Handles returned by {@link setupAcExHtmlSimpleToolbar}. */
export interface AcExHtmlSimpleToolbarController {
  /** Underlying shared toolbar instance. */
  toolbar: AcUiToolbar
  /** Rebuilds items after locale / visibility / snap state changes. */
  refresh: () => void
  /** Tears down the toolbar DOM. */
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
  /** @deprecated Prefer {@link toolbar}.placement. @default from layout */
  placement?: AcUiToolbarPlacement
  /** @deprecated Prefer {@link toolbar}.edgeOffset. */
  edgeOffset?: number
  /** @deprecated Prefer {@link toolbar}.overflow. */
  overflow?: AcUiToolbarOverflow
}

function mergeToolbarConfig(
  ...layers: Array<AcUiToolbarConfig | undefined>
): AcUiToolbarConfig {
  const result: AcUiToolbarConfig = {}
  for (const layer of layers) {
    if (!layer) continue
    Object.assign(result, layer)
  }
  return result
}

function resolveKindToolbar(
  options: AcExHtmlSimpleToolbarOptions,
  kind: AcUiLayoutKind
): AcUiToolbarConfig {
  const builtIn = getAcExHtmlBuiltInToolbarConfig(kind, options.context)
  const topLevel = kind === 'mobile' ? undefined : options.toolbar
  const legacy: AcUiToolbarConfig | undefined =
    kind === 'mobile'
      ? undefined
      : {
          placement: options.placement,
          edgeOffset: options.edgeOffset,
          overflow: options.overflow
        }
  const layoutOverride = options.layouts?.[kind]?.toolbar
  return mergeToolbarConfig(builtIn, topLevel, legacy, layoutOverride)
}

/**
 * Creates the HTML export viewer toolbar using shared simple-ui chrome.
 */
export function setupAcExHtmlSimpleToolbar(
  options: AcExHtmlSimpleToolbarOptions
): AcExHtmlSimpleToolbarController {
  const layoutMode = options.layout ?? 'auto'
  let currentKind: AcUiLayoutKind =
    layoutMode === 'auto' ? acuiGetLayoutKind() : layoutMode

  const buildConfig = (kind: AcUiLayoutKind) =>
    resolveKindToolbar(options, kind)

  const buildItems = (kind: AcUiLayoutKind): AcUiToolbarItem[] =>
    resolveAcExHtmlToolbarConfig(buildConfig(kind), options.context)

  let config = buildConfig(currentKind)

  const toolbar = new AcUiToolbar({
    host: options.host,
    themeHost: options.overlayHost ?? options.host,
    placement: config.placement ?? 'left',
    positioning: 'absolute',
    collapsible: config.collapsible ?? true,
    defaultCollapsed: config.defaultCollapsed ?? false,
    overflow: config.overflow ?? 'menu',
    edgeOffset: config.edgeOffset ?? 12,
    docBinding: false,
    documentState: {
      hasDocument: true,
      openMode: HTML_TOOLBAR_OPEN_MODE_WRITE
    },
    items: buildItems(currentKind),
    i18n: toToolbarI18n(options.i18n),
    onCommand: options.onCommand,
    onCollapse: options.onCollapse,
    onRender: options.onRender
  })

  toolbar.setSelectedChild('locale', `locale-${options.context.getLocale()}`)

  const applyKind = (kind: AcUiLayoutKind) => {
    if (kind === currentKind) return
    currentKind = kind
    config = buildConfig(kind)
    toolbar.setPlacement(config.placement ?? 'left')
    toolbar.setEdgeOffset(config.edgeOffset ?? (kind === 'mobile' ? 0 : 12))
    toolbar.setOverflow(config.overflow ?? 'menu')
    toolbar.setCollapsible(config.collapsible ?? kind !== 'mobile')
    toolbar.updateItems(buildItems(kind))
    toolbar.setSelectedChild('locale', `locale-${options.context.getLocale()}`)
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
      toolbar.setSelectedChild(
        'locale',
        `locale-${options.context.getLocale()}`
      )
      toolbar.updateItems(buildItems(currentKind))
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
