import {
  ACAP_DEFAULT_COMPARE_COLORS,
  type AcApCompareDisplayColors,
  type AcApCompareDisplayOptions,
  AcApDocManager,
  type AcApDocument,
  AcApI18n,
  type AcApMarkupRecord,
  type AcApOpenDatabaseOptions,
  type AcApWebworkerFiles,
  AcEdOpenMode,
  type AcTrView2d,
  listMarkupsForSession
} from '@mlightcad/cad-simple-viewer'
import { AcGeBox2d } from '@mlightcad/data-model'

import {
  acapCompareDrawings,
  type AcApDiffChangeKind,
  type AcApDiffCompareResult,
  type AcApDiffEntityHit
} from './compare'
import { acapDiffViewerT, acapRegisterDiffViewerI18n } from './i18n'
import { acapCreateEmptyFileIcon, acapCreateOpenFileIcon } from './icons'
import { acapInjectDiffViewerStyles } from './injectDiffViewerStyles'

/** Which pane of the comparison widget a drawing occupies. */
export type AcApDiffViewerSide = 'left' | 'right'

/** How the two drawings are shown in the widget. */
export type AcApDiffViewMode = 'side-by-side' | 'overlay'

/** How compare hits are grouped in the results panel. */
export type AcApDiffResultGroupMode = 'kind' | 'type'

/** Optional host callbacks for {@link AcApDiffViewer}. */
export interface AcApDiffViewerEvents {
  /** Fired when a pane becomes the command target. */
  focus?: (side: AcApDiffViewerSide) => void
  /** Fired after a drawing is opened into a pane. */
  opened?: (side: AcApDiffViewerSide, doc: AcApDocument) => void
  /** Fired when opening a file into a pane fails. */
  failed?: (side: AcApDiffViewerSide, fileName: string) => void
  /** Fired after two drawings are compared. */
  compared?: (result: AcApDiffCompareResult) => void
}

/** Construction options for {@link AcApDiffViewer}. */
export interface AcApDiffViewerOptions {
  /** Host element that receives the widget DOM. */
  container: HTMLElement
  /** Base URL for fonts and templates, forwarded to {@link AcApDocManager}. */
  baseUrl?: string
  /** Worker script URLs forwarded to {@link AcApDocManager}. */
  webworkerFileUrls?: AcApWebworkerFiles
  /** Default options used when a pane opens a drawing. */
  openDocumentDefaults?: AcApOpenDatabaseOptions
  /** Compare display colors (left=old/deleted red, right=new/added green). */
  compareColors?: AcApCompareDisplayColors
  /** Initial view mode. Default side-by-side. */
  viewMode?: AcApDiffViewMode
  /** Whether the results side panel starts open. Default true. */
  sidePanelOpen?: boolean
  /** Optional lifecycle callbacks. */
  events?: AcApDiffViewerEvents
}

/** DOM nodes owned by one comparison pane. */
interface AcApDiffPaneUi {
  /** Outer pane section. */
  pane: HTMLElement
  /** Canvas host passed to {@link AcApDocManager}. */
  canvas: HTMLElement
  /** Header title showing the drawing name. */
  title: HTMLElement
  /** Empty-state overlay shown when no drawing is open. */
  empty: HTMLElement
  /** Empty-state heading. */
  emptyTitle: HTMLElement
  /** Empty-state hint text. */
  emptyHint: HTMLElement
  /** Empty-state error message. */
  emptyError: HTMLElement
  /** Transient banner shown when a drawing is already open. */
  banner: HTMLElement
  /** Button that opens the file picker. */
  openButton: HTMLButtonElement
  /** Hidden file input used by {@link AcApDiffViewer.pickFile}. */
  fileInput: HTMLInputElement
}

/** Default open options used when the host does not supply {@link AcApDiffViewerOptions.openDocumentDefaults}. */
const DEFAULT_OPEN: AcApOpenDatabaseOptions = {
  minimumChunkSize: 1000,
  mode: AcEdOpenMode.Write,
  progressiveRendering: false,
  sysVars: {
    lwdisplay: false
  }
}

/** File-name pattern accepted by pane drop / file-picker open. */
const DRAWING_EXT = /\.(dwg|dxf)$/i

/** Toolbar markup commands shown in the widget chrome. */
const MARKUP_TOOLS: Array<{
  /** Command string sent to {@link AcApDocManager.sendStringToExecute}. */
  command: string
  /** i18n key under the `diffViewer` namespace. */
  labelKey: Parameters<typeof acapDiffViewerT>[0]
}> = [
  { command: 'markupcloud', labelKey: 'markupCloud' },
  { command: 'markupcallout', labelKey: 'markupCallout' },
  { command: 'markuptext', labelKey: 'markupText' },
  { command: 'markuprect', labelKey: 'markupRect' },
  { command: 'markupcircle', labelKey: 'markupCircle' },
  { command: 'markuparrow', labelKey: 'markupArrow' },
  { command: 'markupstamp', labelKey: 'markupStamp' },
  { command: 'markupline', labelKey: 'markupLine' },
  { command: 'markuphighlight', labelKey: 'markupHighlight' }
]

/**
 * Returns the process-wide {@link AcApDocManager} created by this widget.
 *
 * @throws If the widget has not been constructed, or the manager was destroyed.
 */
function requireInstance(): AcApDocManager {
  try {
    return AcApDocManager.instance
  } catch {
    throw new Error('AcApDiffViewer is not initialized')
  }
}

/** Returns true when `fileName` has a `.dwg` or `.dxf` extension. */
function isDrawingFile(fileName: string): boolean {
  return DRAWING_EXT.test(fileName)
}

