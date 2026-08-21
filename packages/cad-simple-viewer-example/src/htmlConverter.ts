import {
  type AcApHtmlExportOptions,
  AcApHtmlSnapshotBuilder,
  type AcExInitialViewMode,
  type AcExViewerMode,
  captureAcApHtmlViewState,
  packHtml,
  resolveAcApHtmlExportOptions
} from '@mlightcad/cad-html-plugin'
import {
  AcApDocManager,
  type AcApOpenDatabaseOptions,
  AcApOpenViewMode,
  AcEdOpenMode,
  AcTrView2d,
  getDrawingExportBaseName,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE,
  resolveExportDownloadName
} from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'

import { registerLibreDwgConverter } from './registerLibreDwg'

const SAMPLE_DRAWING_URL =
  'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/data/canteen.dwg'
const SAMPLE_DRAWING_NAME = 'canteen.dwg'
const VIEWER_RUNTIME_URL = './viewer-runtime.iife.js'
const CAD_DATA_BASE_URL = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/'

const OPEN_OPTIONS: AcApOpenDatabaseOptions = {
  minimumChunkSize: 1000,
  mode: AcEdOpenMode.Read,
  progressiveRendering: false
}

const MESSAGES = {
  invalidType: 'Please choose a .dwg or .dxf file.',
  ready: 'Selected {name}. Adjust options, then convert.',
  opening: 'Opening {name}…',
  converting: 'Converting {name} to HTML…',
  converted: 'Download started for {name}.html',
  openFailed: 'Failed to open {name}.',
  convertFailed: 'Conversion failed: {error}',
  runtimeMissing:
    'Failed to load viewer-runtime.iife.js. Rebuild the example package and refresh.'
} as const

function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

function isCadFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.dwg') || lower.endsWith('.dxf')
}

function drawingBaseName(name: string): string {
  return name.replace(/\.(dwg|dxf)$/i, '')
}

class HtmlConverterApp {
  private readonly container: HTMLDivElement
  private readonly hiddenViewer: HTMLElement
  private readonly converterCard: HTMLElement
  private readonly dropZone: HTMLLabelElement
  private readonly fileInput: HTMLInputElement
  private readonly fileNameEl: HTMLElement
  private readonly statusEl: HTMLElement
  private readonly progressOverlay: HTMLElement
  private readonly progressMessage: HTMLElement
  private readonly convertButton: HTMLButtonElement
  private readonly exportInvisibleLayers: HTMLInputElement
  private readonly exportLayouts: HTMLInputElement
  private initialized = false
  private busy = false
  private currentName = ''
  private pendingFile: File | undefined
  private pendingSample = false
  private runtimePromise: Promise<string> | undefined
  private downloadUrl = ''

  constructor() {
    this.container = document.getElementById('cad-container') as HTMLDivElement
    this.hiddenViewer = document.getElementById('hiddenViewer') as HTMLElement
    this.converterCard = document.getElementById('converterCard') as HTMLElement
    this.dropZone = document.getElementById('dropZone') as HTMLLabelElement
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement
    this.fileNameEl = document.getElementById('fileName') as HTMLElement
    this.statusEl = document.getElementById('status') as HTMLElement
    this.progressOverlay = document.getElementById(
      'progressOverlay'
    ) as HTMLElement
    this.progressMessage = document.getElementById(
      'progressMessage'
    ) as HTMLElement
    this.convertButton = document.getElementById(
      'convertButton'
    ) as HTMLButtonElement
    this.exportInvisibleLayers = document.getElementById(
      'exportInvisibleLayers'
    ) as HTMLInputElement
    this.exportLayouts = document.getElementById(
      'exportLayouts'
    ) as HTMLInputElement

    this.bindEvents()
  }

