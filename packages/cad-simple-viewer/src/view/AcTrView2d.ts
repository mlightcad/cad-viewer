import {
  AcCmUiYieldGate,
  AcDbAttribute,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbEntity,
  acdbHostApplicationServices,
  AcDbLayerTableRecord,
  AcDbLayerTableRecordAttrs,
  AcDbLayout,
  AcDbMText,
  AcDbObjectId,
  AcDbRasterImage,
  AcDbRay,
  AcDbSysVarManager,
  AcDbViewport,
  AcDbXline,
  AcGeBox2d,
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike,
  log
} from '@mlightcad/data-model'
import { AcDbSystemVariables } from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrGlyphEntity,
  AcTrGroup,
  AcTrHtmlTransientManager,
  AcTrRenderer,
  AcTrViewportView
} from '@mlightcad/three-renderer'
import { AcTrMatrixUtil } from '@mlightcad/three-renderer'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import { AcApDocManager, AcApSettingManager } from '../app'
import { AcApZoomCmd } from '../command/AcApZoomCmd'
import { isMarkupHtmlTextEditing } from '../command/markup/AcApMarkupTextEdit'
import { notifyMeasurementLayoutChanged } from '../command/measure/AcApMeasurementStore'
import {
  AcEdBaseView,
  AcEdCalculateSizeCallback,
  AcEdConditionWaiter,
  AcEdCorsorType,
  AcEdGripManager,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdSnapLoupeViewState,
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx,
  AcEdViewMode,
  eventBus,
  resolvePointerSelectionAction
} from '../editor'
import {
  ACGI_MODEL_SPACE_BACKGROUND,
  isModelSpaceDatabase,
  readLayoutBackgroundColor
} from '../editor/global/AcEdUiColor'
import { ML_UI_Z_CANVAS_HTML_OVERLAY } from '../editor/global/AcEdUiLayout'
import { isEffectiveSpatialQueryHit } from '../editor/view/AcEdSpatialQueryResult'
import type { AcTrSpatialSearchOptions } from '../spatialIndex/AcTrSpatialIndex'
import { AcTrGeometryUtil } from '../util'
import { acapRunDatabaseEdit } from '../util/AcApDatabaseEdit'
import type { AcApCompareDisplayOptions } from './AcApCompareDisplay'
import {
  ACAP_READING_MODE_BACKGROUND,
  AcApReadingModeState
} from './AcApReadingMode'
import {
  trySelectReviewOverlay,
  trySelectReviewOverlaysByBox
} from './AcEdReviewOverlayPick'
import { AcEdViewKeyHandler } from './AcEdViewKeyHandler'
import {
  shouldExtendBboxForDirectEntity,
  tryBuildDirectEntityMeta
} from './AcTrDirectBatch'
import { AcTrEntityDisplayController } from './AcTrEntityDisplayController'
import {
  assertAcTrGroupWcsBboxesConsistent,
  unionGroupWcsChildBoxes
} from './AcTrGroupWcsBboxAssert'
import { AcTrInheritedLayerMaterialMapper } from './AcTrInheritedLayerMaterialMapper'
import { AcTrLayer } from './AcTrLayer'
import { AcTrLayerAppearanceController } from './AcTrLayerAppearanceController'
import { AcTrLayout } from './AcTrLayout'
import { AcTrLayoutView } from './AcTrLayoutView'
import { AcTrLayoutViewManager } from './AcTrLayoutViewManager'
import { sortPickResults } from './AcTrPickResultUtil'
import { AcTrProgressiveOpenFitController } from './AcTrProgressiveOpenFitController'
import { AcTrScene } from './AcTrScene'
import type { AcTrViewSessionState } from './AcTrViewSessionState'

/**
 * Options to customize view
 */
export interface AcTrView2dOptions {
  /**
   * Container HTML element used by renderer
   */
  container?: HTMLElement
  /**
   * Callback function used to calculate size of canvas when window resized
   */
  calculateSizeCallback?: AcEdCalculateSizeCallback
  /**
   * Background color
   */
  background?: number
}

/**
 * Default view option values
 */
export const DEFAULT_VIEW_2D_OPTIONS: AcTrView2dOptions = {
  background: ACGI_MODEL_SPACE_BACKGROUND
}

/**
 * A 2D CAD viewer component that renders CAD drawings using Three.js.
 *
 * This class extends {@link AcEdBaseView} and provides functionality for:
 * - Rendering 2D CAD drawings with Three.js WebGL renderer
 * - Handling user interactions (pan, zoom, select)
 * - Managing layouts, layers, and entities
 * - Supporting various CAD file formats (DWG, DXF)
 *
 * @example
 * ```typescript
 * const viewer = new AcTrView2d({
 *   canvas: document.getElementById('canvas') as HTMLCanvasElement,
 *   background: 0x000000,
 *   calculateSizeCallback: () => ({
 *     width: window.innerWidth,
 *     height: window.innerHeight
 *   })
 * });
 * ```
 */
export class AcTrView2d extends AcEdBaseView {
  /** The Three.js renderer wrapper for CAD rendering */
  private _renderer: AcTrRenderer
  /**
   * ID of the currently scheduled requestAnimationFrame callback.
   *
   * This value is used to:
   * - Track whether the animation loop is currently running
   * - Prevent scheduling multiple animation loops
   * - Cancel the animation loop when the view is paused, hidden, or disposed
   *
   * A value of `null` indicates that no animation frame is currently scheduled.
   */
  private _rafId: number | null = null
  /** Manager for layout views and viewport handling */
  private _layoutViewManager: AcTrLayoutViewManager
  /** The 3D scene containing all CAD entities organized by layouts and layers */
  private _scene: AcTrScene
  /** Flag indicating if the WebGL scene needs to be re-rendered */
  private _isDirty: boolean
  /** Flag indicating if CSS2D / HTML overlays need a CSS2DRenderer pass */
  private _htmlDirty: boolean
  /** Performance monitoring statistics display */
  private _stats: Stats
  /** Map of missing raster images during rendering */
  private _missedImages: Map<AcDbObjectId, string>
  /** The number of entities waiting for processing */
  private _numOfEntitiesToProcess: number
  /** CSS2D renderer for HTML transient overlays */
  private _css2dRenderer: CSS2DRenderer
  /**
   * Block table record ids of layouts whose entities are currently being
   * batch-converted into the scene. Used by
   * {@link AcTrView2d.loadLayoutEntitiesIfNeeded} to guard against
   * re-entrant calls before the convert drain flips
   * `AcTrLayout.isLoaded` to `true`, which would otherwise duplicate
   * entities when the same layout tab is clicked twice in quick succession.
   */
  private _loadingLayouts: Set<AcDbObjectId> = new Set()
  /**
   * Block table record ids of layouts that have already received an
   * initial zoom-to-fit. Used by the `layoutSwitched` handler to apply
   * the auto-zoom **only on the first user visit** to each layout, and
   * to preserve the camera state on subsequent visits (matches AutoCAD's
   * per-tab view persistence).
   *
   * Cannot be inferred from `_layoutViewManager.has(btrId)` because
   * `addLayout` pre-creates an `AcTrLayoutView` for every layout in the
   * DWG at document load time — by the time the user clicks a layout
   * tab the view already exists, so "first existence of view" is
   * always false. This set tracks the orthogonal question "has the user
   * actually focused on this layout before?".
   *
   * Marked from two entry points:
   *  - `onAfterOpenDocument` (via `markLayoutAsInitialized`): the
   *    document's startup layout is initialized externally, so we don't
   *    auto-zoom again when the user clicks back to it.
   *  - `layoutSwitched` handler: after the first user-driven switch
   *    completes its initial zoom-to-fit.
   */
  private _initializedLayouts: Set<AcDbObjectId> = new Set()
  /**
   * Layouts already framed by `AcApDocManager.onAfterOpenDocument` before a
   * first-visit async zoom runs. Suppresses redundant `applyInitialZoom` /
   * `zoomToFitDrawing(..., layoutBtrId)` callbacks that would override the
   * application layer's initial camera when startup and layout-switch events
   * race during document open.
   */
  private _externallyFramedLayouts: Set<AcDbObjectId> = new Set()
  /** Progressive camera framing while entities batch-convert at document open. */
  private readonly _progressiveOpenFit: AcTrProgressiveOpenFitController
  /** Entity display policy for layer-aware conversion skipping. */
  private readonly _entityDisplay: AcTrEntityDisplayController
  /** Layer appearance sync for style-table changes and text refresh. */
  private _layerAppearance: AcTrLayerAppearanceController
  /** INSERT layer-0 inheritance material remapping. */
  private readonly _inheritedLayerMaterialMapper: AcTrInheritedLayerMaterialMapper
  /**
   * Layer names with an in-flight {@link convertMissingEntitiesOnLayer} pass.
   *
   * {@link updateLayer} triggers that conversion fire-and-forget when a layer
   * becomes visible again. Rapid or repeated layer-on events for the same name
   * would otherwise start parallel {@link batchConvert} runs over the same
   * pending entities. `hasEntity` prevents duplicate scene entries, but not the
   * wasted conversion work — this set skips re-entry until the current pass ends.
   */
  private readonly _convertingLayers = new Set<string>()
  /**
   * When true, entity conversion during document open yields cooperatively so
   * geometry paints incrementally while the open overlay is still visible.
   */
  private _progressiveRendering = false
  /**
   * Serial convert queue for progressive opens. Chunks from `entityAppended`
   * enqueue here and a single drain loop runs {@link batchConvert}, so scene
   * convert overlaps ENTITY flush instead of waiting for a post-open
   * `setTimeout` storm after the loading overlay hides.
   */
  private _convertQueue: AcDbEntity[] = []
  /** In-flight progressive convert drain; shared so awaiters wait for the queue. */
  private _convertDrainPromise: Promise<void> | null = null
  /**
   * Bumped by {@link clear} so an in-flight {@link batchConvert} abandons
   * scene writes and counter updates after the view has been reset for a new
   * document open.
   */
  private _convertEpoch = 0
  /** Last time progressive open marked the canvas dirty for paint. */
  private _lastProgressivePaintAt = 0
  /** Mid-open WebGL paints while progressive convert was still running. */
  private _progressivePaintCount = 0
  /** Cooperative yields taken inside progressive {@link batchConvert}. */
  private _progressiveYieldCount = 0
  /**
   * In-flight glyph/group geometry jobs that await fonts via asyncDraw.
   * Counted separately so linework convert can continue while text waits.
   */
  private _pendingGeometryJobs = 0
  /** Grip point display and drag editing (Write mode only). */
  private _gripManager: AcEdGripManager
  /** Global keyboard shortcuts for the view (undo/redo, erase, etc.). */
  private _keyHandler: AcEdViewKeyHandler
  /** Transient reading mode forces black linework on a white canvas. */
  private readonly _readingMode = new AcApReadingModeState({
    getCurrentBackgroundColor: () => this._renderer.currentBackgroundColor,
    applyViewClearColor: value => this.applyViewClearColor(value),
    setCompareDisplay: options => this.setCompareDisplay(options),
    markDirty: () => {
      this._isDirty = true
    }
  })

  /**
   * Wall-time between cooperative yields during progressive open (ms).
   * Kept relatively large so convert throughput stays close to the
   * non-progressive path; smaller budgets made open 2–3× slower.
   */
  private static readonly PROGRESSIVE_OPEN_YIELD_BUDGET_MS = 300
  /**
   * Minimum interval between progressive mid-open paints (ms).
   * Full-scene WebGL paints dominate open wall time on large drawings;
   * paint much less often than we yield.
   */
  private static readonly PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 1000

