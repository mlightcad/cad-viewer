import {
  AcApDocManager,
  AcApOpenDatabaseOptions,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'

class CadViewerApp {
  private container: HTMLDivElement
  private fileInput: HTMLInputElement
  private centerOpenButton: HTMLButtonElement
  private toolbarOpenButton: HTMLButtonElement
  private toolbarZoomButton: HTMLButtonElement
  private toolbarZoomWindowButton: HTMLButtonElement
  private toolbarBgButton: HTMLButtonElement
  private emptyState: HTMLDivElement
  private predefinedButtons: NodeListOf<HTMLButtonElement>
  private isInitialized: boolean = false
  private hasOpenedFile: boolean = false
  private hasLoadedDocument: boolean = false

  constructor() {
    this.container = document.getElementById('cad-container') as HTMLDivElement
    this.fileInput = document.getElementById(
      'fileInputElement'
    ) as HTMLInputElement
    this.centerOpenButton = document.getElementById(
      'centerOpenButton'
    ) as HTMLButtonElement
    this.toolbarOpenButton = document.getElementById(
      'toolbarOpenButton'
    ) as HTMLButtonElement
    this.toolbarZoomButton = document.getElementById(
      'toolbarZoomButton'
    ) as HTMLButtonElement
    this.toolbarZoomWindowButton = document.getElementById(
      'toolbarZoomWindowButton'
    ) as HTMLButtonElement
    this.toolbarBgButton = document.getElementById(
      'toolbarBgButton'
    ) as HTMLButtonElement
    this.emptyState = document.getElementById('emptyState') as HTMLDivElement
    this.predefinedButtons = document.querySelectorAll(
      '#predefinedFileList .file-list-item'
    ) as NodeListOf<HTMLButtonElement>

    this.setupFileHandling()
    this.setupToolbarActions()
    this.setupPredefinedFileActions()
    this.updateEmptyStateVisibility()
    this.updateToolbarButtonsState()
  }

  private initialize() {
    if (!this.isInitialized) {
      try {
        AcApDocManager.createInstance({
          container: this.container,
          autoResize: true,
          baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
          webworkerFileUrls: {
            mtextRender: './workers/mtext-renderer-worker.js',
            dxfParser: './workers/dxf-parser-worker.js',
            dwgParser: './workers/libredwg-parser-worker.js'
          }
        })

        AcApDocManager.instance.events.documentActivated.addEventListener(
          args => {
            document.title = args.doc.docTitle
          }
        )

        this.isInitialized = true
      } catch (error) {
        console.error('Failed to initialize CAD viewer:', error)
        this.showMessage('Failed to initialize CAD viewer', 'error')
      }
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

    this.toolbarOpenButton.addEventListener('click', () => {
      this.fileInput.click()
    })
  }

  private setupToolbarActions() {
    this.toolbarZoomButton.addEventListener('click', () => {
      if (!this.hasLoadedDocument || !this.isInitialized) {
        return
      }
      AcApDocManager.instance.sendStringToExecute('zoom')
    })

    this.toolbarZoomWindowButton.addEventListener('click', () => {
      if (!this.hasLoadedDocument || !this.isInitialized) {
        return
      }
      AcApDocManager.instance.sendStringToExecute('zoomw')
    })

    this.toolbarBgButton.addEventListener('click', () => {
      if (!this.hasLoadedDocument || !this.isInitialized) {
        return
      }
      AcApDocManager.instance.sendStringToExecute('switchbg')
    })
  }

  private setupPredefinedFileActions() {
    this.predefinedButtons.forEach(button => {
      button.addEventListener('click', () => {
        const url = button.dataset.fileUrl
        if (!url) {
          return
        }
        // Hide empty-state open button as soon as a predefined file is selected.
        this.hasOpenedFile = true
        this.updateEmptyStateVisibility()
        this.predefinedButtons.forEach(item => item.classList.remove('active'))
        button.classList.add('active')
        void this.loadPredefinedFile(url)
      })
    })
  }

  private async loadLocalFile(file: File) {
    this.initialize()

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.dxf') && !fileName.endsWith('.dwg')) {
      this.showMessage('Please select a DXF or DWG file', 'error')
      return
    }

    this.clearMessages()

    try {
      const fileContent = await this.readFile(file)
      const options: AcDbOpenDatabaseOptions = {
        minimumChunkSize: 1000,
        readOnly: true
      }

      const success = await AcApDocManager.instance.openDocument(
        file.name,
        fileContent,
        options
      )

      if (success) {
        this.onFileOpened()
        this.predefinedButtons.forEach(item => item.classList.remove('active'))
        this.showMessage(`Successfully loaded: ${file.name}`, 'success')
      } else {
        this.showMessage(`Failed to load: ${file.name}`, 'error')
      }
    } catch (error) {
      console.error('Error loading file:', error)
      this.showMessage(`Error loading file: ${error}`, 'error')
    }
  }

  private async loadPredefinedFile(url: string) {
    this.initialize()
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
      console.error('Error loading predefined file:', error)
      this.showMessage(`Error loading file: ${error}`, 'error')
    }
  }

  private onFileOpened() {
    this.hasOpenedFile = true
    this.hasLoadedDocument = true
    this.updateEmptyStateVisibility()
    this.updateToolbarButtonsState()
  }

  private updateEmptyStateVisibility() {
    this.emptyState.classList.toggle('hidden', this.hasOpenedFile)
  }

  private updateToolbarButtonsState() {
    this.toolbarZoomButton.disabled = !this.hasLoadedDocument
    this.toolbarZoomWindowButton.disabled = !this.hasLoadedDocument
    this.toolbarBgButton.disabled = !this.hasLoadedDocument
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
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup)
        }
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
