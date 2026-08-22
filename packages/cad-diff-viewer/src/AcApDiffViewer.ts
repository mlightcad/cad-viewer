import {
  ACAP_DEFAULT_COMPARE_COLORS,
  type AcApCompareDisplayColors,
  type AcApCompareDisplayOptions,
  AcApDocManager,
  type AcApDocument,
  AcApI18n,
  type AcApLocale,
  type AcApMarkupRecord,
  type AcApOpenDatabaseOptions,
  type AcApWebworkerFiles,
  acedApplyUiTheme,
  AcEdOpenMode,
  type AcEdUiTheme,
  type AcTrView2d,
  listMarkupsForSession
} from '@mlightcad/cad-simple-viewer'
import {
  ICON_MARKUP_ARROW,
  ICON_MARKUP_CALLOUT,
  ICON_MARKUP_CIRCLE,
  ICON_MARKUP_CLOUD,
  ICON_MARKUP_HIGHLIGHT,
  ICON_MARKUP_LINE,
  ICON_MARKUP_RECT,
  ICON_MARKUP_STAMP,
  ICON_MARKUP_TEXT
} from '@mlightcad/cad-simple-viewer/icons'
import { AcGeBox2d } from '@mlightcad/data-model'

import {
  acapDiffColorToCssHex,
  AcApDiffSettingsDialog
} from './AcApDiffSettingsDialog'
import {
  acapCompareDrawings,
  type AcApDiffChangeKind,
  type AcApDiffCompareResult,
  type AcApDiffEntityHit
} from './compare'
import { acapDiffViewerT, acapRegisterDiffViewerI18n } from './i18n'
import {
  acapCreateEmptyFileIcon,
  acapCreateOpenFileIcon,
  ICON_OVERLAY,
  ICON_RESULTS_PANEL,
  ICON_SETTINGS,
  ICON_SIDE_BY_SIDE,
  ICON_SYNC_VIEWS,
  ICON_THEME_MOON,
  ICON_THEME_SUNNY
} from './icons'
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
  /** Initial UI chrome theme. Default dark. */
  theme?: AcEdUiTheme
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
  /** Inline SVG from `@mlightcad/cad-simple-viewer/icons`. */
  icon: string
}> = [
  { command: 'markupcloud', labelKey: 'markupCloud', icon: ICON_MARKUP_CLOUD },
  { command: 'markupcallout', labelKey: 'markupCallout', icon: ICON_MARKUP_CALLOUT },
  { command: 'markuptext', labelKey: 'markupText', icon: ICON_MARKUP_TEXT },
  { command: 'markuprect', labelKey: 'markupRect', icon: ICON_MARKUP_RECT },
  { command: 'markupcircle', labelKey: 'markupCircle', icon: ICON_MARKUP_CIRCLE },
  { command: 'markuparrow', labelKey: 'markupArrow', icon: ICON_MARKUP_ARROW },
  { command: 'markupstamp', labelKey: 'markupStamp', icon: ICON_MARKUP_STAMP },
  { command: 'markupline', labelKey: 'markupLine', icon: ICON_MARKUP_LINE },
  { command: 'markuphighlight', labelKey: 'markupHighlight', icon: ICON_MARKUP_HIGHLIGHT }
]

/** Language options shown in the toolbar select (same labels as cad-viewer ribbon). */
const LOCALE_OPTIONS: Array<{ locale: AcApLocale; label: string }> = [
  { locale: 'en', label: 'English' },
  { locale: 'zh', label: '简体中文' },
  { locale: 'tr', label: 'Türkçe' },
  { locale: 'cs', label: 'Čeština' },
  { locale: 'ar', label: 'العربية' }
]

/** Caret used by the language select trigger (Element Plus-style). */
const LOCALE_CHEVRON =
  '<svg class="ml-diff-lang-select__caret" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.4 4.2 6 8.1l3.6-3.9"/></svg>'

