/**
 * Builds and mounts {@link AcUiToolbar} for the offline HTML viewer.
 *
 * Replaces the previous static `#mlcad-toolbar` button markup and flyout
 * strips with the shared plain-DOM toolbar engine. Clicks use `action` /
 * `anchorAction` / nested `childrenUi` — never DocManager command strings.
 *
 * @module AcExHtmlMainToolbar
 * @packageDocumentation
 */

import {
  acexHtmlIsMobileNavUi,
  acexHtmlIsPhoneLayout
} from './AcExHtmlDrawerSheet'
import {
  ACEX_HTML_LOCALE_BADGES,
  ACEX_HTML_LOCALES,
  type AcExHtmlI18n,
  type AcExHtmlLocale
} from './AcExHtmlI18n'
import { AcExHtmlIcons } from './AcExHtmlIcons'
import {
  AcEdOpenMode,
  acuiCopyDynamicToolbarChildren,
  acuiEnsureToolbarStyles,
  AcUiToolbar,
  type AcUiToolbarI18n,
  type AcUiToolbarItem,
  type AcUiToolbarPlacement
} from './AcExHtmlSimpleViewerUi'
import type { AcExMarkupMode } from './AcExMarkup'
import type { AcExMeasureMode } from './AcExMeasurement'
import type { AcExLayoutSnapshot, AcExViewerMode } from './AcExSnapshotTypes'
import {
  acexIsSimulatedMouseEnabled,
  acexToggleSimulatedMouse
} from './AcExTouchPickStrategy'

/** Theme values persisted by the offline HTML shell. */
export type AcExHtmlToolbarTheme = 'dark' | 'light'

/** Callbacks the runtime wires into toolbar item actions. */
export interface AcExHtmlMainToolbarHandlers {
  /** Idle navigation: select / pan / zoom-window. */
  setNavMode: (mode: 'select' | 'pan' | 'zoom-window') => void
  /** Zoom to drawing extents. */
  fit: () => void
  /** Restore the view captured when the HTML first opened. */
  restoreOriginalView: () => void
  /** Cancel zoom-window rubber band without changing idle nav mode. */
  cancelZoomWindow: () => void
  /** Open or close the layer drawer. */
  toggleLayerDrawer: () => void
  /** Switch the active layout by block-table record id. */
  switchLayout: (btrId: string) => void
  /** Start a measurement tool (or cancel when already active). */
  setMeasureMode: (mode: AcExMeasureMode) => void
  /** Toggle measurement results drawer. */
  toggleMeasurePanel: () => void
  /** Show / hide measurement overlays. */
  toggleMeasureVisibility: () => void
  /** Whether measurement overlays are currently visible. */
  isMeasureVisible: () => boolean
  /** Clear all measurements. */
  clearMeasurements: () => void
  /** Import / export measurement sidecar JSON. */
  importMeasurements: () => void
  exportMeasurements: () => void
  /** Start a markup tool. */
  setMarkupMode: (mode: AcExMarkupMode) => void
  /** Toggle review results drawer. */
  toggleMarkupPanel: () => void
  /** Show / hide markup overlays. */
  toggleMarkupVisibility: () => void
  /** Whether markup overlays are currently visible. */
  isMarkupVisible: () => boolean
  /** Clear all markups. */
  clearMarkups: () => void
  importMarkups: () => void
  exportMarkups: () => void
  /** Apply UI chrome theme. */
  applyTheme: (theme: AcExHtmlToolbarTheme) => void
  /** Current UI chrome theme. */
  getTheme: () => AcExHtmlToolbarTheme
  /** Flip drawing background between black and white. */
  switchBackground: () => void
  /** Toggle ortho tracking (measure settings). */
  toggleOrtho?: () => void
  /** Whether ortho tracking is on. */
  isOrtho?: () => boolean
  /**
   * Opens or toggles the polar-angle panel (measure settings). Returns whether
   * the panel is open after the call.
   */
  togglePolarPanel?: () => boolean
  /** Whether the polar-angle panel is open. */
  isPolarPanelOpen?: () => boolean
  /** Called when strips / collapse change layout chrome (resize canvas). */
  onChromeChange?: () => void
  /** Close sibling drawers when a phone exclusive strip opens. */
  onExclusiveOpen?: () => void
  /** Called when the toolbar collapses (close drawers / snap strip). */
  onCollapse?: () => void
}