  /**
   * Creates a new 2D CAD viewer instance.
   *
   * @param options - Configuration options for the viewer
   * @param options.container - Optional HTML container element. If not provided, a new container will be created
   * @param options.calculateSizeCallback - Optional callback function to calculate canvas size on window resize
   * @param options.background - Optional background color as hex number (default: 0x000000)
   */
  constructor(options: AcTrView2dOptions = DEFAULT_VIEW_2D_OPTIONS) {
    const mergedOptions: AcTrView2dOptions = {
      ...DEFAULT_VIEW_2D_OPTIONS,
      ...options
    }

    const container = mergedOptions.container ?? document.createElement('div')
    mergedOptions.container = container
    container.style.overflow = 'hidden'

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.maxWidth = '100%'
    renderer.domElement.style.maxHeight = '100%'
    // Keep one-finger picks (measure snap loupe) from being stolen by the
    // browser scroll / long-press context-menu gesture.
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.style.userSelect = 'none'
    renderer.domElement.style.setProperty('-webkit-user-select', 'none')
    renderer.domElement.style.setProperty('-webkit-touch-callout', 'none')

    super(renderer.domElement, container)
    this._gripManager = new AcEdGripManager(this)
    this._keyHandler = new AcEdViewKeyHandler(this)
    if (options.calculateSizeCallback) {
      this.setCalculateSizeCallback(options.calculateSizeCallback)
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(this.width, this.height)

    this._renderer = new AcTrRenderer(renderer)
    const fontMapping = AcApSettingManager.instance.fontMapping
    this._renderer.setFontMapping(fontMapping)
    this._renderer.events.fontNotFound.addEventListener(args => {
      eventBus.emit('font-not-found', {
        fontName: args.fontName,
        count: args.count ?? 0
      })
    })

    this._scene = this.createScene()
    this._layerAppearance = new AcTrLayerAppearanceController(
      this._scene,
      this._renderer
    )
    this._inheritedLayerMaterialMapper = new AcTrInheritedLayerMaterialMapper(
      layerName => this._layerAppearance.getEffectiveLayerTraits(layerName),
      this._renderer
    )
    // Initialize background color through setter to keep renderer/cursor in sync.
    this.backgroundColor =
      mergedOptions.background ?? ACGI_MODEL_SPACE_BACKGROUND
    this._stats = this.createStats(
      AcApSettingManager.instance.isShowStats && this.isActiveManagedView()
    )

    // Layout background sysvars drive the canvas clear colour and ACI-7
    // inversion (`MODELBKCOLOR` for model space, `PAPERBKCOLOR` for the
    // active layout). `COLORTHEME` only affects UI chrome — see
    // `useDark` / `AcEdUiTheme`, not the renderer foreground.
    const sysVarManager = AcDbSysVarManager.instance()
    const modelBkVar = AcDbSystemVariables.MODELBKCOLOR.toLowerCase()
    const paperBkVar = AcDbSystemVariables.PAPERBKCOLOR.toLowerCase()
    sysVarManager.events.sysVarChanged.addEventListener(args => {
      const nameLower = args.name.toLowerCase()
      if (nameLower === modelBkVar || nameLower === paperBkVar) {
        const isModelSpace = this.isModelSpaceLayout(args.database)
        const applies =
          (nameLower === modelBkVar && isModelSpace) ||
          (nameLower === paperBkVar && !isModelSpace)
        if (!applies) {
          return
        }
        this.applyCanvasBackground(
          readLayoutBackgroundColor(args.database, isModelSpace)
        )
      }
    })

    AcApSettingManager.instance.events.modified.addEventListener(args => {
      if (args.key == 'isShowStats') {
        this.toggleStatsVisibility(this._stats, args.value as boolean)
      }
    })

    let selectionStartWcs: AcGePoint2dLike | null = null
    let selectionStartCanvas: AcGePoint2dLike | null = null
    let selectionPreviewEl: HTMLDivElement | null = null

    const canHandleSelectionGesture = () => {
      return (
        this.mode === AcEdViewMode.SELECTION &&
        !this.editor.isActive &&
        !AcEdMTextEditor.getActiveInputBox() &&
        !isMarkupHtmlTextEditing() &&
        !this._gripManager.isDragging
      )
    }

    const clearSelectionPreview = () => {
      selectionPreviewEl?.remove()
      selectionPreviewEl = null
    }

    this.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return
      if (!canHandleSelectionGesture()) return

      selectionStartCanvas = this.viewportToCanvas({
        x: e.clientX,
        y: e.clientY
      })
      selectionStartWcs = this.screenToWorld(selectionStartCanvas)

      selectionPreviewEl = document.createElement('div')
      selectionPreviewEl.className = 'ml-jig-preview-rect'
      this.container.appendChild(selectionPreviewEl)
    })

