import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  AcApPlugin,
  AcApSettingManager,
  AcEdCommandStack,
  acedGetUiLayout,
  acedSubscribeUiLayout,
  type AcEdUiLayoutKind,
  type AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import {
  AcApLayerUiCmd,
  AcUiLayerDockController,
  AcUiLayerUiControllerHolder
} from './command/AcApLayerUiCmd'
import { AcApMarkupPanelUiCmd } from './command/AcApMarkupPanelUiCmd'
import { AcApMeasurementPanelUiCmd } from './command/AcApMeasurementPanelUiCmd'
import { acuiPrependToolbarLayoutSwitcher } from './config/createToolbarLayoutSwitcher'
import { acuiMergeToolbarOptionsForLayout } from './config/mergeToolbarOptionsForLayout'
import { acuiNormalizePluginOptions } from './config/normalizePluginOptions'
import { acuiResolveDockMountTarget } from './config/resolveDockMountTarget'
import { acuiResolveToolbarItems } from './config/resolveToolbarItems'
import { acuiResolveToolbarMountTarget } from './config/resolveToolbarMountTarget'
import { acuiToolbarItemsIncludeItem } from './config/toolbarItemUtils'
import {
  AcUiDockPanelSide,
  AcUiPluginLayoutMode,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarItem,
  AcUiToolbarItemsInput,
  AcUiToolbarOptions,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  AcUiToolbarSize,
  SIMPLE_UI_PLUGIN_NAME
} from './config/types'
import { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
import { AcUiThemeSync } from './theme/AcUiThemeSync'
import { AcUiDockPanel, type AcUiDockPanelTab } from './ui/AcUiDockPanel'
import { AcUiLayerListView } from './ui/AcUiLayerListView'
import { AcUiMeasurementPaletteView } from './ui/AcUiMeasurementPaletteView'
import { AcUiReviewPaletteView } from './ui/AcUiReviewPaletteView'
import { AcUiToolbar } from './ui/AcUiToolbar'
import { acuiRemoveUiStylesIfUnused } from './ui/styles'

const LAYERS_TAB_ID = 'layers'
const REVIEW_TAB_ID = 'review'
const MEASUREMENTS_TAB_ID = 'measurements'

/**
 * CAD viewer plugin that adds a framework-agnostic toolbar, layer manager, and
 * review palette.
 *
 * Registers the `layer`, `markuppanel`, and `measurementpanel` commands when
 * the toolbar includes those buttons, injects shared UI styles, and keeps
 * theme and locale in sync
 * with {@link AcApI18n} and the `COLORTHEME` system variable.
 *
 * Supports responsive chrome via {@link AcUiSimpleUiPluginOptions.layout} and
 * {@link AcUiSimpleUiPluginOptions.layouts}: phone (bottom full-width bar),
 * pad, and desktop (default right-side toolbar). Use {@link getLayout} and
 * {@link setLayout} to read or override the active layout at runtime.
 */
export class AcApSimpleUiPlugin implements AcApPlugin {
  /** {@link SIMPLE_UI_PLUGIN_NAME} */
  name = SIMPLE_UI_PLUGIN_NAME
  /** Plugin semver string. */
  version = packageJson.version
  /** Human-readable plugin summary. */
  description =
    'Framework-agnostic toolbar, layer manager, and review palette UI'

  /** Layer list view mounted in the dock panel layers tab. */
  private layerListView?: AcUiLayerListView
  /** Review palette view mounted in the dock panel review tab. */
  private reviewPaletteView?: AcUiReviewPaletteView
  /** Measurement list view mounted in the dock panel measurements tab. */
  private measurementPaletteView?: AcUiMeasurementPaletteView
  /** Chrome DevTools-style dock panel container. */
  private dockPanel?: AcUiDockPanel
  /** Dock-mode layer controller (for cleanup). */
  private layerDockController?: AcUiLayerDockController
  /** Mutable delegate for the registered `layer` command. */
  private readonly layerUiControllerHolder = new AcUiLayerUiControllerHolder()
  /** Configurable toolbar instance. */
  private toolbar?: AcUiToolbar
  /** Scoped i18n helper for plugin strings. */
  private i18n?: AcUiI18n
  /** Syncs UI theme with host attribute and database sysvar. */
  private themeSync?: AcUiThemeSync
  /** Viewer host element receiving UI chrome. */
  private hostEl?: HTMLElement
  /** Explicit dock mount override from plugin options. */
  private dockPanelMountTargetOption?: HTMLElement
  /** Resolved toolbar items before layer action wiring. */
  private baseToolbarItems: AcUiToolbarItem[] = []
  /** Raw toolbar items configuration last applied via {@link setToolbarItems}. */
  private toolbarItemsInput: AcUiToolbarItemsInput = 'default'
  /**
   * When true, {@link setToolbarItems} replaced the layout-derived item list.
   * Layout switches still update chrome (placement, size, labels) but keep
   * this item list until the next {@link setToolbarItems} call.
   */
  private toolbarItemsOverridden = false
  /** Optional layout-switcher button prepended by the last {@link setToolbarItems}. */
  private toolbarLayoutSwitcher?: AcUiToolbarItem
  /** Command stack reference for dynamic layer command registration. */
  private commandManager?: AcEdCommandStack
  /** Whether the toolbar includes a layer button. */
  private hasLayerToolbarItem = false
  /** Whether the toolbar includes a markup panel / review button. */
  private hasMarkupPanelToolbarItem = false
  /** Whether the toolbar includes a measurement panel button. */
  private hasMeasurementPanelToolbarItem = false
  /** Whether {@link dockPanel} was explicitly enabled in options. */
  private dockPanelExplicitlyEnabled = false
  /** Normalized dock panel defaults from plugin options. */
  private dockPanelDefaults?: {
    defaultOpen: boolean
    defaultSide: 'bottom' | 'left' | 'right' | 'top'
    defaultHeight: number
    defaultWidth: number
  }
  /** Current toolbar edge placement (mutable via toolbar settings button). */
  private toolbarPlacement: AcUiToolbarPlacement = 'right'
  /** Whether the viewer toolbar supports collapse/expand. */
  private toolbarCollapsible = false
  /** Canvas element receiving the floating viewer toolbar. */
  private toolbarMountEl?: HTMLElement
  /** Explicit toolbar mount override from plugin options. */
  private toolbarMountTargetOption?: HTMLElement
  /** Inset of the viewer toolbar from the canvas edge in px. */
  private toolbarEdgeOffset = 8
  /** Cross-axis inset of the viewer toolbar from host edges in px. */
  private toolbarSideOffset = 0
  /**
   * When true, the toolbar is a flex sibling of the canvas in the canvas parent.
   */
  private toolbarInCanvasParent = false
  /** Whether the main toolbar shows labels below icons. */
  private toolbarShowLabels = false
  /** Whether parent buttons with children show a corner triangle. */
  private toolbarShowChildrenIndicator = true
  /** Whether the toolbar container border is shown. */
  private toolbarShowBorder = true
  /** Whether each toolbar button draws a permanent outer border. */
  private toolbarShowButtonBorder = false
  /** Whether toolbar separator dividers are shown. */
  private toolbarShowSeparators = true
  /** Toolbar sizing along the layout axis (`auto` or `stretch`). */
  private toolbarSize: AcUiToolbarSize = 'auto'
  /** Overflow behavior when buttons exceed host bounds. */
  private toolbarOverflow: AcUiToolbarOverflow = 'menu'
  /** Sub-toolbar chrome overrides. */
  private toolbarSubToolbar?: AcUiToolbarOptions['subToolbar']
  /** Layout mode from plugin options (`auto` or forced kind). */
  private layoutMode: AcUiPluginLayoutMode = 'auto'
  /** Active resolved layout kind after merging defaults. */
  private activeLayoutKind: AcEdUiLayoutKind = 'desktop'
  /** Unsubscribe from viewport layout media queries. */
  private unsubscribeLayout?: () => void
  /** Commands registered during {@link onLoad} for cleanup on unload. */
  private registeredCommands: Array<{ group: string; name: string }> = []
  /** Refreshes toolbar, layer, and review UI when the app locale changes. */
  private handleLocaleChanged = () => {
    this.rebuildToolbarItems(this.activeLayoutKind)
    this.toolbar?.setSelectedChild('locale', `locale-${AcApI18n.currentLocale}`)
    this.layerListView?.refreshLocale()
    this.reviewPaletteView?.refreshLocale()
    this.measurementPaletteView?.refreshLocale()
    this.dockPanel?.refreshLocale()
    if (this.toolbar) {
      this.toolbar.updateItems(this.baseToolbarItems)
      this.toolbar.refreshLocale()
    }
  }
  /** Re-resolves mount targets after the viewer view becomes available. */
  private handleDocumentActivatedForDock = () => {
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    }
    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
    }
    if (this.hasMeasurementPanelToolbarItem) {
      this.mountMeasurementDockUi()
    }
    this.tryUpgradeDockMountTarget()
    this.dockPanel?.ensureMounted()
    this.ensureViewerToolbar()
    this.tryUpgradeToolbarMountTarget()
    this.toolbar?.syncInParentLayout()
  }

  /**
   * @param options - Toolbar, layer manager, dock panel, and host configuration.
   */
  constructor(private readonly options: AcUiSimpleUiPluginOptions = {}) {}

  /**
   * Adds a tab to the dock panel and opens it.
   * Creates the dock panel container when it does not exist yet.
   *
   * @param tab - Tab definition.
   * @returns Whether the tab was added.
   */
  addDockPanelTab(tab: AcUiDockPanelTab): boolean {
    if (!tab.labelKey && !tab.label) return false

    this.ensureDockReady()

    if (!this.dockPanel) return false
    if (!this.dockPanel.addTab(tab)) return false

    this.dockPanel.open(tab.id)
    return true
  }

  /** Whether the dock panel is open. */
  isDockPanelOpen(): boolean {
    return this.dockPanel?.isOpen ?? false
  }

  /** Whether a dock panel tab with the given id is registered. */
  hasDockPanelTab(tabId: string): boolean {
    return this.dockPanel?.hasTab(tabId) ?? false
  }

  /**
   * Opens the dock panel and activates a tab, or closes the panel when that tab
   * is already active.
   *
   * @param tabId - Tab to toggle.
   * @returns `true` when applied; `false` when the tab or dock panel is unavailable.
   */
  toggleDockPanelTab(tabId: string): boolean {
    if (!this.dockPanel?.hasTab(tabId)) {
      return false
    }

    this.ensureDockReady()
    if (!this.dockPanel) {
      return false
    }

    this.dockPanel.toggle(tabId)
    return true
  }

  /**
   * Opens or closes the dock panel.
   *
   * @param open - Target open state.
   * @returns `true` when applied; `false` when the dock panel is unavailable.
   */
  setDockPanelOpen(open: boolean): boolean {
    if (open) {
      this.ensureDockReady()

      if (!this.dockPanel) {
        console.warn(
          '[SimpleUiPlugin] setDockPanelOpen skipped: dock panel is unavailable.'
        )
        return false
      }

      this.dockPanel.open()
      return true
    }

    if (!this.dockPanel) {
      return true
    }

    this.dockPanel.close()
    return true
  }

  /** Returns the dock panel side, if the dock panel exists. */
  getDockPanelSide(): AcUiDockPanelSide | undefined {
    return this.dockPanel?.getSide()
  }

  /** Returns the dock panel size in px, if the dock panel exists. */
  getDockPanelSize(): number | undefined {
    return this.dockPanel?.getSize()
  }

  /**
   * Sets the dock panel width or height in px.
   *
   * @param size - Target size in px.
   * @returns `true` when applied; `false` when the dock panel is unavailable.
   */
  setDockPanelSize(size: number): boolean {
    this.ensureDockReady()

    if (!this.dockPanel) {
      console.warn(
        '[SimpleUiPlugin] setDockPanelSize skipped: dock panel is unavailable.'
      )
      return false
    }
    this.dockPanel.setPanelSize(size)
    return true
  }

  /** Returns the toolbar item configuration last passed to {@link setToolbarItems}. */
  getToolbarItems(): AcUiToolbarItemsInput {
    return this.toolbarItemsInput
  }

  /**
   * Replaces the entire toolbar item list at runtime.
   *
   * Unlike `toolbar.appendItems`, this replaces the full `items` collection.
   * Preset references and `'default'` are resolved using the same rules as
   * initial plugin load. Subsequent {@link setLayout} / auto viewport switches
   * keep this list and only update toolbar chrome.
   *
   * @param items - Full toolbar layout definition.
   * @param layoutSwitcher - Optional layout submenu button prepended before `items`.
   */
  setToolbarItems(
    items: AcUiToolbarItemsInput,
    layoutSwitcher?: AcUiToolbarItem
  ) {
    if (!this.toolbar) return

    this.toolbarItemsOverridden = true
    this.toolbarLayoutSwitcher = layoutSwitcher
    this.toolbarItemsInput = items
    const resolved = this.resolveBaseToolbarItems(items)
    this.baseToolbarItems = layoutSwitcher
      ? acuiPrependToolbarLayoutSwitcher(resolved, layoutSwitcher)
      : resolved
    this.syncLayerToolbarItem()
    this.syncReviewToolbarItem()
    this.syncMeasurementToolbarItem()
    this.renderToolbarItems()
  }

  /** Returns the viewer toolbar edge placement. */
  getToolbarPlacement(): AcUiToolbarPlacement {
    return this.toolbarPlacement
  }

  /**
   * Moves the viewer toolbar to another host edge.
   *
   * @param placement - Target edge placement.
   * @returns `true` when applied; `false` when the toolbar is unavailable.
   */
  setToolbarPlacement(placement: AcUiToolbarPlacement): boolean {
    if (!this.toolbar) {
      console.warn(
        '[SimpleUiPlugin] setToolbarPlacement skipped: toolbar is unavailable.'
      )
      return false
    }
    this.applyToolbarPlacement(placement)
    return true
  }

  /** Whether the viewer toolbar is visible. */
  isToolbarVisible(): boolean {
    return this.toolbar?.isVisible ?? false
  }

  /**
   * Shows or hides the viewer toolbar.
   *
   * @param visible - Target visibility.
   * @returns `true` when applied; `false` when the toolbar is unavailable.
   */
  setToolbarVisible(visible: boolean): boolean {
    if (!this.toolbar) {
      console.warn(
        '[SimpleUiPlugin] setToolbarVisible skipped: toolbar is unavailable.'
      )
      return false
    }
    this.toolbar.setVisible(visible)
    if (!visible) {
      this.dockPanel?.close()
    }
    return true
  }

  /** Whether the viewer toolbar is collapsed to its toggle button. */
  isToolbarCollapsed(): boolean {
    return this.toolbar?.isCollapsed ?? false
  }

  /**
   * Collapses or expands the viewer toolbar when {@link toolbar.collapsible} is enabled.
   *
   * @param collapsed - Target collapsed state.
   * @returns `true` when applied; `false` when the toolbar is unavailable or not collapsible.
   */
  setToolbarCollapsed(collapsed: boolean): boolean {
    if (!this.toolbar) {
      console.warn(
        '[SimpleUiPlugin] setToolbarCollapsed skipped: toolbar is unavailable.'
      )
      return false
    }
    if (!this.toolbarCollapsible) {
      console.warn(
        '[SimpleUiPlugin] setToolbarCollapsed skipped: toolbar is not collapsible.'
      )
      return false
    }
    this.toolbar.setCollapsed(collapsed)
    return true
  }

  /** Returns the viewer toolbar inset from the canvas edge in px. */
  getToolbarEdgeOffset(): number {
    return this.toolbar?.getEdgeOffset() ?? this.toolbarEdgeOffset
  }

  /** Returns the active UI layout kind (`phone`, `pad`, or `desktop`). */
  getLayout(): AcEdUiLayoutKind {
    return this.activeLayoutKind
  }

  /**
   * Sets layout mode and reapplies toolbar chrome for the target kind.
   *
   * When `mode` is `'auto'`, subscribes to viewport media queries via
   * {@link acedSubscribeUiLayout} and switches toolbar configuration when
   * {@link acedGetUiLayout} changes. Forced modes stop auto subscription.
   *
   * @param mode - `'auto'` or a fixed {@link AcEdUiLayoutKind}.
   * @returns `true` when the mode was stored or applied; `false` when the
   *   toolbar is unavailable and the mode could not be applied (except when only
   *   updating stored mode before toolbar creation).
   */
  setLayout(mode: AcUiPluginLayoutMode): boolean {
    if (!this.toolbar && mode !== this.layoutMode) {
      this.layoutMode = mode
      return true
    }
    if (!this.toolbar) return false

    this.layoutMode = mode
    this.unsubscribeLayout?.()
    this.unsubscribeLayout = undefined

    if (mode === 'auto') {
      this.unsubscribeLayout = acedSubscribeUiLayout(kind => {
        if (kind !== this.activeLayoutKind) {
          this.applyLayoutKind(kind)
        }
      })
      this.applyLayoutKind(acedGetUiLayout())
    } else {
      this.applyLayoutKind(mode)
    }
    return true
  }

  /**
   * Sets the viewer toolbar inset from the canvas edge.
   *
   * @param offset - Distance in px (clamped to >= 0).
   * @returns `true` when applied; `false` when the toolbar is unavailable.
   */
  setToolbarEdgeOffset(offset: number): boolean {
    if (!this.toolbar) {
      console.warn(
        '[SimpleUiPlugin] setToolbarEdgeOffset skipped: toolbar is unavailable.'
      )
      return false
    }
    this.toolbarEdgeOffset = Math.max(0, offset)
    this.toolbar.setEdgeOffset(this.toolbarEdgeOffset)
    return true
  }

  /**
   * Creates UI components, registers commands, and starts theme sync.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register `layer`, `markuppanel`, and `measurementpanel`.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    acuiRegisterSimpleUiI18n()
    this.commandManager = commandManager
    // This shell has no command ribbon; keep the draw-style overlay available
    // without persisting isShowRibbon into shared localStorage.
    AcApSettingManager.instance.set('isShowRibbon', false, { persist: false })

    const resolvedOptions = acuiNormalizePluginOptions(this.options)
    const host =
      resolvedOptions.host ??
      AcApDocManager.instance.curView?.container ??
      document.body

    this.hostEl = host
    this.dockPanelMountTargetOption = this.options.dockPanel?.mountTarget
    this.toolbarMountTargetOption = this.options.toolbar?.mountTarget
    this.layoutMode = resolvedOptions.layout
    this.dockPanelExplicitlyEnabled = resolvedOptions.dockPanel.enabled === true
    this.dockPanelDefaults = {
      defaultOpen: resolvedOptions.dockPanel.defaultOpen ?? false,
      defaultSide: resolvedOptions.dockPanel.defaultSide ?? 'left',
      defaultHeight: resolvedOptions.dockPanel.defaultHeight ?? 240,
      defaultWidth: resolvedOptions.dockPanel.defaultWidth ?? 280
    }

    this.themeSync = new AcUiThemeSync(host, () => this.toolbar?.refresh())
    this.themeSync.start()

    this.i18n = new AcUiI18n()
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivatedForDock
    )

    const initialLayout =
      this.layoutMode === 'auto' ? acedGetUiLayout() : this.layoutMode
    const toolbarEnabled = this.isViewerToolbarEnabled()
    this.applyLayoutKind(initialLayout, { skipToolbarApply: !toolbarEnabled })

    if (resolvedOptions.shouldCreateDockPanel) {
      this.ensureDockPanel()
    }

    // applyLayoutKind → syncLayerToolbarItem / syncReviewToolbarItem /
    // syncMeasurementToolbarItem may already have registered these; use
    // ensure* so onLoad stays idempotent.
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
      this.ensureLayerCommandRegistered()
    }

    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
      this.ensureMarkupPanelCommandRegistered()
    }

    if (this.hasMeasurementPanelToolbarItem) {
      this.mountMeasurementDockUi()
      this.ensureMeasurementPanelCommandRegistered()
    }

    this.ensureViewerToolbar(host)
  }

  /** Whether viewer toolbar creation is allowed (only explicit `false` disables). */
  private isViewerToolbarEnabled(): boolean {
    return this.options.toolbar?.enabled !== false
  }

  /**
   * Creates the floating toolbar when enabled and not already present.
   *
   * @param host - Plugin theme host; defaults to {@link hostEl}.
   */
  private ensureViewerToolbar(host?: HTMLElement) {
    if (!this.isViewerToolbarEnabled()) {
      return
    }
    if (this.toolbar) {
      if (this.toolbar.isRootConnected()) {
        return
      }
      this.toolbar.destroy()
      this.toolbar = undefined
      this.toolbarMountEl = undefined
    }

    const mountHost = host ?? this.hostEl
    if (!mountHost || !this.i18n) {
      return
    }

    const toolbarMountEl = this.getToolbarMountEl() ?? mountHost
    this.toolbarMountEl = toolbarMountEl
    const mergedToolbar = this.getMergedToolbarOptions(this.activeLayoutKind)
    try {
      this.toolbar = new AcUiToolbar({
        host: toolbarMountEl,
        themeHost: mountHost,
        placement: this.toolbarPlacement,
        edgeOffset: this.toolbarEdgeOffset,
        sideOffset: this.toolbarSideOffset,
        items: this.baseToolbarItems,
        i18n: this.i18n,
        collapsible: this.toolbarCollapsible,
        defaultCollapsed: mergedToolbar.defaultCollapsed,
        showLabels: this.toolbarShowLabels,
        showChildrenIndicator: this.toolbarShowChildrenIndicator,
        size: this.toolbarSize,
        overflow: this.toolbarOverflow,
        showBorder: this.toolbarShowBorder,
        showButtonBorder: this.toolbarShowButtonBorder,
        showSeparators: this.toolbarShowSeparators,
        inCanvasParent: this.toolbarInCanvasParent,
        subToolbar: this.toolbarSubToolbar,
        onCollapse: () => {
          this.dockPanel?.close()
        },
        onExclusiveOpen: () => this.dismissDockForExclusiveChrome(),
        onCommand: command => {
          AcApDocManager.instance.sendStringToExecute(command)
        }
      })
    } catch (error) {
      console.error('[SimpleUiPlugin] Failed to create viewer toolbar:', error)
      return
    }

    try {
      this.setLayout(this.layoutMode)
    } catch (error) {
      console.warn('[SimpleUiPlugin] setLayout failed during toolbar setup:', error)
    }
  }

  /** Resolves the canvas element that receives the viewer toolbar. */
  private getToolbarMountEl(): HTMLElement | undefined {
    if (!this.hostEl) return undefined
    if (this.toolbarInCanvasParent) {
      return acuiResolveDockMountTarget(
        this.hostEl,
        this.toolbarMountTargetOption
      )
    }
    return acuiResolveToolbarMountTarget(
      this.hostEl,
      this.toolbarMountTargetOption
    )
  }

  /**
   * Moves the toolbar from a host or inner-canvas fallback to the preferred
   * mount (typically the canvas parent) once the view is available.
   */
  private tryUpgradeToolbarMountTarget() {
    if (this.toolbarMountTargetOption || !this.hostEl || !this.toolbar) {
      return
    }

    const preferred = this.getToolbarMountEl()
    if (!preferred || preferred === this.toolbarMountEl) {
      return
    }

    const canvasContainer = AcApDocManager.instance.curView?.container
    const canvasParent = canvasContainer?.parentElement
    if (
      this.toolbarMountEl !== this.hostEl &&
      this.toolbarMountEl !== canvasContainer &&
      this.toolbarMountEl !== canvasParent
    ) {
      return
    }

    this.toolbar.reparentTo(preferred)
    this.toolbarMountEl = preferred
    this.toolbar.syncInParentLayout()
  }

  /**
   * Merges built-in, top-level, and per-layout toolbar options for a kind.
   *
   * @param kind - Layout kind to resolve options for.
   * @returns Merged {@link AcUiToolbarOptions} used by {@link applyLayoutKind}.
   */
  private getMergedToolbarOptions(kind: AcEdUiLayoutKind): AcUiToolbarOptions {
    return acuiMergeToolbarOptionsForLayout(
      kind,
      this.options.toolbar,
      this.options.layouts?.[kind]?.toolbar
    )
  }

  /**
   * Applies toolbar configuration for a layout kind and refreshes dock wiring.
   *
   * Chrome always comes from merged layout options. Item lists come from those
   * options unless {@link setToolbarItems} has replaced them at runtime.
   *
   * @param kind - Target layout kind.
   * @param options - When `skipToolbarApply` is true, only updates resolved state.
   */
  private applyLayoutKind(
    kind: AcEdUiLayoutKind,
    options?: { skipToolbarApply?: boolean }
  ) {
    this.activeLayoutKind = kind
    const toolbarOpts = this.getMergedToolbarOptions(kind)

    this.toolbarPlacement = toolbarOpts.placement ?? 'right'
    this.toolbarCollapsible = toolbarOpts.collapsible ?? false
    this.toolbarEdgeOffset = toolbarOpts.edgeOffset ?? 8
    this.toolbarSideOffset = toolbarOpts.sideOffset ?? 0
    this.toolbarShowLabels = toolbarOpts.showLabels ?? false
    this.toolbarShowChildrenIndicator =
      toolbarOpts.showChildrenIndicator ?? true
    this.toolbarShowBorder = toolbarOpts.showBorder ?? true
    this.toolbarShowButtonBorder = toolbarOpts.showButtonBorder ?? false
    this.toolbarShowSeparators = toolbarOpts.showSeparators ?? true
    this.toolbarSize = toolbarOpts.size ?? 'auto'
    this.toolbarOverflow = toolbarOpts.overflow ?? 'menu'
    this.toolbarSubToolbar = toolbarOpts.subToolbar
    const nextInCanvasParent = toolbarOpts.inCanvasParent === true
    const inCanvasParentChanged =
      nextInCanvasParent !== this.toolbarInCanvasParent
    this.toolbarInCanvasParent = nextInCanvasParent
    this.rebuildToolbarItems(kind, toolbarOpts)
    this.syncLayerToolbarItem()
    this.syncReviewToolbarItem()
    this.syncMeasurementToolbarItem()

    if (options?.skipToolbarApply || !this.toolbar) {
      return
    }

    // Unwrap/wrap before remounting so overlay resolution never sees a
    // transient `toolbar-main` as `canvas.parentElement`.
    this.toolbar.applyViewOptions({
      placement: this.toolbarPlacement,
      edgeOffset: this.toolbarEdgeOffset,
      sideOffset: this.toolbarSideOffset,
      collapsible: this.toolbarCollapsible,
      defaultCollapsed: toolbarOpts.defaultCollapsed,
      showLabels: this.toolbarShowLabels,
      showChildrenIndicator: this.toolbarShowChildrenIndicator,
      size: this.toolbarSize,
      overflow: this.toolbarOverflow,
      showBorder: this.toolbarShowBorder,
      showButtonBorder: this.toolbarShowButtonBorder,
      showSeparators: this.toolbarShowSeparators,
      subToolbar: this.toolbarSubToolbar,
      inCanvasParent: this.toolbarInCanvasParent,
      items: this.baseToolbarItems
    })

    if (inCanvasParentChanged || !this.toolbar.isRootConnected()) {
      const preferred = this.getToolbarMountEl()
      if (preferred) {
        this.toolbar.reparentTo(preferred)
        this.toolbarMountEl = preferred
      }
    }

    this.toolbar.syncInParentLayout()
  }

  /** Context passed when resolving default toolbar presets. */
  private getToolbarContext() {
    return {
      getTheme: () => this.themeSync?.getTheme() ?? 'dark',
      setTheme: (theme: AcEdUiTheme) => this.themeSync?.setTheme(theme),
      getLocale: () => AcApI18n.currentLocale,
      setLocale: (locale: AcApLocale) => this.setLocale(locale),
      getPlacement: () => this.toolbarPlacement,
      setPlacement: (placement: AcUiToolbarPlacement) => {
        this.applyToolbarPlacement(placement)
      }
    }
  }

  /**
   * Resolves {@link baseToolbarItems} from a runtime override or layout options.
   *
   * @param kind - Layout kind used for `'default'` and preset expansion.
   * @param toolbarOpts - Merged options for `kind`; fetched when omitted.
   */
  private rebuildToolbarItems(
    kind: AcEdUiLayoutKind,
    toolbarOpts?: AcUiToolbarOptions
  ) {
    if (this.toolbarItemsOverridden) {
      const resolved = this.resolveBaseToolbarItems(this.toolbarItemsInput)
      this.baseToolbarItems = this.toolbarLayoutSwitcher
        ? acuiPrependToolbarLayoutSwitcher(resolved, this.toolbarLayoutSwitcher)
        : resolved
      return
    }

    const merged = toolbarOpts ?? this.getMergedToolbarOptions(kind)
    this.toolbarItemsInput = merged.items ?? 'default'
    this.baseToolbarItems = acuiResolveToolbarItems(
      merged,
      this.getToolbarContext(),
      kind
    )
  }

  /** Resolves raw toolbar input into concrete toolbar items. */
  private resolveBaseToolbarItems(
    items: AcUiToolbarItemsInput
  ): AcUiToolbarItem[] {
    return acuiResolveToolbarItems(
      {
        items,
        appendItems: undefined
      },
      this.getToolbarContext(),
      this.activeLayoutKind
    )
  }

  /** Applies {@link baseToolbarItems} to the toolbar. */
  private renderToolbarItems() {
    this.toolbar?.updateItems(this.baseToolbarItems)
  }

  /** Mounts or tears down layer UI when the layer toolbar button is added or removed. */
  private syncLayerToolbarItem() {
    const hadLayer = this.hasLayerToolbarItem
    const hasLayer = acuiToolbarItemsIncludeItem(this.baseToolbarItems, 'layer')
    this.hasLayerToolbarItem = hasLayer

    if (hasLayer && !hadLayer) {
      this.ensureLayerCommandRegistered()
      this.mountLayerDockUi()
    } else if (!hasLayer && hadLayer) {
      this.teardownLayerUi()
      this.unregisterLayerCommand()
    }
  }

  /** Mounts or tears down review UI when the markup panel button is added or removed. */
  private syncReviewToolbarItem() {
    const hadReview = this.hasMarkupPanelToolbarItem
    const hasReview = acuiToolbarItemsIncludeItem(
      this.baseToolbarItems,
      'markup-panel'
    )
    this.hasMarkupPanelToolbarItem = hasReview

    if (hasReview && !hadReview) {
      this.ensureMarkupPanelCommandRegistered()
      this.mountReviewDockUi()
    } else if (!hasReview && hadReview) {
      this.teardownReviewUi()
      this.unregisterMarkupPanelCommand()
    }
  }

  /** Mounts or tears down measurement UI when the panel button is added or removed. */
  private syncMeasurementToolbarItem() {
    const hadPanel = this.hasMeasurementPanelToolbarItem
    const hasPanel = acuiToolbarItemsIncludeItem(
      this.baseToolbarItems,
      'measurement-panel'
    )
    this.hasMeasurementPanelToolbarItem = hasPanel

    if (hasPanel && !hadPanel) {
      this.ensureMeasurementPanelCommandRegistered()
      this.mountMeasurementDockUi()
    } else if (!hasPanel && hadPanel) {
      this.teardownMeasurementUi()
      this.unregisterMeasurementPanelCommand()
    }
  }

  /** Removes the `layer` command when the layer toolbar button is removed at runtime. */
  private unregisterLayerCommand() {
    if (!this.commandManager) return
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    const index = this.registeredCommands.findIndex(cmd => cmd.name === 'layer')
    if (index === -1) return

    this.commandManager.removeCmd(group, 'layer')
    this.registeredCommands.splice(index, 1)
  }

  /** Registers the `layer` command when a layer button appears at runtime. */
  private ensureLayerCommandRegistered() {
    if (!this.commandManager) return
    if (this.registeredCommands.some(cmd => cmd.name === 'layer')) return

    this.registerLayerCommand(this.commandManager)
  }

  /** Removes the `markuppanel` command when the review toolbar button is removed. */
  private unregisterMarkupPanelCommand() {
    if (!this.commandManager) return
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    const index = this.registeredCommands.findIndex(
      cmd => cmd.name === 'markuppanel'
    )
    if (index === -1) return

    this.commandManager.removeCmd(group, 'markuppanel')
    this.registeredCommands.splice(index, 1)
  }

  /** Registers the `markuppanel` command when a review button appears at runtime. */
  private ensureMarkupPanelCommandRegistered() {
    if (!this.commandManager) return
    if (this.registeredCommands.some(cmd => cmd.name === 'markuppanel')) return

    this.registerMarkupPanelCommand(this.commandManager)
  }

  /** Removes the `measurementpanel` command when the measurement panel button is removed. */
  private unregisterMeasurementPanelCommand() {
    if (!this.commandManager) return
    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    const index = this.registeredCommands.findIndex(
      cmd => cmd.name === 'measurementpanel'
    )
    if (index === -1) return

    this.commandManager.removeCmd(group, 'measurementpanel')
    this.registeredCommands.splice(index, 1)
  }

  /** Registers the `measurementpanel` command when a panel button appears at runtime. */
  private ensureMeasurementPanelCommandRegistered() {
    if (!this.commandManager) return
    if (this.registeredCommands.some(cmd => cmd.name === 'measurementpanel')) {
      return
    }

    this.registerMeasurementPanelCommand(this.commandManager)
  }

  /** Registers the `layer` command with dock preparation wired in. */
  private registerLayerCommand(commandManager: AcEdCommandStack) {
    if (this.registeredCommands.some(cmd => cmd.name === 'layer')) return

    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(
      group,
      'layer',
      'layer',
      this.createLayerCommand()
    )
    this.registeredCommands.push({ group, name: 'layer' })
  }

  /** Creates the `layer` command that prepares the dock panel before opening layers. */
  private createLayerCommand() {
    return new AcApLayerUiCmd({
      prepare: () => this.prepareLayerDockForCommand(),
      toggle: () => this.layerUiControllerHolder.toggleFromCommand()
    })
  }

  /** Ensures the dock panel and layers tab exist for the `layer` command. */
  private prepareLayerDockForCommand() {
    this.mountLayerDockUi()
    this.tryUpgradeDockMountTarget()
  }

  /** Registers the `markuppanel` command with dock preparation wired in. */
  private registerMarkupPanelCommand(commandManager: AcEdCommandStack) {
    if (this.registeredCommands.some(cmd => cmd.name === 'markuppanel')) return

    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(
      group,
      'markuppanel',
      'markuppanel',
      this.createMarkupPanelCommand()
    )
    this.registeredCommands.push({ group, name: 'markuppanel' })
  }

  /** Creates the `markuppanel` command that prepares the dock panel before opening review. */
  private createMarkupPanelCommand() {
    return new AcApMarkupPanelUiCmd({
      prepare: () => this.prepareReviewDockForCommand(),
      toggle: () => this.dockPanel?.open(REVIEW_TAB_ID)
    })
  }

  /** Ensures the dock panel and review tab exist for the `markuppanel` command. */
  private prepareReviewDockForCommand() {
    this.mountReviewDockUi()
    this.tryUpgradeDockMountTarget()
  }

  /** Registers the `measurementpanel` command with dock preparation wired in. */
  private registerMeasurementPanelCommand(commandManager: AcEdCommandStack) {
    if (this.registeredCommands.some(cmd => cmd.name === 'measurementpanel')) {
      return
    }

    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    commandManager.addCommand(
      group,
      'measurementpanel',
      'measurementpanel',
      this.createMeasurementPanelCommand()
    )
    this.registeredCommands.push({ group, name: 'measurementpanel' })
  }

  /** Creates the `measurementpanel` command that prepares the dock before opening. */
  private createMeasurementPanelCommand() {
    return new AcApMeasurementPanelUiCmd({
      prepare: () => this.prepareMeasurementDockForCommand(),
      toggle: () => this.dockPanel?.open(MEASUREMENTS_TAB_ID)
    })
  }

  /** Ensures the dock panel and measurements tab exist for the command. */
  private prepareMeasurementDockForCommand() {
    this.mountMeasurementDockUi()
    this.tryUpgradeDockMountTarget()
  }

  /** Ensures the dock panel exists, tabs are mounted, and mount target is current. */
  private ensureDockReady() {
    if (!this.dockPanel) {
      this.prepareDockPanel()
      return
    }

    if (this.hasLayerToolbarItem && !this.dockPanel.hasTab(LAYERS_TAB_ID)) {
      this.mountLayerDockUi()
    }
    if (
      this.hasMarkupPanelToolbarItem &&
      !this.dockPanel.hasTab(REVIEW_TAB_ID)
    ) {
      this.mountReviewDockUi()
    }
    if (
      this.hasMeasurementPanelToolbarItem &&
      !this.dockPanel.hasTab(MEASUREMENTS_TAB_ID)
    ) {
      this.mountMeasurementDockUi()
    }

    this.tryUpgradeDockMountTarget()
    this.dockPanel.ensureMounted()
    this.toolbar?.syncInParentLayout()
  }

  /** Ensures the dock panel exists, is mounted on the current target, and has tabs when applicable. */
  private prepareDockPanel() {
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    }
    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
    }
    if (this.hasMeasurementPanelToolbarItem) {
      this.mountMeasurementDockUi()
    }
    if (!this.dockPanel) {
      this.ensureDockPanel()
    }
    this.tryUpgradeDockMountTarget()
  }

  /** Closes open sub-toolbars when {@link AcUiSubToolbarOptions.replaceOnNested} is set. */
  private dismissStripsForDockPanel() {
    if (this.toolbar?.replaceOnNested) {
      this.toolbar.dismissOpenChildren()
    }
  }

  /** Closes the dock panel when {@link AcUiSubToolbarOptions.replaceOnNested} is set. */
  private dismissDockForExclusiveChrome() {
    if (this.toolbar?.replaceOnNested) {
      this.dockPanel?.close()
    }
  }

  /** Ensures the dock panel container exists. */
  private ensureDockPanel() {
    const mountEl = this.getDockMountEl()
    if (!mountEl || !this.i18n || !this.dockPanelDefaults) {
      return
    }

    if (this.dockPanel) {
      return
    }

    this.dockPanel = new AcUiDockPanel({
      host: mountEl,
      i18n: this.i18n,
      defaultSide: this.dockPanelDefaults.defaultSide,
      defaultOpen: this.dockPanelDefaults.defaultOpen,
      defaultHeight: this.dockPanelDefaults.defaultHeight,
      defaultWidth: this.dockPanelDefaults.defaultWidth,
      onOpen: () => this.dismissStripsForDockPanel()
    })
    this.syncToolbarMountAfterDockChange()
  }

  /** Resolves the dock mount element (lazy; canvas parent may appear after load). */
  private getDockMountEl(): HTMLElement | undefined {
    if (!this.hostEl) return undefined
    return acuiResolveDockMountTarget(
      this.hostEl,
      this.dockPanelMountTargetOption
    )
  }

  /**
   * Moves the dock panel from a host fallback to the canvas parent once available.
   */
  private tryUpgradeDockMountTarget() {
    if (this.dockPanelMountTargetOption || !this.hostEl || !this.dockPanel) {
      return
    }

    const preferred = acuiResolveDockMountTarget(this.hostEl)
    const current = this.dockPanel.getMountHost()

    if (current === preferred) {
      return
    }

    // Only upgrade from the host fallback to the canvas parent.
    if (current !== this.hostEl || preferred === this.hostEl) {
      return
    }

    this.dockPanel.reparentTo(preferred)
    this.refreshLayerDockController()
    this.syncToolbarMountAfterDockChange()
  }

  /** Rebinds the layer dock controller after the dock panel moves. */
  private refreshLayerDockController() {
    if (!this.dockPanel?.hasTab(LAYERS_TAB_ID)) {
      return
    }

    this.layerDockController?.destroy()
    this.layerDockController = new AcUiLayerDockController(
      this.dockPanel,
      LAYERS_TAB_ID
    )
    this.layerUiControllerHolder.current = this.layerDockController
  }

  /** Mounts the layer list in the dock panel layers tab. */
  private mountLayerDockUi() {
    if (!this.hostEl || !this.i18n) return

    this.ensureDockPanel()
    if (!this.dockPanel) return

    if (this.dockPanel.hasTab(LAYERS_TAB_ID)) {
      this.refreshLayerDockController()
      return
    }

    this.layerListView = new AcUiLayerListView({
      editor: AcApDocManager.instance,
      i18n: this.i18n,
      host: this.hostEl,
      showHeader: false
    })
    const added = this.dockPanel.addTab({
      id: LAYERS_TAB_ID,
      labelKey: 'dockPanel.tab.layers',
      content: this.layerListView.element
    })
    if (!added) {
      this.layerListView.destroy()
      this.layerListView = undefined
      return
    }

    this.layerDockController = new AcUiLayerDockController(
      this.dockPanel,
      LAYERS_TAB_ID
    )
    this.layerUiControllerHolder.current = this.layerDockController
  }

  /** Tears down active layer UI without removing the dock shell when other tabs remain. */
  private teardownLayerUi() {
    this.dockPanel?.removeTab(LAYERS_TAB_ID)
    this.layerListView?.destroy()
    this.layerListView = undefined

    this.layerDockController?.destroy()
    this.layerDockController = undefined

    this.layerUiControllerHolder.current = undefined

    this.destroyDockIfUnused()
  }

  /** Mounts the review palette in the dock panel review tab. */
  private mountReviewDockUi() {
    if (!this.hostEl || !this.i18n) return

    this.ensureDockPanel()
    if (!this.dockPanel) return

    if (this.dockPanel.hasTab(REVIEW_TAB_ID)) {
      return
    }

    this.reviewPaletteView = new AcUiReviewPaletteView({
      editor: AcApDocManager.instance,
      i18n: this.i18n
    })
    const added = this.dockPanel.addTab({
      id: REVIEW_TAB_ID,
      labelKey: 'dockPanel.tab.review',
      content: this.reviewPaletteView.element
    })
    if (!added) {
      this.reviewPaletteView.destroy()
      this.reviewPaletteView = undefined
    }
  }

  /** Tears down review UI without removing the dock shell when other tabs remain. */
  private teardownReviewUi() {
    this.dockPanel?.removeTab(REVIEW_TAB_ID)
    this.reviewPaletteView?.destroy()
    this.reviewPaletteView = undefined
    this.destroyDockIfUnused()
  }

  /** Mounts the measurement list in the dock panel measurements tab. */
  private mountMeasurementDockUi() {
    if (!this.hostEl || !this.i18n) return

    this.ensureDockPanel()
    if (!this.dockPanel) return

    if (this.dockPanel.hasTab(MEASUREMENTS_TAB_ID)) {
      return
    }

    this.measurementPaletteView = new AcUiMeasurementPaletteView({
      editor: AcApDocManager.instance,
      i18n: this.i18n
    })
    const added = this.dockPanel.addTab({
      id: MEASUREMENTS_TAB_ID,
      labelKey: 'dockPanel.tab.measurements',
      content: this.measurementPaletteView.element
    })
    if (!added) {
      this.measurementPaletteView.destroy()
      this.measurementPaletteView = undefined
    }
  }

  /** Tears down measurement UI without removing the dock shell when other tabs remain. */
  private teardownMeasurementUi() {
    this.dockPanel?.removeTab(MEASUREMENTS_TAB_ID)
    this.measurementPaletteView?.destroy()
    this.measurementPaletteView = undefined
    this.destroyDockIfUnused()
  }

  /** Closes and optionally destroys the dock panel when it has no remaining tabs. */
  private destroyDockIfUnused() {
    if (!this.dockPanel) return
    if (this.dockPanel.hasTabs) return

    this.dockPanel.close()
    if (this.dockPanelExplicitlyEnabled) return

    this.dockPanel.destroy()
    this.dockPanel = undefined
    this.syncToolbarMountAfterDockChange()
  }

  /**
   * Re-resolves the toolbar mount after dock wrap/unwrap, which can detach a
   * stale `dock-main` host or change `canvas.parentElement`.
   */
  private syncToolbarMountAfterDockChange() {
    if (!this.toolbar || !this.hostEl) return
    const preferred = this.getToolbarMountEl()
    if (!preferred) return
    if (preferred !== this.toolbarMountEl || !this.toolbar.isRootConnected()) {
      this.toolbar.reparentTo(preferred)
      this.toolbarMountEl = preferred
    }
    this.toolbar.syncInParentLayout()
  }

  /** Updates toolbar placement. */
  private applyToolbarPlacement(placement: AcUiToolbarPlacement) {
    this.toolbarPlacement = placement
    this.toolbar?.setPlacement(placement)
  }

  /**
   * Tears down UI, unregisters commands, and removes injected styles if unused.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to remove registered commands.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    this.unsubscribeLayout?.()
    this.unsubscribeLayout = undefined

    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivatedForDock
    )

    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    this.teardownLayerUi()
    this.teardownReviewUi()
    this.teardownMeasurementUi()
    this.toolbar?.destroy()
    this.dockPanel?.destroy()

    this.toolbar = undefined
    this.toolbarMountEl = undefined
    this.toolbarMountTargetOption = undefined
    this.dockPanel = undefined
    this.hostEl = undefined
    this.dockPanelMountTargetOption = undefined
    this.baseToolbarItems = []
    this.toolbarItemsInput = 'default'
    this.toolbarItemsOverridden = false
    this.toolbarLayoutSwitcher = undefined
    this.hasLayerToolbarItem = false
    this.hasMarkupPanelToolbarItem = false
    this.hasMeasurementPanelToolbarItem = false
    this.commandManager = undefined
    this.i18n = undefined
    this.themeSync?.stop()
    this.themeSync = undefined
    AcApSettingManager.instance.clearSessionOverride('isShowRibbon')

    acuiRemoveUiStylesIfUnused()
  }

  /** Sets {@link AcApI18n.currentLocale} to one of the supported locales. */
  private setLocale(locale: AcApLocale) {
    AcApI18n.setCurrentLocale(locale)
  }
}

/**
 * Factory for {@link AcApSimpleUiPlugin}.
 *
 * @param options - Plugin configuration.
 * @returns A new plugin instance ready for {@link AcApPluginManager.loadPlugin}.
 */
export function acuiCreateSimpleUiPlugin(
  options: AcUiSimpleUiPluginOptions = {}
): AcApSimpleUiPlugin {
  return new AcApSimpleUiPlugin(options)
}