/** Options for {@link setupAcExHtmlMainToolbar}. */
export interface AcExHtmlMainToolbarOptions {
  /** Empty `#mlcad-toolbar` mount (or another host in the sidebar). */
  host: HTMLElement
  /** Theme / dropdown host; defaults to `#mlcad-root` or `document.body`. */
  themeHost?: HTMLElement
  i18n: AcExHtmlI18n
  viewerMode: AcExViewerMode
  /** When false, the layout switcher is omitted. */
  exportLayouts: boolean
  /** Snapshot layouts for the layout menu (may be empty). */
  layouts: Pick<AcExLayoutSnapshot, 'btrId' | 'name'>[]
  /** BTR id of the layout currently shown. */
  getActiveLayoutBtrId: () => string
  handlers: AcExHtmlMainToolbarHandlers
}

/** Handles returned by {@link setupAcExHtmlMainToolbar}. */
export interface AcExHtmlMainToolbarController {
  /** Live toolbar instance. */
  toolbar: AcUiToolbar
  /** Closes open sub-toolbars / menus and the snap strip. */
  dismissOpenChildren: () => void
  /** Re-applies labels after locale change. */
  refreshLabels: () => void
  /** Re-syncs phone/pad chrome and item visibility after resize. */
  syncLayout: () => void
  /** Re-renders toggle icons (theme, visibility, nav, etc.). */
  refresh: () => void
  /** Marks the drawing as loaded for enablement / open-mode filters. */
  setDocumentReady: (ready: boolean) => void
  /** Tears down the toolbar and snap strip listeners. */
  destroy: () => void
}

/**
 * Adapts {@link AcExHtmlI18n} to the toolbar engine i18n surface.
 */
export function acexHtmlToolbarI18n(i18n: AcExHtmlI18n): AcUiToolbarI18n {
  return {
    t: (key, params) => i18n.t(key as never, params)
  }
}

function localeBadgeIcon(locale: AcExHtmlLocale): string {
  return `<span class="ml-ex-ui-locale-badge">${ACEX_HTML_LOCALE_BADGES[locale]}</span>`
}

/**
 * Copies compatibility attributes onto rendered toolbar buttons so existing
 * measure / markup / nav sync code can keep using `data-action` selectors.
 */
