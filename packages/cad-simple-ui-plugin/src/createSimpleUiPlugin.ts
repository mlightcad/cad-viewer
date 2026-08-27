import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  AcApPlugin,
  acapSetDrawStyleHostHasRibbon,
  AcEdCommandStack,
  acedGetUiLayoutKind,
  AcEdOpenMode,
  type AcEdUiTheme,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MEDIA_QUERY
} from '@mlightcad/cad-simple-viewer'
import { AcGeBox2d } from '@mlightcad/data-model'

import packageJson from '../package.json'
import {
  AcApLayerUiCmd,
  AcUiLayerDockController,
  AcUiLayerUiControllerHolder
} from './command/AcApLayerUiCmd'
import { AcApMarkupPanelUiCmd } from './command/AcApMarkupPanelUiCmd'
import { acuiPrependToolbarLayoutSwitcher } from './config/createToolbarLayoutSwitcher'
import { acuiNormalizePluginOptions } from './config/normalizePluginOptions'
import { acuiResolveDockMountTarget } from './config/resolveDockMountTarget'
import { acuiResolveToolbarItems } from './config/resolveToolbarItems'
import { acuiResolveToolbarMountTarget } from './config/resolveToolbarMountTarget'
import { acuiToolbarItemsIncludeItem } from './config/toolbarItemUtils'
import {
  AcUiDockPanelSide,
  AcUiLayoutKind,
  AcUiSimpleUiPluginOptions,
  AcUiToolbarConfig,
  AcUiToolbarItem,
  AcUiToolbarItemsInput,
  AcUiToolbarOverflow,
  AcUiToolbarPlacement,
  SIMPLE_UI_PLUGIN_NAME
} from './config/types'
import { AcUiI18n, acuiRegisterSimpleUiI18n } from './i18n'
import { AcUiThemeSync } from './theme/AcUiThemeSync'
import { AcUiDockPanel, type AcUiDockPanelTab } from './ui/AcUiDockPanel'
import { AcUiLayerListView } from './ui/AcUiLayerListView'
import { AcUiReviewPaletteView } from './ui/AcUiReviewPaletteView'
import { AcUiToolbar } from './ui/AcUiToolbar'
import { acuiRemoveUiStylesIfUnused } from './ui/styles'

const LAYERS_TAB_ID = 'layers'
const REVIEW_TAB_ID = 'review'