    this.canvas.addEventListener('mousemove', e => {
      if (!selectionStartWcs || !selectionPreviewEl || !selectionStartCanvas) {
        return
      }

      const curCanvas = this.viewportToCanvas({ x: e.clientX, y: e.clientY })
      const curWcs = this.screenToWorld(curCanvas)

      const p1 = this.worldToScreen(selectionStartWcs)
      const p2 = this.worldToScreen(curWcs)

      const left = Math.min(p1.x, p2.x)
      const top = Math.min(p1.y, p2.y)
      const width = Math.abs(p1.x - p2.x)
      const height = Math.abs(p1.y - p2.y)

      const mode = this.getSelectionMode(selectionStartCanvas, curCanvas)
      const action = this.getPointerSelectionAction(e)
      const style = this.getSelectionPreviewStyle(mode, action)

      Object.assign(selectionPreviewEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderStyle: style.borderStyle,
        background: style.background
      })
      selectionPreviewEl.style.setProperty('--line-color', style.lineColor)
    })

    this.canvas.addEventListener('mouseup', e => {
      if (this._gripManager.isDragging) {
        selectionStartWcs = null
        selectionStartCanvas = null
        clearSelectionPreview()
        return
      }
      if (!selectionStartWcs || !selectionStartCanvas) return

      const endCanvas = this.viewportToCanvas({
        x: e.clientX,
        y: e.clientY
      })
      const endWcs = this.screenToWorld(endCanvas)
      clearSelectionPreview()

      const action = this.getPointerSelectionAction(e)

      if (this.isSelectionClick(selectionStartCanvas, endCanvas)) {
        if (trySelectReviewOverlay(this, endCanvas.x, endCanvas.y, action)) {
          if (action === 'replace') {
            this.selectionSet.clear()
          }
        } else if (this.entitySelectionEnabled) {
          const picked = this.pick(endWcs)
          if (picked.length > 0) {
            if (action === 'replace') {
              this.htmlTransientManager.deselectAll()
            }
            this.applySelection([picked[0].id], action)
          } else if (action === 'replace') {
            this.selectionSet.clear()
          }
        } else if (action === 'replace') {
          this.selectionSet.clear()
        }
      } else {
        const box = new AcGeBox2d()
          .expandByPoint(selectionStartWcs)
          .expandByPoint(endWcs)
        const mode = this.getSelectionMode(selectionStartCanvas, endCanvas)
        if (this.entitySelectionEnabled) {
          this.selectByBoxWithMode(box, mode, action)
        }
        trySelectReviewOverlaysByBox(this, box, mode, action)
      }

      selectionStartWcs = null
      selectionStartCanvas = null
    })

    this.canvas.addEventListener('dblclick', e => {
      if (e.button !== 0) return
      if (!canHandleSelectionGesture()) return
      if (!this.entitySelectionEnabled) return
      if (AcApDocManager.instance.curDocument.openMode !== AcEdOpenMode.Write) {
        return
      }
      void this.openPickedEntityEditor(e)
    })
    // When using OrbitControls in THREE.js, it attaches its own event listeners to the DOM elements,
    // such as the canvas or the entire document. This can interfere with other event listeners you
    // add, including the keydown event.
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isActiveManagedView()) return
      this._keyHandler.handleKeyDown(e)
    })
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
      args => {
        if (!this.isActiveManagedView()) return
        const layoutDb = (args.layout as { database?: { objectId?: string } })
          .database
        const currentDb = (
          AcApDocManager as unknown as {
            _instance?: { curDocument?: { database?: object } }
          }
        )._instance?.curDocument?.database
        if (layoutDb && currentDb && layoutDb !== currentDb) {
          return
        }
        const btrId = args.layout.blockTableRecordId
        // "First visit" is tracked separately from view existence because
        // `addLayout` pre-creates an `AcTrLayoutView` for every layout in
        // the DWG at load time — `_layoutViewManager.has(btrId)` is
        // therefore `true` even for layouts the user has never focused
        // on, and "first visit" computed from it would always be false.
        // We use a dedicated set instead, marked here on first switch and
        // also from `markLayoutAsInitialized` when the document opens
        // straight into a layout (AcApDocManager has already framed it).
        // Each AcTrLayoutView owns its own camera, so on subsequent
        // visits the previous camera state is naturally restored and we
        // must NOT zoom-to-fit again — that would be jarring and
        // diverges from how AutoCAD preserves per-tab view state.
        const isFirstVisit = !this._initializedLayouts.has(btrId)
        this._initializedLayouts.add(btrId)

        // Measurement HTML overlays are layout-scoped via `layoutId`.
        // Switching layouts only updates visibility (see
        // {@link AcTrHtmlTransientManager.setActiveLayoutId} from the
        // `activeLayoutBtrId` setter below) — overlays are not deleted, so
        // returning to a layout restores its measurements. Entity selection
        // is intentionally **not** cleared here: it is entity-id-based and
        // the same entity stays selected wherever it is rendered.
        this.activeLayoutBtrId = btrId
        this.createLayoutViewIfNeeded(btrId)
        this.loadLayoutEntitiesIfNeeded(btrId)
        this.refreshCanvasBackgroundForActiveLayout()
        this._isDirty = true

        if (isFirstVisit) {
          this.applyInitialZoom(btrId, args.layout)
        }
      }
    )

    this._css2dRenderer = new CSS2DRenderer()
    this._css2dRenderer.setSize(this.width, this.height)
    this._css2dRenderer.domElement.style.position = 'absolute'
    this._css2dRenderer.domElement.style.top = '0px'
    this._css2dRenderer.domElement.style.left = '0px'
    this._css2dRenderer.domElement.style.pointerEvents = 'none'
    // Below command line / mobile chrome / dialogs; above the WebGL canvas.
    this._css2dRenderer.domElement.style.zIndex = String(
      ML_UI_Z_CANVAS_HTML_OVERLAY
    )
    this._css2dRenderer.domElement.style.maxWidth = '100%'
    this._css2dRenderer.domElement.style.maxHeight = '100%'
    container.appendChild(this._css2dRenderer.domElement)

    this._missedImages = new Map()
    this._layoutViewManager = new AcTrLayoutViewManager()
    this._progressiveOpenFit = new AcTrProgressiveOpenFitController(
      (box, margin) => {
        this.activeLayoutView.zoomTo(box, margin ?? 1.1)
        this._isDirty = true
      }
    )
    this._entityDisplay = new AcTrEntityDisplayController(layerName =>
      this.resolveLayerInfo(layerName)
    )
    this.initialize()
    this.onWindowResize()
    this._isDirty = true
    this._htmlDirty = false
    this.startAnimationLoop()
    this._numOfEntitiesToProcess = 0
    this._pendingGeometryJobs = 0
  }

  private getPointerSelectionAction(e: MouseEvent) {
    return resolvePointerSelectionAction(e)
  }

  /**
   * Initializes the viewer after renderer and camera are created.
   *
   * This method sets up the initial cursor and can be overridden by child classes
   * to add custom initialization logic.
   *
   * @protected
   */
  initialize() {
    // This method is called after camera and render are created.
    // Children class can override this method to add its own logic
    this.setCursor(AcEdCorsorType.Crosshair)
    this.editor.events.commandWillStart.addEventListener(() => {
      this.htmlTransientManager.setHitTestEnabled(false)
    })
    this.editor.events.commandEnded.addEventListener(() => {
      this.htmlTransientManager.setHitTestEnabled(true)
    })
  }

  /**
   * Gets the current view mode (selection or pan).
   *
   * @returns The current view mode
   * @inheritdoc
   */
  get mode() {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView ? activeLayoutView.mode : AcEdViewMode.SELECTION
  }

  /**
   * Sets the view mode (selection or pan).
   *
   * @param value - The view mode to set
   */
  set mode(value: AcEdViewMode) {
    this.activeLayoutView.mode = value
  }

  /**
   * Enables or disables OrbitControls on the active layout view.
   *
   * @param enabled - When false, pan and zoom are disabled (e.g. while the
   *   snap loupe is tracking a long-press).
   */
  override setNavigationEnabled(enabled: boolean) {
    const layoutView = this.activeLayoutView
    if (layoutView) layoutView.enabled = enabled
  }

  /**
   * Shows or hides the screen-fixed snap loupe overlay viewport.
   *
   * @param state - Loupe screen rectangle and world box, or `null` to hide.
   */
  override setSnapLoupe(state: AcEdSnapLoupeViewState | null) {
    const overlay = this.activeLayoutView?.overlayViewport
    if (!overlay) return
    if (!state) {
      overlay.visible = false
      this._isDirty = true
      return
    }
    overlay.setScreenRect(state.x, state.y, state.size, state.size)
    overlay.setViewBox(state.viewBox)
    overlay.visible = true
    this._isDirty = true
  }

  /**
   * Gets the Three.js renderer wrapper used for CAD rendering.
   *
   * @returns The renderer instance
   */
  get renderer() {
    return this._renderer
  }

  /** Grip point manager for the view (Write mode only). */
  get gripManager() {
    return this._gripManager
  }

  /**
   * Gets whether the WebGL scene needs to be re-rendered.
   *
   * Camera, CAD entities, and WebGL transients set this flag. CSS2D / HTML
   * overlay mutations should use {@link isHtmlDirty} instead so a badge or
   * markup DOM change does not clear and redraw the drawing.
   *
   * @returns True if the WebGL view is dirty and needs re-rendering
   */
  get isDirty() {
    return this._isDirty
  }

  /**
   * True while batch conversion or deferred glyph/group geometry is still
   * running.
   *
   * Parsing can report 100% before this reaches zero; callers opening files
   * should wait on this (as {@link zoomToFitDrawing} does) before hiding
   * progress UI or assuming the canvas is ready.
   */
  get isProcessingEntities() {
    return this._numOfEntitiesToProcess > 0 || this._pendingGeometryJobs > 0
  }

  /**
   * Waits until batch conversion and deferred glyph/font geometry finish.
   *
   * Document open can resolve before text is drawable (`FontManager.lazyFontLoading`
   * + deferred geometry jobs). Call this before raster/HTML export or scripted
   * commands that assume a complete scene.
   *
   * @param timeoutMs - Maximum wait; returns `false` on timeout (default 60s).
   * @returns `true` when idle, `false` if still busy after the timeout.
   */
  async waitUntilIdle(timeoutMs = 60_000): Promise<boolean> {
    const deadline = Date.now() + Math.max(0, timeoutMs)
    // Require two consecutive idle samples so a brief gap between convert
    // batches / deferred jobs does not look like a finished scene.
    let idleStreak = 0
    for (;;) {
      if (!this.isProcessingEntities) {
        idleStreak++
        if (idleStreak >= 2) {
          return true
        }
      } else {
        idleStreak = 0
      }
      if (Date.now() > deadline) {
        return !this.isProcessingEntities
      }
      await new Promise<void>(resolve => setTimeout(resolve, 16))
    }
  }

  /**
   * Whether entity conversion during document open is deferred for progressive display.
   */
  get progressiveRendering() {
    return this._progressiveRendering
  }
  set progressiveRendering(value: boolean) {
    this._progressiveRendering = value
    this.resetProgressiveOpenStats()
  }

  /**
   * Progressive-open counters for OPENPROF / palette (paints while converting,
   * cooperative yields). Reset when progressive mode is enabled for an open.
   */
  get progressiveOpenStats() {
    return {
      paintCount: this._progressivePaintCount,
      yieldCount: this._progressiveYieldCount
    }
  }

  private resetProgressiveOpenStats() {
    this._progressivePaintCount = 0
    this._progressiveYieldCount = 0
    this._lastProgressivePaintAt = 0
  }

  /**
   * Enables progressive camera framing while entities are batch-converted at
   * document open. Pair with {@link zoomToFitDrawing} for the final accurate fit.
   */
  beginProgressiveOpenFit() {
    this._progressiveOpenFit.begin(this._numOfEntitiesToProcess)
  }

  /**
   * Disables progressive open framing after the final zoom-to-fit runs.
   */
  endProgressiveOpenFit() {
    this._progressiveOpenFit.end()
  }

  /**
   * Sets whether the WebGL scene needs to be re-rendered.
   *
   * When true, the animation loop also runs CSS2DRenderer so HTML
   * overlays reproject after pan / zoom. HTML-only changes should set
   * {@link isHtmlDirty} instead.
   *
   * @param value - True to mark the WebGL view as needing re-rendering
   */
  set isDirty(value: boolean) {
    this._isDirty = value
  }

  /**
   * Gets whether CSS2D / HTML overlays need a CSS2DRenderer pass.
   *
   * @returns True if HTML overlays changed without a WebGL scene change
   */
  get isHtmlDirty() {
    return this._htmlDirty
  }

  /**
   * Sets whether CSS2D / HTML overlays need a CSS2DRenderer pass.
   *
   * Does not force a WebGL redraw. Camera changes still go through
   * {@link isDirty}, which also refreshes overlay projection.
   *
   * @param value - True to mark HTML overlays as needing a CSS2D pass
   */
  set isHtmlDirty(value: boolean) {
    this._htmlDirty = value
  }

  /**
   * Gets information about missing data during rendering (fonts, images, xrefs).
   *
   * @returns Object containing maps of missing fonts/images and unresolved xrefs
   */
  get missedData() {
    return {
      fonts: this._renderer.missedFonts,
      images: this._missedImages,
      xrefs: this.collectUnresolvedXrefs()
    }
  }

  private collectUnresolvedXrefs() {
    try {
      const db = AcApDocManager.instance?.curDocument?.database
      if (!db) return []
      // Available once @mlightcad/data-model exports getUnresolvedXrefs on the
      // block table (realdwg-web). Soft-detect so older package versions still run.
      const blockTable = db.tables.blockTable as {
        getUnresolvedXrefs?: () => Array<{
          name: string
          pathName: string
          isOverlayReference: boolean
        }>
      }
      if (typeof blockTable.getUnresolvedXrefs !== 'function') {
        return []
      }
      return blockTable.getUnresolvedXrefs().map(btr => ({
        name: btr.name,
        pathName: btr.pathName,
        isOverlay: btr.isOverlayReference
      }))
    } catch {
      return []
    }
  }

  get center() {
    return this.activeLayoutView.center
  }
  set center(value: AcGePoint2d) {
    this.activeLayoutView.center = value
  }

  /**
   * Gets the background color of the view.
   *
   * The color is represented as a 24-bit hexadecimal RGB number, e.g.,
   * `0x000000` for black.
   */
  get backgroundColor() {
    return this._renderer.getClearColor()
  }

  /**
   * Sets the background color of the view.
   *
   * @param value - The background color as a 24-bit hexadecimal RGB number
   */
  set backgroundColor(value: number) {
    this.applyCanvasBackground(value)
  }

  /**
   * Applies canvas background colour from layout background sysvars or explicit
   * API calls. Also refreshes ACI-7 foreground inversion via the style
   * manager. Does not touch `COLORTHEME` / UI chrome.
   */
  private applyCanvasBackground(value: number) {
    this._renderer.currentBackgroundColor = value
    this._layerAppearance.refreshTextMaterialsInObjectTree(
      this._scene.internalScene
    )
    this.resyncForegroundLayersForBackground()
    if (this._readingMode.isEnabled) {
      this._readingMode.noteLayoutBackground(value)
      this.applyViewClearColor(ACAP_READING_MODE_BACKGROUND)
      return
    }
    this.applyViewClearColor(value)
  }

  /**
   * Updates only the WebGL clear colour and cursor chrome.
   *
   * Reading mode uses this so the white canvas is visual-only and does not
   * repaint cached entity materials via the style manager.
   */
  private applyViewClearColor(value: number) {
    this._renderer.setClearColor(value)
    this.editor.syncCursorBackground(value)
    this._isDirty = true
  }

  /**
   * Rebuilds byLayer materials on ACI-7 (foreground) layers after a canvas
   * background change.
   *
   * The scene traversal above only reaches entity wrappers that still expose
   * `refreshTextMaterials` — but `AcTrBatchedGroup.addEntity` flattens glyph
   * entities into cloned drawable subtrees at add time, so for already-batched
   * layouts it matches nothing and ACI-7 byLayer text kept its build-time
   * colour (white text on a white canvas, #464). Entity-level ACI-7 materials
   * are foreground-tracked and repainted by the style manager, but byLayer
   * materials on an ACI-7 layer were created before the manager knew the
   * layer colour and are not. Re-running the live layer sync — the same path
   * a layer-table colour edit uses, which the #464 workaround exploited —
   * rebuilds them against the background set just above, with foreground
   * tracking attached for subsequent switches.
   */
  private resyncForegroundLayersForBackground() {
    const database = this._renderer.context.database
    if (!database) return
    for (const layer of database.tables.layerTable.newIterator()) {
      if (layer.color?.isForeground) {
        this._layerAppearance.syncFromLiveRecord(layer)
      }
    }
  }

  private isModelSpaceLayout(database?: AcDbDatabase): boolean {
    if (!database) {
      return this.activeLayoutBtrId === this.modelSpaceBtrId
    }
    return isModelSpaceDatabase(database)
  }

  /**
   * Binds the active drawing database on the renderer draw context.
   *
   * Called before document read so layer-table traits are available while layers
   * are appended during open, and again after open to refresh display sysvars.
   */
  bindDrawDatabase(database: AcDbDatabase | undefined): void {
    this._renderer.context.database = database
  }

  /**
   * Re-reads layout background sysvars from the active database. Called after
   * a document is opened so DWG-stored values take effect.
   */
  syncDisplaySysVars(database: AcDbDatabase) {
    this.bindDrawDatabase(database)
    this.applyCanvasBackground(
      readLayoutBackgroundColor(database, this.isModelSpaceLayout(database))
    )
    this._readingMode.reapplyIfEnabled()
  }

  /** Whether transient reading mode is active on this view. */
  get readingModeEnabled() {
    return this._readingMode.isEnabled
  }

  /** Toggles transient reading mode on or off. */
  toggleReadingMode() {
    this._readingMode.toggle()
  }

  /**
   * Enables or disables transient reading mode (black linework, white canvas).
   *
   * @param enabled - When true, snapshots the current canvas background and
   *   forces monochrome display; when false, restores the snapshot and
   *   original entity colors.
   */
  setReadingMode(enabled: boolean) {
    this._readingMode.setEnabled(enabled)
  }

  /**
   * Converts and renders model-space entities from a standalone, independently
   * parsed database (an overlay/reference drawing) into a dedicated
   * {@link AcTrLayout} added directly to the THREE scene.
   *
   * The returned layout is intentionally **not** registered in
   * {@link AcTrScene}'s owner-id-keyed layout map, so it never participates in
   * layout-tab switching, the primary document's layer table/panel, undo
   * stack, or selection set. Toggle visibility via the returned layout's
   * `visible` property, and tear it down by removing `internalObject` from
   * `cadScene.internalScene` and calling `clear()`.
   *
   * Scope: draws top-level geometry, text, hatch, and block-reference
   * (INSERT) entities, including entities that expand to multi-layer groups
   * (dimensions, tables). A multi-layer group stays bucketed under its
   * INSERT's layer — overlay layers are display-only, so per-fragment layer
   * re-parenting (see `handleGroup`) is intentionally not replicated here.
   * Viewports are not supported for overlays and are skipped.
   *
   * @param overlayDb - Input a database parsed independently of the active
   * document (e.g. via `new AcDbDatabase().read(...)`).
   * @returns The layout containing the converted overlay entities.
   */
  async addOverlayEntities(overlayDb: AcDbDatabase): Promise<AcTrLayout> {
    const layout = new AcTrLayout()
    layout.isReference = true
    layout.internalObject.userData.isReference = true
    this._scene.internalScene.add(layout.internalObject)

    for (const layer of overlayDb.tables.layerTable.newIterator()) {
      layout.addLayer({
        name: layer.name,
        isOff: layer.isOff,
        isFrozen: layer.isFrozen,
        color: layer.color
      })
    }

    const previousDatabase = this._renderer.context.database
    this._renderer.context.database = overlayDb
    try {
      const modelSpace = overlayDb.tables.blockTable.modelSpace
      for (const entity of modelSpace.newIterator()) {
        if (entity instanceof AcDbViewport) continue
        try {
          const threeEntity = this.drawEntity(entity, false)
          if (!threeEntity) continue

          threeEntity.objectId = entity.objectId
          threeEntity.ownerId = entity.ownerId
          threeEntity.layerName = entity.layer
          threeEntity.visible = entity.visibility !== false
          if (
            threeEntity instanceof AcTrGroup &&
            (threeEntity as AcTrGroup).isOnTheSameLayer
          ) {
            // Children authored on layer "0" inherit the INSERT layer for
            // ByLayer traits (color, etc.), same as the primary-document path.
            this._inheritedLayerMaterialMapper.remap(
              (threeEntity as AcTrGroup).children,
              '0',
              threeEntity.layerName
            )
          }
          await this.finishEntityGeometry(threeEntity, false)
          layout.addEntity(threeEntity)
          threeEntity.dispose()
        } catch (error) {
          // One unconvertible entity must not abort the whole overlay.
          log.error(
            `[AcTrView2d] Failed to convert overlay entity ${entity.objectId} (${entity.type}):`,
            error
          )
        }
      }
    } finally {
      this._renderer.context.database = previousDatabase
    }

    return layout
  }

  /**
   * Re-apply canvas background after a layout tab switch using the sysvar for
   * the newly active layout (model or paper space).
   */
  private refreshCanvasBackgroundForActiveLayout() {
    const docManager = AcApDocManager as unknown as {
      _instance?: AcApDocManager
    }
    const database = docManager._instance?.curDocument?.database
    if (!database) return

    const isModelSpace = this.activeLayoutBtrId === this.modelSpaceBtrId
    this.applyCanvasBackground(
      readLayoutBackgroundColor(database, isModelSpace)
    )
  }

  /**
   * The block table record id of the model space
   */
  get modelSpaceBtrId() {
    return this._scene.modelSpaceBtrId
  }
  set modelSpaceBtrId(value: AcDbObjectId) {
    this._scene.modelSpaceBtrId = value
  }

  /**
   * The block table record id associated with the active layout
   */
  get activeLayoutBtrId() {
    return this._scene.activeLayoutBtrId
  }
  set activeLayoutBtrId(value: string) {
    const previous = this._scene.activeLayoutBtrId
    this._layoutViewManager.activeLayoutBtrId = value
    this._scene.activeLayoutBtrId = value
    this.htmlTransientManager.setActiveLayoutId(value)
    this._isDirty = true
    if (previous !== value) {
      notifyMeasurementLayoutChanged()
    }
  }

  /**
   * The active layout view
   */
  get activeLayoutView() {
    return this._layoutViewManager.activeLayoutView!
  }

  /**
   * The statistics of the current scene
   */
  get stats() {
    return this._scene.stats
  }

  /**
   * CAD scene graph used for rendering and HTML export.
   */
  get cadScene() {
    return this._scene
  }

  /**
   * Converts drawable entities into the scene before offline export.
   *
   * Interactive viewing skips off/frozen layers for performance; HTML snapshots
   * store layer visibility separately and need full geometry so the exported
   * layer panel can toggle layers on later.
   *
   * When `includeLayouts` is `true` (the default), paper-space tabs the user
   * never visited are registered and converted. When `false`, only model space
   * is converted.
   *
   * Converted geometry remains in the live scene after this call completes.
   */
  async ensureEntitiesConvertedForExport(options?: {
    includeInvisibleLayers?: boolean
    includeLayouts?: boolean
  }) {
    const includeInvisibleLayers = options?.includeInvisibleLayers !== false
    const includeLayouts = options?.includeLayouts !== false
    const db = AcApDocManager.instance.curDocument.database
    const pending: AcDbEntity[] = []

    // Paper-space tabs the user never visited exist in the layout table but
    // may be missing from the scene until first switch. HTML export needs
    // every layout's geometry, so register those BTRs before collecting.
    const layoutTable = db.objects?.layout
    if (includeLayouts && layoutTable?.newIterator) {
      for (const layout of layoutTable.newIterator()) {
        const btrId = layout.blockTableRecordId
        if (btrId) {
          this._scene.addEmptyLayout(btrId)
        }
      }
    }

    for (const [layoutBtrId] of this._scene.layouts) {
      if (!includeLayouts && layoutBtrId !== this._scene.modelSpaceBtrId) {
        continue
      }
      const blockTableRecord = db.tables.blockTable.getIdAt(layoutBtrId)
      if (!blockTableRecord) {
        continue
      }
      pending.push(
        ...this._entityDisplay.collectMissingEntitiesForExport(
          blockTableRecord,
          objectId => this.hasEntity(objectId),
          includeInvisibleLayers
        )
      )
    }

    if (pending.length > 0) {
      this._numOfEntitiesToProcess += pending.length
      await this.batchConvert(pending, { forExport: true })
    }

    // Open-time deferred glyph jobs may still be draining even when every
    // entity id is already present (or when nothing was missing for export).
    const idle = await this.waitUntilIdle()
    if (!idle) {
      log.warn(
        '[AcTrView2d] Timed out waiting for deferred geometry before export'
      )
    }
  }

  /**
   * The internal THREE scene used by this view.
   */
  get internalScene() {
    return this._scene.internalScene
  }

  /**
   * The HTML transient elements manager for placing overlays anchored to world coordinates.
   */
  get htmlTransientManager(): AcTrHtmlTransientManager {
    return this._scene.htmlTransientManager
  }

  /**
   * The internal THREE camera used by current active layout.
   */
  get internalCamera() {
    return this.activeLayoutView?.internalCamera
  }

  /**
   * Sets global ltscale
   */
  set ltscale(scale: number) {
    this._renderer.ltscale = scale
  }

  /**
   * Sets global celtscale
   */
  set celtscale(scale: number) {
    this._renderer.celtscale = scale
  }

  /**
   * @inheritdoc
   */
  screenToWorld(point: AcGePoint2dLike): AcGePoint2d {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView
      ? activeLayoutView.screenToWorld(point)
      : new AcGePoint2d(point)
  }

  /**
   * @inheritdoc
   */
  worldToScreen(point: AcGePoint2dLike): AcGePoint2d {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView
      ? activeLayoutView.worldToScreen(point)
      : new AcGePoint2d(point)
  }

  /**
   * @inheritdoc
   */
  zoomTo(box: AcGeBox2d, margin: number = 1.1) {
    this.activeLayoutView.zoomTo(box, margin)
    this._isDirty = true
  }

  /**
   * Re-render points with latest point style settings
   * @param displayMode Input display mode of points
   */
  rerenderPoints(displayMode: number) {
    const activeLayout = this._scene.activeLayout
    if (activeLayout) {
      activeLayout.rerenderPoints(displayMode)
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  zoomToFitDrawing(timeout: number = 0, layoutBtrId?: AcDbObjectId) {
    const waiter = new AcEdConditionWaiter(
      // Include deferred glyph/group jobs so text extents land before final fit.
      () => !this.isProcessingEntities,
      () => {
        if (layoutBtrId && this._externallyFramedLayouts.delete(layoutBtrId)) {
          this.endProgressiveOpenFit()
          return
        }
        this._progressiveOpenFit.applyFinalFit(() => this.resolveLayoutFitBox())
        this.endProgressiveOpenFit()
        const originalBtrId = layoutBtrId ?? this.activeLayoutBtrId
        if (originalBtrId) {
          AcApZoomCmd.rememberOriginalView(this, originalBtrId)
        }
      },
      300, // check every 300 ms
      timeout
    )
    waiter.start()
  }

  /**
   * @inheritdoc
   */
  zoomToFitLayer(layerName: string) {
    const activeLayout = this._scene.activeLayout
    if (activeLayout) {
      const layer = activeLayout.getLayer(layerName)
      if (layer && !layer.box.isEmpty()) {
        const box = AcTrGeometryUtil.threeBox3dToGeBox2d(layer.box)
        this.zoomTo(box)
        this._isDirty = true
        return true
      }
    }
    return false
  }

  /**
   * @inheritdoc
   */
  flyTo(point: AcGePoint2dLike, scale: number) {
    this.activeLayoutView.flyTo(point, scale)
    this._isDirty = true
  }

  private async openPickedEntityEditor(e: MouseEvent) {
    const point = this.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    const worldPoint = this.screenToWorld(point)
    const picked = this.pick(worldPoint, undefined, true)
    if (!picked.length) return

    const entity =
      AcApDocManager.instance.curDocument.database.tables.blockTable.getEntityById(
        picked[0].id
      )
    if (!entity) return

    const attributedBlock = this.resolveAttributedBlockReference(entity)
    if (attributedBlock) {
      e.preventDefault()
      this.selectionSet.clear()
      this.selectionSet.add(attributedBlock.objectId)
      AcApDocManager.instance.sendStringToExecute('attedit')
      return
    }

    if (!(entity instanceof AcDbMText)) return

    e.preventDefault()
    await this.editMTextEntity(entity)
  }

  /**
   * Resolves an attributed INSERT from a picked block reference or attribute.
   */
  private resolveAttributedBlockReference(
    entity: AcDbEntity
  ): AcDbBlockReference | undefined {
    if (entity instanceof AcDbBlockReference) {
      if (entity.attributeIterator().count > 0) return entity
      return undefined
    }

    if (entity instanceof AcDbAttribute) {
      const owner =
        AcApDocManager.instance.curDocument.database.tables.blockTable.getEntityById(
          entity.ownerId
        )
      if (
        owner instanceof AcDbBlockReference &&
        owner.attributeIterator().count > 0
      ) {
        return owner
      }
    }

    return undefined
  }

  private async editMTextEntity(mtext: AcDbMText) {
    const db = mtext.database

    if (mtext.lineSpacingFactor !== AcEdMTextEditor.defaultLineSpacingFactor) {
      acapRunDatabaseEdit(db, 'Edit MText', () => {
        const opened = db.openEntityForWrite(mtext)
        if (!(opened instanceof AcDbMText)) return
        opened.lineSpacingFactor = AcEdMTextEditor.defaultLineSpacingFactor
      })
    }

    // Hide the in-scene MTEXT while the inline editor renders its own copy; otherwise
    // both draw at once (double text) when the user double-clicks to edit.
    // this.removeEntity(mtext)
    this._isDirty = true

    const editor = new AcEdMTextEditor()
    let applied = false
    try {
      const result = await editor.open({
        view: this,
        location: mtext.location,
        width: this.resolveMTextEditorWidth(mtext),
        textHeight: this.resolveMTextEditorTextHeight(mtext),
        initialText: mtext.contents,
        initialAttachmentPoint: mtext.attachmentPoint,
        toolbarFontFamilies: this.getMTextToolbarFontFamilies()
      })
      if (!result) return

      acapRunDatabaseEdit(db, 'Edit MText', () => {
        const opened = db.openEntityForWrite(mtext)
        if (!(opened instanceof AcDbMText)) return
        opened.location = result.location
        opened.contents = result.contents
        opened.width = result.width
        opened.height = result.height
        opened.lineSpacingFactor = result.lineSpacingFactor
        opened.attachmentPoint = result.attachmentPoint
      })
      applied = true
    } finally {
      if (!applied) {
        this.updateEntity(mtext)
        this._isDirty = true
      }
    }
  }

  private resolveMTextEditorWidth(mtext: AcDbMText) {
    const width = Number(mtext.width)
    if (Number.isFinite(width) && width > 0) return width
    return 1e-4
  }

  private resolveMTextEditorTextHeight(mtext: AcDbMText) {
    const textHeight = Number(mtext.height)
    if (Number.isFinite(textHeight) && textHeight > 0) return textHeight
    return this.pixelsToWorldY(24)
  }

  private pixelsToWorldY(pixels: number) {
    const p0 = this.screenToWorld({ x: 0, y: 0 })
    const p1 = this.screenToWorld({ x: 0, y: pixels })
    return Math.max(Math.abs(p1.y - p0.y), 1e-4)
  }

  private getMTextToolbarFontFamilies() {
    return Array.from(
      new Set(
        AcApDocManager.instance.avaiableFonts
          .flatMap(fontInfo => fontInfo.name)
          .map(fontName => fontName.trim())
          .filter(fontName => fontName.length > 0)
      )
    )
  }

  /**
   * @inheritdoc
   *
   * In **paper space** layouts the selection pipeline supports
   * "drill-through": clicks inside a viewport rectangle resolve against
   * the model-space entities that are visually rendered through that
   * viewport, rather than picking the viewport's border. Clicks **near**
   * the border still pick the `AcDbViewport` entity itself so the user
   * can grip, move, lock or delete the viewport.
   *
   * This mirrors AutoCAD **web** behaviour (single-click selection of
   * model content through the viewport). The desktop ARX behaviour
   * (explicit MSPACE/PSPACE modes, CVPORT system variable, double-click
   * to enter mspace) is a separate, larger feature — tracked in
   * `.claude/plans/next_14_viewports_full.md` PR-γ Option A. We
   * intentionally do **not** implement it here.
   *
   * The border vs interior decision uses a tolerance derived from
   * `selectionBoxSize` (the same pixel-sized hit radius used elsewhere
   * in pick) converted to paper-space WCS via `pointToBox`. This keeps
   * the gesture consistent with how other entity edges behave — you
   * don't have to land pixel-perfect on the viewport line to grab it.
   */
  pick(point?: AcGePoint2dLike, hitRadius?: number, pickOneOnly?: boolean) {
    if (point == null) point = this.curPos
    const results: AcEdSpatialQueryResultItemEx[] = []
    const activeLayout = this._scene.activeLayout
    if (!activeLayout) return results

    const activeLayoutView = this.activeLayoutView
    const effectiveHitRadius = hitRadius ?? this.selectionBoxSize
    const paperBox = activeLayoutView.pointToBox(point, effectiveHitRadius)
    const threshold = Math.max(
      paperBox.size.width / 2,
      paperBox.size.height / 2
    )

    // Identify drill-through viewports (paper space only): viewports whose
    // paper rectangle contains the click AND whose border is NOT within
    // tolerance of the click. The border tolerance is the average of the
    // hit-box width/height — a robust, scale-aware proxy for "user is
    // trying to grab the frame, not click inside".
    const isPaperSpace =
      activeLayoutView.layoutBtrId !== this._scene.modelSpaceBtrId
    const borderTolerance = (paperBox.size.width + paperBox.size.height) / 2
    const drillThroughViewports: AcTrViewportView[] = []
    const drillThroughViewportIds = new Set<AcDbObjectId>()
    if (isPaperSpace) {
      for (const vpView of activeLayoutView.viewportViews) {
        if (
          vpView.containsPaperPoint(point) &&
          !vpView.isNearPaperBorder(point, borderTolerance)
        ) {
          drillThroughViewports.push(vpView)
          drillThroughViewportIds.add(vpView.viewport.id)
        }
      }
    }

    // 1) Resolve hits in the active layout. Skip the `AcDbViewport`
    //    entity for any viewport we're drilling through — otherwise the
    //    rectangle's bounding box always wins (it covers the whole click
    //    region) and selection feels "stuck on the frame".
    const firstQueryResults = this._scene.search(paperBox)
    const raycaster = activeLayoutView.resetRaycaster(point, threshold)
    firstQueryResults.forEach(item => {
      if (drillThroughViewportIds.has(item.id)) return
      if (!isEffectiveSpatialQueryHit(item)) return
      if (activeLayout.isIntersectWith(item.id, raycaster)) {
        results.push(item)
      }
    })

    // 2) For each drill-through viewport, resolve hits against the
    //    model-space layout using the viewport's own camera/raycaster.
    if (drillThroughViewports.length > 0) {
      this.pickThroughViewports(point, paperBox, drillThroughViewports, results)
    }

    const sortedResults = sortPickResults(results, point)
    return pickOneOnly ? sortedResults.slice(0, 1) : sortedResults
  }

  /**
   * Resolves hits against the model-space layout for each viewport the
   * click drills through. Appends the matches into `results` (caller
   * sorts/dedups). Kept private and separate from `pick` so the main
   * pick path stays a single straight read.
   *
   * Each viewport gets its own raycaster shot (using the viewport view's
   * own camera, which is zoomed to `viewport.viewBox` in model WCS), so
   * a click that lands in overlapping viewports correctly resolves
   * against each viewport's particular model framing.
   *
   * `pickThroughViewports` does NOT consult the active (paper) layout's
   * spatial index — that work is already done by the caller. It only
   * adds model-space results that would otherwise be invisible to the
   * paper-space pick.
   */
  private pickThroughViewports(
    paperPoint: AcGePoint2dLike,
    paperBox: AcGeBox2d,
    viewports: AcTrViewportView[],
    results: AcEdSpatialQueryResultItemEx[]
  ) {
    const modelLayout = this._scene.modelSpaceLayout
    if (!modelLayout) return

    // Half-extent of the paper-space hit box (== "radius" in paper WCS).
    // Multiplied per viewport by its paper→model scale, this becomes a
    // model-WCS radius that the per-viewport raycaster threshold and the
    // spatial-index probe both use. This keeps the hit area visually
    // consistent across viewports at different zoom levels.
    const paperHalfRadius = (paperBox.size.width + paperBox.size.height) / 4

    for (const vpView of viewports) {
      const modelPt = vpView.paperPointToModel(paperPoint)
      const modelRadius = paperHalfRadius * vpView.paperToModelScale
      if (modelRadius <= 0) continue

      const modelBox = new AcGeBox2d().setFromPoints([
        new AcGePoint2d(modelPt.x - modelRadius, modelPt.y - modelRadius),
        new AcGePoint2d(modelPt.x + modelRadius, modelPt.y + modelRadius)
      ])

      const vpRaycaster = vpView.resetRaycaster(modelPt, modelRadius)
      const modelHits = modelLayout.search(modelBox)
      modelHits.forEach(item => {
        if (!isEffectiveSpatialQueryHit(item)) return
        if (modelLayout.isIntersectWith(item.id, vpRaycaster)) {
          results.push(item)
        }
      })
    }
  }

  /**
   * @inheritdoc
   */
  search(box: AcGeBox2d | AcGeBox3d, options?: AcTrSpatialSearchOptions) {
    return this._scene.search(box, options)
  }

  /**
   * @inheritdoc
   */
  select(point?: AcGePoint2dLike) {
    const idsAdded: Array<AcDbObjectId> = []
    const results = this.pick(point)
    results.forEach(item => idsAdded.push(item.id))
    if (idsAdded.length > 0) this.selectionSet.add(idsAdded)
  }

  /**
   * @inheritdoc
   */
  selectByBox(box: AcGeBox2d) {
    this.selectByBoxWithMode(box, 'crossing', 'add')
  }

  /**
   * @inheritdoc
   */
  addLayer(layer: AcDbLayerTableRecord) {
    this._scene.addLayer(this.toLayerInfo(layer))
    this._layerAppearance.syncFromLiveRecord(layer)
    this._isDirty = true
  }

  /**
   * @inheritdoc
   */
  updateLayer(
    layer: AcDbLayerTableRecord,
    changes: Partial<AcDbLayerTableRecordAttrs>
  ) {
    const { touchedObjectIds } = this._scene.updateLayer(
      this.toLayerInfo(layer)
    )

    if (this._layerAppearance.layerStyleMayHaveChanged(changes)) {
      this._layerAppearance.syncFromLiveRecord(layer)
    }

    if (this._entityDisplay.layerVisibilityMayHaveChanged(changes)) {
      const layerInfo = this.toLayerInfo(layer)
      // Normal entities convert when the layer is on and thawed. INSERTs also
      // convert when thawed while still off (Off must not skip multi-layer
      // block contents).
      if (AcTrLayer.isLayerVisible(layerInfo) || !layerInfo.isFrozen) {
        void this.convertMissingEntitiesOnLayer(layer.name)
      }
    }

    // Thawing an INSERT layer may restore cross-layer fragments that were
    // session-hidden; reapply that state.
    for (const objectId of touchedObjectIds) {
      this.applySessionHiddenObjectState(objectId)
    }

    this._isDirty = true
  }

  /**
   * Add the specified transient entity or entities into this view
   * @param entity Input one or multiple transient entities
   */
  addTransientEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    const epoch = this._convertEpoch
    // Overlay transients (markup / measurement / jigs) must honor entity
    // lineweight even when LWDISPLAY is off; otherwise ribbon style is a no-op.
    const previousForce = this._renderer.forceShowLineWeight
    this._renderer.forceShowLineWeight = true
    try {
      for (let i = 0; i < entities.length; ++i) {
        const entity = entities[i]
        const threeEntity: AcTrEntity | null = this.drawEntity(entity, true)
        if (threeEntity) {
          threeEntity.objectId = entity.objectId
          void threeEntity
            .asyncDraw()
            .then(() => {
              // Drop stale transients started before clear()/regen invalidated the view.
              if (epoch !== this._convertEpoch) {
                threeEntity.dispose()
                return
              }
              this._scene.addTransientEntity(threeEntity)
              this._isDirty = true
            })
            .catch(error => {
              log.error('[AcTrView2d] Transient entity geometry failed:', error)
              threeEntity.dispose()
            })
        }
      }
    } finally {
      this._renderer.forceShowLineWeight = previousForce
    }
  }

  /**
   * Remove the specified transient entity from this view
   * @param objectId Input the object id of the transient entity to remove
   */
  removeTransientEntity(objectId: AcDbObjectId) {
    this._scene.removeTransientEntity(objectId)
    this._isDirty = true
  }

  /**
   * Show or hide a published CAD transient entity (e.g. when its measurement
   * group is hidden by a layout switch).
   */
  setTransientEntityVisible(objectId: AcDbObjectId, visible: boolean): void {
    if (this._scene.setTransientEntityVisible(objectId, visible)) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  canCreateEntityPreview(entityIds: AcDbObjectId[]): boolean {
    return this._scene.canCreatePreview(entityIds)
  }

  /**
   * @inheritdoc
   */
  createEntityPreview(entityIds: AcDbObjectId[]): string | null {
    const handleId = this._scene.createPreview(entityIds)
    if (handleId) {
      this._isDirty = true
    }
    return handleId
  }

  /**
   * @inheritdoc
   */
  updateEntityPreview(handleId: string, matrix: AcGeMatrix3d): void {
    if (
      this._scene.updatePreview(handleId, AcTrMatrixUtil.createMatrix4(matrix))
    ) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  removeEntityPreview(handleId: string): void {
    if (this._scene.removePreview(handleId)) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  updateTransientPreviewTransforms(
    transforms: ReadonlyArray<{
      objectId: AcDbObjectId
      matrix: AcGeMatrix3d
    }>
  ): void {
    const updated = this._scene.updateTransientPreviewTransforms(
      transforms.map(entry => ({
        objectId: entry.objectId,
        matrix: AcTrMatrixUtil.createMatrix4(entry.matrix)
      }))
    )
    if (updated.webgl) this._isDirty = true
    if (updated.html) this._htmlDirty = true
  }

  /**
   * @inheritdoc
   */
  addEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    this._numOfEntitiesToProcess += entities.length
    if (this._progressiveRendering) {
      this._convertQueue.push(...entities)
      void this.drainConvertQueue()
    } else {
      void this.batchConvert(entities)
    }
  }

  /**
   * @inheritdoc
   */
  removeEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    entities.forEach(entity => this._scene.removeEntity(entity.objectId))
    this._isDirty = true
  }

  /**
   * @inheritdoc
   */
  hasEntity(objectId: AcDbObjectId) {
    return this._scene.hasEntity(objectId)
  }

  /**
   * @inheritdoc
   */
  getEntityVisible(objectId: AcDbObjectId) {
    return this._scene.getEntityVisible(objectId)
  }

  /**
   * Updates entity visibility without rebuilding batched geometry.
   */
  updateEntityVisibility(entity: AcDbEntity) {
    if (!this._scene.setEntityVisible(entity.objectId, entity.visibility)) {
      return false
    }
    this._isDirty = true
    return true
  }

  /**
   * Updates scene visibility for one entity without changing the database.
   */
  setEntitySceneVisible(objectId: AcDbObjectId, visible: boolean) {
    if (!this._scene.setEntityVisible(objectId, visible)) {
      return false
    }
    this._isDirty = true
    return true
  }

  /**
   * Reapplies session-only hidden state after an entity enters the scene.
   */
  private applySessionHiddenObjectState(objectId: AcDbObjectId) {
    if (!AcApDocManager.instance.curDocument.isObjectHidden(objectId)) {
      return
    }
    this._scene.setEntityVisible(objectId, false)
  }

  /**
   * Rebuilds scene geometry for entities whose shape or styling changed.
   *
   * Pure translations should use {@link translateEntity} instead.
   *
   * Attribute entities are drawn as part of their owning INSERT, so attribute
   * edits are remapped to the parent {@link AcDbBlockReference} before the
   * scene is updated.
   */
  updateEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = this.resolveSceneUpdateEntities(
      Array.isArray(entity) ? entity : [entity]
    )
    if (entities.length === 0) return

    const selectedIds = entities
      .map(item => item.objectId)
      .filter(objectId => this.selectionSet.has(objectId))

    for (let i = 0; i < entities.length; ++i) {
      const item = entities[i]
      if (this._scene.hasEntity(item.objectId)) {
        this._scene.removeEntity(item.objectId)
      }
    }

    // Reconvert through the same path as initial load so block references are
    // split by layer correctly and deferred MTEXT/SHAPE geometry is drawn.
    void (async () => {
      await this.batchConvert(entities)
      await this.waitUntilDeferredGeometryIdle()
      if (selectedIds.length > 0) {
        this.highlight(selectedIds)
      }
      this._gripManager.refresh()
    })()
    this._isDirty = true
    // Not sure why texture for image entity isn't updated even if 'isDirty' flag is already set to true.
    // So add one timeout event to set 'isDirty' flag to true again to make it work
    setTimeout(() => {
      this._isDirty = true
    }, 100)
  }

  /**
   * Maps entities that are not independently drawn in the scene to the
   * drawable entity that must be rebuilt (for example ATTRIB → INSERT).
   */
  private resolveSceneUpdateEntities(entities: AcDbEntity[]): AcDbEntity[] {
    const db = AcApDocManager.instance.curDocument?.database
    const resolved: AcDbEntity[] = []
    const seen = new Set<AcDbObjectId>()

    for (const entity of entities) {
      let target: AcDbEntity = entity
      if (entity instanceof AcDbAttribute) {
        const owner = db?.tables.blockTable.getEntityById(entity.ownerId)
        if (!(owner instanceof AcDbBlockReference)) {
          continue
        }
        target = owner
      }

      if (seen.has(target.objectId)) continue
      seen.add(target.objectId)
      resolved.push(target)
    }

    return resolved
  }

  /**
   * @inheritdoc
   */
  addLayout(layout: AcDbLayout) {
    this._scene.addEmptyLayout(layout.blockTableRecordId)
    this.createLayoutViewIfNeeded(layout.blockTableRecordId)
    this._isDirty = true
  }

  /**
   * Marks a layout as already framed by an external caller (typically
   * `AcApDocManager.onAfterOpenDocument`, which zooms the startup
   * layout right after parsing). Subsequent first-visit async zoom
   * callbacks (`applyInitialZoom`, `zoomToFitDrawing(..., layoutBtrId)`)
   * for this btrId are suppressed so they do not override the
   * application layer's initial camera.
   *
   * This is the public counterpart of the `_initializedLayouts` set —
   * exposed so the application layer can stay in sync with the view's
   * notion of "which layouts have been framed already" without
   * needing access to private state.
   */
  markLayoutAsInitialized(layoutBtrId: AcDbObjectId) {
    this._initializedLayouts.add(layoutBtrId)
    this._externallyFramedLayouts.add(layoutBtrId)
  }

  /**
   * Resolves the 2D box to frame for the active layout once entities are
   * converted. Uses {@link AcTrScene.box}, which is derived from batch geometry.
   */
  private resolveLayoutFitBox(): AcGeBox2d | undefined {
    const sceneBox = this._scene.box
    if (sceneBox && !sceneBox.isEmpty()) {
      return AcTrGeometryUtil.threeBox3dToGeBox2d(sceneBox)
    }
    return undefined
  }

  /**
   * Applies the initial zoom-to-fit for a layout the user just switched
   * into for the first time. Picks the best available "what should the
   * camera frame?" signal in this order:
   *
   * 1. **`AcDbLayout.limits`** (LIMMIN/LIMMAX) — only when it actually
   *    contains the layout's viewports. Many real DWGs ship with garbage
   *    limits (e.g. `(0,0)-(12,9)` from a legacy template setup) that
   *    don't reflect the actual paper sheet. We reject those by
   *    checking containment against `viewportsBoundingBox`.
   *
   * 2. **`AcTrLayoutView.viewportsBoundingBox`** — bounding box of all
   *    real user viewports in the layout. In production sheets viewports
   *    typically span 70-90% of the paper, so this is a great proxy for
   *    the printable area and (crucially) ignores outliers like title
   *    blocks authored in a different unit/scale.
   *
   * 3. **`AcDbLayout.extents`** — the layout's own EXTMIN/EXTMAX, if
   *    populated. Many parsers leave this empty (we've seen `(0,0)-(0,0)`),
   *    so it sits below the viewport-based heuristic.
   *
   * 4. **`resolveLayoutFitBox`** (entity extents from batch geometry) —
   *    last-resort fallback for layouts with no viewports and no
   *    sensible limits/extents (e.g. a freshly created empty paper).
   *    Vulnerable to scale-mismatch outliers, but better than no zoom.
   *
   * **Critically, this runs through `AcEdConditionWaiter`**: at the
   * moment `layoutSwitched` fires, the layout's entities (including its
   * `AcDbViewport`s) have not yet been batch-converted into the scene
   * — `loadLayoutEntitiesIfNeeded` chunked-converts via the progressive
   * convert queue (or direct `batchConvert`).
   * Without the waiter, `viewportsBoundingBox` returns undefined and
   * the strategy degrades into (1) zooming to garbage `limits`, or
   * (4) zooming to an empty scene box. The waiter polls
   * {@link isProcessingEntities} (convert queue + deferred glyph jobs)
   * and only fires the heuristic once conversion and text geometry finish.
   */
  private applyInitialZoom(btrId: AcDbObjectId, layout: AcDbLayout) {
    const waiter = new AcEdConditionWaiter(
      () => !this.isProcessingEntities,
      () => {
        if (this._externallyFramedLayouts.delete(btrId)) {
          return
        }

        const limits = layout.limits
        const layoutView = this._layoutViewManager.getAt(btrId)
        const vpsBox = layoutView?.viewportsBoundingBox

        const limitsContainsViewports = (() => {
          if (!limits || limits.isEmpty()) return false
          if (!vpsBox) return true
          return (
            limits.min.x <= vpsBox.min.x &&
            limits.min.y <= vpsBox.min.y &&
            limits.max.x >= vpsBox.max.x &&
            limits.max.y >= vpsBox.max.y
          )
        })()

        if (limits && !limits.isEmpty() && limitsContainsViewports) {
          this.zoomTo(limits)
        } else if (vpsBox) {
          this.zoomTo(vpsBox)
        } else if (layout.extents && !layout.extents.isEmpty()) {
          const extents = layout.extents
          this.zoomTo(
            new AcGeBox2d(
              { x: extents.min.x, y: extents.min.y },
              { x: extents.max.x, y: extents.max.y }
            )
          )
        } else {
          const box = this.resolveLayoutFitBox()
          if (box) {
            this.zoomTo(box)
          }
        }
        this._isDirty = true
        AcApZoomCmd.rememberOriginalView(this, btrId)
      },
      300,
      0
    )
    waiter.start()
  }

  /**
   * @inheritdoc
   */
  clear() {
    // Invalidate any in-flight progressive convert so it neither paints into
    // the cleared scene nor double-decrements the processing counter.
    this._convertEpoch++
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._pendingGeometryJobs = 0
    this._scene.clear()
    this._isDirty = true
    this._missedImages.clear()
    this._initializedLayouts.clear()
    this._externallyFramedLayouts.clear()
    this._loadingLayouts.clear()
    this._renderer.dispose()
  }

  /**
   * Captures GPU/camera/selection state so another document can occupy this view.
   *
   * @returns Parked state owned by {@link AcApDocSession} until restore.
   */
  captureSessionState(): AcTrViewSessionState {
    return {
      scene: this._scene,
      layoutViewManager: this._layoutViewManager,
      initializedLayouts: this._initializedLayouts,
      externallyFramedLayouts: this._externallyFramedLayouts,
      loadingLayouts: this._loadingLayouts,
      missedImages: this._missedImages,
      selectionIds: this.selectionSet.ids
    }
  }

  /**
   * Restores a parked document onto this shared view without disposing the renderer.
   *
   * @param state - Snapshot previously returned by {@link captureSessionState} or {@link beginNewSession}.
   */
  restoreSessionState(state: AcTrViewSessionState): void {
    this._convertEpoch++
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._pendingGeometryJobs = 0
    this._scene = state.scene
    this._layoutViewManager = state.layoutViewManager
    this._initializedLayouts = state.initializedLayouts
    this._externallyFramedLayouts = state.externallyFramedLayouts
    this._loadingLayouts = state.loadingLayouts
    this._missedImages = state.missedImages
    this.rebindLayerAppearance()
    this._layoutViewManager.resize(this.width, this.height)
    this.selectionSet.clear()
    if (state.selectionIds.length > 0) {
      this.selectionSet.add(state.selectionIds)
    }
    this._isDirty = true
  }

  /**
   * Detaches the current scene and installs an empty one for a newly opened document.
   *
   * @returns Parked state of the previous document.
   */
  beginNewSession(): AcTrViewSessionState {
    const parked = this.captureSessionState()
    this._convertEpoch++
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._pendingGeometryJobs = 0
    this._scene = this.createScene()
    this._layoutViewManager = new AcTrLayoutViewManager()
    this._initializedLayouts = new Set()
    this._externallyFramedLayouts = new Set()
    this._loadingLayouts = new Set()
    this._missedImages = new Map()
    this.rebindLayerAppearance()
    this.selectionSet.clear()
    this._isDirty = true
    return parked
  }

  /**
   * Disposes GPU resources for a parked session that is being closed.
   *
   * @param state - Parked snapshot to discard.
   */
  disposeSessionState(state: AcTrViewSessionState): void {
    state.scene.clear()
    state.layoutViewManager = new AcTrLayoutViewManager()
    state.initializedLayouts.clear()
    state.externallyFramedLayouts.clear()
    state.loadingLayouts.clear()
    state.missedImages.clear()
    state.selectionIds = []
  }

  /**
   * Recreates the layer-appearance controller after the scene is swapped.
   */
  private rebindLayerAppearance() {
    this._layerAppearance = new AcTrLayerAppearanceController(
      this._scene,
      this._renderer
    )
  }

  /**
   * True when this view is the document manager's live canvas.
   * Satellite/preview views must ignore global shortcuts and layout switches.
   */
  private isActiveManagedView(): boolean {
    const singleton = AcApDocManager as unknown as {
      _instance?: { curView?: AcTrView2d }
    }
    const current = singleton._instance?.curView
    return current == null || current === this
  }

  /**
   * Drains the progressive convert queue on a single serial worker so ENTITY
   * flush chunks can enqueue while conversion overlaps the loading overlay.
   *
   * Concurrent callers share the same promise; if more entities are queued
   * after a drain finishes, a follow-up drain is started.
   */
  private async drainConvertQueue(): Promise<void> {
    if (this._convertDrainPromise) {
      await this._convertDrainPromise
      if (this._convertQueue.length > 0) {
        await this.drainConvertQueue()
      }
      return
    }

    this._convertDrainPromise = (async () => {
      while (this._convertQueue.length > 0) {
        const batch = this._convertQueue.splice(0, this._convertQueue.length)
        await this.batchConvert(batch)
      }
    })().finally(() => {
      this._convertDrainPromise = null
    })

    await this._convertDrainPromise
  }

  /**
   * Marks the canvas dirty for progressive open, throttled to avoid painting
   * on every entity (which dominated total open time).
   */
  private markProgressiveDirty(force = false) {
    const now = performance.now()
    if (
      force ||
      now - this._lastProgressivePaintAt >=
        AcTrView2d.PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
    ) {
      this._isDirty = true
      this._lastProgressivePaintAt = now
    }
  }

  /**
   * @inheritdoc
   */
  highlight(ids: AcDbObjectId[]) {
    if (!this.entitySelectionEnabled) return
    this._isDirty = this._scene.select(ids)
  }

  /**
   * @inheritdoc
   */
  unhighlight(ids: AcDbObjectId[]) {
    this._isDirty = this._scene.unselect(ids)
  }

  /**
   * Enables compare-display coloring on non-overlay layouts of this view.
   * Pass an overlay {@link AcTrLayout} to color a reference overlay separately.
   *
   * @param options - Compare colors and per-entity role overrides.
   * @param targetLayout - Overlay layout to color; omit for the main scene.
   */
  setCompareDisplay(
    options: AcApCompareDisplayOptions,
    targetLayout?: AcTrLayout
  ) {
    const baseColor = options.baseColor ?? options.colors?.unchanged ?? 0x9ca3af
    const mapped = {
      enabled: options.enabled,
      baseColor,
      colors: {
        deleted: options.colors?.deleted,
        added: options.colors?.added,
        modified: options.colors?.modified
      },
      overrides: options.overrides
    }
    if (targetLayout) {
      targetLayout.setCompareDisplay(mapped)
    } else {
      this._scene.setCompareDisplay(mapped)
    }
    this._isDirty = true
  }

  stopAnimationLoop() {
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /**
   * @inheritdoc
   */
  onHover(id: AcDbObjectId) {
    if (!this.entitySelectionEnabled) return
    this._isDirty = this._scene.hover([id])
  }

  /**
   * @inheritdoc
   */
  onUnhover(id: AcDbObjectId) {
    this._isDirty = this._scene.unhover([id])
  }

  protected createScene() {
    return new AcTrScene()
  }

  private createStats(show?: boolean) {
    const stats = new Stats()
    document.body.appendChild(stats.dom)

    // Show Stats component at the right-bottom corner of the window
    const statsDom = stats.dom
    statsDom.style.position = 'fixed'
    statsDom.style.inset = 'unset'
    statsDom.style.bottom = '30px'
    statsDom.style.right = '0px'
    this.toggleStatsVisibility(stats, show)
    return stats
  }

  protected onWindowResize() {
    super.onWindowResize()
    this._renderer.setSize(this.width, this.height)
    this._css2dRenderer.setSize(this.width, this.height)
    this._layoutViewManager.resize(this.width, this.height)
    this._isDirty = true
  }

  private animate = () => {
    this._rafId = requestAnimationFrame(this.animate)

    this.events.renderFrame.dispatch({
      render: this._renderer,
      camera: this.internalCamera
    })

    const stillLoading = this._numOfEntitiesToProcess > 0
    const deferRenderWhileLoading = stillLoading && !this._progressiveRendering
    if (!this._isDirty && !this._htmlDirty && !stillLoading) return
    if (deferRenderWhileLoading) return
    if (!this._isDirty && !this._htmlDirty) return

    let needsRedraw = false
    if (this._isDirty) {
      if (this._progressiveRendering && stillLoading) {
        this._progressivePaintCount++
      }
      needsRedraw = this._layoutViewManager.render(this._scene)
    }
    // Camera / WebGL dirty also reprojects CSS2D overlays. HTML-only dirty
    // skips the WebGL pass so measurement badges and markup DOM can update
    // without clearing and redrawing the drawing.
    if (this.internalCamera && (this._isDirty || this._htmlDirty)) {
      this._css2dRenderer.render(this._scene.internalScene, this.internalCamera)
    }
    this._stats?.update()
    // Do not re-dirty every frame during progressive open — paint is throttled
    // from geometry batches to keep total open time down. Counter hitting 0
    // still forces a final dirty in decreaseNumOfEntitiesToProcess().
    this._isDirty = needsRedraw
    this._htmlDirty = false
  }

  private startAnimationLoop() {
    if (this._rafId == null) {
      this._rafId = requestAnimationFrame(this.animate)
    }
  }

  /**
   * Create the layout view with the specified block table record id.
   * @param layoutBtrId Input the block table record id associated with the layout view.
   */
  private createLayoutViewIfNeeded(layoutBtrId: AcDbObjectId) {
    let layoutView = this._layoutViewManager.getAt(layoutBtrId)
    if (layoutView == null) {
      layoutView = new AcTrLayoutView(
        this._renderer,
        layoutBtrId,
        this.width,
        this.height
      )
      layoutView.events.viewChanged.addEventListener(() => {
        this._progressiveOpenFit.onLayoutViewChanged()
        this._isDirty = true
        this.events.viewChanged.dispatch()
        this.clearHover()
      })
      this._layoutViewManager.add(layoutView)
    }
    return layoutView
  }

  /**
   * Load entities from the specified layout if they haven't been loaded yet.
   * This ensures that when switching to a layout, all its entities are available for rendering.
   *
   * Two non-obvious invariants are enforced here:
   *
   * 1. The layout is looked up by `layoutBtrId` (the argument), not by
   *    `this._scene.activeLayout`. The active layout reference happens to
   *    match in the current `layoutSwitched` handler call site, but relying
   *    on it would silently miss layouts that are pre-loaded ahead of
   *    becoming active (e.g. background prefetch).
   * 2. The `_loadingLayouts` guard prevents re-entrance while the
   *    convert drain is still in flight. Without it,
   *    clicking the same layout tab twice in quick succession (or
   *    `layoutSwitched` firing twice during the async window) would iterate
   *    the block table record again and duplicate every entity in the
   *    layout — visible as ghosted overdraw and double the spatial-index
   *    weight.
   *
   * @param layoutBtrId Input the block table record id of the layout
   */
  private loadLayoutEntitiesIfNeeded(layoutBtrId: AcDbObjectId) {
    try {
      const db = AcApDocManager.instance.curDocument.database
      const blockTableRecord = db.tables.blockTable.getIdAt(layoutBtrId)
      if (!blockTableRecord) {
        return
      }

      const existingLayout = this._scene.layouts.get(layoutBtrId)
      if (existingLayout && existingLayout.isLoaded) {
        return
      }
      if (this._loadingLayouts.has(layoutBtrId)) {
        return
      }

      // Ensure `AcTrViewportView`s exist for every real `AcDbViewport`
      // in this layout when the layout's entities were already streamed
      // in by the document parser. There is a race in the parser-driven
      // load path: `addLayout(layout)` creates the `AcTrLayoutView`,
      // but the parser may dispatch the AcDbViewport entities before
      // that happens. When that races, `batchConvert`'s viewport
      // handler does `_layoutViewManager.getAt(entity.ownerId)`, gets
      // `undefined`, and **silently skips creating the
      // AcTrViewportView**. The reload path below used to mask this by
      // re-running batchConvert after the layoutView existed, but the
      // entityCount-skip optimization that follows removes that
      // side-effect, so we do the viewport-view-only pass explicitly
      // here. Skipped when the layout is empty — in that case the
      // batchConvert path below will create the viewport views directly
      // as it processes each entity.
      const layoutView = this._layoutViewManager.getAt(layoutBtrId)
      if (
        existingLayout &&
        existingLayout.entityCount > 0 &&
        layoutView &&
        layoutView.viewportCount === 0
      ) {
        this.ensureViewportViews(blockTableRecord, layoutView)
      }

      // Model space (and any other layout pre-populated by the document
      // parser at open time) lands here without `isLoaded` ever having
      // been flipped — the initial entity stream goes through
      // `addEntity()` directly, bypassing this method. Without this
      // guard, switching back to model space from a paper layout would
      // re-iterate the full block table record and re-batch-convert
      // every entity (5759+ on real DWGs), freezing the UI for several
      // seconds AND duplicating entities (every entity ends up in the
      // layout twice, doubling the spatial-index weight and render
      // cost).
      //
      // If the layout already has entities, the parser has finished
      // loading them — flip the flag and bail. The reload path below
      // is only for layouts whose entities were never streamed in
      // (typically non-active paper-space layouts loaded on first user
      // visit).
      if (existingLayout && existingLayout.entityCount > 0) {
        existingLayout.isLoaded = true
        return
      }

      // Ensure layout exists in scene. `addEmptyLayout` is idempotent, but
      // guarding the call avoids an unnecessary Map probe + log noise.
      if (!existingLayout) {
        this._scene.addEmptyLayout(layoutBtrId)
      }

      // Collect all entities from this layout
      const entities: AcDbEntity[] = []
      const iterator = blockTableRecord.newIterator()
      for (const entity of iterator) {
        entities.push(entity)
      }

      if (entities.length === 0) {
        // Empty layout (e.g. a freshly-created paper space tab). Mark as
        // loaded immediately so subsequent visits short-circuit.
        const layout = this._scene.layouts.get(layoutBtrId)
        if (layout) {
          layout.isLoaded = true
        }
        return
      }

      // Load entities asynchronously when progressive rendering is enabled.
      this._loadingLayouts.add(layoutBtrId)
      this._numOfEntitiesToProcess += entities.length
      const convert = async () => {
        try {
          if (this._progressiveRendering) {
            this._convertQueue.push(...entities)
            await this.drainConvertQueue()
          } else {
            await this.batchConvert(entities)
          }
          const layout = this._scene.layouts.get(layoutBtrId)
          if (layout) {
            layout.isLoaded = true
          }
        } finally {
          this._loadingLayouts.delete(layoutBtrId)
        }
      }
      void convert()
    } catch (error) {
      log.error('[AcTrView2d] Error loading layout entities:', error)
    }
  }

  /**
   * Show or hide stats component
   * @param show If it is true, show stats component. Otherwise, hide stats component.
   * Default value is false.
   */
  private toggleStatsVisibility(stats: Stats, show?: boolean) {
    if (show) {
      stats.dom.style.display = 'block' // Show the stats
    } else {
      stats.dom.style.display = 'none' // Hide the stats
    }
  }

  private toLayerInfo(layer: AcDbLayerTableRecord) {
    return {
      name: layer.name,
      isFrozen: layer.isFrozen,
      isOff: layer.isOff,
      color: layer.color
    }
  }

  private resolveLayerInfo(layerName: string) {
    const layer =
      AcApDocManager.instance.curDocument.database.tables.layerTable.getAt(
        layerName
      )
    return layer ? this.toLayerInfo(layer) : undefined
  }

  /**
   * Converts entities on the given layer that were skipped while the layer was
   * off/frozen and therefore are not yet present in the scene.
   */
  private async convertMissingEntitiesOnLayer(layerName: string) {
    if (this._convertingLayers.has(layerName)) {
      return
    }
    this._convertingLayers.add(layerName)
    try {
      const db = AcApDocManager.instance.curDocument.database
      const blockTableRecord = db.tables.blockTable.getIdAt(
        this.activeLayoutBtrId
      )
      if (!blockTableRecord) {
        return
      }

      const pending = this._entityDisplay.collectMissingEntitiesOnLayer(
        layerName,
        blockTableRecord,
        objectId => this.hasEntity(objectId)
      )
      if (pending.length === 0) {
        return
      }

      this._numOfEntitiesToProcess += pending.length
      await this.batchConvert(pending)
    } finally {
      this._convertingLayers.delete(layerName)
    }
  }

  private drawEntity(entity: AcDbEntity, delay?: boolean) {
    return entity.worldDraw(this._renderer, delay) as AcTrEntity | null
  }

  /**
   * Finishes geometry for a converted entity.
   *
   * Glyph entities and block groups use {@link AcTrEntity.asyncDraw} so
   * {@link FontManager.awaitFontsBeforeDraw} can wait for fonts without
   * relying on a full-scene regen. Other entities keep the sync finalize path.
   */
  private async finishEntityGeometry(
    threeEntity: AcTrEntity,
    _progressive: boolean
  ) {
    if (threeEntity instanceof AcTrGroup) {
      // Compacted INSERT templates may skip syncDraw when fonts are awaited
      // later; still walk for empty glyph shells. Skip only when there is
      // nothing left to finalize (incl. post-cache ATTRIBs).
      if (
        threeEntity.getSourceEntities().length === 0 &&
        !this.groupHasPendingGlyphGeometry(threeEntity)
      ) {
        return
      }
      await threeEntity.asyncDraw()
      return
    }
    if (threeEntity.hasDrawableGeometry()) {
      return
    }
    await threeEntity.asyncDraw()
  }

  private needsDeferredFontGeometry(threeEntity: AcTrEntity): boolean {
    return (
      threeEntity instanceof AcTrGlyphEntity || threeEntity instanceof AcTrGroup
    )
  }

  private groupHasPendingGlyphGeometry(group: AcTrGroup): boolean {
    let pending = false
    group.traverse(child => {
      if (child instanceof AcTrGlyphEntity && !child.hasDrawableGeometry()) {
        pending = true
      }
    })
    return pending
  }

  /**
   * Runs glyph/group geometry finalize off the main convert loop so other
   * entities keep converting while fonts download.
   */
  private enqueueDeferredGeometry(
    run: () => Promise<void>,
    epoch: number
  ): void {
    if (epoch !== this._convertEpoch) {
      return
    }
    this._pendingGeometryJobs++
    void run()
      .then(() => {
        // Convert counter often hits 0 before fonts finish; without this,
        // text added later never paints until the user pans/zooms.
        if (epoch === this._convertEpoch) {
          this._isDirty = true
        }
      })
      .catch(error => {
        log.error('[AcTrView2d] Deferred entity geometry failed:', error)
      })
      .finally(() => {
        if (epoch === this._convertEpoch) {
          this._pendingGeometryJobs = Math.max(0, this._pendingGeometryJobs - 1)
          if (this._pendingGeometryJobs === 0) {
            this._isDirty = true
          }
        }
      })
  }

  /**
   * Waits until side-pool glyph/group jobs for the current convert epoch finish.
   * Used by entity updates that must highlight after text is in the scene.
   */
  private async waitUntilDeferredGeometryIdle(): Promise<void> {
    const epoch = this._convertEpoch
    while (epoch === this._convertEpoch && this._pendingGeometryJobs > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
  }

  /**
   * Walks the given block table record once and creates one
   * `AcTrViewportView` for every real `AcDbViewport` entity it finds
   * (skipping the default paper-space viewport that is filtered
   * everywhere else by `AcTrViewportView.isDefaultPaperSpaceViewport`).
   *
   * This is the recovery pass for paper-space layouts whose viewport
   * entities reached `batchConvert` before the `AcTrLayoutView` was
   * created — those entities were drawn and added to the scene, but
   * the viewport-view creation step silently no-oped (lookup returned
   * undefined). Without this recovery, paper-space viewports would not
   * get scissors and the layout would render incorrectly. See the
   * call site in `loadLayoutEntitiesIfNeeded` for the full context.
   *
   * Cheap operation: only AcDbViewport entities are inspected; for a
   * typical sheet that's a handful of entities even on 5000-entity
   * paper layouts.
   */
  private ensureViewportViews(
    blockTableRecord: AcDbBlockTableRecord,
    layoutView: AcTrLayoutView
  ) {
    const iterator = blockTableRecord.newIterator()
    for (const entity of iterator) {
      if (!(entity instanceof AcDbViewport)) continue
      if (AcTrViewportView.isDefaultPaperSpaceViewport(entity)) continue
      const viewportView = new AcTrViewportView(
        layoutView,
        entity.toGiViewport(),
        this._renderer
      )
      layoutView.addViewport(viewportView)
    }
  }

  /**
   * Converts the specified database entities to three entities
   * @param entities - The database entities
   * @returns The converted three entities
   */
  private async batchConvert(
    entities: AcDbEntity[],
    options: { forExport?: boolean } = {}
  ) {
    const epoch = this._convertEpoch
    const progressive = this._progressiveRendering && !options.forExport
    // Time-budgeted yields keep the canvas painting during large open chunks
    // (count-based yields alone stall on expensive INSERT / hatch batches).
    // Prefer setTimeout(0) over rAF: waiting a full frame per yield inflated
    // total open wall time without improving first-paint much.
    const yieldGate = progressive
      ? new AcCmUiYieldGate(AcTrView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS)
      : undefined
    const yieldToEventLoop = () =>
      new Promise<void>(resolve => setTimeout(resolve, 0))
    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i]
      try {
        // Document was cleared / replaced while this batch was draining.
        if (epoch !== this._convertEpoch) {
          continue
        }
        // Skip the default paper-space viewport (`*Paper_Space`) entirely:
        // it is an AutoCAD-internal viewport that exists in every paper
        // layout and must not be drawn (would render a giant rectangle in
        // the paper coordinate system), nor added to the spatial index
        // (would stretch the layout's bounding box and break
        // zoomToFitDrawing), nor turned into an AcTrViewportView (would
        // setScissor over most of the canvas and squeeze the real user
        // viewports into a corner). See
        // `AcTrViewportView.isDefaultPaperSpaceViewport` for the criterion
        // and the rationale (legacy `number === 1` is unreliable across
        // parsers).
        if (
          entity instanceof AcDbViewport &&
          AcTrViewportView.isDefaultPaperSpaceViewport(entity)
        ) {
          continue
        }

        const shouldConvert = options.forExport
          ? this._entityDisplay.shouldConvertForExport(entity)
          : this._entityDisplay.shouldConvert(entity)
        if (!shouldConvert) {
          continue
        }

        // Fast path: entities that declare a single batchable primitive append
        // directly into batches, skipping temporary drawable allocate → clone → dispose.
        const directMeta = tryBuildDirectEntityMeta(entity, this._renderer)
        if (directMeta) {
          let added = false
          try {
            added = this._scene.addDirectEntity(
              directMeta,
              shouldExtendBboxForDirectEntity(entity)
            )
            if (added) {
              this.applySessionHiddenObjectState(entity.objectId)
              if (progressive) {
                this.markProgressiveDirty()
                this._progressiveOpenFit.afterGeometryBatch(
                  () => this.resolveLayoutFitBox(),
                  i
                )
              }
            }
          } finally {
            directMeta.geometry.dispose()
          }
          if (added) {
            continue
          }
          // Append refused (e.g. invisible) — fall through to the legacy path.
        }

        // Sync-construct the entity shell. Glyph geometry is finished via
        // asyncDraw (awaits fonts when awaitFontsBeforeDraw is on). Text/group
        // finalize runs in a side pool so linework convert is not blocked.
        const threeEntity: AcTrEntity | null = this.drawEntity(entity, false)
        // Viewports may produce no border geometry (e.g. on a no-plot layer) while
        // still needing an AcTrViewportView for model content below.
        if (!threeEntity && !(entity instanceof AcDbViewport)) continue

        if (threeEntity) {
          threeEntity.objectId = entity.objectId
          threeEntity.ownerId = entity.ownerId
          threeEntity.layerName = entity.layer
          threeEntity.visible = entity.visibility !== false
          if (
            threeEntity instanceof AcTrGroup &&
            (threeEntity as AcTrGroup).isOnTheSameLayer
          ) {
            // Even when a block expands to a single layer bucket, children authored on
            // layer "0" still inherit the INSERT layer for ByLayer traits (color, etc.).
            this._inheritedLayerMaterialMapper.remap(
              (threeEntity as AcTrGroup).children,
              '0',
              threeEntity.layerName
            )
            threeEntity.userData.insertLayerName = threeEntity.layerName
          }
          const isMultiLayerGroup =
            threeEntity instanceof AcTrGroup &&
            !(threeEntity as AcTrGroup).isOnTheSameLayer
          const deferGeometry =
            !options.forExport && this.needsDeferredFontGeometry(threeEntity)

          if (isMultiLayerGroup) {
            if (deferGeometry) {
              this.enqueueDeferredGeometry(
                () =>
                  this.handleGroup(
                    threeEntity as AcTrGroup,
                    progressive,
                    epoch
                  ),
                epoch
              )
            } else {
              await this.handleGroup(
                threeEntity as AcTrGroup,
                progressive,
                epoch
              )
            }
          } else {
            const isExtendBbox = !(
              entity instanceof AcDbRay || entity instanceof AcDbXline
            )
            const commitEntity = async () => {
              await this.finishEntityGeometry(threeEntity, progressive)
              if (epoch !== this._convertEpoch) {
                threeEntity.dispose()
                return
              }
              if (threeEntity instanceof AcTrGroup) {
                this.syncGroupSpatialBoundsForIndexing(threeEntity)
              }
              this._scene.addEntity(threeEntity, isExtendBbox)
              this.applySessionHiddenObjectState(entity.objectId)
              // Release memory occupied by this entity
              threeEntity.dispose()
              if (progressive) {
                this.markProgressiveDirty()
                this._progressiveOpenFit.afterGeometryBatch(
                  () => this.resolveLayoutFitBox(),
                  i
                )
              }
            }
            if (deferGeometry) {
              this.enqueueDeferredGeometry(commitEntity, epoch)
            } else {
              await commitEntity()
            }
          }
        }

        if (epoch !== this._convertEpoch) {
          continue
        }

        if (entity instanceof AcDbViewport) {
          // Default paper-space viewport was already filtered out at the
          // top of the loop, so anything that reaches here is a real
          // user-created viewport. The redundant check below is kept as
          // a defensive guard in case a future refactor reorders the
          // early-skip — it costs ~nothing and prevents a regression.
          if (!AcTrViewportView.isDefaultPaperSpaceViewport(entity)) {
            const layoutView = this._layoutViewManager.getAt(entity.ownerId)
            if (layoutView) {
              const viewportView = new AcTrViewportView(
                layoutView,
                entity.toGiViewport(),
                this._renderer
              )
              layoutView.addViewport(viewportView)
            }
          }
        } else if (entity instanceof AcDbRasterImage) {
          // Only track images whose pixel data is still unresolved.
          const fileName = entity.imageFileName
          if (fileName && !entity.image) {
            this._missedImages.set(entity.objectId, fileName)
          }
        }
      } catch (error) {
        log.error(
          `[AcTrView2d] Failed to convert entity ${entity.objectId} (${entity.type}):`,
          error
        )
      } finally {
        // Counter was reset in clear() when the epoch advanced; do not
        // decrease again or isProcessingEntities can go negative/warn.
        if (epoch === this._convertEpoch) {
          this.decreaseNumOfEntitiesToProcess()
        }
      }

      if (epoch !== this._convertEpoch) {
        continue
      }

      if (yieldGate) {
        // Yield for input/overlay, but do not force a full-scene paint here —
        // paints are throttled separately via markProgressiveDirty().
        const didYield = await yieldGate.maybeYield(yieldToEventLoop)
        if (didYield) {
          this._progressiveYieldCount++
        }
      }
    }
  }

  /**
   * Rebuilds block-reference child boxes and aligns aggregate {@link AcTrGroup.wcsBbox}
   * with their union before spatial-index registration.
   */
  private syncGroupSpatialBoundsForIndexing(group: AcTrGroup) {
    group.refreshWcsChildBoxesFromChildren()
    if (group.wcsChildBoxes.length === 0) {
      return
    }

    const childBoxes: AcEdSpatialQueryResultItem[] = group.wcsChildBoxes.map(
      box => ({
        minX: box.minX,
        minY: box.minY,
        maxX: box.maxX,
        maxY: box.maxY,
        id: box.id
      })
    )
    group.wcsBbox = unionGroupWcsChildBoxes(group)

    const userData = group.userData as {
      spatialIndexChildBoxes?: AcEdSpatialQueryResultItem[]
    }
    userData.spatialIndexChildBoxes = childBoxes
  }

  private async handleGroup(
    group: AcTrGroup,
    progressive: boolean,
    epoch: number = this._convertEpoch
  ) {
    await this.finishEntityGeometry(group, progressive)
    if (epoch !== this._convertEpoch) {
      group.dispose()
      return
    }
    this.syncGroupSpatialBoundsForIndexing(group)

    const children = group.children
    const objectsGroupByLayer: Map<string, THREE.Object3D[]> = new Map()
    children.forEach(child => {
      if (child.visible === false) {
        return
      }
      const layerName = child.userData.layerName
      if (!objectsGroupByLayer.has(layerName)) {
        objectsGroupByLayer.set(layerName, [])
      }
      objectsGroupByLayer.get(layerName)?.push(child)
    })
    // Important:
    // Sometimes one group may contain huge amount of objects (> 100,000). So it is important
    // to re-parent object with the fast approach. Calling add/remove method in THREE.Object3D
    // is very slow because it do lots of things
    // - Remove children from old group
    // - Insert them into new group
    // - Reset parent pointer
    // - Do one updateMatrixWorld() at the end (optional)
    // So we operate its children directly.
    group.children = []
    for (const child of children) {
      child.parent = null
    }

    const renderContext = group.renderContext
    const groupObjectId = group.objectId
    const groupLayerName = group.layerName

    // AcDbRenderingCache.draw (and similar paths such as AcDbTable) already call
    // applyMatrix on the group, which updates wcsBbbox and wcsChildBoxes to WCS.
    // Do not multiply group.matrix here — that would double-transform spatial bounds.
    if (process.env.NODE_ENV !== 'production') {
      assertAcTrGroupWcsBboxesConsistent(group)
    }

    const groupChildBoxes: AcEdSpatialQueryResultItem[] =
      group.wcsChildBoxes.map(box => ({
        minX: box.minX,
        minY: box.minY,
        maxX: box.maxX,
        maxY: box.maxY,
        id: box.id
      }))
    const aggregateSpatialBbox =
      groupChildBoxes.length > 0
        ? unionGroupWcsChildBoxes(group)
        : group.wcsBbox.clone()
    if (groupChildBoxes.length > 0) {
      group.wcsBbox = aggregateSpatialBbox.clone()
    }
    objectsGroupByLayer.forEach((objects, layerName) => {
      // Nested layer-0 may already be resolved to an inner INSERT layer during
      // flatten. Remaining "0" buckets inherit this (outermost) INSERT layer.
      const effectiveLayerName = layerName === '0' ? groupLayerName : layerName

      // Material remap must still treat authored layer-0 drawables as layer-0
      // ByLayer even when nest resolution already rewrote layerName.
      const sourceLayerForMaterials = objects.some(object => {
        const data = object.userData as {
          authoredLayerName?: string
          layerName?: string
        }
        return (data.authoredLayerName ?? layerName) === '0'
      })
        ? '0'
        : layerName

      // Keep runtime layer metadata/material cache aligned with the inherited layer so
      // later layer style edits (color, linetype, lineweight, transparency) target this
      // object set correctly.
      this._inheritedLayerMaterialMapper.remap(
        objects,
        sourceLayerForMaterials,
        effectiveLayerName
      )

      // One INSERT can expand to children from multiple layers. Here we create one
      // render entity per layer bucket but preserve the INSERT object id for all
      // buckets, so selection/highlight still maps back to the same database object.
      // Within each layer bucket, the object id remains unique in scene indexing.
      const entity = new AcTrEntity(renderContext)
      entity.applyMatrix4(group.matrix)
      entity.objectId = groupObjectId
      entity.ownerId = group.ownerId
      // If block-definition entities are on layer "0", this bucket now uses the layer
      // of the block reference itself (effectiveLayerName).
      entity.layerName = effectiveLayerName
      entity.userData.insertLayerName = groupLayerName
      entity.wcsBbox = aggregateSpatialBbox.clone()
      const entityUserData = entity.userData as {
        spatialIndexChildBoxes?: AcEdSpatialQueryResultItem[]
      }
      entityUserData.spatialIndexChildBoxes = groupChildBoxes

      // Important:
      // DO NOT USE spread operator when adding objects because it may be one very large array
      // and can result in maximum call stack size exceeded
      for (let i = 0; i < objects.length; i++) {
        entity.add(objects[i])
      }
      this._layerAppearance.refreshTextMaterialsInObjectTree(entity)
      this._scene.addEntity(entity, true)
      this.applySessionHiddenObjectState(groupObjectId)
      entity.dispose()
    })
    group.dispose()

    if (progressive) {
      this.markProgressiveDirty()
      this._progressiveOpenFit.afterGeometryBatch(() =>
        this.resolveLayoutFitBox()
      )
    }
  }

  private decreaseNumOfEntitiesToProcess() {
    this._numOfEntitiesToProcess--
    if (this._numOfEntitiesToProcess < 0) {
      this._numOfEntitiesToProcess = 0
      log.warn(
        'Something wrong! The number of entities to process should not be less than 0.'
      )
    } else if (this._numOfEntitiesToProcess === 0) {
      // Always mark dirty when the queue drains. Progressive open throttles
      // mid-open paints, so the last batch would otherwise never redraw until
      // the user pans/zooms (animate bails when !_isDirty && !_htmlDirty &&
      // !stillLoading).
      this._isDirty = true
    }
  }
}