export function acexHtmlAnnotateToolbarDom(scope: ParentNode = document): void {
  const attrs: Record<string, Record<string, string>> = {
    select: { 'data-action': 'select' },
    pan: { 'data-action': 'pan' },
    'zoom-original': { 'data-action': 'zoom-original' },
    'zoom-extent': { 'data-action': 'fit' },
    'zoom-window': { 'data-action': 'zoom-window' },
    'measure-distance': {
      'data-action': 'measure',
      'data-measure-mode': 'distance'
    },
    'measure-continuous': {
      'data-action': 'measure',
      'data-measure-mode': 'continuous'
    },
    'measure-angle': { 'data-action': 'measure', 'data-measure-mode': 'angle' },
    'measure-arc': { 'data-action': 'measure', 'data-measure-mode': 'arc' },
    'measure-area': { 'data-action': 'measure', 'data-measure-mode': 'area' },
    'measure-coordinate': {
      'data-action': 'measure',
      'data-measure-mode': 'coordinate'
    },
    'measurement-panel': { 'data-action': 'measure-panel' },
    'measurement-vis': { 'data-action': 'measure-visibility' },
    'clear-measurements': { 'data-action': 'clear-measurements' },
    'measurement-import': { 'data-action': 'measure-import' },
    'measurement-export': { 'data-action': 'measure-export' },
    'markup-cloud': { 'data-action': 'markup', 'data-markup-mode': 'cloud' },
    'markup-rect': { 'data-action': 'markup', 'data-markup-mode': 'rect' },
    'markup-circle': { 'data-action': 'markup', 'data-markup-mode': 'circle' },
    'markup-callout': { 'data-action': 'markup', 'data-markup-mode': 'callout' },
    'markup-arrow': { 'data-action': 'markup', 'data-markup-mode': 'arrow' },
    'markup-text': { 'data-action': 'markup', 'data-markup-mode': 'text' },
    'markup-stamp': { 'data-action': 'markup', 'data-markup-mode': 'stamp' },
    'markup-panel': { 'data-action': 'markup-panel' },
    'markup-vis': { 'data-action': 'markup-visibility' },
    'clear-markups': { 'data-action': 'clear-markups' },
    'markup-import': { 'data-action': 'markup-import' },
    'markup-export': { 'data-action': 'markup-export' },
    theme: { 'data-action': 'toggle-theme', id: 'mlcad-theme-btn' },
    'simulated-mouse': {
      'data-action': 'toggle-simulated-mouse',
      id: 'mlcad-simulated-mouse-btn'
    },
    'switch-bg': { 'data-action': 'switch-bg' },
    snap: { 'data-action': 'snap-menu', id: 'mlcad-settings-snap-btn' },
    locale: { 'data-action': 'locale-menu', id: 'mlcad-settings-locale-btn' },
    layer: { id: 'mlcad-layers-btn' },
    layout: { id: 'mlcad-layout-menu-btn' },
    zoom: { id: 'mlcad-zoom-menu-btn' },
    measure: { id: 'mlcad-measure-menu-btn' },
    annotation: { id: 'mlcad-markup-menu-btn' },
    settings: { id: 'mlcad-settings-btn' }
  }

  for (const [id, map] of Object.entries(attrs)) {
    scope
      .querySelectorAll<HTMLElement>(`[data-toolbar-item-id="${id}"]`)
      .forEach(el => {
        for (const [key, value] of Object.entries(map)) {
          if (key === 'id') {
            el.id = value
          } else {
            el.setAttribute(key, value)
          }
        }
      })
  }
}

function createLocaleItem(i18n: AcExHtmlI18n): AcUiToolbarItem {
  const current = i18n.locale
  return {
    id: 'locale',
    label: 'toolbar.language',
    icon: AcExHtmlIcons.language,
    requiresDocument: false,
    childrenUi: 'toolbar',
    childIcon: 'selected',
    selectedChildId: `locale-${current}`,
    children: ACEX_HTML_LOCALES.map(locale => ({
      id: `locale-${locale}`,
      label: `toolbar.locale${locale[0]!.toUpperCase()}${locale.slice(1)}`,
      icon: localeBadgeIcon(locale),
      requiresDocument: false,
      action: () => i18n.setLocale(locale)
    }))
  }
}

function createThemeItem(handlers: AcExHtmlMainToolbarHandlers): AcUiToolbarItem {
  const toggle = () => {
    const next: AcExHtmlToolbarTheme =
      handlers.getTheme() === 'dark' ? 'light' : 'dark'
    handlers.applyTheme(next)
  }
  return {
    id: 'theme',
    requiresDocument: false,
    toggle: {
      getValue: () => handlers.getTheme() === 'light',
      on: {
        label: 'toolbar.themeLight',
        icon: AcExHtmlIcons.themeLight,
        action: toggle
      },
      off: {
        label: 'toolbar.themeDark',
        icon: AcExHtmlIcons.themeDark,
        action: toggle
      }
    }
  }
}

function createSimulatedMouseItem(): AcUiToolbarItem {
  const toggle = () => {
    acexToggleSimulatedMouse()
  }
  return {
    id: 'simulated-mouse',
    requiresDocument: false,
    toggle: {
      getValue: () => acexIsSimulatedMouseEnabled(),
      on: {
        label: 'toolbar.simulatedMouseOn',
        icon: AcExHtmlIcons.simulatedMouse,
        action: toggle
      },
      off: {
        label: 'toolbar.simulatedMouseOff',
        icon: AcExHtmlIcons.simulatedMouse,
        action: toggle
      }
    }
  }
}

