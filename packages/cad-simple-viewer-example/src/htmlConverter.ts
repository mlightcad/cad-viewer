import {
  type AcApHtmlExpiryDays,
  AcApHtmlSnapshotBuilder,
  type AcExInitialViewMode,
  type AcExViewerMode,
  captureAcApHtmlViewState,
  encodeSnapshot,
  packHtml,
  protectAcExHtmlEncodedSnapshot,
  resolveAcApHtmlExpiresAt,
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
  expiryCustomRequired: 'Please select a custom expiry date and time.',
  expiryCustomPast: 'The custom expiry must be in the future.',
  copyPasswordSuccess: 'Password copied to the clipboard.',
  copyPasswordFailed: 'Unable to copy the password to the clipboard.',
  runtimeMissing:
    'Failed to load viewer-runtime.iife.js. Rebuild the example package and refresh.'
} as const

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const EXPIRY_DAY_VALUES = new Set<string>(['1', '7', '30', 'never', 'custom'])

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
  private readonly customExpiresAt: HTMLInputElement
  private readonly exportPassword: HTMLInputElement
  private readonly copyPasswordButton: HTMLButtonElement
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
    this.customExpiresAt = document.getElementById(
      'customExpiresAt'
    ) as HTMLInputElement
    this.exportPassword = document.getElementById(
      'exportPassword'
    ) as HTMLInputElement
    this.copyPasswordButton = document.getElementById(
      'copyPassword'
    ) as HTMLButtonElement

    this.bindEvents()
    this.initSecurityDefaults()
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

    document.querySelectorAll<HTMLButtonElement>('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activateTab(tab.dataset.tab === 'security' ? 'security' : 'export')
      })
    })

    document
      .querySelectorAll<HTMLInputElement>('input[name="expiryDays"]')
      .forEach(input => {
        input.addEventListener('change', () => this.syncExpirySelection())
      })
    this.syncExpirySelection()

    document.getElementById('generatePassword')?.addEventListener('click', () => {
      this.generatePassword()
    })
    this.copyPasswordButton.addEventListener('click', () => {
      void this.copyPassword()
    })
    this.exportPassword.addEventListener('input', () => {
      this.syncCopyPasswordButton()
    })
    this.syncCopyPasswordButton()

    document.getElementById('togglePassword')?.addEventListener('click', () => {
      this.togglePasswordVisibility()
    })
  }

  private activateTab(tab: 'export' | 'security') {
    document.querySelectorAll<HTMLButtonElement>('.tab').forEach(button => {
      const isActive = button.dataset.tab === tab
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-selected', isActive ? 'true' : 'false')
      button.tabIndex = isActive ? 0 : -1
    })
    const exportPanel = document.getElementById('panelExport')
    const securityPanel = document.getElementById('panelSecurity')
    if (exportPanel) {
      exportPanel.hidden = tab !== 'export'
    }
    if (securityPanel) {
      securityPanel.hidden = tab !== 'security'
    }
  }

  private initSecurityDefaults() {
    this.customExpiresAt.value = this.toDateTimeLocalValue(
      this.defaultCustomExpiresAt()
    )
    this.customExpiresAt.min = this.toDateTimeLocalValue(new Date())
  }

  private defaultCustomExpiresAt(): Date {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setSeconds(0, 0)
    return date
  }

  private toDateTimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

  private syncExpirySelection() {
    document
      .querySelectorAll<HTMLLabelElement>('.expiry-option')
      .forEach(label => {
        const input = label.querySelector('input[type="radio"]')
        label.classList.toggle(
          'is-selected',
          Boolean(input && (input as HTMLInputElement).checked)
        )
      })
    const selected = (
      document.querySelector(
        'input[name="expiryDays"]:checked'
      ) as HTMLInputElement | null
    )?.value
    this.customExpiresAt.classList.toggle(
      'is-visible',
      selected === 'custom'
    )
  }

  private syncCopyPasswordButton() {
    this.copyPasswordButton.disabled = this.exportPassword.value.trim().length === 0
  }

  private togglePasswordVisibility() {
    const toggle = document.getElementById(
      'togglePassword'
    ) as HTMLButtonElement | null
    const show = this.exportPassword.type === 'password'
    this.exportPassword.type = show ? 'text' : 'password'
    if (!toggle) {
      return
    }
    toggle.classList.toggle('is-visible', show)
    toggle.setAttribute('aria-pressed', show ? 'true' : 'false')
    toggle.setAttribute(
      'aria-label',
      show ? 'Hide password' : 'Show password'
    )
    toggle.title = show ? 'Hide password' : 'Show password'
  }

  private generatePassword() {
    const bytes = new Uint8Array(12)
    crypto.getRandomValues(bytes)
    this.exportPassword.value = Array.from(
      bytes,
      byte => PASSWORD_CHARS[byte % PASSWORD_CHARS.length]!
    ).join('')
    this.syncCopyPasswordButton()
  }

  private async copyPassword() {
    const password = this.exportPassword.value.trim()
    if (!password) {
      return
    }
    try {
      await navigator.clipboard.writeText(password)
      this.setStatus(MESSAGES.copyPasswordSuccess)
    } catch {
      this.setStatus(MESSAGES.copyPasswordFailed, true)
    }
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

  private readExpiryDays(): AcApHtmlExpiryDays {
    const raw = (
      document.querySelector(
        'input[name="expiryDays"]:checked'
      ) as HTMLInputElement | null
    )?.value
    if (!raw || !EXPIRY_DAY_VALUES.has(raw)) {
      return 'never'
    }
    if (raw === '1' || raw === '7' || raw === '30') {
      return Number(raw) as 1 | 7 | 30
    }
    return raw as 'never' | 'custom'
  }

  private readCustomExpiresAt(): number | null {
    const value = this.customExpiresAt.value
    if (!value) {
      return null
    }
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }

  private validateSecurityOptions(
    options: ReturnType<typeof resolveAcApHtmlExportOptions>
  ): string | null {
    if (options.expiryDays !== 'custom') {
      return null
    }
    if (options.expiresAt == null) {
      return MESSAGES.expiryCustomRequired
    }
    if (options.expiresAt <= Date.now()) {
      return MESSAGES.expiryCustomPast
    }
    return null
  }

  private readExportOptions(): ReturnType<typeof resolveAcApHtmlExportOptions> {
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
    const expiryDays = this.readExpiryDays()
    return resolveAcApHtmlExportOptions({
      exportInvisibleLayers: this.exportInvisibleLayers.checked,
      exportLayouts: this.exportLayouts.checked,
      initialView: initialView ?? 'fit',
      viewerMode: viewerMode ?? 'measure',
      expiryDays,
      expiresAt: expiryDays === 'custom' ? this.readCustomExpiresAt() : null,
      password: this.exportPassword.value.trim() || undefined
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

    const expiresAt = resolveAcApHtmlExpiresAt(
      resolved.expiryDays,
      Date.now(),
      resolved.expiresAt
    )
    const protectedSnapshot = await protectAcExHtmlEncodedSnapshot(
      encodeSnapshot(snapshot),
      {
        expiresAt,
        password: resolved.password || undefined
      }
    )

    const viewerRuntime = await (this.runtimePromise ?? this.loadViewerRuntime())
    return packHtml(snapshot, {
      title: snapshot.meta.title,
      viewerRuntime,
      encoded: protectedSnapshot.encoded,
      accessManifest: protectedSnapshot.manifest
    })
  }

  private async convert() {
    if (this.busy || !this.hasPendingSource()) {
      return
    }

    const securityError = this.validateSecurityOptions(this.readExportOptions())
    if (securityError) {
      this.setStatus(securityError, true)
      this.activateTab('security')
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