/**
 * CAD viewer plugin that adds a framework-agnostic toolbar, layer manager, and
 * review palette.
 *
 * Registers the `layer` and `markuppanel` commands when the toolbar includes
 * those buttons, injects shared UI styles, and keeps theme and locale in sync
 * with {@link AcApI18n} and the `COLORTHEME` system variable.
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
  /** Command stack reference for dynamic layer command registration. */
  private commandManager?: AcEdCommandStack
  /** Whether the toolbar includes a layer button. */
  private hasLayerToolbarItem = false
  /** Whether the toolbar includes a markup panel / review button. */
  private hasMarkupPanelToolbarItem = false
  /** Whether {@link dockPanel} was explicitly enabled in options. */
  private dockPanelExplicitlyEnabled = false
  /** Normalized dock panel defaults from plugin options. */
  private dockPanelDefaults?: {
    defaultOpen: boolean
    defaultSide: 'bottom' | 'left' | 'right' | 'top'
    defaultHeight: number
    defaultWidth: number
  }
  /** Canvas element receiving the floating viewer toolbar. */
  private toolbarMountEl?: HTMLElement
  /** Explicit toolbar mount override from plugin options. */
  private toolbarMountTargetOption?: HTMLElement
  /** `'auto'` follows viewport; otherwise locks to one layout kind. */
  private layoutMode: 'auto' | AcUiLayoutKind = 'auto'
  /** Resolved toolbar config per device layout. */
  private layoutToolbars: Record<AcUiLayoutKind, AcUiToolbarConfig> = {
    mobile: {},
    pad: {},
    desktop: {}
  }
  /** Layout kind currently applied to the toolbar. */
  private currentLayoutKind: AcUiLayoutKind = 'desktop'
  /** View box captured when the active document was opened (original viewport). */
  private originalViewBox?: AcGeBox2d
  /** matchMedia listeners for auto layout switching. */
  private layoutMqls: MediaQueryList[] = []
  /** Commands registered during {@link onLoad} for cleanup on unload. */
  private registeredCommands: Array<{ group: string; name: string }> = []
  /** Refreshes toolbar, layer, and review UI when the app locale changes. */
  private handleLocaleChanged = () => {
    this.toolbar?.setSelectedChild('locale', `locale-${AcApI18n.currentLocale}`)
    this.layerListView?.refreshLocale()
    this.reviewPaletteView?.refreshLocale()
    this.dockPanel?.refreshLocale()
    this.toolbar?.refresh()
  }
  /** Re-resolves mount targets after the viewer view becomes available. */
  private handleDocumentActivatedForDock = () => {
    this.captureOriginalView()
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    }
    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
    }
    this.tryUpgradeDockMountTarget()
    this.dockPanel?.ensureMounted()
    this.tryUpgradeToolbarMountTarget()
  }
  /** Applies the matching layout toolbar when the viewport crosses breakpoints. */
  private handleLayoutKindChange = () => {
    if (this.layoutMode !== 'auto') return
    this.applyLayoutKind(acedGetUiLayoutKind())
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
   * Replaces the entire toolbar item list at runtime for the **current** layout.
   *
   * Unlike `toolbar.appendItems`, this replaces the full `items` collection.
   * Preset references and `'default'` are resolved using the same rules as
   * initial plugin load. Switching layout kinds re-applies that kind's config.
   *
   * @param items - Full toolbar layout definition.
   * @param layoutSwitcher - Optional layout submenu button prepended before `items`.
   */
  setToolbarItems(
    items: AcUiToolbarItemsInput,
    layoutSwitcher?: AcUiToolbarItem
  ) {
    if (!this.toolbar) return

    this.toolbarItemsInput = items
    this.layoutToolbars[this.currentLayoutKind] = {
      ...this.layoutToolbars[this.currentLayoutKind],
      items
    }
    const resolved = this.resolveBaseToolbarItems(items)
    this.baseToolbarItems = layoutSwitcher
      ? acuiPrependToolbarLayoutSwitcher(resolved, layoutSwitcher)
      : resolved
    this.syncLayerToolbarItem()
    this.syncReviewToolbarItem()
    this.renderToolbarItems()
  }

  /** Returns the viewer toolbar edge placement. */
  getToolbarPlacement(): AcUiToolbarPlacement {
    return this.toolbar?.placement ?? this.activeToolbarConfig().placement ?? 'right'
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
    this.toolbar.setPlacement(placement)
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
    if (!this.toolbar.isCollapsible) {
      console.warn(
        '[SimpleUiPlugin] setToolbarCollapsed skipped: toolbar is not collapsible.'
      )
      return false
    }
    this.toolbar.setCollapsed(collapsed)
    return true
  }

  /** Returns the viewer toolbar inset from the docked canvas edge in px. */
  getToolbarEdgeOffset(): number {
    return (
      this.toolbar?.getEdgeOffset() ?? this.activeToolbarConfig().edgeOffset ?? 8
    )
  }

  /**
   * Sets the viewer toolbar inset from the docked canvas edge.
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
    this.toolbar.setEdgeOffset(offset)
    return true
  }

  /** Returns how overflowing toolbar items are shown. */
  getToolbarOverflow(): AcUiToolbarOverflow {
    return (
      this.toolbar?.getOverflow() ?? this.activeToolbarConfig().overflow ?? 'menu'
    )
  }

  /**
   * Sets how overflowing toolbar items are shown when the host is too small.
   *
   * @param overflow - `'menu'` (⋯ popup) or `'scroll'`.
   * @returns `true` when applied; `false` when the toolbar is unavailable.
   */
  setToolbarOverflow(overflow: AcUiToolbarOverflow): boolean {
    if (!this.toolbar) {
      console.warn(
        '[SimpleUiPlugin] setToolbarOverflow skipped: toolbar is unavailable.'
      )
      return false
    }
    this.toolbar.setOverflow(overflow)
    return true
  }

  /**
   * Creates UI components, registers commands, and starts theme sync.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to register `layer` and `markuppanel`.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    acuiRegisterSimpleUiI18n()
    this.commandManager = commandManager
    // This shell has no command ribbon; keep the draw-style overlay available
    // without persisting isShowRibbon into shared localStorage.
    acapSetDrawStyleHostHasRibbon(false)

    const resolvedOptions = acuiNormalizePluginOptions(this.options)
    const host =
      resolvedOptions.host ??
      AcApDocManager.instance.curView?.container ??
      document.body

    this.hostEl = host
    this.layoutMode = resolvedOptions.layout
    this.layoutToolbars = resolvedOptions.layoutToolbars
    this.dockPanelMountTargetOption = this.options.dockPanel?.mountTarget

    const initialKind =
      this.layoutMode === 'auto' ? acedGetUiLayoutKind() : this.layoutMode
    const initialToolbar = this.layoutToolbars[initialKind]
    this.currentLayoutKind = initialKind
    this.toolbarMountTargetOption =
      initialToolbar.mountTarget ?? this.options.toolbar?.mountTarget
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

    const toolbarEnabled = initialToolbar.enabled !== false
    this.toolbarItemsInput = initialToolbar.items ?? 'default'
    this.baseToolbarItems = toolbarEnabled
      ? acuiResolveToolbarItems(initialToolbar, this.getToolbarContext())
      : []

    this.hasLayerToolbarItem = acuiToolbarItemsIncludeItem(
      this.baseToolbarItems,
      'layer'
    )
    this.hasMarkupPanelToolbarItem = acuiToolbarItemsIncludeItem(
      this.baseToolbarItems,
      'markup-panel'
    )

    if (resolvedOptions.shouldCreateDockPanel) {
      this.ensureDockPanel()
    }

    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
      this.registerLayerCommand(commandManager)
    }

    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
      this.registerMarkupPanelCommand(commandManager)
    }

    if (toolbarEnabled) {
      const toolbarMountEl = this.getToolbarMountEl() ?? host
      this.toolbarMountEl = toolbarMountEl
      this.toolbar = new AcUiToolbar({
        host: toolbarMountEl,
        themeHost: host,
        placement: initialToolbar.placement ?? 'right',
        edgeOffset: initialToolbar.edgeOffset ?? 8,
        overflow: initialToolbar.overflow ?? 'menu',
        contentWidth: initialToolbar.contentWidth ?? 'hug',
        itemDistribution: initialToolbar.itemDistribution ?? 'start',
        showItemLabels: initialToolbar.showItemLabels ?? false,
        items: this.baseToolbarItems,
        i18n: this.i18n,
        collapsible: initialToolbar.collapsible ?? false,
        defaultCollapsed: initialToolbar.defaultCollapsed,
        docBridge: {
          hasDocument: () => Boolean(AcApDocManager.instance.curDocument),
          getOpenMode: () =>
            AcApDocManager.instance.curDocument?.openMode ?? AcEdOpenMode.Read,
          subscribeActivated: listener => {
            AcApDocManager.instance.events.documentActivated.addEventListener(
              listener
            )
          },
          unsubscribeActivated: listener => {
            AcApDocManager.instance.events.documentActivated.removeEventListener(
              listener
            )
          },
          subscribeToBeOpened: listener => {
            AcApDocManager.instance.events.documentToBeOpened.addEventListener(
              listener
            )
          },
          unsubscribeToBeOpened: listener => {
            AcApDocManager.instance.events.documentToBeOpened.removeEventListener(
              listener
            )
          }
        },
        onCollapse: () => {
          this.dockPanel?.close()
        },
        onCommand: command => {
          AcApDocManager.instance.sendStringToExecute(command)
        }
      })
    }

    if (this.layoutMode === 'auto') {
      this.setupLayoutKindListener()
    }
  }

  /** Resolves the canvas element that receives the floating toolbar. */
  private getToolbarMountEl(): HTMLElement | undefined {
    if (!this.hostEl) return undefined
    return acuiResolveToolbarMountTarget(
      this.hostEl,
      this.toolbarMountTargetOption
    )
  }

  /**
   * Moves the toolbar from a host fallback to the canvas container once available.
   */
  private tryUpgradeToolbarMountTarget() {
    if (this.toolbarMountTargetOption || !this.hostEl || !this.toolbar) {
      return
    }

    const preferred = acuiResolveToolbarMountTarget(this.hostEl)
    if (preferred === this.toolbarMountEl || preferred === this.hostEl) {
      return
    }
    if (this.toolbarMountEl !== this.hostEl) {
      return
    }

    this.toolbar.reparentTo(preferred)
    this.toolbarMountEl = preferred
  }

  /** Context passed when resolving default toolbar presets. */
  private getToolbarContext() {
    return {
      getTheme: () => this.themeSync?.getTheme() ?? 'dark',
      setTheme: (theme: AcEdUiTheme) => this.themeSync?.setTheme(theme),
      getLocale: () => AcApI18n.currentLocale,
      setLocale: (locale: AcApLocale) => this.setLocale(locale),
      getPlacement: () => this.getToolbarPlacement(),
      setPlacement: (placement: AcUiToolbarPlacement) => {
        this.toolbar?.setPlacement(placement)
      },
      restoreOriginalView: () => this.restoreOriginalView()
    }
  }

  /** Captures the current view box as the document's original viewport. */
  private captureOriginalView() {
    const view = AcApDocManager.instance.curView
    if (!view) {
      this.originalViewBox = undefined
      return
    }
    const topLeft = view.screenToWorld({ x: 0, y: 0 })
    const bottomRight = view.screenToWorld({
      x: view.width,
      y: view.height
    })
    this.originalViewBox = new AcGeBox2d()
      .expandByPoint(topLeft)
      .expandByPoint(bottomRight)
  }

  /** Restores the view captured when the current document was activated. */
  private restoreOriginalView() {
    const view = AcApDocManager.instance.curView
    if (!view) return
    if (this.originalViewBox) {
      view.zoomTo(this.originalViewBox, 1)
    } else {
      view.zoomToFitDrawing()
    }
  }

  /** Subscribes to mobile/compact media queries for auto layout switching. */
  private setupLayoutKindListener() {
    this.teardownLayoutKindListener()
    if (typeof window.matchMedia !== 'function') return
    for (const query of [ML_UI_MOBILE_MEDIA_QUERY, ML_UI_COMPACT_MEDIA_QUERY]) {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', this.handleLayoutKindChange)
      this.layoutMqls.push(mql)
    }
  }

  /** Removes layout media-query listeners. */
  private teardownLayoutKindListener() {
    for (const mql of this.layoutMqls) {
      mql.removeEventListener('change', this.handleLayoutKindChange)
    }
    this.layoutMqls = []
  }

  /**
   * Applies toolbar chrome for the given layout kind when it differs from the current one.
   *
   * @param kind - Target device layout.
   */
  private applyLayoutKind(kind: AcUiLayoutKind) {
    if (kind === this.currentLayoutKind) return
    this.currentLayoutKind = kind
    const config = this.layoutToolbars[kind]
    this.toolbarMountTargetOption =
      config.mountTarget ?? this.options.toolbar?.mountTarget
    this.toolbarItemsInput = config.items ?? 'default'

    this.baseToolbarItems =
      config.enabled === false
        ? []
        : acuiResolveToolbarItems(config, this.getToolbarContext())

    this.syncLayerToolbarItem()
    this.syncReviewToolbarItem()

    if (!this.toolbar) return

    const isMobile = kind === 'mobile'
    this.toolbar.setPlacement(config.placement ?? 'right')
    this.toolbar.setEdgeOffset(config.edgeOffset ?? (isMobile ? 0 : 8))
    this.toolbar.setOverflow(config.overflow ?? 'menu')
    this.toolbar.setContentWidth(
      config.contentWidth ?? (isMobile ? 'full' : 'hug')
    )
    this.toolbar.setItemDistribution(
      config.itemDistribution ?? (isMobile ? 'evenly' : 'start')
    )
    this.toolbar.setShowItemLabels(config.showItemLabels ?? isMobile)
    this.toolbar.setCollapsible(config.collapsible ?? false)
    this.toolbar.updateItems(this.baseToolbarItems)
    this.toolbar.setVisible(config.enabled !== false)
  }

  /** Resolved chrome config for the active layout (fallback when toolbar is absent). */
  private activeToolbarConfig(): AcUiToolbarConfig {
    return this.layoutToolbars[this.currentLayoutKind] ?? {}
  }

  /** Resolves raw toolbar input into concrete toolbar items. */
  private resolveBaseToolbarItems(
    items: AcUiToolbarItemsInput
  ): AcUiToolbarItem[] {
    return acuiResolveToolbarItems(
      { items, appendItems: undefined },
      this.getToolbarContext()
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

  /** Registers the `layer` command with dock preparation wired in. */
  private registerLayerCommand(commandManager: AcEdCommandStack) {
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

    this.tryUpgradeDockMountTarget()
    this.dockPanel.ensureMounted()
  }

  /** Ensures the dock panel exists, is mounted on the current target, and has tabs when applicable. */
  private prepareDockPanel() {
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    }
    if (this.hasMarkupPanelToolbarItem) {
      this.mountReviewDockUi()
    }
    if (!this.dockPanel) {
      this.ensureDockPanel()
    }
    this.tryUpgradeDockMountTarget()
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
      defaultWidth: this.dockPanelDefaults.defaultWidth
    })
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

  /** Closes and optionally destroys the dock panel when it has no remaining tabs. */
  private destroyDockIfUnused() {
    if (!this.dockPanel) return
    if (this.dockPanel.hasTabs) return

    this.dockPanel.close()
    if (this.dockPanelExplicitlyEnabled) return

    this.dockPanel.destroy()
    this.dockPanel = undefined
  }

  /**
   * Tears down UI, unregisters commands, and removes injected styles if unused.
   *
   * @param _context - Application context (unused).
   * @param commandManager - Command stack used to remove registered commands.
   */
  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivatedForDock
    )
    this.teardownLayoutKindListener()

    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    this.teardownLayerUi()
    this.teardownReviewUi()
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
    this.hasLayerToolbarItem = false
    this.hasMarkupPanelToolbarItem = false
    this.commandManager = undefined
    this.i18n = undefined
    this.originalViewBox = undefined
    this.themeSync?.stop()
    this.themeSync = undefined
    acapSetDrawStyleHostHasRibbon(undefined)

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
