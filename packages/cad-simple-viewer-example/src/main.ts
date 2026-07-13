import {
  type AcApSimpleUiPlugin,
  type AcExDockPanelSide,
  type AcExToolbarPlacement,
  SIMPLE_UI_PLUGIN_NAME
} from '@mlightcad/cad-simple-ui-plugin'
import { registerSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin/register'
import {
  AcApDocManager,
  AcApOpenDatabaseOptions,
  AcApQNewCmd,
  AcApSettingManager,
  AcEdOpenMode,
  applyUiTheme,
  isCompactUiLayout
} from '@mlightcad/cad-simple-viewer'
import { AcDbSysVarManager, log } from '@mlightcad/data-model'

import { setupAgentIntegration } from './agentIntegration'
import { AGENT_TOOLBAR_ITEM } from './agentToolbarItem'
import { injectAppShellResponsiveStyles } from './appShellResponsiveStyles'
import { createDemoDockTabPanel } from './demoDockTabPanel'
import {
  applyDemoToolbarLayout,
  DEMO_TOOLBAR_LAYOUTS,
  getCurrentDemoToolbarLayoutId
} from './demoToolbarPresets'
import { setupFileSidebarResize } from './fileSidebarResize'
import { registerLazyPlugins } from './register'

const EXAMPLE_COMMAND_ALIASES = {
  LINE: ['LX'],
  CIRCLE: ['CI'],
  ZOOM: ['ZZ']
}

class CadViewerApp {
  private container: HTMLDivElement
  private fileInput: HTMLInputElement
  private centerOpenButton: HTMLButtonElement
  private viewerPane: HTMLElement
  private emptyState: HTMLDivElement
  private predefinedButtons: NodeListOf<HTMLButtonElement>
  private fileSidebarColumn: HTMLElement
  private fileSidebar: HTMLElement
  private fileSidebarBody: HTMLElement
  private fileSidebarToggle: HTMLButtonElement
  private fileSidebarSubtitle: HTMLSpanElement
  private displayButton: HTMLButtonElement
  private displayMenu: HTMLDivElement
  private displayLineWeightCheckbox: HTMLInputElement
  private displayCommandLineCheckbox: HTMLInputElement
  private displaySidebarCheckbox: HTMLInputElement
  private dockButton: HTMLButtonElement
  private dockMenu: HTMLDivElement
  private dockOpenToggle: HTMLButtonElement
  private dockAddTabButton: HTMLButtonElement
  private dockSizeInput: HTMLInputElement
  private dockSizeLabel: HTMLSpanElement
  private toolbarLayoutSelect: HTMLSelectElement
  private viewerToolbarButton: HTMLButtonElement
  private viewerToolbarMenu: HTMLDivElement
  private viewerToolbarVisibilityToggle: HTMLButtonElement
  private viewerToolbarCollapseToggle: HTMLButtonElement
  private viewerToolbarEdgeOffsetInput: HTMLInputElement
  private viewerToolbarPlacementButtons: NodeListOf<HTMLButtonElement>
  private devToolbar: HTMLElement
  private devNewButton: HTMLButtonElement
  private displayMenuOpen = false
  private dockMenuOpen = false
  private demoDockTabCount = 0
  private viewerToolbarMenuOpen = false
  private isInitialized = false
  private hasOpenedFile = false
  private isLoadingFile = false

  constructor() {
    this.container = document.getElementById('cad-container') as HTMLDivElement
    this.fileInput = document.getElementById(
      'fileInputElement'
    ) as HTMLInputElement
    this.centerOpenButton = document.getElementById(
      'centerOpenButton'
    ) as HTMLButtonElement
    this.viewerPane = document.getElementById('viewerPane') as HTMLElement
    this.emptyState = document.getElementById('emptyState') as HTMLDivElement
    this.predefinedButtons = document.querySelectorAll(
      '#predefinedFileList .file-list-item'
    ) as NodeListOf<HTMLButtonElement>
    this.fileSidebarColumn = document.getElementById(
      'fileSidebarColumn'
    ) as HTMLElement
    this.fileSidebar = document.getElementById('fileSidebar') as HTMLElement
    this.fileSidebarBody = document.getElementById(
      'fileSidebarBody'
    ) as HTMLElement
    this.fileSidebarToggle = document.getElementById(
      'fileSidebarToggle'
    ) as HTMLButtonElement
    this.fileSidebarSubtitle = document.getElementById(
      'fileSidebarSubtitle'
    ) as HTMLSpanElement
    this.displayButton = document.getElementById(
      'devDisplayButton'
    ) as HTMLButtonElement
    this.displayMenu = document.getElementById(
      'devDisplayMenu'
    ) as HTMLDivElement
    this.displayLineWeightCheckbox = document.getElementById(
      'devDisplayLineWeight'
    ) as HTMLInputElement
    this.displayCommandLineCheckbox = document.getElementById(
      'devDisplayCommandLine'
    ) as HTMLInputElement
    this.displaySidebarCheckbox = document.getElementById(
      'devDisplaySidebar'
    ) as HTMLInputElement
    this.dockButton = document.getElementById(
      'devDockButton'
    ) as HTMLButtonElement
    this.dockMenu = document.getElementById('devDockMenu') as HTMLDivElement
    this.dockOpenToggle = document.getElementById(
      'devDockOpenToggle'
    ) as HTMLButtonElement
    this.dockAddTabButton = document.getElementById(
      'devDockAddTab'
    ) as HTMLButtonElement
    this.dockSizeInput = document.getElementById(
      'devDockSizeInput'
    ) as HTMLInputElement
    this.dockSizeLabel = document.getElementById(
      'devDockSizeLabel'
    ) as HTMLSpanElement
    this.toolbarLayoutSelect = document.getElementById(
      'devToolbarLayoutSelect'
    ) as HTMLSelectElement
    this.viewerToolbarButton = document.getElementById(
      'devViewerToolbarButton'
    ) as HTMLButtonElement
    this.viewerToolbarMenu = document.getElementById(
      'devViewerToolbarMenu'
    ) as HTMLDivElement
    this.viewerToolbarVisibilityToggle = document.getElementById(
      'devViewerToolbarVisibilityToggle'
    ) as HTMLButtonElement
    this.viewerToolbarCollapseToggle = document.getElementById(
      'devViewerToolbarCollapseToggle'
    ) as HTMLButtonElement
    this.viewerToolbarEdgeOffsetInput = document.getElementById(
      'devViewerToolbarEdgeOffset'
    ) as HTMLInputElement
    this.viewerToolbarPlacementButtons = document.querySelectorAll(
      '[data-viewer-toolbar-placement]'
    ) as NodeListOf<HTMLButtonElement>
    this.devToolbar = document.getElementById('devToolbar') as HTMLElement
    this.devNewButton = document.getElementById(
      'devNewButton'
    ) as HTMLButtonElement

    this.setupFileHandling()
    this.setupPredefinedFileActions()
    this.setupMobileSidebar()
    const fileSidebarResizeHandle = document.getElementById(
      'fileSidebarResizeHandle'
    )
    if (fileSidebarResizeHandle) {
      setupFileSidebarResize(this.fileSidebarColumn, fileSidebarResizeHandle)
    }
    this.setupDevToolbar()
    this.setupDisplayMenu()
    this.setupDockMenu()
    this.setupViewerToolbarMenu()
    this.updateEmptyStateVisibility()
  }

  private setupDisplayMenu() {
    this.displayButton.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleDisplayMenu()
    })

    this.displayLineWeightCheckbox.addEventListener('click', event => {
      event.stopPropagation()
    })
    this.displayLineWeightCheckbox.addEventListener('change', event => {
      event.stopPropagation()
      void this.applyLineWeightDisplay(this.displayLineWeightCheckbox.checked)
    })

    this.displayCommandLineCheckbox.addEventListener('click', event => {
      event.stopPropagation()
    })
    this.displayCommandLineCheckbox.addEventListener('change', event => {
      event.stopPropagation()
      void this.applyCommandLineDisplay(this.displayCommandLineCheckbox.checked)
    })

    this.displaySidebarCheckbox.addEventListener('click', event => {
      event.stopPropagation()
    })
    this.displaySidebarCheckbox.addEventListener('change', event => {
      event.stopPropagation()
      this.applySidebarDisplay(this.displaySidebarCheckbox.checked)
    })

    AcApSettingManager.instance.events.modified.addEventListener(args => {
      if (args.key !== 'isShowCommandLine' || !this.displayMenuOpen) return
      this.syncDisplayMenuState()
    })

    document.addEventListener('pointerdown', event => {
      if (!this.displayMenuOpen) return
      if (!(event.target instanceof Node)) return
      if (
        this.displayMenu.contains(event.target) ||
        this.displayButton.contains(event.target)
      ) {
        return
      }
      this.closeDisplayMenu()
    })
  }

  private async toggleDisplayMenu() {
    if (this.displayMenuOpen) {
      this.closeDisplayMenu()
      return
    }
    this.closeDockMenu()
    this.closeViewerToolbarMenu()
    await this.initialize()
    if (!this.isDevToolbarEnabled()) return
    this.openDisplayMenu()
  }

  private openDisplayMenu() {
    this.syncDisplayMenuState()
    this.displayMenu.hidden = false
    this.displayMenuOpen = true
    this.displayButton.setAttribute('aria-expanded', 'true')
  }

  private closeDisplayMenu() {
    this.displayMenu.hidden = true
    this.displayMenuOpen = false
    this.displayButton.setAttribute('aria-expanded', 'false')
  }

  private async applyLineWeightDisplay(enabled: boolean) {
    await this.initialize()

    const doc = AcApDocManager.instance.curDocument
    if (!doc) {
      this.syncDisplayMenuState()
      this.showMessage('Open a drawing first to toggle line weight', 'info')
      return
    }

    AcDbSysVarManager.instance().setVar(
      'LWDISPLAY',
      enabled ? 1 : 0,
      doc.database
    )
    this.syncDisplayMenuState()
    this.showMessage(
      `Line weight display ${enabled ? 'enabled' : 'disabled'}`,
      'success'
    )
  }

  private async applyCommandLineDisplay(visible: boolean) {
    await this.initialize()

    AcApSettingManager.instance.isShowCommandLine = visible
    this.syncDisplayMenuState()
    this.showMessage(
      visible ? 'Command line shown' : 'Command line hidden',
      'success'
    )
  }

  private applySidebarDisplay(visible: boolean) {
    this.fileSidebarColumn.classList.toggle('is-hidden', !visible)
    this.syncDisplayMenuState()
    this.showMessage(visible ? 'Sidebar shown' : 'Sidebar hidden', 'success')
  }

  private isFileSidebarVisible(): boolean {
    return !this.fileSidebarColumn.classList.contains('is-hidden')
  }

  private syncDisplayMenuState() {
    const enabled = this.isDevToolbarEnabled()
    const lineWeightOn = enabled && this.isLineWeightEnabled()
    const commandLineOn = AcApSettingManager.instance.isShowCommandLine
    const sidebarOn = this.isFileSidebarVisible()

    this.displayButton.disabled = !enabled
    this.displayLineWeightCheckbox.disabled = !enabled
    this.displayCommandLineCheckbox.disabled = !enabled
    this.displaySidebarCheckbox.disabled = !enabled
    this.displayLineWeightCheckbox.checked = lineWeightOn
    this.displayCommandLineCheckbox.checked = commandLineOn
    this.displaySidebarCheckbox.checked = sidebarOn
    this.displayButton.textContent = 'Display'
  }

  private setupDockMenu() {
    this.dockButton.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleDockMenu()
    })

    this.dockOpenToggle.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleDockPanelOpen()
    })

    this.dockAddTabButton.addEventListener('click', event => {
      event.stopPropagation()
      void this.addDemoDockTab()
    })

    this.dockSizeInput.addEventListener('change', () => {
      void this.applyDockPanelSize()
    })

    document.addEventListener('pointerdown', event => {
      if (!this.dockMenuOpen) return
      if (!(event.target instanceof Node)) return
      if (
        this.dockMenu.contains(event.target) ||
        this.dockButton.contains(event.target)
      ) {
        return
      }
      this.closeDockMenu()
    })
  }

  private async toggleDockMenu() {
    if (this.dockMenuOpen) {
      this.closeDockMenu()
      return
    }
    this.closeViewerToolbarMenu()
    this.closeDisplayMenu()
    await this.initialize()
    if (!this.isDevToolbarEnabled()) return
    this.openDockMenu()
  }

  private openDockMenu() {
    this.syncDockMenuState()
    this.dockMenu.hidden = false
    this.dockMenuOpen = true
    this.dockButton.setAttribute('aria-expanded', 'true')
  }

  private closeDockMenu() {
    this.dockMenu.hidden = true
    this.dockMenuOpen = false
    this.dockButton.setAttribute('aria-expanded', 'false')
  }

  private isDockSizeVertical(side: AcExDockPanelSide | undefined): boolean {
    return side === 'top' || side === 'bottom'
  }

  private async toggleDockPanelOpen() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    const nextOpen = !plugin.isDockPanelOpen()
    if (nextOpen) {
      if (!plugin.setDockPanelOpen(true)) {
        this.showMessage('Dock panel is not available', 'error')
        return
      }
    } else if (!plugin.setDockPanelOpen(false)) {
      this.showMessage('Dock panel is not available', 'error')
      return
    }

    this.syncDockMenuState()
    this.showMessage(
      nextOpen ? 'Dock panel opened' : 'Dock panel closed',
      'success'
    )
  }

  private async addDemoDockTab() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    this.demoDockTabCount += 1
    const tabNumber = this.demoDockTabCount
    const tabId = `demo-${tabNumber}`

    const added = plugin.addDockPanelTab({
      id: tabId,
      label: `Demo ${tabNumber}`,
      content: createDemoDockTabPanel(tabNumber)
    })

    if (!added) {
      this.demoDockTabCount -= 1
      this.showMessage('Failed to add dock tab', 'error')
      return
    }

    this.syncDockMenuState()
    this.showMessage(`Added dock tab: Demo ${tabNumber}`, 'success')
  }

  private async applyDockPanelSize() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    const size = Number.parseInt(this.dockSizeInput.value, 10)
    if (!Number.isFinite(size) || size < 120) {
      this.syncDockMenuState()
      this.showMessage('Dock size must be at least 120px', 'error')
      return
    }

    if (!plugin.setDockPanelSize(size)) {
      this.showMessage('Dock panel is not available', 'error')
      return
    }

    this.syncDockMenuState()
    const side = plugin.getDockPanelSide()
    const dimension = this.isDockSizeVertical(side) ? 'height' : 'width'
    this.showMessage(`Dock ${dimension}: ${size}px`, 'success')
  }

  private syncDockMenuState() {
    const plugin = this.getSimpleUiPlugin()
    const enabled = this.isDevToolbarEnabled() && Boolean(plugin)
    const isOpen = plugin?.isDockPanelOpen() ?? false
    const side = plugin?.getDockPanelSide()
    const size =
      plugin?.getDockPanelSize() ?? (this.isDockSizeVertical(side) ? 240 : 280)

    this.dockButton.disabled = !enabled
    this.dockOpenToggle.disabled = !enabled
    this.dockAddTabButton.disabled = !enabled
    this.dockOpenToggle.textContent = isOpen ? 'Close Dock' : 'Open Dock'
    this.dockSizeInput.disabled = !enabled
    this.dockSizeInput.value = String(size)
    this.dockSizeLabel.textContent = this.isDockSizeVertical(side)
      ? 'Height (px)'
      : 'Width (px)'
    this.dockButton.textContent = 'Dock'
  }

  private setupViewerToolbarMenu() {
    this.toolbarLayoutSelect.innerHTML = ''
    for (const layout of DEMO_TOOLBAR_LAYOUTS) {
      const option = document.createElement('option')
      option.value = layout.id
      option.textContent = layout.label
      this.toolbarLayoutSelect.appendChild(option)
    }

    this.toolbarLayoutSelect.addEventListener('click', event => {
      event.stopPropagation()
    })
    this.toolbarLayoutSelect.addEventListener('change', event => {
      event.stopPropagation()
      void this.applyToolbarLayout(this.toolbarLayoutSelect.value)
    })

    this.viewerToolbarButton.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleViewerToolbarMenu()
    })

    this.viewerToolbarPlacementButtons.forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation()
        const placement = button.dataset.viewerToolbarPlacement as
          | AcExToolbarPlacement
          | undefined
        if (!placement) return
        void this.applyViewerToolbarPlacement(placement)
      })
    })

    this.viewerToolbarVisibilityToggle.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleViewerToolbarVisibility()
    })

    this.viewerToolbarCollapseToggle.addEventListener('click', event => {
      event.stopPropagation()
      void this.toggleViewerToolbarCollapsed()
    })

    this.viewerToolbarEdgeOffsetInput.addEventListener('change', () => {
      void this.applyViewerToolbarEdgeOffset()
    })

    document.addEventListener('pointerdown', event => {
      if (!this.viewerToolbarMenuOpen) return
      if (!(event.target instanceof Node)) return
      if (
        this.viewerToolbarMenu.contains(event.target) ||
        this.viewerToolbarButton.contains(event.target)
      ) {
        return
      }
      this.closeViewerToolbarMenu()
    })
  }

  private async toggleViewerToolbarMenu() {
    if (this.viewerToolbarMenuOpen) {
      this.closeViewerToolbarMenu()
      return
    }
    this.closeDockMenu()
    this.closeDisplayMenu()
    await this.initialize()
    if (!this.isDevToolbarEnabled()) return
    this.openViewerToolbarMenu()
  }

  private openViewerToolbarMenu() {
    this.syncViewerToolbarMenuState()
    this.viewerToolbarMenu.hidden = false
    this.viewerToolbarMenuOpen = true
    this.viewerToolbarButton.setAttribute('aria-expanded', 'true')
  }

  private closeViewerToolbarMenu() {
    this.viewerToolbarMenu.hidden = true
    this.viewerToolbarMenuOpen = false
    this.viewerToolbarButton.setAttribute('aria-expanded', 'false')
  }

  private async applyViewerToolbarPlacement(placement: AcExToolbarPlacement) {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    if (!plugin.setToolbarPlacement(placement)) {
      this.showMessage('Viewer toolbar is not available', 'error')
      return
    }

    this.syncViewerToolbarMenuState()
    this.showMessage(`Viewer toolbar position: ${placement}`, 'success')
  }

  private async toggleViewerToolbarVisibility() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    const nextVisible = !plugin.isToolbarVisible()
    if (!plugin.setToolbarVisible(nextVisible)) {
      this.showMessage('Viewer toolbar is not available', 'error')
      return
    }

    this.syncViewerToolbarMenuState()
    this.showMessage(
      nextVisible ? 'Viewer toolbar shown' : 'Viewer toolbar hidden',
      'success'
    )
  }

  private async toggleViewerToolbarCollapsed() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    const nextCollapsed = !plugin.isToolbarCollapsed()
    if (!plugin.setToolbarCollapsed(nextCollapsed)) {
      this.showMessage('Viewer toolbar collapse is not available', 'error')
      return
    }

    this.syncViewerToolbarMenuState()
    this.showMessage(
      nextCollapsed ? 'Viewer toolbar collapsed' : 'Viewer toolbar expanded',
      'success'
    )
  }

  private async applyViewerToolbarEdgeOffset() {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    const offset = Number.parseInt(this.viewerToolbarEdgeOffsetInput.value, 10)
    if (!Number.isFinite(offset) || offset < 0) {
      this.syncViewerToolbarMenuState()
      this.showMessage('Edge inset must be a non-negative number', 'error')
      return
    }

    if (!plugin.setToolbarEdgeOffset(offset)) {
      this.showMessage('Viewer toolbar is not available', 'error')
      return
    }

    this.syncViewerToolbarMenuState()
    this.showMessage(`Toolbar edge inset: ${offset}px`, 'success')
  }

  private syncViewerToolbarMenuState() {
    const plugin = this.getSimpleUiPlugin()
    const enabled = this.isDevToolbarEnabled() && Boolean(plugin)
    const placement = plugin?.getToolbarPlacement() ?? 'right'
    const visible = plugin?.isToolbarVisible() ?? true
    const collapsed = plugin?.isToolbarCollapsed() ?? false
    const edgeOffset = plugin?.getToolbarEdgeOffset() ?? 8

    this.viewerToolbarPlacementButtons.forEach(button => {
      const isSelected = button.dataset.viewerToolbarPlacement === placement
      button.classList.toggle('is-selected', enabled && isSelected)
      button.disabled = !enabled
    })

    this.viewerToolbarVisibilityToggle.disabled = !enabled
    this.viewerToolbarVisibilityToggle.textContent = visible
      ? 'Hide Toolbar'
      : 'Show Toolbar'

    this.viewerToolbarCollapseToggle.disabled = !enabled
    this.viewerToolbarCollapseToggle.textContent = collapsed
      ? 'Expand Toolbar'
      : 'Collapse Toolbar'

    this.viewerToolbarEdgeOffsetInput.disabled = !enabled
    this.viewerToolbarEdgeOffsetInput.value = String(edgeOffset)

    this.toolbarLayoutSelect.disabled = !enabled
    if (enabled) {
      this.toolbarLayoutSelect.value = getCurrentDemoToolbarLayoutId()
    }

    this.viewerToolbarButton.textContent = 'Toolbar'
  }

  private setupDevToolbar() {
    this.devNewButton.addEventListener('click', () => {
      void this.createNewDrawing()
    })
    this.updateDevToolbarLabels()
  }

  private async applyToolbarLayout(presetId: string) {
    await this.initialize()

    const plugin = this.getSimpleUiPlugin()
    if (!plugin) {
      this.showMessage('Simple UI plugin is not loaded', 'error')
      return
    }

    applyDemoToolbarLayout(plugin, presetId)
    this.syncViewerToolbarMenuState()

    const label =
      DEMO_TOOLBAR_LAYOUTS.find(layout => layout.id === presetId)?.label ??
      presetId
    this.showMessage(`Toolbar layout: ${label}`, 'success')
  }

  private updateDevToolbarLabels() {
    const enabled = this.isDevToolbarEnabled()

    this.viewerToolbarButton.disabled = !enabled
    if (!enabled) {
      this.closeViewerToolbarMenu()
      this.closeDockMenu()
      this.closeDisplayMenu()
    }

    this.devToolbar.classList.toggle('is-disabled', !enabled)
    this.syncViewerToolbarMenuState()
    this.syncDockMenuState()
    this.syncDisplayMenuState()
  }

  private getSimpleUiPlugin(): AcApSimpleUiPlugin | undefined {
    if (!this.isInitialized) return undefined
    return AcApDocManager.instance.pluginManager.getPlugin(
      SIMPLE_UI_PLUGIN_NAME
    ) as AcApSimpleUiPlugin | undefined
  }

  private isLineWeightEnabled(): boolean {
    if (!this.isInitialized) return false
    const doc = AcApDocManager.instance.curDocument
    if (!doc) return false
    return Boolean(
      AcDbSysVarManager.instance().getVar('LWDISPLAY', doc.database)
    )
  }

  private isDevToolbarEnabled(): boolean {
    return this.hasOpenedFile
  }

  private async initialize() {
    if (this.isInitialized) return

    try {
      applyUiTheme('dark', this.viewerPane)

      AcApDocManager.createInstance({
        container: this.container,
        busyIndicatorHost: this.viewerPane,
        autoResize: true,
        baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
        commandAliases: EXAMPLE_COMMAND_ALIASES,
        openDocumentDefaults: {
          minimumChunkSize: 1000,
          mode: AcEdOpenMode.Write,
          sysVars: {
            lwdisplay: false
          }
        },
        webworkerFileUrls: {
          mtextRender: './workers/mtext-renderer-worker.js',
          dxfParser: './workers/dxf-parser-worker.js',
          dwgParser: './workers/libredwg-parser-worker.js'
        },
        htmlViewerRuntimeUrl: './viewer-runtime.iife.js'
      })

      registerLazyPlugins()

      await registerSimpleUiPlugin(AcApDocManager.instance.pluginManager, {
        host: this.viewerPane,
        dockPanel: {
          defaultOpen: false,
          defaultHeight: 240,
          defaultWidth: 280
        },
        toolbar: {
          placement: 'right',
          items: 'default',
          appendItems: [AGENT_TOOLBAR_ITEM],
          appendItemsAfter: 'layer',
          collapsible: true
        }
      })

      const plugin = AcApDocManager.instance.pluginManager.getPlugin(
        SIMPLE_UI_PLUGIN_NAME
      ) as AcApSimpleUiPlugin
      setupAgentIntegration(plugin)

      AcApDocManager.instance.events.documentActivated.addEventListener(
        args => {
          document.title = args.doc.docTitle
          this.onFileOpened()
          this.finishLoadingState()
          this.updateDevToolbarLabels()
        }
      )

      AcApDocManager.instance.events.documentToBeOpened.addEventListener(() => {
        this.setLoadingState(true)
      })

      this.isInitialized = true
      this.updateDevToolbarLabels()
    } catch (error) {
      log.error('Failed to initialize CAD viewer:', error)
      this.showMessage('Failed to initialize CAD viewer', 'error')
    }
  }

  private setupFileHandling() {
    this.fileInput.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        void this.loadLocalFile(file)
      }
      this.fileInput.value = ''
    })

    this.centerOpenButton.addEventListener('click', () => {
      this.fileInput.click()
    })
  }

  private setupPredefinedFileActions() {
    this.predefinedButtons.forEach(button => {
      button.addEventListener('click', () => {
        const url = button.dataset.fileUrl
        if (!url) return
        this.predefinedButtons.forEach(item => item.classList.remove('active'))
        button.classList.add('active')
        this.updateFileSidebarSubtitle(button.textContent?.trim() || '')
        this.setFileSidebarExpanded(false)
        void this.loadPredefinedFile(url)
      })
    })
  }

  private setupMobileSidebar() {
    this.fileSidebarToggle.addEventListener('click', () => {
      this.setFileSidebarExpanded(!this.isFileSidebarOpen())
    })

    document.addEventListener('pointerdown', event => {
      if (!this.isMobileLayout() || !this.isFileSidebarOpen()) {
        return
      }

      const target = event.target
      if (!(target instanceof Node)) return
      if (
        this.fileSidebarToggle.contains(target) ||
        this.fileSidebarBody.contains(target)
      ) {
        return
      }
      this.setFileSidebarExpanded(false)
    })

    window.addEventListener('resize', () => {
      if (!this.isMobileLayout()) {
        this.setFileSidebarExpanded(false)
        return
      }
      if (this.isFileSidebarOpen()) {
        this.positionMobileFilePopover()
      }
    })
  }

  private isMobileLayout() {
    return isCompactUiLayout()
  }

  private isFileSidebarOpen(): boolean {
    return this.isMobileLayout()
      ? this.fileSidebarBody.classList.contains('file-sidebar-popover')
      : this.fileSidebar.classList.contains('expanded')
  }

  private setFileSidebarExpanded(expanded: boolean) {
    if (this.isMobileLayout()) {
      this.fileSidebar.classList.toggle('expanded', expanded)
      this.fileSidebarToggle.setAttribute('aria-expanded', String(expanded))
      this.fileSidebarBody.classList.toggle('file-sidebar-popover', expanded)
      if (expanded) {
        this.positionMobileFilePopover()
      } else {
        this.fileSidebarBody.style.top = ''
        this.fileSidebarBody.style.maxHeight = ''
      }
      return
    }

    this.fileSidebar.classList.toggle('expanded', expanded)
    this.fileSidebarToggle.setAttribute('aria-expanded', String(expanded))
  }

  private positionMobileFilePopover() {
    const rect = this.fileSidebarToggle.getBoundingClientRect()
    const gap = 4
    const viewportInset = 8
    const top = rect.bottom + gap
    const maxHeight = Math.max(
      120,
      Math.min(
        window.innerHeight * 0.5,
        360,
        window.innerHeight - top - viewportInset
      )
    )

    this.fileSidebarBody.style.top = `${top}px`
    this.fileSidebarBody.style.maxHeight = `${maxHeight}px`
  }

  private updateFileSidebarSubtitle(label: string) {
    this.fileSidebarSubtitle.textContent = label || 'Tap to browse sample files'
  }

  private async createNewDrawing() {
    await this.initialize()

    if (!this.isInitialized) return

    this.clearMessages()

    try {
      const cmd = new AcApQNewCmd()
      await cmd.execute(AcApDocManager.instance.context)
      this.predefinedButtons.forEach(item => item.classList.remove('active'))
      this.updateFileSidebarSubtitle('Tap to browse sample files')
      this.showMessage('New drawing created', 'success')
    } catch (error) {
      log.error('Error creating new drawing:', error)
      this.showMessage(`Error creating new drawing: ${error}`, 'error')
      this.finishLoadingState()
    }
  }

  private async loadLocalFile(file: File) {
    await this.initialize()

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.dxf') && !fileName.endsWith('.dwg')) {
      this.showMessage('Please select a DXF or DWG file', 'error')
      return
    }

    this.clearMessages()

    try {
      const fileContent = await this.readFile(file)
      const options: AcApOpenDatabaseOptions = {
        minimumChunkSize: 1000,
        mode: AcEdOpenMode.Write,
        sysVars: {
          lwdisplay: false
        }
      }

      const success = await AcApDocManager.instance.openDocument(
        file.name,
        fileContent,
        options
      )

      if (success) {
        this.predefinedButtons.forEach(item => item.classList.remove('active'))
        this.updateFileSidebarSubtitle('Tap to browse sample files')
        this.showMessage(`Successfully loaded: ${file.name}`, 'success')
      } else {
        this.showMessage(`Failed to load: ${file.name}`, 'error')
      }
    } catch (error) {
      log.error('Error loading file:', error)
      this.showMessage(`Error loading file: ${error}`, 'error')
    } finally {
      this.finishLoadingState()
    }
  }

  private async loadPredefinedFile(url: string) {
    await this.initialize()
    this.clearMessages()

    try {
      const options: AcApOpenDatabaseOptions = {
        minimumChunkSize: 1000,
        mode: AcEdOpenMode.Write
      }

      const success = await AcApDocManager.instance.openUrl(url, options)

      if (success) {
        const fileName = this.getFileNameFromUrl(url)
        this.showMessage(`Successfully loaded: ${fileName}`, 'success')
      } else {
        this.showMessage(
          `Failed to load: ${this.getFileNameFromUrl(url)}`,
          'error'
        )
      }
    } catch (error) {
      log.error('Error loading predefined file:', error)
      this.showMessage(`Error loading file: ${error}`, 'error')
    } finally {
      this.finishLoadingState()
    }
  }

  private onFileOpened() {
    this.hasOpenedFile = true
    this.updateEmptyStateVisibility()
    this.updateDevToolbarLabels()
  }

  private setLoadingState(loading: boolean) {
    this.isLoadingFile = loading
    this.updateEmptyStateVisibility()
  }

  private finishLoadingState() {
    this.isLoadingFile = false
    this.updateEmptyStateVisibility()
  }

  private updateEmptyStateVisibility() {
    this.emptyState.classList.toggle(
      'hidden',
      this.hasOpenedFile || this.isLoadingFile
    )
  }

  private getFileNameFromUrl(url: string) {
    const paths = url.split('/')
    return paths[paths.length - 1] || url
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  private showMessage(
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) {
    this.clearMessages()

    const popup = document.createElement('div')
    popup.className = `popup-message ${type}`
    popup.textContent = message
    popup.style.position = 'fixed'
    popup.style.top = '1rem'
    popup.style.left = '50%'
    popup.style.transform = 'translateX(-50%)'
    popup.style.zIndex = '1000'
    popup.style.padding = '0.75rem 1.25rem'
    popup.style.borderRadius = '8px'
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'
    popup.style.fontSize = '0.95rem'
    popup.style.opacity = '0.98'
    popup.style.transition = 'opacity 0.2s'

    if (type === 'error') {
      popup.style.background = '#fee2e2'
      popup.style.color = '#b91c1c'
      popup.style.border = '1px solid #fecaca'
    } else if (type === 'success') {
      popup.style.background = '#dcfce7'
      popup.style.color = '#166534'
      popup.style.border = '1px solid #bbf7d0'
    } else {
      popup.style.background = '#e5e7eb'
      popup.style.color = '#111827'
      popup.style.border = '1px solid #d1d5db'
    }

    document.body.appendChild(popup)

    setTimeout(() => {
      popup.style.opacity = '0'
      setTimeout(() => {
        popup.remove()
      }, 200)
    }, 1200)
  }

  private clearMessages() {
    document.querySelectorAll('.popup-message').forEach(el => el.remove())
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectAppShellResponsiveStyles()
    new CadViewerApp()
  })
} else {
  injectAppShellResponsiveStyles()
  new CadViewerApp()
}
