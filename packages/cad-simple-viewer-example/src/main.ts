import { registerSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin/register'
import {
  AcApDocManager,
  AcApOpenDatabaseOptions,
  AcEdOpenMode,
  applyUiTheme
} from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'

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
  private fileSidebar: HTMLElement
  private fileSidebarBody: HTMLElement
  private fileSidebarToggle: HTMLButtonElement
  private fileSidebarSubtitle: HTMLSpanElement
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

    this.setupFileHandling()
    this.setupPredefinedFileActions()
    this.setupMobileSidebar()
    this.updateEmptyStateVisibility()
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
        toolbar: {
          placement: 'right',
          items: 'default',
          collapsible: true
        }
      })

      AcApDocManager.instance.events.documentActivated.addEventListener(
        args => {
          document.title = args.doc.docTitle
        }
      )

      AcApDocManager.instance.events.documentToBeOpened.addEventListener(
        () => {
          this.setLoadingState(true)
        }
      )

      this.isInitialized = true
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
        this.hasOpenedFile = true
        this.updateEmptyStateVisibility()
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
    return window.matchMedia('(max-width: 960px)').matches
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
      Math.min(window.innerHeight * 0.5, 360, window.innerHeight - top - viewportInset)
    )

    this.fileSidebarBody.style.top = `${top}px`
    this.fileSidebarBody.style.maxHeight = `${maxHeight}px`
  }

  private updateFileSidebarSubtitle(label: string) {
    this.fileSidebarSubtitle.textContent = label || 'Tap to browse sample files'
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
        this.onFileOpened()
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
        this.onFileOpened()
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
    new CadViewerApp()
  })
} else {
  new CadViewerApp()
}