function createSnapItem(
  handlers: AcExHtmlMainToolbarHandlers
): AcUiToolbarItem | null {
  if (!handlers.toggleOrtho || !handlers.togglePolarPanel) return null
  return {
    id: 'snap',
    label: 'toolbar.snap',
    icon: AcExHtmlIcons.osnap,
    requiresDocument: false,
    childrenUi: 'sticky-toolbar',
    children: [
      {
        id: 'ortho',
        requiresDocument: false,
        toggle: {
          getValue: () => handlers.isOrtho?.() === true,
          on: {
            label: 'settings.ortho',
            icon: AcExHtmlIcons.orthoMode,
            action: () => handlers.toggleOrtho?.()
          },
          off: {
            label: 'settings.ortho',
            icon: AcExHtmlIcons.orthoMode,
            action: () => handlers.toggleOrtho?.()
          }
        }
      },
      {
        id: 'polar',
        requiresDocument: false,
        toggle: {
          getValue: () => handlers.isPolarPanelOpen?.() === true,
          on: {
            label: 'settings.polar',
            icon: AcExHtmlIcons.polarTracking,
            action: () => handlers.togglePolarPanel?.()
          },
          off: {
            label: 'settings.polar',
            icon: AcExHtmlIcons.polarTracking,
            action: () => handlers.togglePolarPanel?.()
          }
        }
      }
    ]
  }
}

function createZoomItem(handlers: AcExHtmlMainToolbarHandlers): AcUiToolbarItem {
  return {
    id: 'zoom',
    label: 'toolbar.zoom',
    icon: AcExHtmlIcons.zoomExtent,
    childrenUi: 'toolbar',
    childIcon: 'selected',
    selectedChildId: 'zoom-extent',
    children: [
      {
        id: 'zoom-original',
        label: 'toolbar.zoomOriginal',
        icon: AcExHtmlIcons.zoomOriginal,
        action: () => {
          handlers.cancelZoomWindow()
          handlers.restoreOriginalView()
        }
      },
      {
        id: 'zoom-extent',
        label: 'toolbar.zoomExtents',
        icon: AcExHtmlIcons.zoomExtent,
        action: () => {
          handlers.cancelZoomWindow()
          handlers.fit()
        }
      },
      {
        id: 'zoom-window',
        label: 'toolbar.zoomWindow',
        icon: AcExHtmlIcons.zoomWindow,
        action: () => handlers.setNavMode('zoom-window')
      }
    ]
  }
}

function createMeasureItem(
  handlers: AcExHtmlMainToolbarHandlers
): AcUiToolbarItem {
  const modeChild = (
    id: string,
    label: string,
    icon: string,
    mode: AcExMeasureMode
  ): AcUiToolbarItem => ({
    id,
    label,
    icon,
    action: () => handlers.setMeasureMode(mode)
  })

  return {
    id: 'measure',
    label: 'toolbar.measure',
    icon: AcExHtmlIcons.measure,
    childrenUi: 'toolbar',
    children: [
      modeChild(
        'measure-distance',
        'toolbar.measureDistance',
        AcExHtmlIcons.measureDistance,
        'distance'
      ),
      modeChild(
        'measure-continuous',
        'toolbar.measureContinuous',
        AcExHtmlIcons.measureContinuous,
        'continuous'
      ),
      modeChild(
        'measure-angle',
        'toolbar.measureAngle',
        AcExHtmlIcons.measureAngle,
        'angle'
      ),
      modeChild(
        'measure-arc',
        'toolbar.measureArc',
        AcExHtmlIcons.measureArc,
        'arc'
      ),
      modeChild(
        'measure-area',
        'toolbar.measureArea',
        AcExHtmlIcons.measureArea,
        'area'
      ),
      modeChild(
        'measure-coordinate',
        'toolbar.measureCoordinate',
        AcExHtmlIcons.measureCoordinate,
        'coordinate'
      ),
      {
        id: 'measurement-panel',
        label: 'toolbar.measurementPanel',
        icon: AcExHtmlIcons.measurementPanel,
        action: () => handlers.toggleMeasurePanel()
      },
      {
        id: 'measurement-vis',
        toggle: {
          getValue: () => handlers.isMeasureVisible(),
          on: {
            label: 'toolbar.measureHide',
            icon: AcExHtmlIcons.markupShow,
            action: () => handlers.toggleMeasureVisibility()
          },
          off: {
            label: 'toolbar.measureShow',
            icon: AcExHtmlIcons.markupHide,
            action: () => handlers.toggleMeasureVisibility()
          }
        }
      },
      {
        id: 'clear-measurements',
        label: 'toolbar.clearMeasurements',
        icon: AcExHtmlIcons.clearMeasurements,
        action: () => handlers.clearMeasurements()
      },
      { type: 'separator', id: 'sep-measure-import-export' },
      {
        id: 'measurement-import',
        label: 'toolbar.measureImport',
        icon: AcExHtmlIcons.markupImport,
        action: () => handlers.importMeasurements()
      },
      {
        id: 'measurement-export',
        label: 'toolbar.measureExport',
        icon: AcExHtmlIcons.markupExport,
        action: () => handlers.exportMeasurements()
      }
    ]
  }
}

