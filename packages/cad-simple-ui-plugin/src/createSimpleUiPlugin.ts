import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  type AcApLocale,
  AcApPlugin,
  AcEdCommandStack,
  type AcEdUiTheme
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import {
  AcApLayerUiCmd,
  AcExLayerDockController,
  AcExLayerUiControllerHolder
} from './command/AcApLayerUiCmd'
import { prependToolbarLayoutSwitcher } from './config/createToolbarLayoutSwitcher'
import { normalizePluginOptions } from './config/normalizePluginOptions'
import { resolveDockMountTarget } from './config/resolveDockMountTarget'
import { resolveToolbarItems } from './config/resolveToolbarItems'
import { resolveToolbarMountTarget } from './config/resolveToolbarMountTarget'
import {
  toolbarItemsIncludeItem
} from './config/toolbarItemUtils'
import {
  AcExDockPanelSide,
  AcExSimpleUiPluginOptions,
  AcExToolbarItem,
  AcExToolbarItemsInput,
  AcExToolbarPlacement,
  SIMPLE_UI_PLUGIN_NAME
} from './config/types'
import { AcExI18n, registerSimpleUiI18n } from './i18n'
import { AcExUiThemeSync } from './theme/AcExUiThemeSync'
import { AcExDockPanel, type AcExDockPanelTab } from './ui/AcExDockPanel'
import { AcExLayerListView } from './ui/AcExLayerListView'
import { AcExToolbar } from './ui/AcExToolbar'
import { removeUiStylesIfUnused } from './ui/styles'

const LAYERS_TAB_ID = 'layers'

/**
 * CAD viewer plugin that adds a framework-agnostic toolbar and layer manager.
 *
 * Registers the `layer` command when the toolbar includes a layer button, injects
 * shared UI styles, and keeps theme and locale in sync with {@link AcApI18n} and
 * the `COLORTHEME` system variable.
 */
export class AcApSimpleUiPlugin implements AcApPlugin {
  /** {@link SIMPLE_UI_PLUGIN_NAME} */
  name = SIMPLE_UI_PLUGIN_NAME
  /** Plugin semver string. */
  version = packageJson.version
  /** Human-readable plugin summary. */
  description = 'Framework-agnostic toolbar and layer manager UI'

