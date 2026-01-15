import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbOpenDatabaseOptions } from '@mlightcad/data-model'

class CadViewerApp {
  private container: HTMLDivElement
  private fileInput: HTMLInputElement
  private isInitialized: boolean = false

  constructor() {
    // Get DOM elements
    this.container = document.getElementById('cad-container') as HTMLDivElement
    this.fileInput = document.getElementById(
      'fileInputElement'
    ) as HTMLInputElement
    this.setupFileHandling()
  }

  private initialize() {
    if (!this.isInitialized) {
      try {
        // In most of cases, you can initialize the document manager with default.
        // settings. Here some settings are overriden for demostration only.
        // - 'baseUrl': default value works too. You can override it if you host fonts
        //              data in your own hosts.
        // - 'webworkerFileUrls': In `vite.config.ts`, JavaScript worker bundle files
        //              are copied to folder 'workers' on purpose so that we can demostrate
        //              how to config it when initializing AcApDocManager.
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
        this.isInitialized = true
      } catch (error) {
        console.error('Failed to initialize CAD viewer:', error)
        this.showMessage('Failed to initialize CAD viewer', 'error')
      }
    }
  }

  private setupFileHandling() {
    // File input change event
    this.fileInput.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        this.loadFile(file)
      }
      this.fileInput.value = ''
    })
  }

  private async loadFile(file: File) {
    this.initialize()

    // Validate file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.dxf') && !fileName.endsWith('.dwg')) {
      this.showMessage('Please select a DXF or DWG file', 'error')
      return
    }

    this.clearMessages()

    try {
      // Read the file content
      const fileContent = await this.readFile(file)

      // Add loaded class to move file input container to top-left
      const fileInputContainer = document.getElementById('fileInputContainer')
      if (fileInputContainer) {
        fileInputContainer.classList.add('loaded')
      }

      // Set database options
      const options: AcDbOpenDatabaseOptions = {
        minimumChunkSize: 1000,
        readOnly: true
      }

      // Open the document
      const success = await AcApDocManager.instance.openDocument(
        file.name,
        fileContent,
        options
      )

      if (success) {
        this.showMessage(`Successfully loaded: ${file.name}`, 'success')
      } else {
        this.showMessage(`Failed to load: ${file.name}`, 'error')
      }
    } catch (error) {
      console.error('Error loading file:', error)
      this.showMessage(`Error loading file: ${error}`, 'error')
    }
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
    // Remove old persistent messages
    this.clearMessages()

    // Create popup message element
    const popup = document.createElement('div')
    popup.className = `popup-message ${type}`
    popup.textContent = message
    popup.style.position = 'fixed'
    popup.style.top = '2rem'
    popup.style.left = '50%'
    popup.style.transform = 'translateX(-50%)'
    popup.style.zIndex = '1000'
    popup.style.padding = '1rem 2rem'
    popup.style.borderRadius = '8px'
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    popup.style.fontSize = '1.1rem'
    popup.style.opacity = '0.98'
    popup.style.transition = 'opacity 0.2s'
    if (type === 'error') {
      popup.style.background = '#ffe6e6'
      popup.style.color = '#dc3545'
      popup.style.border = '1px solid #ffcccc'
    } else if (type === 'success') {
      popup.style.background = '#e6ffe6'
      popup.style.color = '#28a745'
      popup.style.border = '1px solid #ccffcc'
    } else {
      popup.style.background = '#f0f0f0'
      popup.style.color = '#333'
      popup.style.border = '1px solid #ccc'
    }

    document.body.appendChild(popup)

    setTimeout(() => {
      popup.style.opacity = '0'
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup)
        }
      }, 200)
    }, 1000)
  }

  private clearMessages() {
    // Remove all popup messages
    document.querySelectorAll('.popup-message').forEach(el => el.remove())
  }
}

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CadViewerApp()
  })
} else {
  new CadViewerApp()
}