/** Visible label for a locale code. */
function localeOptionLabel(locale: AcApLocale): string {
  return (
    LOCALE_OPTIONS.find(option => option.locale === locale)?.label ?? 'English'
  )
}

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
  private colors: Required<AcApCompareDisplayColors>
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
  /** Toolbar toggle that locks pan/zoom of the two side-by-side canvases. */
  private readonly btnSyncViews: HTMLButtonElement
  /** Toolbar button that toggles the side panel. */
  private readonly btnTogglePanel: HTMLButtonElement
  /** Toolbar button that jumps to the previous difference. */
  private readonly btnPrev: HTMLButtonElement
  /** Toolbar button that jumps to the next difference. */
  private readonly btnNext: HTMLButtonElement
  /** Toolbar button that opens the compare-color settings dialog. */
  private readonly btnSettings: HTMLButtonElement
  /** Toolbar button that toggles light / dark UI chrome. */
  private readonly btnTheme: HTMLButtonElement
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
  /** Language select trigger (cad-viewer ribbon-style dropdown). */
  private readonly localeTrigger: HTMLButtonElement
  /** Language select dropdown menu. */
  private readonly localeMenu: HTMLElement
  /** Host wrapping the language trigger and menu (for outside-click). */
  private readonly localeSelectHost: HTMLElement

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
  /** Current UI chrome theme. */
  private uiTheme: AcEdUiTheme
  /** Current view mode. */
  private viewMode: AcApDiffViewMode
  /** Whether the side panel is expanded. */
  private sidePanelOpen: boolean
  /** How the results list is grouped. */
  private resultGroupMode: AcApDiffResultGroupMode = 'kind'
  /**
   * Collapsed result-list sections, keyed by
   * `${resultGroupMode}:${groupKey}`. Missing keys are expanded.
   */
  private readonly collapsedResultGroups = new Set<string>()
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
  /** Whether the language dropdown is open. */
  private localeMenuOpen = false
  /** Monotonic id so overlapping {@link activateSide} calls keep the latest pane. */
  private activateSeq = 0
  /** Serializes {@link activateSide} so hover switches do not overlap. */
  private activateTail: Promise<unknown> = Promise.resolve()
  /**
   * Last pane the pointer entered. Toolbar markup commands target this side
   * even after the pointer leaves for the toolbar.
   */
  private lastPointerSide: AcApDiffViewerSide = 'left'
  /** Last markup tool started from the toolbar; restarted when hover switches panes. */
  private lastMarkupCommand?: string
  /** When true, pan/zoom on one side-by-side canvas is copied to the other. */
  private viewsSynced = false
  /** Re-entrancy guard so a copied camera does not echo back. */
  private viewSyncLock = false
  /** Side whose camera is copied onto the other pane while sync is on. */
  private viewSyncLeader: AcApDiffViewerSide = 'left'
  /**
   * After opening into the follower pane, ignore its auto-fit until the
   * user pans or zooms so the already-open drawing keeps its camera.
   */
  private viewSyncFollowOpen = false
  /** True when the latest pan/zoom came from pointer or wheel on a pane. */
  private viewSyncFromUser = false

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
    this.uiTheme = options.theme ?? 'dark'
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
    acedApplyUiTheme(this.uiTheme, this.root)
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
    this.btnSyncViews = chrome.btnSyncViews
    this.btnTogglePanel = chrome.btnTogglePanel
    this.btnPrev = chrome.btnPrev
    this.btnNext = chrome.btnNext
    this.btnSettings = chrome.btnSettings
    this.btnTheme = chrome.btnTheme
    this.sidePanel = chrome.sidePanel
    this.resultsBody = chrome.resultsBody
    this.markupsBody = chrome.markupsBody
    this.tabResults = chrome.tabResults
    this.tabMarkups = chrome.tabMarkups
    this.groupByKindBtn = chrome.groupByKindBtn
    this.groupByTypeBtn = chrome.groupByTypeBtn
    this.panelTitle = chrome.panelTitle
    this.localeTrigger = chrome.localeTrigger
    this.localeMenu = chrome.localeMenu
    this.localeSelectHost = chrome.localeSelectHost

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
    const mgr = AcApDocManager.instance
    this.disableEntitySelection(mgr.mainView)
    this.disableEntitySelection(mgr.ensureSplitView(this.rightUi.canvas))
    this.bindViewSyncListeners()
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)
    document.addEventListener('pointerdown', this.handleDocumentPointerDown)
    this.syncChrome()
    this.syncViewModeUi()
    this.syncPanelUi()
    this.syncCompareColorVars()
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
    this.syncFollowerAfterOpen(side)
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
    // Same-document checks must be synchronous. Queuing would bump
    // {@link activateSeq} and can cancel an in-flight markup via
    // {@link AcApDocManager.activateDocument}.
    if (mgr.curDocument === doc) {
      this.applyFocusClass(side)
      return true
    }
    const seq = ++this.activateSeq
    const run = async (): Promise<boolean> => {
      if (this.disposed || seq !== this.activateSeq) return false
      const live = side === 'left' ? this.leftDocument : this.rightDocument
      if (!live) return false
      const instance = requireInstance()
      if (instance.curDocument === live) {
        this.applyFocusClass(side)
        return true
      }
      const ok = await instance.activateDocument(live)
      if (this.disposed || seq !== this.activateSeq) {
        if (!this.disposed) this.syncFocusRings()
        return false
      }
      this.applyFocusClass(side)
      this.refreshMarkupsList()
      if (ok) this.options.events?.focus?.(side)
      return ok
    }
    const result = this.activateTail.then(run, run)
    this.activateTail = result.then(
      () => undefined,
      () => undefined
    )
    return result
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
    if (mode === 'side-by-side') this.applyViewSyncFromLeader()
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
   * Moves the current difference by `delta` entries in the navigation list.
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
    const hit = nav[this.navIndex]!
    this.collapsedResultGroups.delete(this.resultGroupStorageKeyForHit(hit))
    await this.focusHit(hit)
    this.renderResultsList()
  }

  /**
   * Tears down the widget, document manager, and injected DOM.
   * Safe to call more than once.
   */
  async destroy(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    AcApDiffSettingsDialog.dismiss()
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown)
    this.unbindViewSyncListeners()
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
    this.setLocaleMenuOpen(false)
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
    btnSideBySide.className = 'ml-diff-tool-btn is-icon'
    btnSideBySide.innerHTML = ICON_SIDE_BY_SIDE
    const btnOverlay = document.createElement('button')
    btnOverlay.type = 'button'
    btnOverlay.className = 'ml-diff-tool-btn is-icon'
    btnOverlay.innerHTML = ICON_OVERLAY
    const btnSyncViews = document.createElement('button')
    btnSyncViews.type = 'button'
    btnSyncViews.className = 'ml-diff-tool-btn is-icon ml-diff-sync-btn'
    btnSyncViews.innerHTML = ICON_SYNC_VIEWS
    modeGroup.append(btnSideBySide, btnOverlay, btnSyncViews)

    const navGroup = document.createElement('div')
    navGroup.className = 'ml-diff-toolbar-group'
    const btnTogglePanel = document.createElement('button')
    btnTogglePanel.type = 'button'
    btnTogglePanel.className = 'ml-diff-tool-btn is-icon'
    btnTogglePanel.innerHTML = ICON_RESULTS_PANEL
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
      btn.className = 'ml-diff-tool-btn is-icon'
      btn.dataset.command = tool.command
      btn.dataset.labelKey = tool.labelKey
      btn.innerHTML = tool.icon
      btn.addEventListener('click', () => {
        void this.runMarkupCommand(tool.command)
      })
      this.markupButtons.push(btn)
      markupGroup.appendChild(btn)
    }

    const localeChrome = this.createLanguageSelect()
    const btnSettings = document.createElement('button')
    btnSettings.type = 'button'
    btnSettings.className = 'ml-diff-tool-btn is-icon'
    btnSettings.innerHTML = ICON_SETTINGS
    const btnTheme = document.createElement('button')
    btnTheme.type = 'button'
    btnTheme.className = 'ml-diff-tool-btn is-icon'
    localeChrome.group.prepend(btnSettings, btnTheme)

    btnSideBySide.addEventListener('click', () => {
      void this.setViewMode('side-by-side')
    })
    btnOverlay.addEventListener('click', () => {
      void this.setViewMode('overlay')
    })
    btnSyncViews.addEventListener('click', () => {
      this.setViewsSynced(!this.viewsSynced)
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
    btnSettings.addEventListener('click', () => {
      void this.openSettings()
    })
    btnTheme.addEventListener('click', () => {
      this.setUiTheme(this.uiTheme === 'dark' ? 'light' : 'dark')
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
      toolbarChildren: [modeGroup, navGroup, markupGroup, localeChrome.group],
      btnSideBySide,
      btnOverlay,
      btnSyncViews,
      btnTogglePanel,
      btnPrev,
      btnNext,
      btnSettings,
      btnTheme,
      sidePanel,
      resultsBody,
      markupsBody,
      tabResults,
      tabMarkups,
      groupByKindBtn,
      groupByTypeBtn,
      panelTitle,
      closeBtn,
      localeTrigger: localeChrome.trigger,
      localeMenu: localeChrome.menu,
      localeSelectHost: localeChrome.host
    }
  }

  /**
   * Builds the far-right language select (compact dropdown like cad-viewer ribbon).
   */
  private createLanguageSelect() {
    const group = document.createElement('div')
    group.className = 'ml-diff-toolbar-group ml-diff-toolbar-locale'
    const host = document.createElement('div')
    host.className = 'ml-diff-lang-select'
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'ml-diff-lang-select__trigger'
    trigger.setAttribute('aria-haspopup', 'listbox')
    trigger.setAttribute('aria-expanded', 'false')
    const label = document.createElement('span')
    label.className = 'ml-diff-lang-select__label'
    trigger.append(label)
    trigger.insertAdjacentHTML('beforeend', LOCALE_CHEVRON)
    trigger.addEventListener('click', event => {
      event.stopPropagation()
      this.setLocaleMenuOpen(!this.localeMenuOpen)
    })

    const menu = document.createElement('div')
    menu.className = 'ml-diff-lang-select__menu'
    menu.setAttribute('role', 'listbox')
    menu.hidden = true
    for (const option of LOCALE_OPTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ml-diff-lang-select__option'
      btn.setAttribute('role', 'option')
      btn.dataset.locale = option.locale
      btn.textContent = option.label
      btn.addEventListener('click', event => {
        event.stopPropagation()
        this.setLocaleMenuOpen(false)
        if (option.locale === AcApI18n.currentLocale) return
        AcApI18n.setCurrentLocale(option.locale)
        document.documentElement.lang = option.locale
      })
      menu.appendChild(btn)
    }

    host.append(trigger, menu)
    group.appendChild(host)
    return { group, host, trigger, menu }
  }

  /** Opens or closes the language dropdown. */
  private setLocaleMenuOpen(open: boolean) {
    this.localeMenuOpen = open
    this.localeMenu.hidden = !open
    this.localeTrigger.setAttribute('aria-expanded', String(open))
    this.localeSelectHost.classList.toggle('is-open', open)
  }

  /** Highlights the active locale and refreshes the trigger label. */
  private syncLocaleSelect() {
    const current = AcApI18n.currentLocale
    const label = this.localeTrigger.querySelector('.ml-diff-lang-select__label')
    if (label) label.textContent = localeOptionLabel(current)
    this.localeTrigger.title = acapDiffViewerT('toolbarLanguage')
    this.localeTrigger.setAttribute(
      'aria-label',
      acapDiffViewerT('toolbarLanguage')
    )
    this.localeMenu
      .querySelectorAll<HTMLButtonElement>('.ml-diff-lang-select__option')
      .forEach(btn => {
        const selected = btn.dataset.locale === current
        btn.classList.toggle('is-selected', selected)
        btn.setAttribute('aria-selected', String(selected))
      })
  }

  /** Closes the language menu when clicking outside it. */
  private handleDocumentPointerDown = (event: PointerEvent) => {
    if (!this.localeMenuOpen) return
    if (!(event.target instanceof Node)) return
    if (this.localeSelectHost.contains(event.target)) return
    this.setLocaleMenuOpen(false)
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

    pane.addEventListener('pointerenter', () => {
      this.activateSideOnHover(side)
    })
    pane.addEventListener('pointerdown', () => {
      this.lastPointerSide = side
      this.applyFocusClass(side)
      void this.activateSideAndResumeMarkup(side)
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

  /**
   * Activates `side` when the pointer enters the pane in side-by-side mode.
   *
   * If a markup command is already running on the other pane, it is cancelled
   * by document activation and restarted on this pane so the tool follows
   * the pointer.
   */
  private activateSideOnHover(side: AcApDiffViewerSide) {
    if (this.disposed) return
    if (this.viewMode !== 'side-by-side') return
    this.lastPointerSide = side
    this.applyFocusClass(side)
    void this.activateSideAndResumeMarkup(side)
  }

  /**
   * Makes `side` the command target. When a markup tool is in progress on the
   * other document, re-issues it after the switch so drawing can continue here.
   */
  private async activateSideAndResumeMarkup(side: AcApDiffViewerSide) {
    if (this.disposed) return
    if (!this.documentFor(side)) return
    let resume: string | undefined
    try {
      const mgr = requireInstance()
      if (
        mgr.commandManager.activeCommand &&
        this.lastMarkupCommand &&
        mgr.curDocument !== this.documentFor(side)
      ) {
        resume = this.lastMarkupCommand
      }
    } catch {
      return
    }
    const ok = await this.activateSide(side)
    if (!ok || this.disposed) return
    if (this.lastPointerSide !== side) return
    this.applyFocusClass(side)
    if (resume) {
      requireInstance().sendStringToExecute(resume)
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
    const side =
      this.viewMode === 'side-by-side' ? this.lastPointerSide : 'left'
    if (!this.documentFor(side)) return
    this.lastMarkupCommand = command
    const ok = await this.activateSide(side)
    if (!ok) return
    this.applyFocusClass(side)
    mgr.sendStringToExecute(command)
  }

  /**
   * Opens the compare-color settings dialog. Edits preview live; Cancel
   * restores the colors that were in effect when the dialog opened.
   */
  private async openSettings() {
    if (this.disposed) return
    const snapshot = { ...this.colors }
    const result = await AcApDiffSettingsDialog.open({
      host: document.body,
      theme: this.uiTheme,
      colors: this.colors,
      onChange: colors => {
        if (!this.disposed) this.applyCompareColors(colors)
      }
    })
    if (this.disposed) return
    if (!result.confirmed) this.applyCompareColors(snapshot)
  }

  /**
   * Writes compare colors onto the widget and re-tints open drawings.
   *
   * @param colors - Full role-color set to apply.
   */
  private applyCompareColors(colors: Required<AcApCompareDisplayColors>) {
    this.colors = { ...colors }
    this.syncCompareColorVars()
    void this.applyCompareDisplay()
  }

  /** Pushes role colors onto CSS custom properties used by the results list. */
  private syncCompareColorVars() {
    this.root.style.setProperty(
      '--ml-diff-added',
      acapDiffColorToCssHex(this.colors.added)
    )
    this.root.style.setProperty(
      '--ml-diff-deleted',
      acapDiffColorToCssHex(this.colors.deleted)
    )
    this.root.style.setProperty(
      '--ml-diff-modified',
      acapDiffColorToCssHex(this.colors.modified)
    )
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
    this.lastPointerSide = 'left'
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

  /**
   * Waits until left/right canvases finish entity conversion so compare
   * role overrides can bind to packed geometry slots.
   */
  private async waitForCompareViewsIdle() {
    const mgr = requireInstance()
    const views: AcTrView2d[] = [mgr.mainView]
    if (mgr.splitView) {
      views.push(mgr.splitView)
    }
    await Promise.all(views.map(view => view.waitUntilIdle()))
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

    // Open returns after the database is parsed, but Three.js conversion
    // is still draining. Role tints look up packed slots; applying before
    // those slots exist leaves added/deleted hits (often the last handles)
    // on the unchanged base color.
    await this.waitForCompareViewsIdle()
    if (
      this.disposed ||
      this.compareResult !== result ||
      !this.leftDocument ||
      !this.rightDocument
    ) {
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

    const deletedIds = result.deleted
      .filter(h => h.side === 'left')
      .map(h => h.objectId)
    const addedIds = result.added
      .filter(h => h.side === 'right')
      .map(h => h.objectId)

    if (this.viewMode === 'overlay') {
      const leftOverrides = [
        ...deletedIds.map(objectId => ({
          objectId,
          role: 'deleted' as const
        })),
        ...result.modified
          .filter(h => h.side === 'left')
          .map(h => ({ objectId: h.objectId, role: 'deleted' as const }))
      ]
      const rightOverrides = [
        ...addedIds.map(objectId => ({
          objectId,
          role: 'added' as const
        })),
        ...result.modified
          .filter(h => h.side === 'right')
          .map(h => ({ objectId: h.objectId, role: 'added' as const }))
      ]
      mgr.setCompareDisplay({ enabled: false }, mgr.mainView)
      mgr.setCompareDisplay({ ...base, overrides: leftOverrides }, mgr.mainView)
      if (this.overlayId) {
        mgr.setOverlayCompareDisplay(
          this.overlayId,
          { enabled: false },
          mgr.mainView
        )
        mgr.setOverlayCompareDisplay(
          this.overlayId,
          { ...base, overrides: rightOverrides },
          mgr.mainView
        )
      }
      return
    }

    const leftOverrides = [
      ...deletedIds.map(objectId => ({
        objectId,
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
      ...addedIds.map(objectId => ({
        objectId,
        role: 'added' as const
      })),
      ...result.modified
        .filter(h => h.side === 'right')
        .map(h => ({
          objectId: h.objectId,
          role: 'modified' as const
        }))
    ]
    mgr.setCompareDisplay({ enabled: false }, mgr.mainView)
    mgr.setCompareDisplay({ ...base, overrides: leftOverrides }, mgr.mainView)
    if (mgr.splitView) {
      mgr.setCompareDisplay({ enabled: false }, mgr.splitView)
      mgr.setCompareDisplay(
        { ...base, overrides: rightOverrides },
        mgr.splitView
      )
    }
  }

  /**
   * Zooms to a hit (and its pair, when modified).
   *
   * Drawing entities are not selected or highlighted; compare display
   * already tints deleted / added / modified geometry.
   *
   * @param hit - Navigation entry from {@link AcApDiffCompareResult}.
   */
  private async focusHit(hit: AcApDiffEntityHit) {
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
    if (this.isViewSyncActive()) {
      this.viewSyncLeader = side
      this.viewSyncFollowOpen = false
      this.copyVisibleView(side, side === 'left' ? 'right' : 'left')
    }
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
      const storageKey = this.resultGroupStorageKey(key)
      const group = document.createElement('details')
      group.className = 'ml-diff-group'
      group.open = !this.collapsedResultGroups.has(storageKey)
      const title = document.createElement('summary')
      title.className = 'ml-diff-group-title'
      title.textContent =
        this.resultGroupMode === 'kind'
          ? `${kindLabel(key as AcApDiffChangeKind)} (${hits.length})`
          : `${key} (${hits.length})`
      group.appendChild(title)
      group.addEventListener('toggle', () => {
        if (group.open) this.collapsedResultGroups.delete(storageKey)
        else this.collapsedResultGroups.add(storageKey)
      })
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

  /** Storage key for a results-list section in the current grouping mode. */
  private resultGroupStorageKey(groupKey: string): string {
    return `${this.resultGroupMode}:${groupKey}`
  }

  /** Storage key of the section that contains `hit`. */
  private resultGroupStorageKeyForHit(hit: AcApDiffEntityHit): string {
    const groupKey =
      this.resultGroupMode === 'kind' ? hit.kind : hit.dxfType || 'UNKNOWN'
    return this.resultGroupStorageKey(groupKey)
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
   * Returns the canvas that should receive convert for `side`.
   *
   * Creates the split view on first use of the right pane.
   */
  private viewFor(side: AcApDiffViewerSide): AcTrView2d {
    const mgr = requireInstance()
    const view =
      side === 'left'
        ? mgr.mainView
        : mgr.ensureSplitView(this.rightUi.canvas)
    this.disableEntitySelection(view)
    return view
  }

  /** Turns off CAD entity pick, selection, and hover highlight on `view`. */
  private disableEntitySelection(view: AcTrView2d) {
    view.entitySelectionEnabled = false
  }

  /** True when both panes should share the same camera. */
  private isViewSyncActive(): boolean {
    return (
      this.viewsSynced &&
      this.viewMode === 'side-by-side' &&
      Boolean(this.leftDocument) &&
      Boolean(this.rightDocument)
    )
  }

  /** Turns pan/zoom locking on or off. */
  private setViewsSynced(on: boolean) {
    this.viewsSynced = on
    this.viewSyncFollowOpen = false
    if (on) {
      const source = this.documentFor(this.lastPointerSide)
        ? this.lastPointerSide
        : 'left'
      this.viewSyncLeader = source
      this.applyViewSyncFromLeader()
    }
    this.syncViewModeUi()
  }

  /** Copies the leader pane's visible world box onto the follower. */
  private applyViewSyncFromLeader() {
    if (!this.isViewSyncActive()) return
    const leader = this.documentFor(this.viewSyncLeader)
      ? this.viewSyncLeader
      : this.leftDocument
        ? 'left'
        : 'right'
    this.viewSyncLeader = leader
    this.copyVisibleView(leader, leader === 'left' ? 'right' : 'left')
  }

  /**
   * After a pane opens, keep the already-open drawing's camera if sync is on.
   * Auto-fit on the new pane is ignored until the user pans or zooms.
   */
  private syncFollowerAfterOpen(opened: AcApDiffViewerSide) {
    const other: AcApDiffViewerSide = opened === 'left' ? 'right' : 'left'
    if (!this.isViewSyncActive() || !this.documentFor(other)) return
    this.viewSyncLeader = other
    this.viewSyncFollowOpen = true
    this.copyVisibleView(other, opened)
  }

  /** Subscribes to camera changes on both canvases. */
  private bindViewSyncListeners() {
    try {
      const left = this.viewFor('left')
      const right = this.viewFor('right')
      left.events.viewChanged.addEventListener(this.handleLeftViewChanged)
      right.events.viewChanged.addEventListener(this.handleRightViewChanged)
    } catch {
      return
    }
    for (const host of [this.leftUi.canvas, this.rightUi.canvas]) {
      host.addEventListener('pointerdown', this.markViewSyncUserInput, true)
      host.addEventListener('wheel', this.markViewSyncUserInput, {
        capture: true,
        passive: true
      })
    }
  }

  /** Drops camera-sync listeners. Safe if the manager is already gone. */
  private unbindViewSyncListeners() {
    for (const host of [this.leftUi.canvas, this.rightUi.canvas]) {
      host.removeEventListener('pointerdown', this.markViewSyncUserInput, true)
      host.removeEventListener('wheel', this.markViewSyncUserInput, true)
    }
    try {
      const left = this.viewFor('left')
      const right = this.viewFor('right')
      left.events.viewChanged.removeEventListener(this.handleLeftViewChanged)
      right.events.viewChanged.removeEventListener(this.handleRightViewChanged)
    } catch {
      // Manager may already be gone.
    }
  }

  /** Marks the next camera change as coming from the user, not auto-fit. */
  private markViewSyncUserInput = () => {
    this.viewSyncFromUser = true
  }

  private handleLeftViewChanged = () => {
    this.onPaneViewChanged('left')
  }

  private handleRightViewChanged = () => {
    this.onPaneViewChanged('right')
  }

  /**
   * Copies `source` onto the other pane. Programmatic zoom-to-fit on a newly
   * opened follower is discarded so the already-open drawing keeps its camera.
   */
  private onPaneViewChanged(source: AcApDiffViewerSide) {
    if (this.disposed || this.viewSyncLock || !this.isViewSyncActive()) return
    const other: AcApDiffViewerSide = source === 'left' ? 'right' : 'left'
    if (
      this.viewSyncFollowOpen &&
      source !== this.viewSyncLeader &&
      !this.viewSyncFromUser
    ) {
      this.copyVisibleView(this.viewSyncLeader, source)
      return
    }
    this.viewSyncFollowOpen = false
    this.viewSyncFromUser = false
    this.viewSyncLeader = source
    this.copyVisibleView(source, other)
  }

  /**
   * Copies the visible world box of `from` onto `to` without echoing back
   * through {@link onPaneViewChanged}.
   */
  private copyVisibleView(from: AcApDiffViewerSide, to: AcApDiffViewerSide) {
    if (from === to || this.viewSyncLock) return
    if (!this.documentFor(from) || !this.documentFor(to)) return
    let source: AcTrView2d
    let target: AcTrView2d
    try {
      source = this.viewFor(from)
      target = this.viewFor(to)
    } catch {
      return
    }
    const width = source.width
    const height = source.height
    if (width < 2 || height < 2) return
    let box: AcGeBox2d
    try {
      const a = source.screenToWorld({ x: 0, y: 0 })
      const b = source.screenToWorld({ x: width, y: height })
      box = new AcGeBox2d()
      box.expandByPoint(a)
      box.expandByPoint(b)
    } catch {
      return
    }
    this.viewSyncLock = true
    try {
      target.zoomTo(box, 1)
    } catch {
      // Layout view may not exist yet on an empty pane.
    } finally {
      requestAnimationFrame(() => {
        this.viewSyncLock = false
      })
    }
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
    this.syncFocusRings()
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Sets `is-focused` immediately so the target pane's canvas receives
   * pointer events. Unfocused canvases use `pointer-events: none`.
   */
  private applyFocusClass(side: AcApDiffViewerSide) {
    this.leftUi.pane.classList.toggle('is-focused', side === 'left')
    this.rightUi.pane.classList.toggle('is-focused', side === 'right')
  }

  /** Updates pane focus rings from the active document. */
  private syncFocusRings() {
    const right = this.rightDocument
    let active: AcApDocument | undefined
    try {
      active = requireInstance().curDocument
    } catch {
      active = undefined
    }
    if (active === right && right) this.applyFocusClass('right')
    else this.applyFocusClass('left')
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
    const sideBySideLabel = acapDiffViewerT('toolbarSideBySide')
    const overlayLabel = acapDiffViewerT('toolbarOverlay')
    const togglePanelLabel = acapDiffViewerT('toolbarTogglePanel')
    this.btnSideBySide.title = sideBySideLabel
    this.btnSideBySide.setAttribute('aria-label', sideBySideLabel)
    this.btnOverlay.title = overlayLabel
    this.btnOverlay.setAttribute('aria-label', overlayLabel)
    const syncLabel = acapDiffViewerT('toolbarSyncViews')
    this.btnSyncViews.title = syncLabel
    this.btnSyncViews.setAttribute('aria-label', syncLabel)
    this.btnSyncViews.setAttribute('aria-pressed', String(this.viewsSynced))
    this.btnSyncViews.classList.toggle('is-active', this.viewsSynced)
    this.btnSyncViews.hidden = this.viewMode !== 'side-by-side'
    this.btnTogglePanel.title = togglePanelLabel
    this.btnTogglePanel.setAttribute('aria-label', togglePanelLabel)
    this.btnPrev.title = acapDiffViewerT('toolbarPrev')
    this.btnNext.title = acapDiffViewerT('toolbarNext')
    const settingsLabel = acapDiffViewerT('toolbarSettings')
    this.btnSettings.title = settingsLabel
    this.btnSettings.setAttribute('aria-label', settingsLabel)
    this.syncThemeButton()
    this.syncLocaleSelect()
    for (const btn of this.markupButtons) {
      const key = btn.dataset.labelKey as Parameters<typeof acapDiffViewerT>[0]
      const label = acapDiffViewerT(key)
      btn.title = label
      btn.setAttribute('aria-label', label)
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

  /**
   * Applies UI chrome theme tokens and refreshes the toolbar theme button.
   *
   * @param theme - Target light or dark chrome theme.
   */
  private setUiTheme(theme: AcEdUiTheme) {
    this.uiTheme = theme
    acedApplyUiTheme(theme, this.root)
    this.syncThemeButton()
  }

  /**
   * Shows the opposite-theme icon (sun in dark, moon in light), matching
   * cad-viewer's status-bar theme button.
   */
  private syncThemeButton() {
    const isDark = this.uiTheme === 'dark'
    this.btnTheme.innerHTML = isDark ? ICON_THEME_SUNNY : ICON_THEME_MOON
    const label = isDark
      ? acapDiffViewerT('toolbarThemeDark')
      : acapDiffViewerT('toolbarThemeLight')
    this.btnTheme.title = label
    this.btnTheme.setAttribute('aria-label', label)
  }

  /** Throws if {@link destroy} has already run. */
  private assertAlive() {
    if (this.disposed) {
      throw new Error('AcApDiffViewer has been destroyed')
    }
  }
}