/**
 * Merges host compare colors onto {@link ACAP_DEFAULT_COMPARE_COLORS}.
 *
 * @param colors - Optional color overrides from {@link AcApDiffViewerOptions}.
 */
function mergeColors(
  colors?: AcApCompareDisplayColors
): Required<AcApCompareDisplayColors> {
  return {
    ...ACAP_DEFAULT_COMPARE_COLORS,
    ...colors
  }
}

/**
 * Side-by-side / overlay CAD comparison widget built on {@link AcApDocManager}.
 */
export class AcApDiffViewer {
  /** Construction options passed by the host. */
  private readonly options: AcApDiffViewerOptions
  /** Resolved compare-display colors after merging defaults. */
  private readonly colors: Required<AcApCompareDisplayColors>
  /** Root widget element appended to {@link AcApDiffViewerOptions.container}. */
  private readonly root: HTMLElement
  /** Top toolbar hosting view-mode, navigation, and markup buttons. */
  private readonly toolbar: HTMLElement
  /** Flex row that holds the panes and the side panel. */
  private readonly body: HTMLElement
  /** Host for the left and right panes. */
  private readonly panesHost: HTMLElement
  /** Compare-results / markups side panel. */
  private readonly sidePanel: HTMLElement
  /** Left (old) pane DOM. */
  private readonly leftUi: AcApDiffPaneUi
  /** Right (new) pane DOM. */
  private readonly rightUi: AcApDiffPaneUi
  /** Scrollable results-list container. */
  private readonly resultsBody: HTMLElement
  /** Scrollable markups-list container. */
  private readonly markupsBody: HTMLElement
  /** Toolbar button that switches to side-by-side mode. */
  private readonly btnSideBySide: HTMLButtonElement
  /** Toolbar button that switches to overlay mode. */
  private readonly btnOverlay: HTMLButtonElement
  /** Toolbar button that toggles the side panel. */
  private readonly btnTogglePanel: HTMLButtonElement
  /** Toolbar button that jumps to the previous difference. */
  private readonly btnPrev: HTMLButtonElement
  /** Toolbar button that jumps to the next difference. */
  private readonly btnNext: HTMLButtonElement
  /** Side-panel tab for compare results. */
  private readonly tabResults: HTMLButtonElement
  /** Side-panel tab for markups. */
  private readonly tabMarkups: HTMLButtonElement
  /** Group-by-change-kind toggle. */
  private readonly groupByKindBtn: HTMLButtonElement
  /** Group-by-entity-type toggle. */
  private readonly groupByTypeBtn: HTMLButtonElement
  /** Side-panel heading. */
  private readonly panelTitle: HTMLElement
  /** Markup tool buttons, kept so locale changes can refresh labels. */
  private readonly markupButtons: HTMLButtonElement[] = []

  /** Document currently shown in the left pane, if any. */
  private leftDoc?: AcApDocument
  /** Document currently shown in the right pane, if any. */
  private rightDoc?: AcApDocument
  /** Nested `dragenter`/`dragleave` depth for the left pane. */
  private leftDragDepth = 0
  /** Nested `dragenter`/`dragleave` depth for the right pane. */
  private rightDragDepth = 0
  /** Auto-hide timers for per-pane error banners. */
  private readonly bannerTimers = new Map<AcApDiffViewerSide, number>()
  /** Current view mode. */
  private viewMode: AcApDiffViewMode
  /** Whether the side panel is expanded. */
  private sidePanelOpen: boolean
  /** How the results list is grouped. */
  private resultGroupMode: AcApDiffResultGroupMode = 'kind'
  /** Active side-panel tab. */
  private activeTab: 'results' | 'markups' = 'results'
  /** Last compare output, if both panes have drawings. */
  private compareResult?: AcApDiffCompareResult
  /** Index into {@link AcApDiffCompareResult.navigation}, or `-1` when unset. */
  private navIndex = -1
  /** Overlay id of the right drawing when in overlay mode. */
  private overlayId?: string
  /** True after {@link destroy} has run. */
  private disposed = false

