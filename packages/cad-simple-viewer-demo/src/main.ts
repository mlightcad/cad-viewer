import type {
  AcApSimpleUiPlugin,
  AcUiDockPanelSide,
  AcUiToolbarPlacement
} from '@mlightcad/cad-simple-ui-plugin'
import {
  type AcApOpenDatabaseOptions,
  acedApplyUiTheme,
  acedIsCompactUiLayout,
  AcEdOpenMode,
  acuiCreateFileOpenSession,
  type AcUiFileOpenRequest,
  type AcUiFileOpenSession
} from '@mlightcad/cad-simple-viewer/file-open-panel'
import {
  AcDbSystemVariables,
  AcDbSysVarManager,
  log
} from '@mlightcad/data-model'

import { injectAppShellResponsiveStyles } from './appShellResponsiveStyles'
import { createDemoDockTabPanel } from './demoDockTabPanel'
import { DEMO_TOOLBAR_LAYOUTS } from './demoToolbarLayouts'
import { setupFileSidebarResize } from './fileSidebarResize'
import { getGoogleDriveEnvConfig } from './googleDriveEnv'
import { getOneDriveEnvConfig } from './onedriveEnv'

type CadSimpleViewerModule = typeof import('@mlightcad/cad-simple-viewer')

/** Lazily loaded viewer runtime — kept off the landing-page critical path. */
const viewerApi = {
  mod: null as CadSimpleViewerModule | null
}

async function loadViewerApi(): Promise<CadSimpleViewerModule> {
  if (!viewerApi.mod) {
    viewerApi.mod = await import('@mlightcad/cad-simple-viewer')
  }
  return viewerApi.mod
}

function viewer(): CadSimpleViewerModule {
  if (!viewerApi.mod) {
    throw new Error('CAD viewer runtime is not initialized yet')
  }
  return viewerApi.mod
}

async function loadSimpleUiPlugin() {
  const [{ SIMPLE_UI_PLUGIN_NAME }, { acuiRegisterSimpleUiPlugin }] =
    await Promise.all([
      import('@mlightcad/cad-simple-ui-plugin'),
      import('@mlightcad/cad-simple-ui-plugin/register')
    ])
  return { SIMPLE_UI_PLUGIN_NAME, acuiRegisterSimpleUiPlugin }
}

async function loadDemoToolbarPresets() {
  return import('./demoToolbarPresets')
}

// AcApSettingManager.configure runs inside initialize() after the viewer module
// is loaded, so the landing page stays on /file-open-panel only.

const EXAMPLE_COMMAND_ALIASES = {
  LINE: ['LX'],
  CIRCLE: ['CI'],
  ZOOM: ['ZZ']
}

/** Query-gated open-file profiling (`?openprof=1`). */
function isOpenProfMode(): boolean {
  return new URLSearchParams(window.location.search).has('openprof')
}

/**
 * Progressive open is off by default. Pass `progressive=1` (or `true`) to
 * enable for A/B comparison with OPENPROF.
 */
function isProgressiveOpenMode(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('progressive')) {
    return false
  }
  const value = params.get('progressive')
  return value === '1' || value === 'true'
}

/**
 * OPENPROF runs use main-thread MTEXT by default (skip worker transfer cost).
 * Pass `worker=1` to measure the worker MTEXT path instead.
 */
function isWorkerOpenMode(): boolean {
  return new URLSearchParams(window.location.search).has('worker')
}

function installOpenProfConsoleCapture(): void {
  const w = window as Window & {
    __OPENPROF_REPORT__?: string
    __OPENPROF_DONE__?: boolean
  }
  w.__OPENPROF_DONE__ = false
  const originalLog = console.log.bind(console)
  console.log = (...args: unknown[]) => {
    originalLog(...args)
    const text = args
      .map(arg => (typeof arg === 'string' ? arg : String(arg)))
      .join(' ')
    if (text.includes('OPENPROF (open-file profile)')) {
      w.__OPENPROF_REPORT__ = text
      w.__OPENPROF_DONE__ = true
    }
  }
}

