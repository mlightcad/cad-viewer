/**
 * Mounts {@link AcExToolbar} for the offline HTML export viewer.
 *
 * Uses absolute docking on the viewer root (same model as simple-ui) so
 * edgeOffset, overflow menu/scroll, edge flush, and mobile sub-toolbars work.
 */

import {
  AcExToolbar,
  type AcExToolbarItem,
  type AcExToolbarOverflow,
  type AcExToolbarPlacement
} from '@mlightcad/cad-simple-ui-plugin/toolbar'

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import {
  type AcExHtmlToolbarItemContext,
  adaptAcExHtmlToolbarI18n,
  createAcExHtmlToolbarItems} from './AcExHtmlToolbarItems'

function toToolbarI18n(i18n: AcExHtmlI18n) {
  return adaptAcExHtmlToolbarI18n({
    t: (key, params) => i18n.t(key as never, params)
  })
}

/** Aligns with `AcEdOpenMode.Write` without importing cad-simple-viewer. */
const HTML_TOOLBAR_OPEN_MODE_WRITE = 8

/** Default inset matching `--mlcad-ui-inset` in the HTML shell. */
const HTML_TOOLBAR_EDGE_OFFSET = 12

/** Handles returned by {@link setupAcExHtmlSimpleToolbar}. */
export interface AcExHtmlSimpleToolbarController {
  /** Underlying shared toolbar instance. */
  toolbar: AcExToolbar
  /** Rebuilds items after locale / visibility / snap state changes. */
  refresh: () => void
  /** Tears down the toolbar DOM. */
  destroy: () => void
  /** Current dock-edge inset in px. */
  getEdgeOffset: () => number
  /** Sets dock-edge inset (clamped to >= 0) and reclamps layout. */
  setEdgeOffset: (offset: number) => void
  /** Current overflow strategy. */
  getOverflow: () => AcExToolbarOverflow
  /** Sets overflow to `'menu'` (⋯) or `'scroll'`. */
  setOverflow: (overflow: AcExToolbarOverflow) => void
  /** Current edge placement. */
  getPlacement: () => AcExToolbarPlacement
  /** Moves the toolbar to another edge. */
  setPlacement: (placement: AcExToolbarPlacement) => void
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
  /** Dock edge. @default `'left'` */
  placement?: AcExToolbarPlacement
  /** Inset from the docked edge in px. @default 12 */
  edgeOffset?: number
  /** Overflow strategy. @default `'menu'` */
  overflow?: AcExToolbarOverflow
}

/**
 * Creates the HTML export viewer toolbar using shared simple-ui chrome.
 */
export function setupAcExHtmlSimpleToolbar(
  options: AcExHtmlSimpleToolbarOptions
): AcExHtmlSimpleToolbarController {
  const buildItems = (): AcExToolbarItem[] =>
    createAcExHtmlToolbarItems(options.context)

  const toolbar = new AcExToolbar({
    host: options.host,
    themeHost: options.overlayHost ?? options.host,
    placement: options.placement ?? 'left',
    positioning: 'absolute',
    collapsible: true,
    defaultCollapsed: false,
    overflow: options.overflow ?? 'menu',
    edgeOffset: options.edgeOffset ?? HTML_TOOLBAR_EDGE_OFFSET,
    docBinding: false,
    documentState: {
      hasDocument: true,
      openMode: HTML_TOOLBAR_OPEN_MODE_WRITE
    },
    items: buildItems(),
    i18n: toToolbarI18n(options.i18n),
    onCommand: options.onCommand,
    onCollapse: options.onCollapse,
    onRender: options.onRender
  })

  toolbar.setSelectedChild('locale', `locale-${options.context.getLocale()}`)

  return {
    toolbar,
    refresh: () => {
      toolbar.setSelectedChild(
        'locale',
        `locale-${options.context.getLocale()}`
      )
      toolbar.updateItems(buildItems())
    },
    destroy: () => toolbar.destroy(),
    getEdgeOffset: () => toolbar.getEdgeOffset(),
    setEdgeOffset: offset => toolbar.setEdgeOffset(offset),
    getOverflow: () => toolbar.getOverflow(),
    setOverflow: overflow => toolbar.setOverflow(overflow),
    getPlacement: () => toolbar.placement,
    setPlacement: placement => toolbar.setPlacement(placement)
  }
}