  /** Layer list view mounted in the dock panel layers tab. */
  private layerListView?: AcExLayerListView
  /** Chrome DevTools-style dock panel container. */
  private dockPanel?: AcExDockPanel
  /** Dock-mode layer controller (for cleanup). */
  private layerDockController?: AcExLayerDockController
  /** Mutable delegate for the registered `layer` command. */
  private readonly layerUiControllerHolder = new AcExLayerUiControllerHolder()
  /** Configurable toolbar instance. */
  private toolbar?: AcExToolbar
  /** Scoped i18n helper for plugin strings. */
  private i18n?: AcExI18n
  /** Syncs UI theme with host attribute and database sysvar. */
  private themeSync?: AcExUiThemeSync
  /** Viewer host element receiving UI chrome. */
  private hostEl?: HTMLElement
  /** Explicit dock mount override from plugin options. */
  private dockPanelMountTargetOption?: HTMLElement
  /** Resolved toolbar items before layer action wiring. */
  private baseToolbarItems: AcExToolbarItem[] = []
  /** Raw toolbar items configuration last applied via {@link setToolbarItems}. */
  private toolbarItemsInput: AcExToolbarItemsInput = 'default'
  /** Command stack reference for dynamic layer command registration. */
  private commandManager?: AcEdCommandStack
  /** Whether the toolbar includes a layer button. */
  private hasLayerToolbarItem = false
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
  private toolbarPlacement: AcExToolbarPlacement = 'right'
  /** Whether the viewer toolbar supports collapse/expand. */
  private toolbarCollapsible = false
  /** Canvas element receiving the floating viewer toolbar. */
  private toolbarMountEl?: HTMLElement
  /** Explicit toolbar mount override from plugin options. */
  private toolbarMountTargetOption?: HTMLElement
  /** Inset of the viewer toolbar from the canvas edge in px. */
  private toolbarEdgeOffset = 8
  /** Commands registered during {@link onLoad} for cleanup on unload. */
  private registeredCommands: Array<{ group: string; name: string }> = []
  /** Refreshes toolbar and layer UI when the app locale changes. */
  private handleLocaleChanged = () => {
    this.layerListView?.refreshLocale()
    this.dockPanel?.refreshLocale()
    this.toolbar?.refresh()
  }
  /** Re-resolves mount targets after the viewer view becomes available. */
  private handleDocumentActivatedForDock = () => {
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    }
    this.tryUpgradeDockMountTarget()
    this.dockPanel?.ensureMounted()
    this.tryUpgradeToolbarMountTarget()
  }

  /**
   * @param options - Toolbar, layer manager, dock panel, and host configuration.
   */
  constructor(private readonly options: AcExSimpleUiPluginOptions = {}) {}

  /**
   * Adds a tab to the dock panel and opens it.
   * Creates the dock panel container when it does not exist yet.
   *
   * @param tab - Tab definition.
   * @returns Whether the tab was added.
   */
  addDockPanelTab(tab: AcExDockPanelTab): boolean {
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
  getDockPanelSide(): AcExDockPanelSide | undefined {
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
  getToolbarItems(): AcExToolbarItemsInput {
    return this.toolbarItemsInput
  }

  /**
   * Replaces the entire toolbar item list at runtime.
   *
   * Unlike `toolbar.appendItems`, this replaces the full `items` collection.
   * Preset references and `'default'` are resolved using the same rules as
   * initial plugin load.
   *
   * @param items - Full toolbar layout definition.
   * @param layoutSwitcher - Optional layout submenu button prepended before `items`.
   */
  setToolbarItems(
    items: AcExToolbarItemsInput,
    layoutSwitcher?: AcExToolbarItem
  ) {
    if (!this.toolbar) return

    this.toolbarItemsInput = items
    const resolved = this.resolveBaseToolbarItems(items)
    this.baseToolbarItems = layoutSwitcher
      ? prependToolbarLayoutSwitcher(resolved, layoutSwitcher)
      : resolved
    this.syncLayerToolbarItem()
    this.renderToolbarItems()
  }

  /** Returns the viewer toolbar edge placement. */
  getToolbarPlacement(): AcExToolbarPlacement {
    return this.toolbarPlacement
  }

  /**
   * Moves the viewer toolbar to another host edge.
   *
   * @param placement - Target edge placement.
   * @returns `true` when applied; `false` when the toolbar is unavailable.
   */
  setToolbarPlacement(placement: AcExToolbarPlacement): boolean {
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
   * @param commandManager - Command stack used to register `layer`.
   */
  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    registerSimpleUiI18n()
    this.commandManager = commandManager

    const resolvedOptions = normalizePluginOptions(this.options)
    const host =
      resolvedOptions.host ??
      AcApDocManager.instance.curView?.container ??
      document.body

    this.hostEl = host
    this.dockPanelMountTargetOption = this.options.dockPanel?.mountTarget
    this.toolbarMountTargetOption = this.options.toolbar?.mountTarget
    this.toolbarPlacement = resolvedOptions.toolbar.placement ?? 'right'
    this.toolbarCollapsible = resolvedOptions.toolbar.collapsible ?? false
    this.toolbarEdgeOffset = resolvedOptions.toolbar.edgeOffset ?? 8
    this.dockPanelExplicitlyEnabled = resolvedOptions.dockPanel.enabled === true
    this.dockPanelDefaults = {
      defaultOpen: resolvedOptions.dockPanel.defaultOpen ?? false,
      defaultSide: resolvedOptions.dockPanel.defaultSide ?? 'left',
      defaultHeight: resolvedOptions.dockPanel.defaultHeight ?? 240,
      defaultWidth: resolvedOptions.dockPanel.defaultWidth ?? 280
    }

    this.themeSync = new AcExUiThemeSync(host, () => this.toolbar?.refresh())
    this.themeSync.start()

    this.i18n = new AcExI18n()
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivatedForDock
    )

    const toolbarEnabled = resolvedOptions.toolbar.enabled
    this.toolbarItemsInput = resolvedOptions.toolbar.items ?? 'default'
    this.baseToolbarItems = toolbarEnabled
      ? resolveToolbarItems(resolvedOptions.toolbar, this.getToolbarContext())
      : []

    this.hasLayerToolbarItem = toolbarItemsIncludeItem(
      this.baseToolbarItems,
      'layer'
    )

    if (resolvedOptions.shouldCreateDockPanel) {
      this.ensureDockPanel()
    }

    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
      this.registerLayerCommand(commandManager)
    }

    if (toolbarEnabled) {
      const toolbarMountEl = this.getToolbarMountEl() ?? host
      this.toolbarMountEl = toolbarMountEl
      this.toolbar = new AcExToolbar({
        host: toolbarMountEl,
        themeHost: host,
        placement: this.toolbarPlacement,
        edgeOffset: this.toolbarEdgeOffset,
        items: this.baseToolbarItems,
        i18n: this.i18n,
        collapsible: resolvedOptions.toolbar.collapsible,
        defaultCollapsed: resolvedOptions.toolbar.defaultCollapsed,
        onCollapse: () => {
          this.dockPanel?.close()
        },
        onCommand: command => {
          AcApDocManager.instance.sendStringToExecute(command)
        }
      })
    }
  }

  /** Resolves the canvas element that receives the floating toolbar. */
  private getToolbarMountEl(): HTMLElement | undefined {
    if (!this.hostEl) return undefined
    return resolveToolbarMountTarget(this.hostEl, this.toolbarMountTargetOption)
  }

  /**
   * Moves the toolbar from a host fallback to the canvas container once available.
   */
  private tryUpgradeToolbarMountTarget() {
    if (this.toolbarMountTargetOption || !this.hostEl || !this.toolbar) {
      return
    }

    const preferred = resolveToolbarMountTarget(this.hostEl)
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
      toggleLocale: () => this.toggleLocale(),
      getPlacement: () => this.toolbarPlacement,
      setPlacement: (placement: AcExToolbarPlacement) => {
        this.applyToolbarPlacement(placement)
      }
    }
  }

  /** Resolves raw toolbar input into concrete toolbar items. */
  private resolveBaseToolbarItems(items: AcExToolbarItemsInput): AcExToolbarItem[] {
    return resolveToolbarItems({ items, appendItems: undefined }, this.getToolbarContext())
  }

  /** Applies {@link baseToolbarItems} to the toolbar. */
  private renderToolbarItems() {
    this.toolbar?.updateItems(this.baseToolbarItems)
  }

  /** Mounts or tears down layer UI when the layer toolbar button is added or removed. */
  private syncLayerToolbarItem() {
    const hadLayer = this.hasLayerToolbarItem
    const hasLayer = toolbarItemsIncludeItem(this.baseToolbarItems, 'layer')
    this.hasLayerToolbarItem = hasLayer

    if (hasLayer && !hadLayer) {
      this.ensureLayerCommandRegistered()
      this.mountLayerDockUi()
    } else if (!hasLayer && hadLayer) {
      this.teardownLayerUi()
      this.unregisterLayerCommand()
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

  /** Ensures the dock panel exists, layers tab is mounted, and mount target is current. */
  private ensureDockReady() {
    if (!this.dockPanel) {
      this.prepareDockPanel()
      return
    }

    if (
      this.hasLayerToolbarItem &&
      !this.dockPanel.hasTab(LAYERS_TAB_ID)
    ) {
      this.mountLayerDockUi()
    }

    this.tryUpgradeDockMountTarget()
    this.dockPanel.ensureMounted()
  }

  /** Ensures the dock panel exists, is mounted on the current target, and has layer tabs when applicable. */
  private prepareDockPanel() {
    if (this.hasLayerToolbarItem) {
      this.mountLayerDockUi()
    } else {
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

    this.dockPanel = new AcExDockPanel({
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
    return resolveDockMountTarget(this.hostEl, this.dockPanelMountTargetOption)
  }

  /**
   * Moves the dock panel from a host fallback to the canvas parent once available.
   */
  private tryUpgradeDockMountTarget() {
    if (this.dockPanelMountTargetOption || !this.hostEl || !this.dockPanel) {
      return
    }

    const preferred = resolveDockMountTarget(this.hostEl)
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
    this.layerDockController = new AcExLayerDockController(
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

    this.layerListView = new AcExLayerListView({
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

    this.layerDockController = new AcExLayerDockController(
      this.dockPanel,
      LAYERS_TAB_ID
    )
    this.layerUiControllerHolder.current = this.layerDockController
  }

  /** Tears down active layer UI without removing the dock shell. */
  private teardownLayerUi() {
    this.dockPanel?.close()

    this.dockPanel?.removeTab(LAYERS_TAB_ID)
    this.layerListView?.destroy()
    this.layerListView = undefined

    this.layerDockController?.destroy()
    this.layerDockController = undefined

    this.layerUiControllerHolder.current = undefined

    if (
      this.dockPanel &&
      !this.dockPanelExplicitlyEnabled &&
      !this.dockPanel.hasTabs
    ) {
      this.dockPanel.destroy()
      this.dockPanel = undefined
    }
  }

  /** Updates toolbar placement. */
  private applyToolbarPlacement(placement: AcExToolbarPlacement) {
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
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivatedForDock
    )

    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    this.teardownLayerUi()
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
    this.commandManager = undefined
    this.i18n = undefined
    this.themeSync?.stop()
    this.themeSync = undefined

    removeUiStylesIfUnused()
  }

  /** Toggles {@link AcApI18n.currentLocale} between English and Chinese. */
  private toggleLocale() {
    const next: AcApLocale = AcApI18n.currentLocale === 'en' ? 'zh' : 'en'
    AcApI18n.setCurrentLocale(next)
  }
}

/**
 * Factory for {@link AcApSimpleUiPlugin}.
 *
 * @param options - Plugin configuration.
 * @returns A new plugin instance ready for {@link AcApPluginManager.loadPlugin}.
 */
export function createSimpleUiPlugin(
  options: AcExSimpleUiPluginOptions = {}
): AcApSimpleUiPlugin {
  return new AcApSimpleUiPlugin(options)
}