class CadViewerApp {
  private container: HTMLDivElement
  private fileInput: HTMLInputElement
  private fileOpenPanelHost: HTMLElement
  private fileOpenSession: AcUiFileOpenSession | null = null
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
  private documentEventsRegistered = false
  private displayMenuSettingListenerRegistered = false
  private hasOpenedFile = false
  private isLoadingFile = false

  constructor() {
    this.container = document.getElementById('cad-container') as HTMLDivElement
    this.fileInput = document.getElementById(
      'fileInputElement'
    ) as HTMLInputElement
    this.fileOpenPanelHost = document.getElementById(
      'fileOpenPanelHost'
    ) as HTMLElement
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

    acedApplyUiTheme('dark', document.documentElement)

    this.setupFileHandling()
    this.setupFileOpenPanel()
    // Defer AcApDocManager / simple-ui creation until the user opens or creates
    // a drawing (or signs in to a cloud source). Eager init showed the blank
    // viewer chrome under the transparent landing panel.
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

  private buildOpenOptions(
    overrides: Partial<AcApOpenDatabaseOptions> = {}
  ): AcApOpenDatabaseOptions {
    return {
      minimumChunkSize: 1000,
      mode: AcEdOpenMode.Write,
      progressiveRendering: isProgressiveOpenMode(),
      sysVars: {
        lwdisplay: false,
        paperbkcolor: viewer().layoutBackgroundColorFromRgb(viewer().ACGI_PAPER_SPACE_BACKGROUND)
      },
      ...overrides
    }
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

  private registerDisplayMenuSettingListener() {
    if (this.displayMenuSettingListenerRegistered || !viewerApi.mod) return
    this.displayMenuSettingListenerRegistered = true
    viewer().AcApSettingManager.instance.events.modified.addEventListener(
      args => {
        if (args.key !== 'isShowCommandLine' || !this.displayMenuOpen) return
        this.syncDisplayMenuState()
      }
    )
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

    const doc = viewer().AcApDocManager.instance.curDocument
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

    viewer().AcApSettingManager.instance.isShowCommandLine = visible
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
    // Command-line visibility lives on AcApSettingManager — unavailable until
    // the viewer runtime is lazily loaded after the first open/create.
    const commandLineOn =
      this.isInitialized &&
      viewer().AcApSettingManager.instance.isShowCommandLine
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

  private isDockSizeVertical(side: AcUiDockPanelSide | undefined): boolean {
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
          | AcUiToolbarPlacement
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

  private async applyViewerToolbarPlacement(placement: AcUiToolbarPlacement) {
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
      void loadDemoToolbarPresets().then(({ getCurrentDemoToolbarLayoutId }) => {
        this.toolbarLayoutSelect.value = getCurrentDemoToolbarLayoutId()
      })
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

    const { applyDemoToolbarLayout } = await loadDemoToolbarPresets()
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

  private simpleUiPluginName: string | null = null

  private getSimpleUiPlugin(): AcApSimpleUiPlugin | undefined {
    if (!this.isInitialized || !this.simpleUiPluginName) return undefined
    return viewer().AcApDocManager.instance.pluginManager.getPlugin(
      this.simpleUiPluginName
    ) as AcApSimpleUiPlugin | undefined
  }

  private isLineWeightEnabled(): boolean {
    if (!this.isInitialized) return false
    const doc = viewer().AcApDocManager.instance.curDocument
    if (!doc) return false
    return Boolean(
      AcDbSysVarManager.instance().getVar('LWDISPLAY', doc.database)
    )
  }

  private isDevToolbarEnabled(): boolean {
    return this.hasOpenedFile
  }

  private registerDocumentEvents() {
    if (this.documentEventsRegistered) return

    viewer().AcApDocManager.instance.events.documentActivated.addEventListener(
      args => {
        document.title = args.doc.docTitle
        this.onFileOpened()
        this.finishLoadingState()
        this.updateDevToolbarLabels()
      }
    )

    viewer().AcApDocManager.instance.events.documentToBeOpened.addEventListener(() => {
      this.setLoadingState(true)
    })

    viewer().eventBus.on('open-local-file-started', () => {
      this.setLoadingState(true)
    })

    viewer().eventBus.on('failed-to-open-file', params => {
      this.showMessage(viewer().acapFormatOpenFileErrorToastMessage(params), 'error')
      this.finishLoadingState()
    })

    this.documentEventsRegistered = true
  }

  /**
   * Whether viewer chrome (toolbar / command line) should be shown.
   * Hidden on the landing panel; shown once a drawing is open or being opened.
   */
  private shouldShowViewerChrome(): boolean {
    return this.hasOpenedFile || this.isLoadingFile
  }

  /** Shows or hides viewer chrome without persisting those preferences. */
  private setViewerChromeVisible(visible: boolean) {
    // Landing-page open sets loading before `initialize()` finishes loading the
    // viewer module — skip setting managers until the runtime exists.
    if (!this.isInitialized && !viewerApi.mod) {
      return
    }
    if (visible) {
      viewer().AcApSettingManager.instance.clearSessionOverride('isShowCommandLine')
      viewer().AcApSettingManager.instance.clearSessionOverride('isShowShortCutToolbar')
    } else {
      viewer().AcApSettingManager.instance.apply(
        {
          isShowCommandLine: false,
          isShowShortCutToolbar: false
        },
        { persist: false }
      )
    }
    this.getSimpleUiPlugin()?.setToolbarVisible(visible)
  }

  private async initialize() {
    if (this.isInitialized) return

    try {
      await loadViewerApi()
      viewer().AcApSettingManager.configure({
        storageKey: 'mlightcad.settings.simple-viewer'
      })
      this.registerDisplayMenuSettingListener()
      acedApplyUiTheme('dark', document.documentElement)
      acedApplyUiTheme('dark', this.viewerPane)

      const showChrome = this.shouldShowViewerChrome()
      // Hide command line / shortcut toolbar before createInstance mounts them,
      // so cloud sign-in (init without opening a file) does not flash chrome.
      if (!showChrome) {
        viewer().AcApSettingManager.instance.apply(
          {
            isShowCommandLine: false,
            isShowShortCutToolbar: false
          },
          { persist: false }
        )
      }

      const openProf = isOpenProfMode()
      // Prefer main-thread MTEXT by default (less peak memory). Pass `?worker=1`
      // with openprof, or rely on worker mode only when explicitly requested.
      const useWorkers = openProf ? isWorkerOpenMode() : false
      const dwgParserUrl = `./workers/${viewer().LIBREDWG_PARSER_WORKER_FILE}`
      const [
        { registerLibreDwgConverter },
        { registerLazyPlugins },
        { registerSvgConverter }
      ] = await Promise.all([
        import('./registerLibreDwg'),
        import('./register'),
        import('@mlightcad/cad-svg-converter')
      ])
      registerLibreDwgConverter(dwgParserUrl)
      registerSvgConverter()
      viewer().AcApDocManager.createInstance({
        container: this.container,
        busyIndicatorHost: this.viewerPane,
        autoResize: true,
        baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
        commandAliases: EXAMPLE_COMMAND_ALIASES,
        // Main-thread MTEXT uses less memory; worker mode is opt-in via ?worker=1.
        useMainThreadDraw: openProf ? !useWorkers : true,
        openDocumentDefaults: () => this.buildOpenOptions(),
        webworkerFileUrls: {
          mtextRender: `./workers/${viewer().MTEXT_RENDERER_WORKER_FILE}`,
          dwgParser: dwgParserUrl
        }
      })
      this.registerDocumentEvents()
      if (openProf) {
        const w = window as Window & { __OPEN_MODE__?: string }
        w.__OPEN_MODE__ = useWorkers ? 'worker-mtext' : 'main-mtext'
        console.log(`[openprof] mode=${w.__OPEN_MODE__}`)
      }

      // Attach before cloud plugins load so they reuse landing MSAL / GIS clients.
      this.fileOpenSession?.landing.attachSourcesTo(
        viewer().AcApDocManager.instance.dataSourceManager
      )
      await registerLazyPlugins()
      this.fileOpenSession?.refreshSourceButtons()

      const [
        { SIMPLE_UI_PLUGIN_NAME, acuiRegisterSimpleUiPlugin },
        { AGENT_TOOLBAR_ITEM },
        { SCRIPT_TOOLBAR_ITEM },
        { setupAgentIntegration }
      ] = await Promise.all([
        loadSimpleUiPlugin(),
        import('./agentToolbarItem'),
        import('./scriptToolbarItem'),
        import('./agentIntegration')
      ])
      this.simpleUiPluginName = SIMPLE_UI_PLUGIN_NAME

      await acuiRegisterSimpleUiPlugin(
        viewer().AcApDocManager.instance.pluginManager,
        {
          host: this.viewerPane,
          dockPanel: {
            defaultOpen: false,
            defaultHeight: 240,
            defaultWidth: 280
          },
          toolbar: {
            placement: 'right',
            items: 'default',
            appendItems: [AGENT_TOOLBAR_ITEM, SCRIPT_TOOLBAR_ITEM],
            appendItemsAfter: 'layout',
            collapsible: true
          },
          layouts: {
            phone: {
              toolbar: {
                placement: 'bottom',
                showLabels: true,
                size: 'stretch',
                edgeOffset: 0,
                collapsible: false,
                inCanvasParent: true,
                subToolbar: {
                  showLabels: true,
                  showSeparators: false,
                  size: 'stretch',
                  overflow: 'wrap',
                  replaceOnNested: true
                }
              }
            }
          }
        }
      )

      const plugin = viewer().AcApDocManager.instance.pluginManager.getPlugin(
        SIMPLE_UI_PLUGIN_NAME
      ) as AcApSimpleUiPlugin
      setupAgentIntegration(plugin)

      this.isInitialized = true
      if (!showChrome) {
        this.setViewerChromeVisible(false)
      }
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
        void this.openViaSession({ kind: 'file', file })
      }
      this.fileInput.value = ''
    })
  }

  private openViaSession(request: AcUiFileOpenRequest) {
    if (!this.fileOpenSession) {
      log.error('File open session is not ready')
      return
    }
    void this.fileOpenSession.open(request)
  }

  private setupFileOpenPanel() {
    if (!this.fileOpenPanelHost) return
    this.fileOpenSession = acuiCreateFileOpenSession({
      host: this.fileOpenPanelHost,
      theme: 'dark',
      showNewDrawing: true,
      createDocManager: async () => {
        await this.initialize()
        return viewer().AcApDocManager.instance
      },
      getOpenOptions: () => this.buildOpenOptions(),
      onBeforeOpen: () => {
        this.setLoadingState(true)
        this.clearMessages()
      },
      onPrepareOpen: async (request, _dm) => {
        if (request.kind !== 'file' || !isOpenProfMode()) return
        installOpenProfConsoleCapture()
        AcDbSysVarManager.instance().setVar(
          AcDbSystemVariables.OPENPROF,
          true,
          viewer().AcApDocManager.instance.curDocument.database
        )
      },
      onAfterOpen: (request, result) => {
        if (result.ok) {
          this.onFileOpened()
          this.predefinedButtons.forEach(item => item.classList.remove('active'))
          this.updateFileSidebarSubtitle('Tap to browse sample files')
          if (request.kind === 'new') {
            this.showMessage('New drawing created', 'success')
          } else if (request.kind === 'file') {
            this.showMessage(
              `Successfully loaded: ${request.file.name}`,
              'success'
            )
          } else {
            this.showMessage(
              `Successfully loaded: ${this.getFileNameFromUrl(request.url)}`,
              'success'
            )
          }
        } else if (result.error) {
          log.error('Error opening drawing:', result.error)
          this.showMessage(`Error loading file: ${result.error}`, 'error')
        }
        this.finishLoadingState()
      }
    })
    void this.setupLandingCloudSources()
  }

  private async setupLandingCloudSources() {
    const session = this.fileOpenSession
    if (!session) return

    const oneDriveEnv = getOneDriveEnvConfig()
    if (oneDriveEnv && !session.manager.get('onedrive')) {
      try {
        const { AcApOneDriveDataSource } = await import(
          '@mlightcad/cad-onedrive-plugin'
        )
        const source = new AcApOneDriveDataSource(oneDriveEnv, session.manager)
        session.registerSource(source)
        await source.restoreSession()
      } catch (error) {
        log.warn('Landing OneDrive data source unavailable:', error)
      }
    }

    const googleDriveEnv = getGoogleDriveEnvConfig()
    if (googleDriveEnv && !session.manager.get('googledrive')) {
      try {
        const { AcApGoogleDriveDataSource } = await import(
          '@mlightcad/cad-google-drive-plugin'
        )
        const source = new AcApGoogleDriveDataSource(
          googleDriveEnv,
          session.manager
        )
        session.registerSource(source)
        await source.restoreSession()
      } catch (error) {
        log.warn('Landing Google Drive data source unavailable:', error)
      }
    }
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
        void this.openViaSession({ kind: 'url', url })
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
    // Available from the light /file-open-panel entry — do not wait for the
    // full viewer runtime (landing page + resize / pointer handlers).
    return acedIsCompactUiLayout()
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
    this.openViaSession({ kind: 'new' })
  }

  private onFileOpened() {
    this.hasOpenedFile = true
    this.setViewerChromeVisible(true)
    this.updateEmptyStateVisibility()
    this.updateDevToolbarLabels()
  }

  private setLoadingState(loading: boolean) {
    this.isLoadingFile = loading
    // Keep chrome in sync when loading starts after a deferred init that hid it
    // (e.g. OneDrive sign-in without opening a file).
    this.setViewerChromeVisible(this.shouldShowViewerChrome())
    this.updateEmptyStateVisibility()
  }

  private finishLoadingState() {
    this.isLoadingFile = false
    this.setViewerChromeVisible(this.shouldShowViewerChrome())
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

  private showMessage(
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) {
    this.clearMessages()

    const popup = document.createElement('div')
    popup.className = `popup-message ${type}`
    popup.style.position = 'fixed'
    popup.style.top = '1rem'
    popup.style.left = '50%'
    popup.style.transform = 'translateX(-50%)'
    popup.style.zIndex = '1000'
    popup.style.display = 'flex'
    popup.style.alignItems = 'flex-start'
    popup.style.gap = '0.75rem'
    popup.style.maxWidth = 'min(36rem, calc(100vw - 2rem))'
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

    const text = document.createElement('span')
    if (viewerApi.mod) {
      viewer().acapAppendLinkedText(text, message)
    } else {
      text.textContent = message
    }
    text.style.flex = '1'
    text.style.lineHeight = '1.4'
    popup.appendChild(text)

    let removeTimer: ReturnType<typeof setTimeout> | undefined

    const dismiss = () => {
      clearTimeout(hideTimer)
      if (removeTimer != null) clearTimeout(removeTimer)
      popup.style.opacity = '0'
      removeTimer = setTimeout(() => {
        popup.remove()
      }, 200)
    }

    if (type === 'error') {
      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.setAttribute('aria-label', 'Close')
      closeBtn.textContent = '×'
      closeBtn.style.flexShrink = '0'
      closeBtn.style.width = '1.5rem'
      closeBtn.style.height = '1.5rem'
      closeBtn.style.margin = '-0.15rem -0.35rem 0 0'
      closeBtn.style.padding = '0'
      closeBtn.style.border = 'none'
      closeBtn.style.borderRadius = '4px'
      closeBtn.style.background = 'transparent'
      closeBtn.style.color = 'inherit'
      closeBtn.style.fontSize = '1.25rem'
      closeBtn.style.lineHeight = '1'
      closeBtn.style.cursor = 'pointer'
      closeBtn.style.opacity = '0.75'
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1'
        closeBtn.style.background = 'rgba(0,0,0,0.06)'
      })
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.75'
        closeBtn.style.background = 'transparent'
      })
      closeBtn.addEventListener('click', dismiss)
      popup.appendChild(closeBtn)
    }

    document.body.appendChild(popup)

    // Errors need more reading time (license / open failures can be long).
    const visibleMs = type === 'error' ? 8000 : 1200
    const hideTimer = setTimeout(dismiss, visibleMs)
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