function createAnnotationItem(
  handlers: AcExHtmlMainToolbarHandlers
): AcUiToolbarItem {
  const modeChild = (
    id: string,
    label: string,
    icon: string,
    mode: AcExMarkupMode
  ): AcUiToolbarItem => ({
    id,
    label,
    icon,
    action: () => handlers.setMarkupMode(mode)
  })

  return {
    id: 'annotation',
    label: 'toolbar.annotation',
    icon: AcExHtmlIcons.annotation,
    minOpenMode: AcEdOpenMode.Review,
    childrenUi: 'toolbar',
    children: [
      modeChild(
        'markup-cloud',
        'toolbar.markupCloud',
        AcExHtmlIcons.markupCloud,
        'cloud'
      ),
      modeChild(
        'markup-rect',
        'toolbar.markupRect',
        AcExHtmlIcons.markupRect,
        'rect'
      ),
      modeChild(
        'markup-circle',
        'toolbar.markupCircle',
        AcExHtmlIcons.markupCircle,
        'circle'
      ),
      modeChild(
        'markup-callout',
        'toolbar.markupCallout',
        AcExHtmlIcons.markupCallout,
        'callout'
      ),
      modeChild(
        'markup-arrow',
        'toolbar.markupArrow',
        AcExHtmlIcons.markupArrow,
        'arrow'
      ),
      modeChild(
        'markup-text',
        'toolbar.markupText',
        AcExHtmlIcons.markupText,
        'text'
      ),
      modeChild(
        'markup-stamp',
        'toolbar.markupStamp',
        AcExHtmlIcons.markupStamp,
        'stamp'
      ),
      {
        id: 'markup-panel',
        label: 'toolbar.markupPanel',
        icon: AcExHtmlIcons.markupPanel,
        action: () => handlers.toggleMarkupPanel()
      },
      {
        id: 'markup-vis',
        toggle: {
          getValue: () => handlers.isMarkupVisible(),
          on: {
            label: 'toolbar.markupHide',
            icon: AcExHtmlIcons.markupShow,
            action: () => handlers.toggleMarkupVisibility()
          },
          off: {
            label: 'toolbar.markupShow',
            icon: AcExHtmlIcons.markupHide,
            action: () => handlers.toggleMarkupVisibility()
          }
        }
      },
      {
        id: 'clear-markups',
        label: 'toolbar.clearMarkups',
        icon: AcExHtmlIcons.clearMarkups,
        action: () => handlers.clearMarkups()
      },
      { type: 'separator', id: 'sep-markup-import-export' },
      {
        id: 'markup-import',
        label: 'toolbar.markupImport',
        icon: AcExHtmlIcons.markupImport,
        action: () => handlers.importMarkups()
      },
      {
        id: 'markup-export',
        label: 'toolbar.markupExport',
        icon: AcExHtmlIcons.markupExport,
        action: () => handlers.exportMarkups()
      }
    ]
  }
}

function createSettingsItem(
  i18n: AcExHtmlI18n,
  handlers: AcExHtmlMainToolbarHandlers,
  viewerMode: AcExViewerMode
): AcUiToolbarItem {
  const children: AcUiToolbarItem[] = [createSimulatedMouseItem()]
  const snap = viewerMode === 'measure' ? createSnapItem(handlers) : null
  if (snap) children.push(snap)
  children.push(
    createThemeItem(handlers),
    {
      id: 'switch-bg',
      label: 'toolbar.switchBg',
      icon: AcExHtmlIcons.switchBg,
      requiresDocument: false,
      action: () => handlers.switchBackground()
    },
    createLocaleItem(i18n)
  )

  return {
    id: 'settings',
    label: 'toolbar.settings',
    icon: AcExHtmlIcons.settings,
    requiresDocument: false,
    childrenUi: 'toolbar',
    children
  }
}