  private bindEvents() {
    document.getElementById('sampleButton')?.addEventListener('click', () => {
      this.selectSample()
    })
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0]
      this.fileInput.value = ''
      if (file) {
        this.selectFile(file)
      }
    })
    this.convertButton.addEventListener('click', () => {
      void this.convert()
    })

    this.dropZone.addEventListener('dragover', event => {
      event.preventDefault()
      this.dropZone.classList.add('drag')
    })
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag')
    })
    this.dropZone.addEventListener('drop', event => {
      event.preventDefault()
      this.dropZone.classList.remove('drag')
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        this.selectFile(file)
      }
    })

    document
      .querySelectorAll<HTMLInputElement>('.choice input[type="radio"]')
      .forEach(input => {
        input.addEventListener('change', () => this.syncChoiceSelection())
      })
    this.syncChoiceSelection()
  }

  private syncChoiceSelection() {
    document.querySelectorAll<HTMLLabelElement>('.choice').forEach(label => {
      const input = label.querySelector('input[type="radio"]')
      label.classList.toggle(
        'is-selected',
        Boolean(input && (input as HTMLInputElement).checked)
      )
    })
  }

  private setStatus(message: string, isError = false) {
    this.statusEl.textContent = message
    this.statusEl.classList.toggle('error', isError)
    this.progressMessage.textContent = message
  }

  private hasPendingSource(): boolean {
    return this.pendingSample || this.pendingFile != null
  }

  private setBusy(busy: boolean, message?: string) {
    this.busy = busy
    this.convertButton.disabled = busy || !this.hasPendingSource()
    document.getElementById('sampleButton')?.toggleAttribute('disabled', busy)
    this.fileInput.disabled = busy
    this.converterCard.classList.toggle('is-busy', busy)
    this.progressOverlay.hidden = !busy
    this.progressOverlay.setAttribute('aria-busy', busy ? 'true' : 'false')
    if (message) {
      this.setStatus(message)
    }
  }

  private clearDownloadUrl() {
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl)
      this.downloadUrl = ''
    }
  }

  private selectFile(file: File) {
    if (this.busy) {
      return
    }
    if (!isCadFileName(file.name)) {
      this.setStatus(MESSAGES.invalidType, true)
      return
    }

    this.pendingFile = file
    this.pendingSample = false
    this.markSelected(file.name)
  }

  private selectSample() {
    if (this.busy) {
      return
    }
    this.pendingFile = undefined
    this.pendingSample = true
    this.markSelected(SAMPLE_DRAWING_NAME)
  }

  private markSelected(name: string) {
    this.currentName = name
    this.fileNameEl.textContent = name
    this.convertButton.disabled = this.busy
    this.clearDownloadUrl()
    this.setStatus(format(MESSAGES.ready, { name }))
  }

  private async initialize() {
    if (this.initialized) {
      return
    }

    const dwgParserUrl = `./workers/${LIBREDWG_PARSER_WORKER_FILE}`
    registerLibreDwgConverter(dwgParserUrl)
    AcApDocManager.createInstance({
      container: this.container,
      busyIndicatorHost: this.hiddenViewer,
      autoResize: true,
      baseUrl: CAD_DATA_BASE_URL,
      builtinOpenFileDialog: false,
      useMainThreadDraw: false,
      openDocumentDefaults: OPEN_OPTIONS,
      webworkerFileUrls: {
        mtextRender: `./workers/${MTEXT_RENDERER_WORKER_FILE}`,
        dwgParser: dwgParserUrl
      }
    })
    this.runtimePromise = this.loadViewerRuntime()
    this.initialized = true
  }

  private viewerRuntimeUrl(): string {
    return new URL(VIEWER_RUNTIME_URL, window.location.href).href
  }

  private async loadViewerRuntime(): Promise<string> {
    const runtimeUrl = this.viewerRuntimeUrl()
    const response = await fetch(runtimeUrl)
    if (!response.ok) {
      throw new Error(
        `${MESSAGES.runtimeMissing} (${response.status} ${runtimeUrl})`
      )
    }
    return response.text()
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  private openOptions(): AcApOpenDatabaseOptions {
    const initialView = this.readExportOptions().initialView
    return {
      ...OPEN_OPTIONS,
      openViewMode:
        initialView === 'current'
          ? AcApOpenViewMode.Saved
          : AcApOpenViewMode.Extents
    }
  }

  private async openPendingDrawing(): Promise<boolean> {
    const openOptions = this.openOptions()
    if (this.pendingSample) {
      return AcApDocManager.instance.openUrl(SAMPLE_DRAWING_URL, openOptions)
    }
    if (!this.pendingFile) {
      return false
    }
    const content = await this.readFile(this.pendingFile)
    return AcApDocManager.instance.openDocument(
      this.pendingFile.name,
      content,
      openOptions
    )
  }

  private readExportOptions(): AcApHtmlExportOptions {
    const viewerMode = (
      document.querySelector(
        'input[name="viewerMode"]:checked'
      ) as HTMLInputElement | null
    )?.value as AcExViewerMode | undefined
    const initialView = (
      document.querySelector(
        'input[name="initialView"]:checked'
      ) as HTMLInputElement | null
    )?.value as AcExInitialViewMode | undefined
    return resolveAcApHtmlExportOptions({
      exportInvisibleLayers: this.exportInvisibleLayers.checked,
      exportLayouts: this.exportLayouts.checked,
      initialView: initialView ?? 'fit',
      viewerMode: viewerMode ?? 'measure'
    })
  }

  private triggerDownload(html: string, downloadName: string) {
    this.clearDownloadUrl()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    this.downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = this.downloadUrl
    link.download = downloadName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  private async buildHtml(fileName: string): Promise<string> {
    const view = AcApDocManager.instance.curView as AcTrView2d
    if (
      !view?.cadScene ||
      typeof view.ensureEntitiesConvertedForExport !== 'function'
    ) {
      throw new Error(
        'CAD scene is not available. Open a drawing before exporting to HTML.'
      )
    }

    const resolved = this.readExportOptions()
    await view.ensureEntitiesConvertedForExport({
      includeInvisibleLayers: resolved.exportInvisibleLayers,
      includeLayouts: resolved.exportLayouts
    })

    const document = AcApDocManager.instance.curDocument
    const snapshot = await new AcApHtmlSnapshotBuilder().buildAsync(
      view.cadScene,
      document.database,
      {
        title: getDrawingExportBaseName(fileName),
        background: view.backgroundColor,
        exportInvisibleLayers: resolved.exportInvisibleLayers,
        exportLayouts: resolved.exportLayouts,
        initialView: resolved.initialView,
        viewerMode: resolved.viewerMode,
        viewState:
          resolved.initialView === 'current' &&
          (resolved.exportLayouts ||
            view.activeLayoutBtrId === view.modelSpaceBtrId)
            ? captureAcApHtmlViewState(view)
            : undefined
      }
    )

    const viewerRuntime = await (this.runtimePromise ?? this.loadViewerRuntime())
    return packHtml(snapshot, {
      title: snapshot.meta.title,
      viewerRuntime
    })
  }

  private async convert() {
    if (this.busy || !this.hasPendingSource()) {
      return
    }

    const sourceName = this.currentName
    this.setBusy(true, format(MESSAGES.opening, { name: sourceName }))
    try {
      await this.initialize()
      const success = await this.openPendingDrawing()
      if (!success) {
        this.setStatus(format(MESSAGES.openFailed, { name: sourceName }), true)
        return
      }

      this.setStatus(format(MESSAGES.converting, { name: sourceName }))
      const html = await this.buildHtml(sourceName)
      const downloadName = resolveExportDownloadName(sourceName, 'html')
      this.triggerDownload(html, downloadName)
      this.setStatus(
        format(MESSAGES.converted, {
          name: drawingBaseName(sourceName)
        })
      )
    } catch (error) {
      log.error('HTML conversion failed:', error)
      this.setStatus(
        format(MESSAGES.convertFailed, {
          error: error instanceof Error ? error.message : String(error)
        }),
        true
      )
    } finally {
      this.setBusy(false)
    }
  }
}

new HtmlConverterApp()