  /**
   * Creates the widget, injects styles, and constructs a dedicated
   * {@link AcApDocManager} bound to the left canvas (and a split view for the right).
   *
   * @param options - Host container, workers, colors, and optional callbacks.
   * @throws If an {@link AcApDocManager} already exists in this page.
   */
  constructor(options: AcApDiffViewerOptions) {
    this.options = options
    this.colors = mergeColors(options.compareColors)
    this.viewMode = options.viewMode ?? 'side-by-side'
    this.sidePanelOpen = options.sidePanelOpen !== false
    acapRegisterDiffViewerI18n()
    acapInjectDiffViewerStyles()

    let alreadyCreated = false
    try {
      AcApDocManager.instance
      alreadyCreated = true
    } catch {
      alreadyCreated = false
    }
    if (alreadyCreated) {
      throw new Error(
        'AcApDiffViewer needs its own AcApDocManager. Create it on a page that does not already host a CAD viewer.'
      )
    }

    this.root = document.createElement('div')
    this.root.className = 'ml-diff-root'
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'ml-diff-toolbar'
    this.body = document.createElement('div')
    this.body.className = 'ml-diff-body'
    this.panesHost = document.createElement('div')
    this.panesHost.className = 'ml-diff-panes'

    this.leftUi = this.createPane('left')
    this.rightUi = this.createPane('right')
    this.panesHost.append(this.leftUi.pane, this.rightUi.pane)

    const chrome = this.createChrome()
    this.btnSideBySide = chrome.btnSideBySide
    this.btnOverlay = chrome.btnOverlay
    this.btnTogglePanel = chrome.btnTogglePanel
    this.btnPrev = chrome.btnPrev
    this.btnNext = chrome.btnNext
    this.sidePanel = chrome.sidePanel
    this.resultsBody = chrome.resultsBody
    this.markupsBody = chrome.markupsBody
    this.tabResults = chrome.tabResults
    this.tabMarkups = chrome.tabMarkups
    this.groupByKindBtn = chrome.groupByKindBtn
    this.groupByTypeBtn = chrome.groupByTypeBtn
    this.panelTitle = chrome.panelTitle

    this.toolbar.append(...chrome.toolbarChildren)
    this.body.append(this.panesHost, this.sidePanel)
    this.root.append(this.toolbar, this.body)
    options.container.appendChild(this.root)

    const openDefaults = options.openDocumentDefaults ?? DEFAULT_OPEN
    AcApDocManager.createInstance({
      container: this.leftUi.canvas,
      busyIndicatorHost: this.leftUi.canvas,
      autoResize: true,
      baseUrl: options.baseUrl,
      builtinOpenFileDialog: false,
      openDocumentDefaults: openDefaults,
      webworkerFileUrls: options.webworkerFileUrls
    })
    AcApDocManager.instance.ensureSplitView(this.rightUi.canvas)
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)
    this.syncChrome()
    this.syncViewModeUi()
    this.syncPanelUi()
  }

  /** Drawing currently shown in the left pane, if still live. */
  get leftDocument(): AcApDocument | undefined {
    return this.liveDoc(this.leftDoc)
  }

  /** Drawing currently shown in the right pane, if still live. */
  get rightDocument(): AcApDocument | undefined {
    return this.liveDoc(this.rightDoc)
  }

  /** Pane that currently owns commands (the active {@link AcApDocManager} document). */
  get activeSide(): AcApDiffViewerSide {
    const mgr = requireInstance()
    return mgr.curDocument === this.rightDocument ? 'right' : 'left'
  }

  /** Last compare result, or `undefined` until both panes have drawings. */
  get compareResultSnapshot(): AcApDiffCompareResult | undefined {
    return this.compareResult
  }

  /**
   * Opens a drawing into one pane from in-memory file content.
   *
   * @param side - Target pane.
   * @param fileName - File name used for format detection and the pane title.
   * @param content - DWG/DXF bytes.
   * @param options - Optional open options; falls back to construction defaults.
   * @returns `true` when the document opened successfully.
   */
  async openDocument(
    side: AcApDiffViewerSide,
    fileName: string,
    content: ArrayBuffer,
    options?: AcApOpenDatabaseOptions
  ): Promise<boolean> {
    this.assertAlive()
    const mgr = requireInstance()
    const wasOverlay = this.viewMode === 'overlay'
    if (wasOverlay) {
      await this.exitOverlayMode()
    }
    const existing = side === 'left' ? this.leftDoc : this.rightDoc
    const otherDoc = side === 'left' ? this.rightDoc : this.leftDoc
    if (
      existing &&
      mgr.sessionFor(existing) &&
      !existing.isReusableUntitled &&
      existing !== otherDoc
    ) {
      await mgr.closeDocument(existing)
    }

    this.uiFor(side).empty.classList.add('is-hidden')
    this.clearPaneError(side)

    const success = await mgr.openDocument(
      fileName,
      content,
      options ?? this.options.openDocumentDefaults ?? DEFAULT_OPEN,
      this.viewFor(side)
    )
    if (!success) {
      this.options.events?.failed?.(side, fileName)
      this.syncChrome()
      if (wasOverlay) {
        await this.enterOverlayMode()
        this.syncViewModeUi()
      }
      return false
    }

    const doc = mgr.curDocument
    if (side === 'left') this.leftDoc = doc
    else this.rightDoc = doc
    this.syncChrome()
    this.options.events?.opened?.(side, doc)
    await this.runCompareAndApply()
    return true
  }

  /**
   * Makes `side` the command target without changing which canvas shows which drawing.
   *
   * @param side - Pane to activate.
   * @returns `false` when that pane has no live document.
   */
  async activateSide(side: AcApDiffViewerSide): Promise<boolean> {
    this.assertAlive()
    const doc = side === 'left' ? this.leftDocument : this.rightDocument
    if (!doc) return false
    const mgr = requireInstance()
    if (mgr.curDocument === doc) {
      this.syncChrome()
      return true
    }
    const ok = await mgr.activateDocument(doc)
    this.syncChrome()
    this.refreshMarkupsList()
    if (ok) this.options.events?.focus?.(side)
    return ok
  }

  /**
   * Switches between side-by-side canvases and a single overlay canvas.
   *
   * @param mode - Target view mode.
   */
  async setViewMode(mode: AcApDiffViewMode): Promise<void> {
    this.assertAlive()
    if (mode === this.viewMode) return
    if (mode === 'overlay') {
      await this.enterOverlayMode()
    } else {
      await this.exitOverlayMode()
    }
    this.viewMode = mode
    this.syncViewModeUi()
    await this.applyCompareDisplay()
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Expands or collapses the compare-results side panel.
   *
   * @param open - `true` to show the panel.
   */
  setSidePanelOpen(open: boolean): void {
    this.sidePanelOpen = open
    this.syncPanelUi()
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Moves the current difference highlight by `delta` entries in the navigation list.
   *
   * @param delta - Typically `-1` (previous) or `1` (next).
   */
  async goToDifference(delta: number): Promise<void> {
    const nav = this.compareResult?.navigation ?? []
    if (nav.length === 0) return
    if (this.navIndex < 0) this.navIndex = delta > 0 ? 0 : nav.length - 1
    else {
      this.navIndex = (this.navIndex + delta + nav.length * 50) % nav.length
    }
    await this.focusHit(nav[this.navIndex]!)
    this.renderResultsList()
  }

  /**
   * Tears down the widget, document manager, and injected DOM.
   * Safe to call more than once.
   */
  async destroy(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    for (const timer of this.bannerTimers.values()) {
      window.clearTimeout(timer)
    }
    this.bannerTimers.clear()
    try {
      if (this.overlayId) {
        requireInstance().removeOverlay(this.overlayId)
      }
      await AcApDocManager.instance.destroy()
    } catch {
      // Manager may already be gone.
    }
    this.root.remove()
  }

  /** Relocalizes chrome and lists when {@link AcApI18n} locale changes. */
  private handleLocaleChanged = () => {
    if (this.disposed) return
    this.syncChrome()
    this.syncViewModeUi()
    this.syncPanelUi()
    this.renderResultsList()
    this.refreshMarkupsList()
  }

  /**
   * Builds the toolbar, side panel, and their event bindings.
   *
   * @returns Chrome nodes assigned onto class fields by the constructor.
   */
  private createChrome() {
    const modeGroup = document.createElement('div')
    modeGroup.className = 'ml-diff-toolbar-group'
    const btnSideBySide = document.createElement('button')
    btnSideBySide.type = 'button'
    btnSideBySide.className = 'ml-diff-tool-btn'
    const btnOverlay = document.createElement('button')
    btnOverlay.type = 'button'
    btnOverlay.className = 'ml-diff-tool-btn'
    modeGroup.append(btnSideBySide, btnOverlay)

    const navGroup = document.createElement('div')
    navGroup.className = 'ml-diff-toolbar-group'
    const btnTogglePanel = document.createElement('button')
    btnTogglePanel.type = 'button'
    btnTogglePanel.className = 'ml-diff-tool-btn'
    const btnPrev = document.createElement('button')
    btnPrev.type = 'button'
    btnPrev.className = 'ml-diff-tool-btn'
    btnPrev.textContent = '◀'
    const btnNext = document.createElement('button')
    btnNext.type = 'button'
    btnNext.className = 'ml-diff-tool-btn'
    btnNext.textContent = '▶'
    navGroup.append(btnTogglePanel, btnPrev, btnNext)

    const markupGroup = document.createElement('div')
    markupGroup.className = 'ml-diff-toolbar-group'
    for (const tool of MARKUP_TOOLS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ml-diff-tool-btn'
      btn.dataset.command = tool.command
      btn.dataset.labelKey = tool.labelKey
      btn.addEventListener('click', () => {
        void this.runMarkupCommand(tool.command)
      })
      this.markupButtons.push(btn)
      markupGroup.appendChild(btn)
    }

    btnSideBySide.addEventListener('click', () => {
      void this.setViewMode('side-by-side')
    })
    btnOverlay.addEventListener('click', () => {
      void this.setViewMode('overlay')
    })
    btnTogglePanel.addEventListener('click', () => {
      this.setSidePanelOpen(!this.sidePanelOpen)
    })
    btnPrev.addEventListener('click', () => {
      void this.goToDifference(-1)
    })
    btnNext.addEventListener('click', () => {
      void this.goToDifference(1)
    })

    const sidePanel = document.createElement('aside')
    sidePanel.className = 'ml-diff-sidepanel'
    const header = document.createElement('div')
    header.className = 'ml-diff-sidepanel-header'
    const panelTitle = document.createElement('div')
    panelTitle.className = 'ml-diff-sidepanel-title'
    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'ml-diff-tool-btn'
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => this.setSidePanelOpen(false))
    header.append(panelTitle, closeBtn)

    const tabs = document.createElement('div')
    tabs.className = 'ml-diff-sidepanel-tabs'
    const tabResults = document.createElement('button')
    tabResults.type = 'button'
    tabResults.className = 'ml-diff-sidepanel-tab is-active'
    const tabMarkups = document.createElement('button')
    tabMarkups.type = 'button'
    tabMarkups.className = 'ml-diff-sidepanel-tab'
    tabs.append(tabResults, tabMarkups)
    tabResults.addEventListener('click', () => {
      this.activeTab = 'results'
      this.syncPanelUi()
    })
    tabMarkups.addEventListener('click', () => {
      this.activeTab = 'markups'
      this.syncPanelUi()
      this.refreshMarkupsList()
    })

    const groupBar = document.createElement('div')
    groupBar.className = 'ml-diff-sidepanel-toolbar'
    const groupByKindBtn = document.createElement('button')
    groupByKindBtn.type = 'button'
    groupByKindBtn.className = 'ml-diff-tool-btn is-active'
    const groupByTypeBtn = document.createElement('button')
    groupByTypeBtn.type = 'button'
    groupByTypeBtn.className = 'ml-diff-tool-btn'
    groupBar.append(groupByKindBtn, groupByTypeBtn)
    groupByKindBtn.addEventListener('click', () => {
      this.resultGroupMode = 'kind'
      this.renderResultsList()
      this.syncPanelUi()
    })
    groupByTypeBtn.addEventListener('click', () => {
      this.resultGroupMode = 'type'
      this.renderResultsList()
      this.syncPanelUi()
    })

    const resultsBody = document.createElement('div')
    resultsBody.className = 'ml-diff-sidepanel-body'
    const markupsBody = document.createElement('div')
    markupsBody.className = 'ml-diff-sidepanel-body'
    markupsBody.hidden = true

    sidePanel.append(header, tabs, groupBar, resultsBody, markupsBody)

    return {
      toolbarChildren: [modeGroup, navGroup, markupGroup],
      btnSideBySide,
      btnOverlay,
      btnTogglePanel,
      btnPrev,
      btnNext,
      sidePanel,
      resultsBody,
      markupsBody,
      tabResults,
      tabMarkups,
      groupByKindBtn,
      groupByTypeBtn,
      panelTitle,
      closeBtn
    }
  }

  /**
   * Builds one pane (header, canvas slot, empty state, drop target).
   *
   * @param side - Which pane to create.
   */
  private createPane(side: AcApDiffViewerSide): AcApDiffPaneUi {
    const pane = document.createElement('section')
    pane.className = 'ml-diff-pane'
    pane.dataset.side = side
    if (side === 'left') pane.classList.add('is-focused')

    const header = document.createElement('header')
    header.className = 'ml-diff-header'
    const title = document.createElement('span')
    title.className = 'ml-diff-title is-empty'
    const openButton = document.createElement('button')
    openButton.type = 'button'
    openButton.className = 'ml-diff-open'
    openButton.appendChild(acapCreateOpenFileIcon())
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.className = 'ml-diff-file-input'
    fileInput.accept = '.dwg,.dxf,application/acad,application/dxf'
    fileInput.tabIndex = -1
    header.append(title, openButton, fileInput)

    const slot = document.createElement('div')
    slot.className = 'ml-diff-canvas-slot'
    const canvas = document.createElement('div')
    canvas.className = 'ml-diff-canvas'
    const empty = document.createElement('div')
    empty.className = 'ml-diff-empty'
    const card = document.createElement('div')
    card.className = 'ml-diff-empty-card'
    const emptyTitle = document.createElement('div')
    emptyTitle.className = 'ml-diff-empty-title'
    const emptyHint = document.createElement('div')
    emptyHint.className = 'ml-diff-empty-hint'
    const emptyError = document.createElement('div')
    emptyError.className = 'ml-diff-empty-error is-hidden'
    card.append(acapCreateEmptyFileIcon(), emptyTitle, emptyHint, emptyError)
    empty.appendChild(card)
    const banner = document.createElement('div')
    banner.className = 'ml-diff-banner is-hidden'
    slot.append(canvas, empty, banner)
    pane.append(header, slot)

    pane.addEventListener('pointerdown', () => {
      void this.activateSide(side)
    })
    pane.addEventListener('click', event => {
      if (this.documentFor(side)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('.ml-diff-open')) return
      this.pickFile(side)
    })
    openButton.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      this.pickFile(side)
    })
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      fileInput.value = ''
      if (file) void this.openLocalFile(side, file)
    })
    pane.addEventListener('dragenter', event => {
      event.preventDefault()
      this.changeDragDepth(side, 1)
    })
    pane.addEventListener('dragover', event => {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    })
    pane.addEventListener('dragleave', event => {
      event.preventDefault()
      this.changeDragDepth(side, -1)
    })
    pane.addEventListener('drop', event => {
      event.preventDefault()
      this.resetDragDepth(side)
      const file = event.dataTransfer?.files?.[0]
      if (file) void this.openLocalFile(side, file)
    })

    return {
      pane,
      canvas,
      title,
      empty,
      emptyTitle,
      emptyHint,
      emptyError,
      banner,
      openButton,
      fileInput
    }
  }

  /** Opens the hidden file picker for `side`. */
  private pickFile(side: AcApDiffViewerSide) {
    this.uiFor(side).fileInput.click()
  }

  /**
   * Opens a local `File` into `side`, showing an error for non-drawing files.
   *
   * @param side - Target pane.
   * @param file - User-selected file.
   */
  private async openLocalFile(side: AcApDiffViewerSide, file: File) {
    if (!isDrawingFile(file.name)) {
      this.showPaneError(side, acapDiffViewerT('invalidFile'))
      return
    }
    await this.openDocument(side, file.name, await file.arrayBuffer())
  }

  /**
   * Runs a markup command against the active pane's document.
   *
   * @param command - Registered command name (e.g. `markupcloud`).
   */
  private async runMarkupCommand(command: string) {
    const mgr = requireInstance()
    const side = this.activeSide
    if (!this.documentFor(side)) return
    await this.activateSide(side)
    mgr.sendStringToExecute(command)
  }

  /** Compares both panes when they have drawings, then applies display coloring. */
  private async runCompareAndApply() {
    const left = this.leftDocument
    const right = this.rightDocument
    if (!left || !right) {
      this.compareResult = undefined
      this.navIndex = -1
      await this.clearCompareDisplay()
      this.renderResultsList()
      return
    }
    this.compareResult = acapCompareDrawings(left.database, right.database)
    this.navIndex = -1
    this.options.events?.compared?.(this.compareResult)
    if (this.viewMode === 'overlay') {
      await this.enterOverlayMode()
    }
    await this.applyCompareDisplay()
    this.renderResultsList()
    this.refreshMarkupsList()
  }

  /** Registers the right drawing as an overlay on the left canvas, hides the right pane, and focuses the left view. */
  private async enterOverlayMode() {
    const mgr = requireInstance()
    const right = this.rightDocument
    if (!right) {
      this.viewMode = 'overlay'
      this.syncViewModeUi()
      await this.activateSide('left')
      return
    }
    if (this.overlayId) {
      mgr.removeOverlay(this.overlayId)
      this.overlayId = undefined
    }
    // Re-convert right DB into left canvas as overlay (do not move scenes)
    this.overlayId = await mgr.registerOverlayDatabase(right.database, {
      targetView: mgr.mainView
    })
    this.rightUi.pane.style.display = 'none'
    this.root.classList.add('is-overlay')
    await this.activateSide('left')
  }

  /**
   * Removes the overlay and restores the right pane.
   * Does not change {@link viewMode}; callers that switch mode assign it themselves.
   */
  private async exitOverlayMode() {
    const mgr = requireInstance()
    if (this.overlayId) {
      mgr.removeOverlay(this.overlayId)
      this.overlayId = undefined
    }
    this.rightUi.pane.style.display = ''
    this.root.classList.remove('is-overlay')
  }

  /** Turns off compare coloring on both canvases and any overlay. */
  private async clearCompareDisplay() {
    const mgr = requireInstance()
    mgr.setCompareDisplay({ enabled: false }, mgr.mainView)
    if (mgr.splitView) {
      mgr.setCompareDisplay({ enabled: false }, mgr.splitView)
    }
    if (this.overlayId) {
      mgr.setOverlayCompareDisplay(
        this.overlayId,
        { enabled: false },
        mgr.mainView
      )
    }
  }

  /** Applies role-based compare colors for the current view mode. */
  private async applyCompareDisplay() {
    const result = this.compareResult
    const mgr = requireInstance()
    if (!result || !this.leftDocument || !this.rightDocument) {
      await this.clearCompareDisplay()
      return
    }

    const base: AcApCompareDisplayOptions = {
      enabled: true,
      baseColor: this.colors.unchanged,
      colors: {
        deleted: this.colors.deleted,
        added: this.colors.added,
        modified: this.colors.modified
      }
    }

    if (this.viewMode === 'overlay') {
      const leftOverrides = [
        ...result.deleted.map(h => ({
          objectId: h.objectId,
          role: 'deleted' as const
        })),
        ...result.modified
          .filter(h => h.side === 'left')
          .map(h => ({ objectId: h.objectId, role: 'deleted' as const }))
      ]
      const rightOverrides = [
        ...result.added.map(h => ({
          objectId: h.objectId,
          role: 'added' as const
        })),
        ...result.modified
          .filter(h => h.side === 'right')
          .map(h => ({ objectId: h.objectId, role: 'added' as const }))
      ]
      mgr.setCompareDisplay({ ...base, overrides: leftOverrides }, mgr.mainView)
      if (this.overlayId) {
        mgr.setOverlayCompareDisplay(
          this.overlayId,
          { ...base, overrides: rightOverrides },
          mgr.mainView
        )
      }
      return
    }

    const leftOverrides = [
      ...result.deleted.map(h => ({
        objectId: h.objectId,
        role: 'deleted' as const
      })),
      ...result.modified
        .filter(h => h.side === 'left')
        .map(h => ({
          objectId: h.objectId,
          role: 'modified' as const
        }))
    ]
    const rightOverrides = [
      ...result.added.map(h => ({
        objectId: h.objectId,
        role: 'added' as const
      })),
      ...result.modified
        .filter(h => h.side === 'right')
        .map(h => ({
          objectId: h.objectId,
          role: 'modified' as const
        }))
    ]
    mgr.setCompareDisplay({ ...base, overrides: leftOverrides }, mgr.mainView)
    if (mgr.splitView) {
      mgr.setCompareDisplay(
        { ...base, overrides: rightOverrides },
        mgr.splitView
      )
    }
  }

  /**
   * Zooms to a hit (and its pair, when modified) and highlights the entities.
   *
   * @param hit - Navigation entry from {@link AcApDiffCompareResult}.
   */
  private async focusHit(hit: AcApDiffEntityHit) {
    const mgr = requireInstance()
    const side: AcApDiffViewerSide =
      this.viewMode === 'overlay' ? 'left' : hit.side
    if (this.viewMode !== 'overlay') {
      await this.activateSide(hit.side)
    }
    const view = this.viewFor(side)
    if (hit.extents) {
      const box = new AcGeBox2d()
      box.expandByPoint({ x: hit.extents.minX, y: hit.extents.minY })
      box.expandByPoint({ x: hit.extents.maxX, y: hit.extents.maxY })
      if (hit.pairedId && hit.kind === 'modified' && this.compareResult) {
        const pair = this.compareResult.modified.find(
          h => h.objectId === hit.pairedId
        )
        if (pair?.extents) {
          box.expandByPoint({ x: pair.extents.minX, y: pair.extents.minY })
          box.expandByPoint({ x: pair.extents.maxX, y: pair.extents.maxY })
        }
      }
      view.zoomTo(box, 1.5)
    }
    const ids = [hit.objectId]
    if (hit.pairedId) ids.push(hit.pairedId)
    mgr.mainView.highlight(ids)
    mgr.splitView?.highlight(ids)
  }

  /** Rebuilds the results list from {@link compareResult}. */
  private renderResultsList() {
    const body = this.resultsBody
    body.replaceChildren()
    const result = this.compareResult
    if (!result || result.navigation.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'ml-diff-empty-list'
      empty.textContent = acapDiffViewerT('noResults')
      body.appendChild(empty)
      return
    }

    const groups = new Map<string, AcApDiffEntityHit[]>()
    const push = (key: string, hit: AcApDiffEntityHit) => {
      const list = groups.get(key)
      if (list) list.push(hit)
      else groups.set(key, [hit])
    }

    if (this.resultGroupMode === 'kind') {
      for (const hit of result.deleted) push('deleted', hit)
      for (const hit of result.modified.filter(h => h.side === 'left')) {
        push('modified', hit)
      }
      for (const hit of result.added) push('added', hit)
    } else {
      for (const hit of result.navigation) {
        push(hit.dxfType || 'UNKNOWN', hit)
      }
    }

    const kindLabel = (kind: AcApDiffChangeKind) => {
      if (kind === 'added') return acapDiffViewerT('kindAdded')
      if (kind === 'deleted') return acapDiffViewerT('kindDeleted')
      if (kind === 'modified') return acapDiffViewerT('kindModified')
      return kind
    }

    for (const [key, hits] of groups) {
      const group = document.createElement('div')
      group.className = 'ml-diff-group'
      const title = document.createElement('div')
      title.className = 'ml-diff-group-title'
      title.textContent =
        this.resultGroupMode === 'kind'
          ? `${kindLabel(key as AcApDiffChangeKind)} (${hits.length})`
          : `${key} (${hits.length})`
      group.appendChild(title)
      hits.forEach(hit => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'ml-diff-result-item'
        btn.dataset.kind = hit.kind
        const navIdx = result.navigation.indexOf(hit)
        if (navIdx === this.navIndex) btn.classList.add('is-active')
        btn.textContent = `${hit.dxfType} · ${hit.objectId}`
        const meta = document.createElement('span')
        meta.className = 'ml-diff-result-meta'
        meta.textContent = `${hit.layer} · ${kindLabel(hit.kind)}`
        btn.appendChild(meta)
        btn.addEventListener('click', () => {
          this.navIndex = navIdx >= 0 ? navIdx : this.navIndex
          void this.focusHit(hit)
          this.renderResultsList()
        })
        group.appendChild(btn)
      })
      body.appendChild(group)
    }
  }

  /** Rebuilds the markups list from both document sessions. */
  private refreshMarkupsList() {
    const body = this.markupsBody
    body.replaceChildren()
    const left = this.leftDocument
    const right = this.rightDocument
    const mgr = requireInstance()
    const entries: Array<{
      side: AcApDiffViewerSide
      record: AcApMarkupRecord
    }> = []
    if (left) {
      const session = mgr.sessionFor(left)
      if (session) {
        for (const record of listMarkupsForSession(session.id)) {
          entries.push({ side: 'left', record })
        }
      }
    }
    if (right) {
      const session = mgr.sessionFor(right)
      if (session) {
        for (const record of listMarkupsForSession(session.id)) {
          entries.push({ side: 'right', record })
        }
      }
    }
    if (entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'ml-diff-empty-list'
      empty.textContent = acapDiffViewerT('noMarkups')
      body.appendChild(empty)
      return
    }
    for (const entry of entries) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ml-diff-markup-item'
      btn.textContent = entry.record.type
      const meta = document.createElement('span')
      meta.className = 'ml-diff-markup-meta'
      meta.textContent =
        entry.side === 'left'
          ? acapDiffViewerT('markupFromLeft')
          : acapDiffViewerT('markupFromRight')
      btn.appendChild(meta)
      btn.addEventListener('click', () => {
        void this.activateSide(entry.side)
      })
      body.appendChild(btn)
    }
  }

  /**
   * Shows a pane error in the empty card or a transient banner.
   *
   * @param side - Pane that owns the message.
   * @param message - Localized error text.
   */
  private showPaneError(side: AcApDiffViewerSide, message: string) {
    const ui = this.uiFor(side)
    if (this.documentFor(side)) {
      ui.banner.textContent = message
      ui.banner.classList.remove('is-hidden')
      const previous = this.bannerTimers.get(side)
      if (previous) window.clearTimeout(previous)
      const timer = window.setTimeout(() => {
        ui.banner.classList.add('is-hidden')
        this.bannerTimers.delete(side)
      }, 3000)
      this.bannerTimers.set(side, timer)
      return
    }
    ui.emptyError.textContent = message
    ui.emptyError.classList.remove('is-hidden')
  }

  /** Hides empty-state and banner errors for `side`. */
  private clearPaneError(side: AcApDiffViewerSide) {
    const ui = this.uiFor(side)
    ui.emptyError.textContent = ''
    ui.emptyError.classList.add('is-hidden')
    ui.banner.textContent = ''
    ui.banner.classList.add('is-hidden')
    const timer = this.bannerTimers.get(side)
    if (timer) {
      window.clearTimeout(timer)
      this.bannerTimers.delete(side)
    }
  }

  /**
   * Updates nested drag-over depth so the pane highlight survives child enter/leave.
   *
   * @param side - Pane receiving the drag event.
   * @param delta - `+1` on enter, `-1` on leave.
   */
  private changeDragDepth(side: AcApDiffViewerSide, delta: number) {
    if (side === 'left') {
      this.leftDragDepth = Math.max(0, this.leftDragDepth + delta)
    } else {
      this.rightDragDepth = Math.max(0, this.rightDragDepth + delta)
    }
    this.uiFor(side).pane.classList.toggle(
      'is-dragover',
      (side === 'left' ? this.leftDragDepth : this.rightDragDepth) > 0
    )
  }

  /** Clears drag-over state after a drop or cancelled drag. */
  private resetDragDepth(side: AcApDiffViewerSide) {
    if (side === 'left') this.leftDragDepth = 0
    else this.rightDragDepth = 0
    this.uiFor(side).pane.classList.remove('is-dragover')
  }

  /** Returns the pane UI for `side`. */
  private uiFor(side: AcApDiffViewerSide): AcApDiffPaneUi {
    return side === 'left' ? this.leftUi : this.rightUi
  }

  /** Live document for `side`, or `undefined` when that pane is empty. */
  private documentFor(side: AcApDiffViewerSide): AcApDocument | undefined {
    return side === 'left' ? this.leftDocument : this.rightDocument
  }

  /**
   * Returns the canvas that should receive convert/highlight for `side`.
   *
   * Creates the split view on first use of the right pane.
   */
  private viewFor(side: AcApDiffViewerSide): AcTrView2d {
    const mgr = requireInstance()
    return side === 'left'
      ? mgr.mainView
      : mgr.ensureSplitView(this.rightUi.canvas)
  }

  /**
   * Returns `doc` only while it still has a live session.
   *
   * @param doc - Candidate document stored on this widget.
   */
  private liveDoc(doc: AcApDocument | undefined): AcApDocument | undefined {
    if (!doc) return undefined
    try {
      return requireInstance().sessionFor(doc) ? doc : undefined
    } catch {
      return undefined
    }
  }

  /** Display title for a pane header. */
  private paneTitle(doc: AcApDocument | undefined): string {
    if (!doc) return acapDiffViewerT('noDrawing')
    return doc.docTitle || doc.fileName || AcApI18n.t('main.document.untitled')
  }

  /** Syncs pane titles, empty states, and focus rings with live documents. */
  private syncChrome() {
    const left = this.leftDocument
    const right = this.rightDocument
    this.leftDoc = left
    this.rightDoc = right
    this.syncPaneChrome(this.leftUi, left)
    this.syncPaneChrome(this.rightUi, right)
    let active: AcApDocument | undefined
    try {
      active = requireInstance().curDocument
    } catch {
      active = undefined
    }
    this.leftUi.pane.classList.toggle('is-focused', active === left)
    this.rightUi.pane.classList.toggle('is-focused', active === right)
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Updates one pane's header and empty-state copy.
   *
   * @param ui - Pane DOM.
   * @param doc - Live document, if any.
   */
  private syncPaneChrome(ui: AcApDiffPaneUi, doc: AcApDocument | undefined) {
    ui.pane.classList.toggle('is-empty', !doc)
    ui.empty.classList.toggle('is-hidden', Boolean(doc))
    ui.title.textContent = this.paneTitle(doc)
    ui.title.classList.toggle('is-empty', !doc)
    ui.openButton.setAttribute('aria-label', acapDiffViewerT('openFile'))
    ui.openButton.title = acapDiffViewerT('openFile')
    ui.emptyTitle.textContent = acapDiffViewerT('emptyTitle')
    ui.emptyHint.textContent = acapDiffViewerT('emptyHint')
    if (!ui.emptyError.classList.contains('is-hidden')) {
      ui.emptyError.textContent = acapDiffViewerT('invalidFile')
    }
    if (!ui.banner.classList.contains('is-hidden')) {
      ui.banner.textContent = acapDiffViewerT('invalidFile')
    }
  }

  /** Updates view-mode button labels and active states. */
  private syncViewModeUi() {
    this.root.classList.toggle('is-overlay', this.viewMode === 'overlay')
    this.btnSideBySide.classList.toggle(
      'is-active',
      this.viewMode === 'side-by-side'
    )
    this.btnOverlay.classList.toggle('is-active', this.viewMode === 'overlay')
    this.btnSideBySide.textContent = acapDiffViewerT('toolbarSideBySide')
    this.btnOverlay.textContent = acapDiffViewerT('toolbarOverlay')
    this.btnTogglePanel.textContent = acapDiffViewerT('toolbarTogglePanel')
    this.btnPrev.title = acapDiffViewerT('toolbarPrev')
    this.btnNext.title = acapDiffViewerT('toolbarNext')
    for (const btn of this.markupButtons) {
      const key = btn.dataset.labelKey as Parameters<typeof acapDiffViewerT>[0]
      btn.textContent = acapDiffViewerT(key)
      btn.title = acapDiffViewerT(key)
    }
  }

  /** Updates side-panel visibility, tabs, and grouping toggles. */
  private syncPanelUi() {
    this.sidePanel.classList.toggle('is-collapsed', !this.sidePanelOpen)
    this.btnTogglePanel.classList.toggle('is-active', this.sidePanelOpen)
    this.panelTitle.textContent = acapDiffViewerT('panelTitle')
    this.tabResults.textContent = acapDiffViewerT('tabResults')
    this.tabMarkups.textContent = acapDiffViewerT('tabMarkups')
    this.groupByKindBtn.textContent = acapDiffViewerT('groupByKind')
    this.groupByTypeBtn.textContent = acapDiffViewerT('groupByType')
    this.tabResults.classList.toggle('is-active', this.activeTab === 'results')
    this.tabMarkups.classList.toggle('is-active', this.activeTab === 'markups')
    this.resultsBody.hidden = this.activeTab !== 'results'
    this.markupsBody.hidden = this.activeTab !== 'markups'
    this.groupByKindBtn.classList.toggle(
      'is-active',
      this.resultGroupMode === 'kind'
    )
    this.groupByTypeBtn.classList.toggle(
      'is-active',
      this.resultGroupMode === 'type'
    )
    // Hide group toolbar on markups tab
    const groupBar = this.groupByKindBtn.parentElement
    if (groupBar) groupBar.hidden = this.activeTab !== 'results'
  }

  /** Throws if {@link destroy} has already run. */
  private assertAlive() {
    if (this.disposed) {
      throw new Error('AcApDiffViewer has been destroyed')
    }
  }
}