function createLayoutItem(
  options: Pick<
    AcExHtmlMainToolbarOptions,
    'layouts' | 'getActiveLayoutBtrId' | 'handlers'
  >
): AcUiToolbarItem {
  const item: AcUiToolbarItem = {
    id: 'layout',
    label: 'toolbar.layout',
    icon: AcExHtmlIcons.layout,
    requiresDocument: true,
    childrenUi: 'menu',
    children: []
  }
  return acuiCopyDynamicToolbarChildren(item, () =>
    options.layouts.map(layout => ({
      id: `layout-${layout.btrId}`,
      label: layout.name,
      action: () => {
        if (layout.btrId === options.getActiveLayoutBtrId()) return
        options.handlers.switchLayout(layout.btrId)
      },
      toggle: {
        getValue: () => options.getActiveLayoutBtrId() === layout.btrId,
        on: {},
        off: {}
      }
    }))
  )
}

/**
 * Builds the HTML viewer toolbar item list matching the previous static shell.
 */
export function acexHtmlCreateMainToolbarItems(
  options: AcExHtmlMainToolbarOptions
): AcUiToolbarItem[] {
  const { viewerMode, exportLayouts, handlers, i18n } = options
  const hideNav = acexHtmlIsMobileNavUi()
  const items: AcUiToolbarItem[] = []

  if (!hideNav) {
    items.push(
      {
        id: 'select',
        label: 'toolbar.select',
        icon: AcExHtmlIcons.select,
        action: () => handlers.setNavMode('select')
      },
      {
        id: 'pan',
        label: 'toolbar.pan',
        icon: AcExHtmlIcons.pan,
        action: () => handlers.setNavMode('pan')
      }
    )
  }

  items.push(createZoomItem(handlers))

  if (viewerMode === 'measure') {
    items.push(
      { type: 'separator', id: 'sep-measure' },
      createMeasureItem(handlers),
      createAnnotationItem(handlers),
      { type: 'separator', id: 'sep-layers' }
    )
  }

  items.push({
    id: 'layer',
    label: 'toolbar.layers',
    icon: AcExHtmlIcons.layer,
    action: () => handlers.toggleLayerDrawer()
  })

  if (exportLayouts && options.layouts.length > 0) {
    items.push(createLayoutItem(options))
  }

  items.push(createSettingsItem(i18n, handlers, viewerMode))
  return items
}

function resolveChrome(phone: boolean): {
  placement: AcUiToolbarPlacement
  showLabels: boolean
  size: 'auto' | 'stretch'
  overflow: 'menu' | 'wrap'
  showChildrenIndicator: boolean
  collapsible: boolean
  edgeOffset: number
  sideOffset: number
  subToolbar: {
    replaceOnNested: boolean
    showLabels?: boolean
    overflow?: 'menu' | 'wrap'
  }
} {
  if (phone) {
    return {
      placement: 'bottom',
      showLabels: true,
      size: 'stretch',
      overflow: 'wrap',
      showChildrenIndicator: false,
      collapsible: false,
      edgeOffset: 0,
      sideOffset: 0,
      subToolbar: {
        replaceOnNested: true,
        showLabels: true,
        overflow: 'wrap'
      }
    }
  }
  return {
    placement: 'left',
    showLabels: false,
    size: 'auto',
    overflow: 'menu',
    showChildrenIndicator: true,
    collapsible: true,
    edgeOffset: 0,
    sideOffset: 0,
    subToolbar: {
      replaceOnNested: false
    }
  }
}

/**
 * Creates {@link AcUiToolbar} inside the HTML shell mount point.
 */
export function setupAcExHtmlMainToolbar(
  options: AcExHtmlMainToolbarOptions
): AcExHtmlMainToolbarController {
  acuiEnsureToolbarStyles()

  const themeHost =
    options.themeHost ??
    document.getElementById('mlcad-root') ??
    document.body

  let phone = acexHtmlIsPhoneLayout()
  const chrome = resolveChrome(phone)
  let items = acexHtmlCreateMainToolbarItems(options)

  const toolbar = new AcUiToolbar({
    host: options.host,
    themeHost,
    overlayHost: themeHost,
    placement: chrome.placement,
    items,
    i18n: acexHtmlToolbarI18n(options.i18n),
    onCommand: () => {
      /* HTML viewer never routes DocManager commands through the toolbar. */
    },
    collapsible: chrome.collapsible,
    defaultCollapsed: false,
    showLabels: chrome.showLabels,
    size: chrome.size,
    overflow: chrome.overflow,
    showBorder: true,
    showButtonBorder: false,
    showSeparators: true,
    showChildrenIndicator: chrome.showChildrenIndicator,
    edgeOffset: chrome.edgeOffset,
    sideOffset: chrome.sideOffset,
    subToolbar: chrome.subToolbar,
    onCollapse: () => options.handlers.onCollapse?.(),
    onExclusiveOpen: () => {
      closePolarAngles()
      options.handlers.onExclusiveOpen?.()
    },
    docState: {
      hasDocument: true,
      isOpening: false,
      openMode:
        options.viewerMode === 'measure'
          ? AcEdOpenMode.Review
          : AcEdOpenMode.Read
    }
  })

  const polarPanel = document.getElementById('mlcad-polar-angles')

  const closePolarAngles = () => {
    if (polarPanel) polarPanel.hidden = true
  }

  const afterRender = () => {
    acexHtmlAnnotateToolbarDom(options.host)
    acexHtmlAnnotateToolbarDom(themeHost)
    // Sub-toolbars append to the overlay host (often themeHost / root).
    acexHtmlAnnotateToolbarDom(document)
  }
  afterRender()

  // Re-annotate after toggle re-renders.
  const originalRefresh = toolbar.refresh.bind(toolbar)
  toolbar.refresh = () => {
    originalRefresh()
    afterRender()
  }

  const syncLayout = () => {
    const nextPhone = acexHtmlIsPhoneLayout()
    const nextHideNav = acexHtmlIsMobileNavUi()
    const prevHideNav = !items.some(item => item.id === 'select')
    if (nextPhone !== phone || nextHideNav !== prevHideNav) {
      phone = nextPhone
      const nextChrome = resolveChrome(phone)
      const nextItems = acexHtmlCreateMainToolbarItems(options)
      items = nextItems
      toolbar.applyViewOptions({
        placement: nextChrome.placement,
        showLabels: nextChrome.showLabels,
        size: nextChrome.size,
        overflow: nextChrome.overflow,
        showChildrenIndicator: nextChrome.showChildrenIndicator,
        collapsible: nextChrome.collapsible,
        edgeOffset: nextChrome.edgeOffset,
        sideOffset: nextChrome.sideOffset,
        subToolbar: nextChrome.subToolbar,
        items: nextItems
      })
      afterRender()
    }
    options.handlers.onChromeChange?.()
  }

  // Park the polar-angle panel on the sidebar so sticky snap can keep it open.
  const ensurePolarPanelHome = () => {
    const sidebar = document.getElementById('mlcad-sidebar')
    if (polarPanel && sidebar && polarPanel.parentElement !== sidebar) {
      sidebar.appendChild(polarPanel)
    }
  }
  ensurePolarPanelHome()

  return {
    toolbar,
    dismissOpenChildren: () => {
      toolbar.dismissOpenChildren()
      closePolarAngles()
    },
    refreshLabels: () => {
      toolbar.refreshLocale()
      afterRender()
    },
    syncLayout,
    refresh: () => {
      toolbar.refresh()
    },
    setDocumentReady: ready => {
      toolbar.setDocState({
        hasDocument: ready,
        isOpening: false,
        openMode:
          options.viewerMode === 'measure'
            ? AcEdOpenMode.Review
            : AcEdOpenMode.Read
      })
      afterRender()
    },
    destroy: () => {
      closePolarAngles()
      toolbar.destroy()
    }
  }
}
