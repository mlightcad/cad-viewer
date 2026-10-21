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
  AcDbRenderingCache,
  AcDbSysVarManager,
  AcDbViewport,
  AcDbXline,
  AcGeBox2d,
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike,
  acgiForegroundColorForBackground,
  AcGiViewport,
  log
} from '@mlightcad/data-model'
import { AcDbSystemVariables } from '@mlightcad/data-model'
import { FontManager } from '@mlightcad/mtext-renderer'
import {
  AcTrEntity,
  AcTrGlyphEntity,
  AcTrGroup,
  AcTrHtmlTransientManager,
  AcTrMTextRenderer,
  AcTrRenderer,
  AcTrViewportView,
  hasPendingComplexLineTypeGlyphs,
  setAcTrDrawOrderZAllocator
} from '@mlightcad/three-renderer'
import { AcTrMatrixUtil } from '@mlightcad/three-renderer'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import { AcApDocManager, AcApSettingManager } from '../app'
import { AcApOpenViewMode } from '../app/AcApOpenDatabaseOptions'
import { AcApZoomCmd } from '../command/AcApZoomCmd'
import { isMarkupHtmlTextEditing } from '../command/markup/AcApMarkupTextEdit'
import { notifyMeasurementLayoutChanged } from '../command/measure/AcApMeasurementStore'
import {
  acedAttachMobileBoxGesture,
  AcEdBaseView,
  AcEdCalculateSizeCallback,
  AcEdConditionWaiter,
  AcEdCorsorType,
  AcEdGripManager,
  acedGuardCanvasTouchCallout,
  acedInteractionStrategy,
  acedIsTouchDerivedMouseEvent,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdSelectionAction,
  acedShouldIgnoreCompatMouse,
  AcEdSnapLoupeViewState,
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx,
  AcEdViewMode,
  AcEdViewportCoordinateMapper,
  eventBus,
  resolvePointerSelectionAction
} from '../editor'
import {
  ACGI_MODEL_SPACE_BACKGROUND,
  isModelSpaceDatabase,
  readLayoutBackgroundColor
} from '../editor/global/AcEdUiColor'
import { ML_UI_Z_CANVAS_HTML_OVERLAY } from '../editor/global/AcEdUiLayout'
import {
  acedEntityIntersectsSelectionBox,
  acedNeedsCrossingGeometryRefine
} from '../editor/view/AcEdSelectionBoxIntersect'
import { isEffectiveSpatialQueryHit } from '../editor/view/AcEdSpatialQueryResult'
import type { AcTrLazySpatialChildren } from '../spatialIndex'
import type { AcTrSpatialSearchOptions } from '../spatialIndex/AcTrSpatialIndex'
import { AcTrGeometryUtil } from '../util'
import { acapRunDatabaseEdit } from '../util/AcApDatabaseEdit'
import { acapResolveLayoutFrameBox } from '../util/AcApLayoutViewFraming'
import {
  collectTextStyleFontNames,
  planTextStyleFontPreload
} from '../util/AcApTextStyleFontPreload'
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
  absorbConvertQueue,
  adaptConvertSliceSize,
  createConvertPending,
  hasPendingActiveOwner
} from './AcTrConvertQueue'
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
import { computeIntelligentExtentsAsync } from './AcTrIntelligentExtents'
import { AcTrLayer } from './AcTrLayer'
import { AcTrLayerAppearanceController } from './AcTrLayerAppearanceController'
import { AcTrLayout } from './AcTrLayout'
import { AcTrLayoutView } from './AcTrLayoutView'
import { AcTrLayoutViewManager } from './AcTrLayoutViewManager'
import { sortPickResults } from './AcTrPickResultUtil'
import { AcTrProgressiveOpenFitController } from './AcTrProgressiveOpenFitController'
import { AcTrScene } from './AcTrScene'
import type { AcTrViewSessionState } from './AcTrViewSessionState'
import { AcTrWorkSlice } from './AcTrWorkSlice'
import { shouldRegenDatabaseAfterFontLoad } from './fontLoadRegen'

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
  /**
   * Open options → Initial view (`Extents` / `Saved`) for this document.
   * Applied at document open for the startup layout, and again on the
   * **first visit** to every other layout the user has not framed yet.
   */
  private _openViewMode: AcApOpenViewMode = AcApOpenViewMode.Extents
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
   * Object ids claimed by an in-flight interactive {@link batchConvert},
   * including deferred glyph commits that have not yet called
   * {@link AcTrScene.addEntity}. Without this, a second convert pass can
   * append another batched slot for the same id (visible as doubled TEXT
   * linetype labels) because {@link hasEntity} is still false.
   */
  private readonly _claimedConvertObjectIds = new Set<string>()
  /**
   * Per-objectId convert generation. Bumped by {@link updateEntity} so an
   * in-flight progressive {@link batchConvert} / deferred commit for the same
   * id cannot `addEntity` after the scene was cleared for reconversion
   * (ghost RasterImage / pre-replacement pixels).
   */
  private readonly _entityConvertGeneration = new Map<string, number>()
  /**
   * When true, entity conversion during document open yields cooperatively so
   * geometry paints incrementally while the open overlay is still visible.
   */
  private _progressiveRendering = false
  /**
   * When true, open-time convert includes off/frozen-layer entities so HTML
   * export does not need a second convert pass for those entities.
   */
  private _convertInvisibleLayers = false
  /**
   * When false, {@link batchConvert} skips cooperative setTimeout yields.
   * Headless CLI sets this false; interactive viewers leave it true.
   */
  private _cooperativeYield = true
  /**
   * Serial convert queue for progressive opens. Chunks from `entityAppended`
   * enqueue here and a single drain loop runs {@link batchConvert}, so scene
   * convert overlaps ENTITY flush instead of waiting for a post-open
   * `setTimeout` storm after the loading overlay hides.
   */
  private _convertQueue: AcDbEntity[] = []
  /**
   * Paper-space block table record ids whose viewport entities were converted
   * before an {@link AcTrLayoutView} existed, so {@link batchConvert} could
   * not create the {@link AcTrViewportView}. Repaired when that layout view
   * is created.
   */
  private readonly _viewportRepairOwnerIds = new Set<string>()
  /** In-flight progressive convert drain; shared so awaiters wait for the queue. */
  private _convertDrainPromise: Promise<void> | null = null
  /**
   * Bumped by {@link clear} so an in-flight {@link batchConvert} abandons
   * scene writes and counter updates after the view has been reset for a new
   * document open.
   */
  private _convertEpoch = 0
  /** Last time progressive open actually painted mid-convert. */
  private _lastProgressivePaintAt = 0
  /**
   * When true, the next progressive mid-open paint must not be throttled
   * (camera moved — user pan/zoom or incremental auto-fit).
   */
  private _progressivePaintUrgent = false
  /** Pause convert until this `performance.now()` after user input. */
  private _progressiveInputPauseUntil = 0
  /** Mid-open WebGL paints while progressive convert was still running. */
  private _progressivePaintCount = 0
  /** Cooperative yields taken inside progressive {@link batchConvert}. */
  private _progressiveYieldCount = 0
  /** Removes progressive open input listeners registered in the constructor. */
  private _disposeProgressiveInputWatch?: () => void
  /**
   * Saved view was not applied at open. Frame batch bounds once linework
   * convert drains, so the canvas is not blank until deferred glyphs finish.
   * Applied on a timer so it does not run on the entity-parse stack.
   */
  private _openLineworkFramePending = false
  private _openLineworkFrameTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * In-flight + queued glyph/group geometry jobs that await fonts via asyncDraw.
   * Counted separately so linework convert can continue while text waits.
   */
  private _pendingGeometryJobs = 0
  /**
   * Waiting deferred geometry runners. Capped concurrency avoids scheduling
   * thousands of INSERT/text `asyncDraw` jobs at once (large multi-sheet DWGs
   * otherwise flood the main thread and freeze on "Rendering drawing ...").
   */
  private _deferredGeometryQueue: Array<{
    run: () => Promise<void>
    epoch: number
  }> = []
  /** Currently executing deferred geometry runners. */
  private _deferredGeometryActive = 0
  /**
   * Debounced glyph rebuild after {@link FontManager.events.fontLoaded} so a
   * burst of lazy face loads (simsun + malgun, etc.) triggers one redraw pass.
   */
  private _fontLoadedRedrawTimer: ReturnType<typeof setTimeout> | null = null
  private _fontLoadedRedrawEpoch = 0
  /**
   * `performance.now()` when convert and deferred glyph jobs last reached
   * idle together. Zero until that first transition. Used to ignore the
   * open-time `fontLoaded` regen that replays the loading spinner.
   */
  private _entityProcessingIdleAt = 0
  /**
   * Convert epoch for which text-style font preload was started.
   */
  private _textStyleFontPreloadEpoch = -1
  /**
   * In-flight (or resolved) preload of {@link AcDbTextStyleTable.fonts}.
   * Started at conversion stage `STYLE` END so download overlaps LAYER/BLOCK/
   * ENTITY parse and linework convert; glyph jobs await this before draw.
   */
  private _textStyleFontPreloadPromise: Promise<void> | null = null
  /** Grip point display and drag editing (Write mode only). */
  private _gripManager: AcEdGripManager
  /** Global keyboard shortcuts for the view (undo/redo, erase, etc.). */
  private _keyHandler: AcEdViewKeyHandler
  /** Removes iOS canvas long-press callout listeners registered in the constructor. */
  private _disposeCanvasTouchCallout: (() => void) | undefined
  /** Removes mobile long-press box-selection gesture listeners. */
  private _disposeMobileBoxGesture: (() => void) | undefined
  /**
   * Aborts canvas / document DOM listeners registered on this view.
   * Custom singleton listeners are removed explicitly in {@link dispose}.
   */
  private readonly _viewDomAbort = new AbortController()
  private _viewDisposed = false
  /** Named listeners so dispose can detach from shared singletons. */
  private _onFontNotFound?: (args: { fontName: string; count?: number }) => void
  private _onFontLoaded?: (args?: { fontName?: string }) => void
  private _onSysVarChanged?: (args: {
    name: string
    database?: AcDbDatabase
  }) => void
  private _onSettingsModified?: (args: { key: string; value: unknown }) => void
  private _onLayoutSwitched?: (args: {
    layout: AcDbLayout & { database?: object }
  }) => void
  private _onCommandWillStartHitTest?: () => void
  private _onCommandEndedHitTest?: () => void
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
   * Promise that resolves when text-style fonts needed by deferred glyph jobs
   * are ready. Shared so concurrent deferred jobs do not each await a long
   * font preload.
   */
  private _deferredFontsReady: Promise<void> | null = null

  /** Convert-phase wall timers (ms) for OPENPERF diagnostics. */
  private _convertPhaseMs = {
    finishGeometry: 0,
    handleGroup: 0,
    addEntity: 0,
    awaitFonts: 0
  }

  /** Last text-style font preload plan (for OPENPERF). */
  private _fontPreloadDiag: {
    critical: string[]
    /** @deprecated Prefer {@link preset}; kept for OPENPROF compatibility. */
    workerWarm: string[]
    background: string[]
    /** Full default/symbol preset loaded at open start (drawing-independent). */
    preset: string[]
    workerSkipped: number
    /** Where mesh/style faces are parsed for this open. */
    parseSite?: 'main' | 'worker'
  } | null = null

  private ensureDeferredFontsReady(): Promise<void> {
    if (!this._deferredFontsReady) {
      const t0 = performance.now()
      // Preset (fallback) + STYLE-table faces must both be ready before glyph
      // bake. Linework convert does not await this promise.
      const ready = Promise.all([
        this.awaitPresetFontsReadySafe(),
        this.awaitTextStyleFontsReady()
      ]).then(
        () => undefined,
        () => undefined
      )
      this._deferredFontsReady = ready.then(() => {
        this._convertPhaseMs.awaitFonts += performance.now() - t0
      })
    }
    return this._deferredFontsReady
  }

  /**
   * Awaits DocManager preset preload when the singleton exists.
   * No-op in unit tests that construct a view without a manager.
   */
  private async awaitPresetFontsReadySafe(): Promise<void> {
    const singleton = AcApDocManager as unknown as {
      _instance?: AcApDocManager
    }
    if (!singleton._instance) {
      return
    }
    await singleton._instance.awaitPresetFontsReady()
  }

  /**
   * Returns and resets convert-phase wall timers collected during the last open.
   */
  takeConvertPhaseTimings() {
    const snapshot = {
      ...this._convertPhaseMs,
      fontPreload: this._fontPreloadDiag
        ? { ...this._fontPreloadDiag }
        : undefined
    }
    this._convertPhaseMs = {
      finishGeometry: 0,
      handleGroup: 0,
      addEntity: 0,
      awaitFonts: 0
    }
    this._fontPreloadDiag = null
    return snapshot
  }

  /**
   * Wall-time between cooperative yields during scene convert (ms) when
   * progressive rendering is off. Overlay still blocks input, so a larger
   * budget keeps throughput high while avoiding Chromium "Page Unresponsive".
   */
  private static readonly OPEN_CONVERT_YIELD_BUDGET_MS = 300
  /**
   * Yield cadence during progressive open (ms). Overlay stays hidden; keep
   * slices near one frame so pan/zoom handlers can run. Discrete
   * `navigator.scheduling.isInputPending` yields once so handlers run;
   * pointerdown/wheel set a short pause so OrbitControls can catch up.
   */
  private static readonly PROGRESSIVE_OPEN_YIELD_BUDGET_MS = 32
  /** Extra idle window after canvas pointerdown/wheel so gestures stay fluid. */
  private static readonly PROGRESSIVE_INPUT_PAUSE_MS = 120
  /**
   * Minimum interval between progressive mid-open paints driven by convert
   * (ms). Full-scene WebGL paints dominate open wall time; user camera
   * changes bypass this throttle via {@link _progressivePaintUrgent}.
   */
  private static readonly PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 2500
  /**
   * Minimum interval between interactive non-progressive mid-open paints (ms)
   * while convert / deferred glyphs run under "Rendering drawing ...".
   * Longer than {@link PROGRESSIVE_OPEN_PAINT_INTERVAL_MS}: the overlay is
   * semi-transparent (`rgba(0,0,0,0.45)`), but each paint still redraws the
   * full scene and used to fire on every glyph completion. Headless
   * (`cooperativeYield` false) skips these paints entirely.
   */
  private static readonly NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 4000
  /**
   * Max concurrent deferred glyph/INSERT geometry finalizers. Large drawings
   * enqueue thousands of jobs; keep this modest to limit peak JS heap during
   * open while retaining reasonable text throughput after convert finishes.
   */
  private static readonly DEFERRED_GEOMETRY_CONCURRENCY = 8
  /**
   * Target wall time of one interactive convert slice (ms) while a paper
   * layout is active.
   *
   * Slices return to the drain so a layout activated mid-open can jump ahead
   * of a long model-space batch. Kept well above one frame (≈50–100 ms) so
   * the fixed cost of each slice — yield, paint, queue absorb — does not
   * dominate total load time. The 300ms yield inside {@link batchConvert}
   * still applies within a slice.
   */
  private static readonly CONVERT_SLICE_BUDGET_MS = 64
  /**
   * Upper bound on entities per slice. Heavy block references stay at 1
   * because a slice that overruns the time budget is halved.
   */
  private static readonly CONVERT_SLICE_MAX = 512

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
    // Allow focusing the container after canvas clicks so document-level
    // shortcuts stay scoped to this viewer without stealing host-page focus.
    if (!container.hasAttribute('tabindex')) {
      container.tabIndex = -1
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.maxWidth = '100%'
    renderer.domElement.style.maxHeight = '100%'
    // Keep one-finger picks (measure snap loupe) from being stolen by the
    // browser scroll / long-press copy-selection callout (especially iOS).
    const disposeCanvasTouchCallout = acedGuardCanvasTouchCallout(
      renderer.domElement,
      container
    )

    super(renderer.domElement, container)
    this._disposeCanvasTouchCallout = disposeCanvasTouchCallout
    const onProgressiveInput = () => this.noteProgressiveUserInput()
    // Pointer and wheel both claim shortcut focus so undo/erase still work
    // after zooming without a prior click, without stealing focus from host
    // inputs/textareas/contenteditable fields.
    const onCanvasPointerDown = () => {
      onProgressiveInput()
      this.focusViewerForShortcuts()
    }
    const onCanvasWheel = () => {
      onProgressiveInput()
      this.focusViewerForShortcuts()
    }
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown, {
      capture: true
    })
    renderer.domElement.addEventListener('wheel', onCanvasWheel, {
      capture: true,
      passive: true
    })
    this._disposeProgressiveInputWatch = () => {
      renderer.domElement.removeEventListener(
        'pointerdown',
        onCanvasPointerDown,
        { capture: true }
      )
      renderer.domElement.removeEventListener('wheel', onCanvasWheel, {
        capture: true
      })
    }
    this._gripManager = new AcEdGripManager(this)
    this._keyHandler = new AcEdViewKeyHandler(this)
    if (options.calculateSizeCallback) {
      this.setCalculateSizeCallback(options.calculateSizeCallback)
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(this.width, this.height)

    this._renderer = new AcTrRenderer(renderer)
    // Shared across all layer batched groups so later entities (e.g. wipeouts)
    // occlude earlier linework via depth, matching AutoCAD draw order.
    setAcTrDrawOrderZAllocator(() => this._renderer.allocateDrawOrderZ())
    const fontMapping = AcApSettingManager.instance.fontMapping
    this._renderer.setFontMapping(fontMapping)
    this._onFontNotFound = args => {
      eventBus.emit('font-not-found', {
        fontName: args.fontName,
        count: args.count ?? 0
      })
    }
    this._onFontLoaded = args => {
      // Lazy load success clears FontManager.missedFonts; refresh status-bar state.
      eventBus.emit('missed-data-changed', {})
      // On-demand faces (e.g. style `malgun`) may finish after the first glyph
      // bake. Rebuild text so Hangul is not left as permanent '?'.
      this.scheduleGlyphRedrawAfterFontLoad(args?.fontName)
    }
    this._renderer.events.fontNotFound.addEventListener(this._onFontNotFound)
    this._renderer.events.fontLoaded.addEventListener(this._onFontLoaded)

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
    // During main-view construction the manager singleton is not published yet,
    // so treat a missing manager as "this is the primary canvas".
    this._stats = this.createStats(
      AcApSettingManager.instance.isShowStats &&
        (AcApDocManager.tryGetInstance() == null || this.isActiveManagedView())
    )

    // Layout background sysvars drive the canvas clear colour and ACI-7
    // inversion (`MODELBKCOLOR` for model space, `PAPERBKCOLOR` for the
    // active layout). `COLORTHEME` only affects UI chrome — see
    // `useDark` / `AcEdUiTheme`, not the renderer foreground.
    const sysVarManager = AcDbSysVarManager.instance()
    const modelBkVar = AcDbSystemVariables.MODELBKCOLOR.toLowerCase()
    const paperBkVar = AcDbSystemVariables.PAPERBKCOLOR.toLowerCase()
    this._onSysVarChanged = args => {
      const nameLower = args.name.toLowerCase()
      if (nameLower === modelBkVar || nameLower === paperBkVar) {
        const database = args.database
        if (!database) return
        const isModelSpace = this.isModelSpaceLayout(database)
        const applies =
          (nameLower === modelBkVar && isModelSpace) ||
          (nameLower === paperBkVar && !isModelSpace)
        if (!applies) {
          return
        }
        this.applyCanvasBackground(
          readLayoutBackgroundColor(database, isModelSpace)
        )
      }
    }
    sysVarManager.events.sysVarChanged.addEventListener(this._onSysVarChanged)

    this._onSettingsModified = args => {
      if (args.key == 'isShowStats') {
        this.toggleStatsVisibility(this._stats, args.value as boolean)
      }
    }
    AcApSettingManager.instance.events.modified.addEventListener(
      this._onSettingsModified
    )

    let selectionStartWcs: AcGePoint2dLike | null = null
    let selectionStartCanvas: AcGePoint2dLike | null = null
    let selectionPreviewEl: HTMLDivElement | null = null

    const canHandleIdlePointer = () => {
      return (
        !this.editor.isActive &&
        !AcEdMTextEditor.getActiveInputBox() &&
        !isMarkupHtmlTextEditing() &&
        !this._gripManager.isDragging
      )
    }

    const canHandleSelectionGesture = () => {
      return this.mode === AcEdViewMode.SELECTION && canHandleIdlePointer()
    }

    const canHandleMobileBoxGesture = () => {
      return (
        canHandleIdlePointer() &&
        acedInteractionStrategy().canIdleTouchBox(this.mode)
      )
    }

    const clearSelectionPreview = () => {
      selectionPreviewEl?.remove()
      selectionPreviewEl = null
    }

    const resetSelectionDrag = () => {
      selectionStartWcs = null
      selectionStartCanvas = null
      clearSelectionPreview()
    }

    const beginSelectionPreview = (clientX: number, clientY: number) => {
      selectionStartCanvas = this.viewportToCanvas({
        x: clientX,
        y: clientY
      })
      selectionStartWcs = this.screenToWorld(selectionStartCanvas)
      clearSelectionPreview()
      selectionPreviewEl = document.createElement('div')
      selectionPreviewEl.className = 'ml-jig-preview-rect'
      this.container.appendChild(selectionPreviewEl)
    }

    const updateSelectionPreview = (
      clientX: number,
      clientY: number,
      action: AcEdSelectionAction = 'replace'
    ) => {
      if (!selectionStartWcs || !selectionPreviewEl || !selectionStartCanvas) {
        return
      }

      const curCanvas = this.viewportToCanvas({ x: clientX, y: clientY })
      const curWcs = this.screenToWorld(curCanvas)

      const p1 = this.worldToScreen(selectionStartWcs)
      const p2 = this.worldToScreen(curWcs)

      const left = Math.min(p1.x, p2.x)
      const top = Math.min(p1.y, p2.y)
      const width = Math.abs(p1.x - p2.x)
      const height = Math.abs(p1.y - p2.y)

      const mode = this.getSelectionMode(selectionStartCanvas, curCanvas)
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
    }

    const finishSelection = (
      clientX: number,
      clientY: number,
      action: AcEdSelectionAction,
      isClick: boolean
    ) => {
      if (!selectionStartWcs || !selectionStartCanvas) return

      const endCanvas = this.viewportToCanvas({
        x: clientX,
        y: clientY
      })
      const endWcs = this.screenToWorld(endCanvas)
      clearSelectionPreview()

      if (isClick) {
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
    }

    const viewDomSignal = this._viewDomAbort.signal

    this.canvas.addEventListener(
      'mousedown',
      e => {
        if (e.button !== 0) return
        if (!canHandleSelectionGesture()) return
        if (acedIsTouchDerivedMouseEvent(e) || acedShouldIgnoreCompatMouse()) {
          return
        }

        beginSelectionPreview(e.clientX, e.clientY)
      },
      { signal: viewDomSignal }
    )

    this.canvas.addEventListener(
      'mousemove',
      e => {
        if (!selectionStartWcs || !selectionPreviewEl || !selectionStartCanvas) {
          return
        }
        if (acedIsTouchDerivedMouseEvent(e) || acedShouldIgnoreCompatMouse()) {
          return
        }

        updateSelectionPreview(
          e.clientX,
          e.clientY,
          this.getPointerSelectionAction(e)
        )
      },
      { signal: viewDomSignal }
    )

    this.canvas.addEventListener(
      'mouseup',
      e => {
        if (this._gripManager.isDragging) {
          resetSelectionDrag()
          return
        }
        if (!selectionStartWcs || !selectionStartCanvas) return
        if (acedIsTouchDerivedMouseEvent(e) || acedShouldIgnoreCompatMouse()) {
          return
        }

        const endCanvas = this.viewportToCanvas({
          x: e.clientX,
          y: e.clientY
        })
        const action = this.getPointerSelectionAction(e)
        finishSelection(
          e.clientX,
          e.clientY,
          action,
          this.isSelectionClick(selectionStartCanvas, endCanvas)
        )
      },
      { signal: viewDomSignal }
    )

    this._disposeMobileBoxGesture = acedAttachMobileBoxGesture({
      element: this.canvas,
      shouldStart: () => canHandleMobileBoxGesture(),
      setNavigationEnabled: enabled => {
        this.setNavigationEnabled(enabled)
      },
      onActivate: (clientX, clientY) => {
        beginSelectionPreview(clientX, clientY)
        updateSelectionPreview(clientX, clientY)
      },
      onMove: (clientX, clientY) => {
        updateSelectionPreview(clientX, clientY)
      },
      onBoxEnd: (clientX, clientY, moved) => {
        finishSelection(clientX, clientY, 'replace', !moved)
      },
      onTap: (clientX, clientY) => {
        selectionStartCanvas = this.viewportToCanvas({
          x: clientX,
          y: clientY
        })
        selectionStartWcs = this.screenToWorld(selectionStartCanvas)
        finishSelection(clientX, clientY, 'replace', true)
      },
      onAbort: () => {
        resetSelectionDrag()
      }
    })

    this.canvas.addEventListener(
      'dblclick',
      e => {
        if (e.button !== 0) return
        if (!canHandleSelectionGesture()) return
        if (!this.entitySelectionEnabled) return
        if (
          AcApDocManager.instance.curDocument.openMode !== AcEdOpenMode.Write
        ) {
          return
        }
        void this.openPickedEntityEditor(e)
      },
      { signal: viewDomSignal }
    )
    // When using OrbitControls in THREE.js, it attaches its own event listeners to the DOM elements,
    // such as the canvas or the entire document. This can interfere with other event listeners you
    // add, including the keydown event. Scope to this view's container so host-page shortcuts
    // (and post-destroy key presses) are not captured.
    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!this.isActiveManagedView()) return
        if (!this.isShortcutEventInsideViewer(e)) return
        this._keyHandler.handleKeyDown(e)
      },
      { signal: viewDomSignal }
    )
    this._onLayoutSwitched = args => {
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
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
      this._onLayoutSwitched
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
    this.resetDeferredGeometryQueue()
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
    this._onCommandWillStartHitTest = () => {
      this.htmlTransientManager.setHitTestEnabled(false)
    }
    this._onCommandEndedHitTest = () => {
      this.htmlTransientManager.setHitTestEnabled(true)
    }
    this.editor.events.commandWillStart.addEventListener(
      this._onCommandWillStartHitTest
    )
    this.editor.events.commandEnded.addEventListener(
      this._onCommandEndedHitTest
    )
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
   * Parsing can report 100% before this reaches zero; callers that need a
   * fully drawable scene (export, scripted zoom) should wait on this (as
   * {@link waitUntilIdle} / {@link zoomToFitDrawing} do).
   *
   * The open-file progress overlay uses this when
   * {@link AcApOpenDatabaseOptions.progressiveRendering} is off, so
   * "Rendering drawing ..." stays up until deferred glyph jobs finish.
   * When progressive rendering is on, the overlay hides at CONVERSION `END`
   * and does not wait on this flag (pan/zoom enabled while convert continues).
   * Deprecated `waitForTextGeometry` no longer selects this gate.
   */
  get isProcessingEntities() {
    return this._numOfEntitiesToProcess > 0 || this._pendingGeometryJobs > 0
  }

  /**
   * True while the entity convert queue / {@link batchConvert} is still
   * draining. Does **not** include deferred glyph/INSERT geometry jobs.
   */
  get isConvertingEntities() {
    return this._numOfEntitiesToProcess > 0
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
   * When true, open-time convert includes off/frozen-layer entities.
   */
  get convertInvisibleLayers() {
    return this._convertInvisibleLayers
  }
  set convertInvisibleLayers(value: boolean) {
    this._convertInvisibleLayers = value
  }

  /**
   * When false, entity convert skips cooperative yields and non-progressive
   * mid-open WebGL paints (headless export). Interactive viewers keep this
   * `true` so "Rendering drawing ..." can still refresh the canvas.
   */
  get cooperativeYield() {
    return this._cooperativeYield
  }
  set cooperativeYield(value: boolean) {
    this._cooperativeYield = value
  }

  /**
   * Open-convert counters for OPENPROF / palette (cooperative yields during
   * convert, and throttled mid-open paints). Reset when progressive mode is
   * enabled for an open.
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
    this._progressivePaintUrgent = false
    this._progressiveInputPauseUntil = 0
  }

  /**
   * True while a recent canvas pointerdown/wheel asked convert to pause.
   * Does not treat hover mousemove as a pause (that starved convert).
   */
  private isProgressiveGesturePauseActive(): boolean {
    return performance.now() < this._progressiveInputPauseUntil
  }

  /**
   * True when the browser reports pending discrete input (clicks, keys).
   * Continuous events (mousemove) are excluded so hover does not throttle
   * progressive convert.
   */
  private isProgressiveDiscreteInputPending(): boolean {
    const scheduling = (
      navigator as Navigator & {
        scheduling?: {
          isInputPending?: (opts?: { includeContinuous?: boolean }) => boolean
        }
      }
    ).scheduling
    return scheduling?.isInputPending?.() === true
  }

  /**
   * Notes user interaction during progressive convert so paints stay urgent
   * and the drain loop pauses briefly for OrbitControls.
   */
  private noteProgressiveUserInput() {
    if (!this._progressiveRendering || this._numOfEntitiesToProcess <= 0) {
      return
    }
    this._progressivePaintUrgent = true
    this._isDirty = true
    this._progressiveInputPauseUntil =
      performance.now() + AcTrView2d.PROGRESSIVE_INPUT_PAUSE_MS
  }

  /**
   * Yields during progressive convert: honor the time budget; after
   * pointerdown/wheel pause briefly for OrbitControls; on discrete pending
   * input yield once so handlers run without extending the pause window.
   */
  private async progressiveYieldForInput(
    yieldGate: AcCmUiYieldGate | undefined,
    yieldToEventLoop: () => Promise<void>
  ): Promise<void> {
    if (this.isProgressiveGesturePauseActive()) {
      await yieldToEventLoop()
      while (performance.now() < this._progressiveInputPauseUntil) {
        await new Promise<void>(resolve => setTimeout(resolve, 16))
      }
      this._progressiveYieldCount++
      return
    }
    if (this.isProgressiveDiscreteInputPending()) {
      await yieldToEventLoop()
      this._progressiveYieldCount++
      return
    }
    if (!yieldGate) {
      return
    }
    const didYield = await yieldGate.maybeYield(yieldToEventLoop)
    if (didYield) {
      this._progressiveYieldCount++
    }
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
    // Style-manager changeForeground only updates cache entries; batch
    // containers own private material clones and must be repainted too.
    this._scene.repaintForegroundMaterials(
      acgiForegroundColorForBackground(value)
    )
    // Wipeouts track the canvas background (isBackgroundFill); repaint their
    // batch-owned clones the same way as ACI-7 foreground materials.
    this._scene.repaintBackgroundMaterials(value)
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
            threeEntity.userData.insertLayerName = threeEntity.layerName
          }
          await this.finishEntityGeometry(threeEntity, false)
          if (
            threeEntity instanceof AcTrGroup &&
            (threeEntity as AcTrGroup).isOnTheSameLayer
          ) {
            // Remap after glyph geometry exists — see same-layer commit path.
            this._inheritedLayerMaterialMapper.remap(
              (threeEntity as AcTrGroup).children,
              '0',
              threeEntity.layerName
            )
          }
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

    // Open streams entities through `drainConvertQueue` and claims each id
    // before the scene commit (deferred glyphs / INSERT text). Headless
    // export used to scan here as soon as parse returned, while that drain
    // was still running. Claimed ids are not in the scene yet, so they
    // looked missing and `batchConvert({ forExport: true })` expanded them
    // again — serially, because export convert does not defer glyph work.
    // On a text-heavy drawing that second pass dominates wall time and
    // leaves duplicate geometry in the snapshot. Wait until the open drain
    // has claimed or committed every streamed entity, then skip those ids.
    await this.drainConvertQueue()

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
          objectId => this.isEntityConvertScheduled(objectId),
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
    // Large drawings exceed the 60s default; match the CLI open-idle budget.
    const idle = await this.waitUntilIdle(120_000)
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
   * @param displaySize Input display size of points (`PDSIZE`)
   */
  rerenderPoints(displayMode: number, displaySize: number = 0) {
    const activeLayout = this._scene.activeLayout
    if (activeLayout) {
      activeLayout.rerenderPoints(displayMode, displaySize)
      this._isDirty = true
    }
  }

  /**
   * When open framing waits on {@link zoomToFitDrawing}, show the linework
   * bounds as soon as entity convert drains. The final fit still runs after
   * deferred glyphs so text extents can refine the camera.
   */
  requestOpenLineworkFrame() {
    this._openLineworkFramePending = true
    this.scheduleOpenLineworkFrame()
  }

  private cancelOpenLineworkFrame() {
    this._openLineworkFramePending = false
    if (this._openLineworkFrameTimer != null) {
      clearTimeout(this._openLineworkFrameTimer)
      this._openLineworkFrameTimer = null
    }
  }

  private scheduleOpenLineworkFrame() {
    if (
      this._openLineworkFrameTimer != null ||
      !this._openLineworkFramePending
    ) {
      return
    }
    const delay = this.isConvertingEntities ? 50 : 0
    this._openLineworkFrameTimer = setTimeout(() => {
      this._openLineworkFrameTimer = null
      if (!this._openLineworkFramePending) return
      if (this.isConvertingEntities) {
        this.scheduleOpenLineworkFrame()
        return
      }
      this.frameOpenLineworkIfReady()
    }, delay)
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
        this._progressiveOpenFit.applyFinalFit(() => this.getDrawingExtents())
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
  zoomToSmartExtents(timeout: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const waiter = new AcEdConditionWaiter(
        () => !this.isProcessingEntities,
        () => {
          void (async () => {
            try {
              const smart = await this.resolveSmartFitBox()
              if (smart) {
                this.zoomTo(smart)
                this._isDirty = true
                this.endProgressiveOpenFit()
                resolve()
                return
              }
              this._progressiveOpenFit.applyFinalFit(() =>
                this.getDrawingExtents()
              )
              this.endProgressiveOpenFit()
              resolve()
            } catch (error) {
              // Always clear progressive-open framing so a failed smart fit
              // cannot leave the open-fit overlay/state stuck indefinitely.
              this.endProgressiveOpenFit()
              reject(error)
            }
          })()
        },
        300,
        timeout
      )
      waiter.start()
    })
  }

  /**
   * Resolves intelligent zoom extents from spatial-index entity boxes.
   * Reuses the layout cache until entity geometry extents are invalidated.
   * Collects and clusters cooperatively so the UI thread stays responsive.
   */
  private async resolveSmartFitBox(): Promise<AcGeBox2d | undefined> {
    const activeLayout = this._scene.activeLayout
    if (!activeLayout) return undefined
    const cached = activeLayout.cachedSmartExtents
    if (cached) {
      return cached
    }
    const generation = activeLayout.smartExtentsGeneration
    const work = new AcTrWorkSlice()
    const entries = await activeLayout.collectSpatialExtentBoxesAsync(work)
    const smart = await computeIntelligentExtentsAsync(entries, work)
    // Geometry changed while we yielded: discard this result (a newer cache
    // may already exist; otherwise the caller falls back to drawing extents).
    if (activeLayout.smartExtentsGeneration !== generation) {
      return activeLayout.cachedSmartExtents
    }
    if (smart) {
      activeLayout.cachedSmartExtents = smart
    }
    return smart
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

    if (
      entity instanceof AcDbAttribute ||
      entity.type === 'Attrib' ||
      entity.type === 'Attribute'
    ) {
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
        toolbarFontFamilies: await this.getMTextToolbarFontFamilies()
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

  private async getMTextToolbarFontFamilies() {
    const availableFonts =
      (await AcApDocManager.instance.getAvaiableFonts()) ?? []
    return Array.from(
      new Set(
        availableFonts
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
   * @inheritdoc
   */
  getViewportCoordinateMapper(
    viewportId: AcDbObjectId
  ): AcEdViewportCoordinateMapper | undefined {
    let vpView: AcTrViewportView | undefined
    for (const candidate of this.activeLayoutView?.viewportViews ?? []) {
      if (candidate.viewport.id === viewportId) {
        vpView = candidate
        break
      }
    }
    if (!vpView) return undefined
    return {
      paperToModel: point => vpView.paperPointToModel(point),
      modelToPaper: point => vpView.modelPointToPaper(point),
      containsPaperPoint: point => vpView.containsPaperPoint(point)
    }
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
          results.push({ ...item, viewportId: vpView.viewport.id })
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
    const selectable = this.selectableIds(idsAdded, 'add')
    if (selectable.length > 0) this.selectionSet.add(selectable)
  }

  /**
   * @inheritdoc
   */
  selectByBox(box: AcGeBox2d) {
    this.selectByBoxWithMode(box, 'crossing', 'add')
  }

  /**
   * Drops crossing spatial hits whose curve geometry misses the pick box.
   *
   * Large closed polylines (site boundaries, frames) have AABBs that cover
   * huge empty interiors. Without this refine, crossing a small INSERT inside
   * that interior also selects those polylines and can stall highlight work.
   */
  protected override refineCrossingSelectionHits(
    box: AcGeBox2d,
    results: AcEdSpatialQueryResultItemEx[]
  ): AcDbObjectId[] {
    const database = AcApDocManager.instance.curDocument?.database
    if (!database) {
      return results.map(item => item.id)
    }

    const ids: AcDbObjectId[] = []
    for (const item of results) {
      if (!acedNeedsCrossingGeometryRefine(item)) {
        ids.push(item.id)
        continue
      }

      const entityBox = new AcGeBox2d(
        { x: item.minX, y: item.minY },
        { x: item.maxX, y: item.maxY }
      )
      if (box.containsBox(entityBox)) {
        ids.push(item.id)
        continue
      }

      const entity = database.tables.blockTable.getEntityById(item.id)
      if (!entity || acedEntityIntersectsSelectionBox(entity, box)) {
        ids.push(item.id)
      }
    }
    return ids
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
    // Mark each owner layout as loaded as soon as the open-time ENTITY stream
    // enqueues work. Progressive convert may not have committed scene entities
    // yet (`entityCount` still 0); without this, `loadLayoutEntitiesIfNeeded`
    // (from `onAfterOpenDocument` → `setActiveLayout`) re-iterates the BTR,
    // double-increments `_numOfEntitiesToProcess`, and keeps
    // "Rendering drawing ..." up long after linework should have finished —
    // so progressive rendering cannot release pan/zoom on time.
    for (let i = 0; i < entities.length; i++) {
      const ownerId = entities[i]?.ownerId
      if (!ownerId) continue
      let layout = this._scene.layouts.get(ownerId)
      if (!layout) {
        this._scene.addEmptyLayout(ownerId)
        layout = this._scene.layouts.get(ownerId)
      }
      if (layout && !layout.isLoaded) {
        layout.isLoaded = true
      }
    }
    this._numOfEntitiesToProcess += entities.length
    // Always serialize convert through one drain loop. Non-progressive opens
    // used to `void batchConvert(chunk)` per ENTITY flush chunk, which ran
    // many converts in parallel and OOM'd dense drawings (e.g. cathedral.dwg)
    // during "Rendering drawing ...". Progressive mid-open paints stay gated
    // by `_progressiveRendering` inside batchConvert / markProgressiveDirty.
    this._convertQueue.push(...entities)
    void this.drainConvertQueue()
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
   * True when an entity is already in the scene or claimed by an in-flight
   * convert (including deferred glyph commits that have not called
   * `addEntity` yet).
   */
  private isEntityConvertScheduled(objectId: AcDbObjectId): boolean {
    const id = String(objectId ?? '')
    if (!id) return false
    return this.hasEntity(objectId) || this._claimedConvertObjectIds.has(id)
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
      const objectId = String(item.objectId ?? '')
      if (objectId) {
        // Invalidate in-flight commits for this id before releasing the claim /
        // clearing the scene, so a stale progressive convert cannot re-add the
        // pre-update drawable after (or instead of) the reconversion pass.
        this._entityConvertGeneration.set(
          objectId,
          (this._entityConvertGeneration.get(objectId) ?? 0) + 1
        )
        // Allow reconversion: open-time batchConvert claims objectIds to prevent
        // duplicate progressive slots. updateEntity must release that claim or
        // batchConvert skips the entity (scene already cleared → blank RasterImage).
        this._claimedConvertObjectIds.delete(objectId)
      }
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
      this._isDirty = true
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
   * Records the Open options → Initial view choice for this document.
   *
   * Used by {@link applyInitialZoom} on the first visit to any layout that
   * was not already framed at open time.
   */
  setOpenViewMode(mode: AcApOpenViewMode) {
    this._openViewMode = mode
  }

  /**
   * Whether the layout has already been visited (or framed by the
   * application layer), i.e. a switch to it will not run the first-visit
   * auto zoom. Lets callers that frame a layout themselves (FIND) call
   * {@link markLayoutAsInitialized} only when it is still needed.
   *
   * @param layoutBtrId Input the block table record id of the layout
   */
  isLayoutInitialized(layoutBtrId: AcDbObjectId) {
    return this._initializedLayouts.has(layoutBtrId)
  }

  /**
   * Returns the 2D box of drawable geometry in the active layout.
   *
   * Uses {@link AcTrScene.box}, which is derived from batch geometry — not
   * database header `EXTMIN`/`EXTMAX`, which are often stale on real DWGs.
   *
   * @inheritdoc
   */
  getDrawingExtents(): AcGeBox2d | undefined {
    const sceneBox = this._scene.box
    if (sceneBox && !sceneBox.isEmpty()) {
      return AcTrGeometryUtil.threeBox3dToGeBox2d(sceneBox)
    }
    return undefined
  }

  /**
   * Applies Open options → Initial view for a layout the user just switched
   * into for the **first** time ({@link setOpenViewMode}).
   *
   * - **Saved + model**: VPORT `*ACTIVE`, else geometry fallback.
   * - **Saved + paper**: {@link acapResolveLayoutFrameBox} with limits
   *   trusted only when they contain real viewports (rejects template
   *   `(0,0)-(12,9)`), then viewports → layout extents → entity box.
   * - **Extents**: frame converted geometry (and paper viewports as a
   *   content proxy). Does not prefer LIMMIN/LIMMAX over drawable bounds.
   *
   * Runs through {@link AcEdConditionWaiter} so viewport / entity convert
   * finishes before framing.
   */
  private applyInitialZoom(btrId: AcDbObjectId, layout: AcDbLayout) {
    const waiter = new AcEdConditionWaiter(
      () => !this.isProcessingEntities,
      () => {
        if (this._externallyFramedLayouts.delete(btrId)) {
          return
        }

        const box = this.resolveFirstVisitFrameBox(btrId, layout)
        if (box) {
          this.zoomTo(box)
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
   * Resolves the camera box for a layout's first visit from
   * {@link _openViewMode}.
   */
  private resolveFirstVisitFrameBox(
    btrId: AcDbObjectId,
    layout: AcDbLayout
  ): AcGeBox2d | undefined {
    const isModelSpace = btrId === this.modelSpaceBtrId
    const wantSaved = this._openViewMode === AcApOpenViewMode.Saved

    if (wantSaved && isModelSpace) {
      const db = AcApDocManager.instance.curDocument.database
      const aspect = this.width / Math.max(this.height, 1)
      const savedBox = db.tables.viewportTable.getActiveVportBox(aspect)
      if (savedBox) return savedBox
    }

    const layoutView = this._layoutViewManager.getAt(btrId)
    const extents = layout.extents
    const layoutExtents =
      extents && !extents.isEmpty()
        ? {
            min: { x: extents.min.x, y: extents.min.y },
            max: { x: extents.max.x, y: extents.max.y }
          }
        : undefined
    const entityBox = this.getDrawingExtents()
    const viewportsBox = layoutView?.viewportsBoundingBox

    if (wantSaved && !isModelSpace) {
      // Paper Saved: trust LIMMIN/LIMMAX only when they contain viewports.
      return acapResolveLayoutFrameBox({
        limits: layout.limits,
        viewportsBox,
        layoutExtents,
        entityBox
      })?.box
    }

    // Extents (any layout), or Saved model fallback without *ACTIVE:
    // prefer drawable content; never lead with template model/paper limits.
    return acapResolveLayoutFrameBox({
      limits: undefined,
      viewportsBox: isModelSpace ? undefined : viewportsBox,
      layoutExtents,
      entityBox
    })?.box
  }

  /**
   * Invalidates in-flight progressive convert and empties convert / deferred
   * queues without tearing down the renderer or DOM.
   *
   * Call before {@link AcApDocManager.destroy} tears down documents so
   * in-flight commits do not keep reading the manager singleton.
   */
  abortConversion() {
    // Invalidate any in-flight progressive convert so it neither paints into
    // the cleared scene nor double-decrements the processing counter.
    this._convertEpoch++
    this.clearFontLoadedRedrawTimer()
    this._convertQueue.length = 0
    this._viewportRepairOwnerIds.clear()
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this.cancelOpenLineworkFrame()
    this.resetDeferredGeometryQueue()
    this._entityProcessingIdleAt = 0
  }

  /**
   * @inheritdoc
   */
  clear() {
    this.abortConversion()
    this._scene.clear()
    this._renderer.resetDrawOrderZ()
    this._isDirty = true
    this._missedImages.clear()
    this._initializedLayouts.clear()
    this._externallyFramedLayouts.clear()
    this._openViewMode = AcApOpenViewMode.Extents
    this._loadingLayouts.clear()
    this._renderer.dispose()
    // Drop block templates when the scene is torn down (next open / close).
    AcDbRenderingCache.instance.clear()
    eventBus.emit('missed-data-changed', {})
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
      openViewMode: this._openViewMode,
      loadingLayouts: this._loadingLayouts,
      missedImages: this._missedImages,
      missedFonts: this._renderer.snapshotMissedFonts(),
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
    this.clearFontLoadedRedrawTimer()
    this.cancelOpenLineworkFrame()
    this._convertQueue.length = 0
    this._viewportRepairOwnerIds.clear()
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this.resetDeferredGeometryQueue()
    this._entityProcessingIdleAt = 0
    this._scene = state.scene
    this._layoutViewManager = state.layoutViewManager
    this._initializedLayouts = state.initializedLayouts
    this._externallyFramedLayouts = state.externallyFramedLayouts
    this._openViewMode = state.openViewMode ?? AcApOpenViewMode.Extents
    this._loadingLayouts = state.loadingLayouts
    this._missedImages = state.missedImages
    this._renderer.replaceMissedFonts(state.missedFonts ?? {})
    this.rebindLayerAppearance()
    this._layoutViewManager.resize(this.width, this.height)
    this.selectionSet.clear()
    if (state.selectionIds.length > 0) {
      this.selectionSet.add(state.selectionIds)
    }
    this._isDirty = true
    eventBus.emit('missed-data-changed', {})
  }

  /**
   * Detaches the current scene and installs an empty one for a newly opened document.
   *
   * @returns Parked state of the previous document.
   */
  beginNewSession(): AcTrViewSessionState {
    const parked = this.captureSessionState()
    this._convertEpoch++
    this.clearFontLoadedRedrawTimer()
    this.cancelOpenLineworkFrame()
    this._convertQueue.length = 0
    this._viewportRepairOwnerIds.clear()
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this.resetDeferredGeometryQueue()
    this._entityProcessingIdleAt = 0
    this._scene = this.createScene()
    this._layoutViewManager = new AcTrLayoutViewManager()
    this._initializedLayouts = new Set()
    this._externallyFramedLayouts = new Set()
    this._openViewMode = AcApOpenViewMode.Extents
    this._loadingLayouts = new Set()
    this._missedImages = new Map()
    this._renderer.clearMissedFonts()
    this.rebindLayerAppearance()
    this.selectionSet.clear()
    this._isDirty = true
    eventBus.emit('missed-data-changed', {})
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
    state.missedFonts = {}
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
   * Returns false when no manager exists so post-destroy key handlers do not
   * reach {@link AcApDocManager.instance}.
   */
  private isActiveManagedView(): boolean {
    const singleton = AcApDocManager as unknown as {
      _instance?: { curView?: AcTrView2d }
    }
    const current = singleton._instance?.curView
    return current != null && current === this
  }

  /**
   * Moves keyboard focus into the viewer container after canvas interaction so
   * document-level shortcuts stay scoped to this view.
   *
   * Skips host editable fields so wheel-over-canvas does not interrupt typing.
   */
  private focusViewerForShortcuts() {
    const active = document.activeElement
    if (active instanceof Node && this.container.contains(active)) {
      return
    }
    if (
      active instanceof HTMLElement &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    ) {
      return
    }
    this.container.focus({ preventScroll: true })
  }

  /**
   * True when the key event originated from (or is focused within) this view.
   */
  private isShortcutEventInsideViewer(e: KeyboardEvent): boolean {
    const target = e.target
    if (target instanceof Node && this.container.contains(target)) {
      return true
    }
    const active = document.activeElement
    return active instanceof Node && this.container.contains(active)
  }

  /**
   * Drains the convert queue on a single serial worker so ENTITY flush chunks
   * can enqueue without overlapping multiple {@link batchConvert} runs (which
   * spikes heap on large drawings).
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

    this._convertDrainPromise = this.runConvertDrain().finally(() => {
      this._convertDrainPromise = null
    })

    await this._convertDrainPromise
  }

  /**
   * Converts the queued entities in slices, active layout first.
   *
   * `drainConvertQueue` used to hand the whole queue to one
   * {@link batchConvert}. Model-space block references queued ahead of the
   * sheet then blocked the sheet's frame and viewports for the entire batch,
   * and a layout activated during that batch stayed starved until it
   * finished. Slices return here so a newly active layout is ordered ahead
   * of the remainder. Paper-active opens use a modest slice budget so the
   * sheet can paint soon; model-active opens match the inner
   * {@link batchConvert} yield cadence and grow slices for throughput so
   * Model-first drawings are not slowed by fine outer slicing. Headless
   * opens (`cooperativeYield === false`) still convert in one batch after
   * that reorder.
   */
  private async runConvertDrain(): Promise<void> {
    const epoch = this._convertEpoch
    const interactive = this._cooperativeYield
    // Model-first opens start at max slice so throughput matches a single
    // batchConvert; paper-first stays at 1 so the sheet can paint in small
    // bites. Layout switches reset slice below.
    let slice = !interactive
      ? Number.POSITIVE_INFINITY
      : this.activeLayoutBtrId === this.modelSpaceBtrId
        ? AcTrView2d.CONVERT_SLICE_MAX
        : 1
    let lastYieldAt = performance.now()
    let state = createConvertPending(
      this._convertQueue.splice(0, this._convertQueue.length),
      this.activeLayoutBtrId
    )
    this.repairViewportViewsFor(state.activeOwnerId)

    while (
      state.cursor < state.pending.length ||
      this._convertQueue.length > 0
    ) {
      if (this._convertEpoch !== epoch) return

      const queued = this._convertQueue.splice(0, this._convertQueue.length)
      const activeNow = this.activeLayoutBtrId
      const activeChanged = activeNow !== state.activeOwnerId
      state = absorbConvertQueue(state, queued, activeNow)
      if (activeChanged) {
        this.repairViewportViewsFor(activeNow)
        // Drop back to a small slice so the newly active layout's own
        // entities are not buried inside a leftover large model-space bite.
        if (interactive) slice = 1
      }
      this.flushViewportViewRepairs()

      if (state.cursor >= state.pending.length) break

      const end = Math.min(state.pending.length, state.cursor + slice)
      const startedAt = performance.now()
      await this.batchConvert(state.pending.slice(state.cursor, end))
      state.cursor = end
      if (this._convertEpoch !== epoch) return

      if (!interactive) continue

      const took = performance.now() - startedAt
      const modelActive = state.activeOwnerId === this.modelSpaceBtrId
      // Model-first opens only need occasional slice boundaries so a sheet
      // activated mid-load can jump the queue. Progressive uses a tighter
      // budget so input stays responsive after the overlay hides.
      const modelYieldBudget = this._progressiveRendering
        ? AcTrView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS
        : AcTrView2d.OPEN_CONVERT_YIELD_BUDGET_MS
      const budget = modelActive
        ? modelYieldBudget
        : AcTrView2d.CONVERT_SLICE_BUDGET_MS
      slice = adaptConvertSliceSize({
        slice,
        tookMs: took,
        budgetMs: budget,
        maxSlice: AcTrView2d.CONVERT_SLICE_MAX,
        // Fine 2× growth only while a paper sheet still needs converting.
        // Model-active (or paper already drained) prefers 4× throughput.
        activeLayoutPending: !modelActive && hasPendingActiveOwner(state)
      })
      if (
        this._progressiveRendering &&
        this.isProgressiveGesturePauseActive()
      ) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        while (performance.now() < this._progressiveInputPauseUntil) {
          await new Promise<void>(resolve => setTimeout(resolve, 16))
        }
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      } else if (
        this._progressiveRendering &&
        this.isProgressiveDiscreteInputPending()
      ) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      } else if (performance.now() - lastYieldAt >= budget) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      }
    }

    this.repairViewportViewsFor(this.activeLayoutBtrId)
    this.flushViewportViewRepairs()
  }

  /**
   * Creates missing {@link AcTrViewportView}s for one paper layout.
   *
   * Safe to call before the layout's entities have been committed to the
   * scene: the database block table record already holds the viewports.
   * Model space is skipped so a large model is not walked on every slice.
   *
   * @param layoutBtrId - Block table record id of the layout to repair.
   */
  private repairViewportViewsFor(layoutBtrId: string) {
    if (!layoutBtrId || layoutBtrId === this.modelSpaceBtrId) return
    const layoutView = this._layoutViewManager.getAt(layoutBtrId)
    if (!layoutView || layoutView.viewportCount > 0) {
      if (layoutView && layoutView.viewportCount > 0) {
        this._viewportRepairOwnerIds.delete(layoutBtrId)
      }
      return
    }
    try {
      const db = AcApDocManager.instance.curDocument?.database
      const blockTableRecord = db?.tables.blockTable.getIdAt(layoutBtrId)
      if (!blockTableRecord) return
      const before = layoutView.viewportCount
      this.ensureViewportViews(blockTableRecord, layoutView)
      if (layoutView.viewportCount > before) {
        this._isDirty = true
      }
      // The block table record was readable. Drop the id even when every
      // viewport was the default paper-space one, so a model-sized record
      // is not walked again on the next slice.
      this._viewportRepairOwnerIds.delete(layoutBtrId)
    } catch (error) {
      log.error('[AcTrView2d] Error repairing viewport views:', error)
    }
  }

  /**
   * Retries viewport-view creation for owners recorded while their layout
   * view did not exist yet.
   */
  private flushViewportViewRepairs() {
    if (this._viewportRepairOwnerIds.size === 0) return
    const ownerIds = Array.from(this._viewportRepairOwnerIds)
    for (let i = 0; i < ownerIds.length; i++) {
      this.repairViewportViewsFor(ownerIds[i])
    }
  }

  /**
   * Marks the canvas dirty for progressive open, throttled to avoid painting
   * on every entity (which dominated total open time).
   *
   * Does not stamp {@link _lastProgressivePaintAt} — that updates only when
   * {@link animate} actually paints. Does not set
   * {@link _progressivePaintUrgent}; camera moves do that so pan/zoom stay
   * immediate while convert-driven paints remain rare.
   */
  private markProgressiveDirty(force = false) {
    const now = performance.now()
    if (
      force ||
      now - this._lastProgressivePaintAt >=
        AcTrView2d.PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
    ) {
      this._isDirty = true
    }
  }

  /**
   * Interactive non-progressive open: dirty the canvas so {@link animate} can
   * refresh under "Rendering drawing ...". Headless (`cooperativeYield`
   * false) leaves this unset; the pool-drain / convert-end dirty is enough.
   * {@link animate} applies {@link NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS}.
   */
  private markInteractiveOpenDirty() {
    if (this._progressiveRendering || !this._cooperativeYield) {
      return
    }
    this._isDirty = true
  }

  /**
   * True when this frame's WebGL paint should count toward OPENPROF mid-open
   * paints and use the open-time throttle (unless the camera marked urgent).
   */
  private shouldCountMidOpenPaint(
    stillLoading: boolean,
    sceneBusy: boolean
  ): boolean {
    return (
      (this._progressiveRendering && stillLoading) ||
      (!this._progressiveRendering && this._cooperativeYield && sceneBusy)
    )
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
   * Releases canvas DOM, WebGL context, convert work, and listeners.
   *
   * Call when this view will no longer be used (manager destroy / split
   * view teardown). Safe to call more than once.
   */
  dispose() {
    if (this._viewDisposed) return
    this._viewDisposed = true

    // Stop convert before tearing down documents/singletons that commit paths read.
    this.abortConversion()

    this._disposeCanvasTouchCallout?.()
    this._disposeCanvasTouchCallout = undefined
    this._disposeProgressiveInputWatch?.()
    this._disposeProgressiveInputWatch = undefined
    this._disposeMobileBoxGesture?.()
    this._disposeMobileBoxGesture = undefined
    this._viewDomAbort.abort()

    if (this._onFontNotFound) {
      this._renderer.events.fontNotFound.removeEventListener(
        this._onFontNotFound
      )
    }
    if (this._onFontLoaded) {
      this._renderer.events.fontLoaded.removeEventListener(this._onFontLoaded)
    }
    if (this._onSysVarChanged) {
      AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
        this._onSysVarChanged
      )
    }
    if (this._onSettingsModified) {
      AcApSettingManager.instance.events.modified.removeEventListener(
        this._onSettingsModified
      )
    }
    if (this._onLayoutSwitched) {
      acdbHostApplicationServices().layoutManager.events.layoutSwitched.removeEventListener(
        this._onLayoutSwitched
      )
    }
    if (this._onCommandWillStartHitTest) {
      this.editor.events.commandWillStart.removeEventListener(
        this._onCommandWillStartHitTest
      )
    }
    if (this._onCommandEndedHitTest) {
      this.editor.events.commandEnded.removeEventListener(
        this._onCommandEndedHitTest
      )
    }

    this._gripManager.dispose()
    this.clearFontLoadedRedrawTimer()
    this.cancelOpenLineworkFrame()
    this.stopAnimationLoop()

    this.selectionSet.clear()
    this.htmlTransientManager.dispose()
    this._scene.clear()
    this._renderer.dispose()
    AcDbRenderingCache.instance.clear()

    const webgl = this._renderer.internalRenderer
    webgl.dispose()
    webgl.forceContextLoss()

    this.canvas.remove()
    this._css2dRenderer.domElement.remove()
    this._stats.dom.remove()

    // Editor / command line / ResizeObserver (after canvas/CSS2D removed).
    super.dispose()
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
    // Refresh size first, then sync WebGL / CSS2D / frustum before notifying
    // listeners so `worldToScreen` consumers see the new projection.
    this.refreshViewSize()
    this._renderer.setSize(this.width, this.height)
    this._css2dRenderer.setSize(this.width, this.height)
    this._layoutViewManager.resize(this.width, this.height)
    this._isDirty = true
    this.events.viewResize.dispatch({
      width: this.width,
      height: this.height
    })
    // CSS2D badges reproject via `_isDirty`. Canvas overlays (measure /
    // markup strokes, live preview) paint with `worldToScreen` and listen to
    // `viewChanged` only — resize must notify them too.
    this.events.viewChanged.dispatch()
  }

  private animate = () => {
    this._rafId = requestAnimationFrame(this.animate)

    this.events.renderFrame.dispatch({
      render: this._renderer,
      camera: this.internalCamera
    })

    const stillLoading = this._numOfEntitiesToProcess > 0
    const sceneBusy = stillLoading || this._pendingGeometryJobs > 0
    // Headless non-progressive (`cooperativeYield` false): skip WebGL until
    // idle. Export reads scene batches, not the framebuffer, and software
    // WebGL + uncapped rAF spent most of open time rasterizing. Interactive
    // non-progressive still paints under "Rendering drawing ..." — throttled
    // below so each glyph completion does not redraw the full scene.
    const deferRenderWhileLoading =
      !this._progressiveRendering && !this._cooperativeYield && sceneBusy
    if (!this._isDirty && !this._htmlDirty && !sceneBusy) {
      return
    }
    if (deferRenderWhileLoading) return
    if (!this._isDirty && !this._htmlDirty) return

    // Mid-open throttle: progressive convert paints, and interactive
    // non-progressive paints while the scene is still busy. Camera changes
    // set `_progressivePaintUrgent` so pan/zoom still redraw now.
    const countMidOpenPaint = this.shouldCountMidOpenPaint(
      stillLoading,
      sceneBusy
    )
    const throttleOpenPaint =
      this._isDirty && !this._progressivePaintUrgent && countMidOpenPaint
    if (throttleOpenPaint) {
      const intervalMs = this._progressiveRendering
        ? AcTrView2d.PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
        : AcTrView2d.NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
      if (performance.now() - this._lastProgressivePaintAt < intervalMs) {
        return
      }
    }

    let needsRedraw = false
    if (this._isDirty) {
      if (countMidOpenPaint) {
        this._progressivePaintCount++
        this._lastProgressivePaintAt = performance.now()
        this._progressivePaintUrgent = false
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
        // Bypass mid-open paint throttle so pan/zoom (and incremental fit)
        // remain visible while convert continues.
        if (this._progressiveRendering && this._numOfEntitiesToProcess > 0) {
          this._progressivePaintUrgent = true
        }
        this.events.viewChanged.dispatch()
        this.clearHover()
      })
      this._layoutViewManager.add(layoutView)
    }
    // Viewport entities may already have been converted while this view was
    // missing. Creating it is the moment those AcTrViewportViews can exist.
    this.flushViewportViewRepairs()
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
        // Streamed layouts flip `isLoaded` from `addEntity` before scene
        // commits finish (`entityCount` still 0). Viewport views are read
        // from the block table record, so repair them even while the sheet's
        // own entities are still queued behind model space.
        this.repairViewportViewsFor(layoutBtrId)
        return
      }
      if (this._loadingLayouts.has(layoutBtrId)) {
        return
      }

      // Same repair as the isLoaded path: the layout view can exist before
      // any of its entities have been committed to the scene. Viewport
      // entities converted before `addLayout` created that view are recorded
      // in `_viewportRepairOwnerIds` and attached here.
      this.repairViewportViewsFor(layoutBtrId)

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
      //
      // Note: `addEntity` now sets `isLoaded` when the open stream
      // enqueues work, so the common progressive-open race (entityCount
      // still 0 at `onAfterOpenDocument` while the convert queue is full)
      // is handled by the `isLoaded` early return above.
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
   * Starts loading fonts referenced by the drawing text style table.
   *
   * Call when conversion stage `STYLE` ends so the download overlaps later
   * parse stages and linework convert. Does not block the caller — glyph
   * finalize awaits {@link awaitTextStyleFontsReady} (and the open-start
   * preset gate) instead.
   *
   * Drawing-independent preset faces are loaded separately via
   * {@link AcApDocManager.ensurePresetFontsForOpen} at open start.
   *
   * @param database - Database whose text style table has just been filled.
   */
  startTextStyleFontPreload(database: AcDbDatabase): void {
    const epoch = this._convertEpoch
    if (
      this._textStyleFontPreloadEpoch === epoch &&
      this._textStyleFontPreloadPromise
    ) {
      return
    }
    this._textStyleFontPreloadEpoch = epoch
    // Worker mode: do not parse STYLE faces on the main thread (would dual-
    // parse mesh with workers). Each worker draw awaits its own content/style
    // faces via awaitFontsBeforeDraw. Preset fallbacks are gated separately
    // by ensurePresetFontsForOpen (scope: all).
    //
    // Main mode: gate deferred glyph jobs on style-table faces only. Unused
    // preset faces were already started at open — do not re-request here.
    const styleFonts = collectTextStyleFontNames(database)
    const fallbackFonts = FontManager.instance.getFontsToLoad()
    const firstDefault = [...FontManager.instance.defaultFonts][0]
    const plan = planTextStyleFontPreload(styleFonts, fallbackFonts, {
      firstDefaultFont: firstDefault
    })
    const mtextRenderer = AcTrMTextRenderer.getInstance()
    const parseSite =
      mtextRenderer.getRenderMode() === 'worker' ? 'worker' : 'main'
    const singleton = AcApDocManager as unknown as {
      _instance?: AcApDocManager
    }
    const preset =
      singleton._instance?.lastPresetFontsForOpen?.length
        ? [...singleton._instance.lastPresetFontsForOpen]
        : [...fallbackFonts]
    this._fontPreloadDiag = {
      critical: [...plan.critical],
      workerWarm: [],
      background: [],
      preset,
      workerSkipped: 0,
      parseSite
    }
    if (parseSite === 'worker') {
      this._textStyleFontPreloadPromise = Promise.resolve()
      return
    }

    // Same deadline as AcApDocManager.installFontFileLoadTimeout.
    const preloadTimeoutMs = 30_000
    if (plan.critical.length === 0) {
      this._textStyleFontPreloadPromise = Promise.resolve()
      return
    }
    const preload = FontManager.instance.requestFonts(plan.critical)
    this._textStyleFontPreloadPromise = new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        // Glyph draw still falls back via FontManager defaults / '?'.
        resolve()
      }, preloadTimeoutMs)
      preload.then(
        () => {
          clearTimeout(timer)
          resolve()
        },
        () => {
          clearTimeout(timer)
          resolve()
        }
      )
    })
  }

  /**
   * Waits until {@link startTextStyleFontPreload} has finished (or starts a
   * fallback preload from this view's bound draw database if STYLE was missed).
   */
  async awaitTextStyleFontsReady(): Promise<void> {
    if (!this._textStyleFontPreloadPromise) {
      // Prefer the database bound to this canvas — not curDocument — so
      // split-view / multi-session opens preload the correct style table.
      const db = this._renderer.context.database
      if (db) {
        this.startTextStyleFontPreload(db)
      } else {
        return
      }
    }
    await this._textStyleFontPreloadPromise
  }

  /**
   * Finishes geometry for a converted entity.
   *
   * Glyph entities, complex-linetype lines, and block groups use
   * {@link AcTrEntity.asyncDraw} so {@link FontManager.awaitFontsBeforeDraw}
   * can wait for fonts without relying on a full-scene regen. Other entities
   * keep the sync finalize path.
   */
  private async finishEntityGeometry(
    threeEntity: AcTrEntity,
    _progressive: boolean
  ) {
    const t0 = performance.now()
    try {
      const isGroup = threeEntity instanceof AcTrGroup
      const groupPending =
        isGroup && this.groupHasPendingGlyphGeometry(threeEntity)
      const needsGlyphDraw =
        groupPending ||
        hasPendingComplexLineTypeGlyphs(threeEntity) ||
        (threeEntity instanceof AcTrGlyphEntity &&
          !threeEntity.hasDrawableGeometry())

      if (needsGlyphDraw) {
        await this.ensureDeferredFontsReady()
      }

      if (isGroup) {
        // Linework-only INSERTs (no empty glyph shells) skip asyncDraw; spatial
        // boxes are refreshed by syncGroupSpatialBoundsForIndexing after commit.
        if (!groupPending) {
          return
        }
        await threeEntity.asyncDraw()
        return
      }
      // Complex TEXT/SHAPE linetypes attach stroke children immediately while
      // glyph shells still need asyncDraw — do not treat stroke children as done.
      if (hasPendingComplexLineTypeGlyphs(threeEntity)) {
        await threeEntity.asyncDraw()
        return
      }
      if (threeEntity.hasDrawableGeometry()) {
        return
      }
      await threeEntity.asyncDraw()
    } finally {
      this._convertPhaseMs.finishGeometry += performance.now() - t0
    }
  }

  private needsDeferredFontGeometry(threeEntity: AcTrEntity): boolean {
    if (threeEntity instanceof AcTrGlyphEntity) {
      return !threeEntity.hasDrawableGeometry()
    }
    // Only defer INSERTs that still have empty glyph shells. Linework-only
    // blocks should commit on the convert path and not occupy the geometry pool.
    if (threeEntity instanceof AcTrGroup) {
      return this.groupHasPendingGlyphGeometry(threeEntity)
    }
    return hasPendingComplexLineTypeGlyphs(threeEntity)
  }

  private clearFontLoadedRedrawTimer() {
    if (this._fontLoadedRedrawTimer != null) {
      clearTimeout(this._fontLoadedRedrawTimer)
      this._fontLoadedRedrawTimer = null
    }
  }

  /**
   * Coalesces late font-load notifications into one glyph rebuild pass.
   */
  private scheduleGlyphRedrawAfterFontLoad(fontName?: string) {
    this.clearFontLoadedRedrawTimer()
    const epoch = this._convertEpoch
    this._fontLoadedRedrawTimer = setTimeout(() => {
      this._fontLoadedRedrawTimer = null
      if (epoch !== this._convertEpoch) {
        return
      }
      void this.redrawGlyphEntitiesAfterFontLoad(epoch, fontName)
    }, 50)
  }

  /**
   * Rebuilds text after a late {@link FontManager.events.fontLoaded}.
   *
   * Live {@link AcTrGlyphEntity} shells (rare: mid-convert / not yet batched)
   * are re-drawn in place. Committed text is already flattened into batches and
   * disposed. A database regen does not rebuild those batches — `entityAppended`
   * skips ids the view already has — but it does replay open-file CONVERSION
   * progress. That replay is skipped while the open has just gone idle
   * ({@link shouldRegenDatabaseAfterFontLoad}); a face that arrives later can
   * still regen.
   */
  private async redrawGlyphEntitiesAfterFontLoad(
    epoch: number,
    fontName?: string
  ) {
    if (epoch !== this._convertEpoch) {
      return
    }
    // Drop overlapping redraws from a rapid fontLoaded burst.
    const redrawEpoch = ++this._fontLoadedRedrawEpoch
    const glyphs: AcTrGlyphEntity[] = []
    for (const layout of this._scene.layouts.values()) {
      layout.layers.forEach(layer => {
        layer.internalObject.traverse(obj => {
          if (obj instanceof AcTrGlyphEntity) {
            glyphs.push(obj)
          }
        })
      })
    }
    for (const glyph of glyphs) {
      if (
        epoch !== this._convertEpoch ||
        redrawEpoch !== this._fontLoadedRedrawEpoch
      ) {
        return
      }
      await glyph.asyncDraw()
    }
    if (glyphs.length > 0) {
      if (epoch === this._convertEpoch) {
        this._isDirty = true
      }
      return
    }

    // Default/symbol preset faces are requested in the background under lazy
    // loading (mtext-renderer awaitFontsBeforeDraw only waits on content/style
    // fonts). Regenerating for every default face load would thrash after open;
    // style fonts that finish late still take the regen path below.
    if (fontName) {
      const defaults = FontManager.instance.defaultFonts
      const normalized = fontName.toLowerCase()
      if (
        defaults.has(fontName) ||
        defaults.has(normalized) ||
        [...defaults].some(name => name.toLowerCase() === normalized)
      ) {
        return
      }
    }

    if (
      epoch !== this._convertEpoch ||
      redrawEpoch !== this._fontLoadedRedrawEpoch
    ) {
      return
    }

    // Font load before the first convert idle (empty scene, ENTITY stream not
    // started yet). Glyph jobs await that font. regen() here replays the
    // in-flight database: measured as thousands of duplicate convert claims
    // and a ~1GB heap spike at the start of open.
    if (this._entityProcessingIdleAt <= 0) {
      return
    }

    const msSinceIdle = performance.now() - this._entityProcessingIdleAt
    // Open-time text awaits its fonts, then this debounced callback runs.
    // Regen here only flashes the loading spinner again after
    // "Rendering drawing ..." has already hidden (progressive rendering on).
    if (
      !shouldRegenDatabaseAfterFontLoad(
        this.isProcessingEntities,
        0,
        msSinceIdle
      )
    ) {
      return
    }

    const db = AcApDocManager.instance?.curDocument?.database
    if (!db) {
      return
    }
    db.regen()
  }

  private groupHasPendingGlyphGeometry(group: AcTrGroup): boolean {
    // Prefer O(block-def shells). A full THREE.traverse over a mega-block
    // (100k+ flattened mesh leaves) was dominating scene-convert wall time.
    for (const entity of group.getSourceEntities()) {
      if (entity instanceof AcTrGlyphEntity && !entity.hasDrawableGeometry()) {
        return true
      }
    }
    return AcTrView2d.directChildrenHavePendingGlyphs(group)
  }

  /**
   * Walks only {@link AcTrEntity} containers for empty glyph shells.
   *
   * Skips raw mesh/line leaves under a flattened {@link AcTrGroup} so checking
   * a whole-floor INSERT is O(glyph shells), not O(all drawable leaves).
   */
  private static directChildrenHavePendingGlyphs(
    root: THREE.Object3D
  ): boolean {
    const children = root.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child instanceof AcTrGlyphEntity) {
        if (!child.hasDrawableGeometry()) {
          return true
        }
        continue
      }
      if (child instanceof AcTrGroup) {
        for (const entity of child.getSourceEntities()) {
          if (
            entity instanceof AcTrGlyphEntity &&
            !entity.hasDrawableGeometry()
          ) {
            return true
          }
        }
        if (AcTrView2d.directChildrenHavePendingGlyphs(child)) {
          return true
        }
        continue
      }
      if (child instanceof AcTrEntity) {
        // Nested non-group entity that may still host deferred glyph children.
        if (AcTrView2d.directChildrenHavePendingGlyphs(child)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Runs glyph/group geometry finalize off the main convert loop so other
   * entities keep converting while fonts download.
   *
   * Jobs are queued with bounded concurrency — unbounded parallel
   * `asyncDraw` on large INSERT/text drawings can freeze the main thread
   * during the "Rendering drawing ..." stage.
   */
  private enqueueDeferredGeometry(
    run: () => Promise<void>,
    epoch: number
  ): void {
    if (epoch !== this._convertEpoch) {
      return
    }
    this._pendingGeometryJobs++
    this._deferredGeometryQueue.push({ run, epoch })
    this.pumpDeferredGeometryQueue()
  }

  /**
   * Starts queued deferred geometry jobs up to
   * {@link DEFERRED_GEOMETRY_CONCURRENCY}.
   */
  private pumpDeferredGeometryQueue(): void {
    while (
      this._deferredGeometryActive < AcTrView2d.DEFERRED_GEOMETRY_CONCURRENCY &&
      this._deferredGeometryQueue.length > 0
    ) {
      const job = this._deferredGeometryQueue.shift()!
      if (job.epoch !== this._convertEpoch) {
        this._pendingGeometryJobs = Math.max(0, this._pendingGeometryJobs - 1)
        continue
      }

      this._deferredGeometryActive++
      void job
        .run()
        .then(() => {
          // Progressive: dirty every glyph (animate throttles paints).
          // Interactive non-progressive: same, under a longer open-paint
          // interval so "Rendering drawing ..." still shows progress.
          // Headless non-progressive: skip — the pool-drain dirty below
          // queues the single frame export/scripts need.
          if (
            job.epoch === this._convertEpoch &&
            (this._progressiveRendering || this._cooperativeYield)
          ) {
            this._isDirty = true
          }
        })
        .catch(error => {
          log.error('[AcTrView2d] Deferred entity geometry failed:', error)
        })
        .finally(() => {
          this._deferredGeometryActive = Math.max(
            0,
            this._deferredGeometryActive - 1
          )
          if (job.epoch === this._convertEpoch) {
            this._pendingGeometryJobs = Math.max(
              0,
              this._pendingGeometryJobs - 1
            )
            if (this._pendingGeometryJobs === 0) {
              this._isDirty = true
            }
            this.stampEntityProcessingIdle()
          }
          this.pumpDeferredGeometryQueue()
        })
    }
  }

  /** Drops queued deferred geometry and resets counters for a new epoch. */
  private resetDeferredGeometryQueue(): void {
    this._deferredGeometryQueue.length = 0
    // Keep `_deferredGeometryActive`: in-flight runners still own concurrency
    // slots until their `finally` runs. Zeroing here lets pump over-schedule
    // when those completions decrement the counter afterward.
    this._pendingGeometryJobs = 0
    this._textStyleFontPreloadPromise = null
    this._textStyleFontPreloadEpoch = -1
    this._deferredFontsReady = null
    this._fontPreloadDiag = null
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
   * Adds an {@link AcTrViewportView} for a real paper-space viewport.
   *
   * When the layout view does not exist yet, the owner id is remembered and
   * {@link flushViewportViewRepairs} creates the view once the layout view
   * does. Adding twice for the same viewport id replaces the previous view.
   *
   * @param entity - Viewport entity, already past the default-viewport filter
   *   at the caller's discretion. Checked again here.
   */
  private attachViewportView(entity: AcDbViewport) {
    if (AcTrViewportView.isDefaultPaperSpaceViewport(entity)) return
    const ownerId = entity.ownerId
    const layoutView = ownerId
      ? this._layoutViewManager.getAt(ownerId)
      : undefined
    if (!layoutView) {
      if (ownerId) this._viewportRepairOwnerIds.add(ownerId)
      return
    }
    layoutView.addViewport(
      new AcTrViewportView(
        layoutView,
        this.toGiViewportWithFrozenLayers(entity),
        this._renderer
      )
    )
    this._isDirty = true
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
        this.toGiViewportWithFrozenLayers(entity),
        this._renderer
      )
      layoutView.addViewport(viewportView)
    }
  }

  /**
   * Builds an {@link AcGiViewport} and ensures VPLAYER frozen layers are
   * present as resolved names. Older data-model builds read group 331 into
   * {@link AcDbViewport.frozenLayerIds} but omit them from `toGiViewport()`.
   */
  private toGiViewportWithFrozenLayers(entity: AcDbViewport): AcGiViewport {
    const gi = entity.toGiViewport() as AcGiViewport & {
      frozenLayers?: string[]
      frozenLayerIds?: string[]
    }
    if (gi.frozenLayers && gi.frozenLayers.length > 0) {
      return gi
    }
    const ids = entity.frozenLayerIds
    if (!ids?.length) return gi

    const names: string[] = []
    const layerTable = entity.database?.tables.layerTable
    if (layerTable) {
      for (const id of ids) {
        const layer = layerTable.getIdAt(id)
        if (layer) names.push(layer.name)
      }
    }
    gi.frozenLayerIds = [...ids]
    gi.frozenLayers = names
    return gi
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
    // Fallback: if STYLE-stage preload never started (e.g. non-conversion open
    // paths), kick it off without blocking linework convert. Glyph finalize
    // awaits the promise via {@link awaitTextStyleFontsReady}.
    if (!options.forExport && !this._textStyleFontPreloadPromise) {
      const db = this._renderer.context.database
      if (db) {
        this.startTextStyleFontPreload(db)
      }
    }
    const progressive = this._progressiveRendering && !options.forExport
    // Time-budgeted yields keep the UI (and optional progressive paints) alive
    // during large open chunks. Count-based yields alone stall on expensive
    // INSERT / hatch batches. Prefer setTimeout(0) over rAF: waiting a full
    // frame per yield inflated total open wall time without improving
    // first-paint much.
    //
    // Always yield for interactive opens — not only when progressiveRendering
    // is on. Otherwise a long sync convert blocks the main thread, the
    // progress overlay cannot poll `isProcessingEntities`, and Chromium may
    // treat the tab as hung ("Page Unresponsive" / kill) at the
    // "Rendering drawing ..." stage. Mid-open WebGL paints are gated by
    // `progressive` / markProgressiveDirty, or markInteractiveOpenDirty
    // when cooperative yields are on.
    //
    // Headless export sets cooperativeYield=false (or forExport) so convert
    // does not pay for setTimeout yields the CLI never needs.
    const yieldBudgetMs = progressive
      ? AcTrView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS
      : AcTrView2d.OPEN_CONVERT_YIELD_BUDGET_MS
    const yieldGate =
      options.forExport || !this._cooperativeYield
        ? undefined
        : new AcCmUiYieldGate(yieldBudgetMs)
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

        const shouldConvert =
          options.forExport || this._convertInvisibleLayers
            ? this._entityDisplay.shouldConvertForExport(entity)
            : this._entityDisplay.shouldConvert(entity)
        if (!shouldConvert) {
          continue
        }

        // Open and export can both observe the same id: the open drain claims
        // it before deferred glyph commit calls addEntity, and export convert
        // used to ignore that claim (`forExport`) and expand the block again.
        // Claim as soon as convert starts so a later pass skips it. Skipping
        // a claimed id is safe for export — off/frozen entities are not
        // claimed when open skipped them, so they still convert here.
        const objectId = String(entity.objectId ?? '')
        let convertGen = 0
        if (
          objectId &&
          (this.hasEntity(objectId) ||
            this._claimedConvertObjectIds.has(objectId))
        ) {
          // The border may already be in the scene from a pass that ran
          // before the layout view existed. Still attach the viewport
          // view; a second border is not drawn because we continue below.
          if (entity instanceof AcDbViewport) {
            this.attachViewportView(entity)
          }
          continue
        }
        if (objectId) {
          this._claimedConvertObjectIds.add(objectId)
          convertGen = this._entityConvertGeneration.get(objectId) ?? 0
        }

        // Fast path: entities that declare a single batchable primitive append
        // directly into batches, skipping temporary drawable allocate → clone → dispose.
        const directMeta = tryBuildDirectEntityMeta(entity, this._renderer)
        if (directMeta) {
          let added = false
          let superseded = false
          try {
            if (
              objectId &&
              (this._entityConvertGeneration.get(objectId) ?? 0) !== convertGen
            ) {
              superseded = true
            } else {
              added = this._scene.addDirectEntity(
                directMeta,
                shouldExtendBboxForDirectEntity(entity)
              )
              if (added) {
                this.applySessionHiddenObjectState(entity.objectId)
                if (progressive) {
                  this.markProgressiveDirty()
                  this._progressiveOpenFit.afterGeometryBatch(
                    () => this.getDrawingExtents(),
                    i
                  )
                } else {
                  this.markInteractiveOpenDirty()
                }
              }
            }
          } finally {
            directMeta.geometry.dispose()
          }
          if (superseded || added) {
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
        if (!threeEntity && !(entity instanceof AcDbViewport)) {
          // Release the claim so a later export pass can retry; otherwise
          // `forExport` claim checks would skip this id forever.
          if (objectId) {
            this._claimedConvertObjectIds.delete(objectId)
          }
          continue
        }

        if (threeEntity) {
          threeEntity.objectId = entity.objectId
          threeEntity.ownerId = entity.ownerId
          threeEntity.layerName = entity.layer
          threeEntity.visible = entity.visibility !== false
          if (
            threeEntity instanceof AcTrGroup &&
            (threeEntity as AcTrGroup).isOnTheSameLayer
          ) {
            // Layer-0 inheritance must run AFTER finishEntityGeometry so TEXT/
            // MTEXT glyph materials exist. Remapping earlier (before asyncDraw)
            // leaves GM/GB-style labels as ACI-7 white while the block frame
            // remaps correctly (GAS-Meter / GAS-Box, A517B / A517E).
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
                    epoch,
                    convertGen
                  ),
                epoch
              )
            } else {
              await this.handleGroup(
                threeEntity as AcTrGroup,
                progressive,
                epoch,
                convertGen
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
              if (
                objectId &&
                (this._entityConvertGeneration.get(objectId) ?? 0) !==
                  convertGen
              ) {
                threeEntity.dispose()
                return
              }
              if (threeEntity instanceof AcTrGroup) {
                this.syncGroupSpatialBoundsForIndexing(threeEntity)
                if ((threeEntity as AcTrGroup).isOnTheSameLayer) {
                  this._inheritedLayerMaterialMapper.remap(
                    (threeEntity as AcTrGroup).children,
                    '0',
                    threeEntity.layerName
                  )
                }
              }
              const tAdd = performance.now()
              this._scene.addEntity(threeEntity, isExtendBbox)
              this._convertPhaseMs.addEntity += performance.now() - tAdd
              this.applySessionHiddenObjectState(entity.objectId)
              // Release memory occupied by this entity
              threeEntity.dispose()
              if (progressive) {
                this.markProgressiveDirty()
                this._progressiveOpenFit.afterGeometryBatch(
                  () => this.getDrawingExtents(),
                  i
                )
              } else {
                this.markInteractiveOpenDirty()
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
          this.attachViewportView(entity)
        } else if (entity instanceof AcDbRasterImage) {
          // Only track images whose pixel data is still unresolved.
          const fileName = entity.imageFileName
          if (fileName && !entity.image) {
            this._missedImages.set(entity.objectId, fileName)
          } else if (entity.image) {
            this._missedImages.delete(entity.objectId)
          }
        }
      } catch (error) {
        const failedId = String(entity.objectId ?? '')
        if (failedId) {
          this._claimedConvertObjectIds.delete(failedId)
        }
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

      if (progressive) {
        // Prefer input-aware yields so pan/zoom are not starved after the
        // overlay is gone; paint throttling stays in markProgressiveDirty.
        await this.progressiveYieldForInput(yieldGate, yieldToEventLoop)
      } else if (yieldGate) {
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
    const lazy = group.peekLazyChildBoxes()
    if (lazy && lazy.boxes.length > 0) {
      const userData = group.userData as {
        lazySpatialChildren?: AcTrLazySpatialChildren
      }
      userData.lazySpatialChildren = lazy
      return
    }
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
    epoch: number = this._convertEpoch,
    convertGen: number = 0
  ) {
    const t0 = performance.now()
    try {
      await this.finishEntityGeometry(group, progressive)
      if (epoch !== this._convertEpoch) {
        group.dispose()
        return
      }
      const objectId = String(group.objectId ?? '')
      if (
        objectId &&
        (this._entityConvertGeneration.get(objectId) ?? 0) !== convertGen
      ) {
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
      const lazyChildren = (
        group.userData as { lazySpatialChildren?: AcTrLazySpatialChildren }
      ).lazySpatialChildren
      if (process.env.NODE_ENV !== 'production' && !lazyChildren) {
        assertAcTrGroupWcsBboxesConsistent(group)
      }

      const groupChildBoxes: AcEdSpatialQueryResultItem[] = lazyChildren
        ? []
        : group.wcsChildBoxes.map(box => ({
            minX: box.minX,
            minY: box.minY,
            maxX: box.maxX,
            maxY: box.maxY,
            id: box.id
          }))
      const aggregateSpatialBbox = lazyChildren
        ? group.wcsBbox.clone()
        : groupChildBoxes.length > 0
          ? unionGroupWcsChildBoxes(group)
          : group.wcsBbox.clone()
      if (groupChildBoxes.length > 0) {
        group.wcsBbox = aggregateSpatialBbox.clone()
      }
      // Every layer fragment shares one INSERT object id, and the child spatial
      // index is keyed by that id. Attaching the full child-box list to each
      // fragment makes addEntity rebuild the same index once per layer. A
      // whole-floor block (00-1~4F: 181515 children, 81 layers) spent ~74s
      // there while "Rendering drawing ..." stayed up.
      let registeredChildIndex = false
      const yieldToEventLoop = () =>
        new Promise<void>(resolve => setTimeout(resolve, 0))
      let lastGroupYieldAt = progressive ? performance.now() : 0
      for (const [layerName, objects] of objectsGroupByLayer) {
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
        // Copy the INSERT matrix exactly — applyMatrix4 decomposes and drops
        // reflections from mirrored block scales.
        entity.matrix.copy(group.matrix)
        entity.matrixAutoUpdate = false
        entity.matrixWorldNeedsUpdate = true
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
        if (!registeredChildIndex && lazyChildren) {
          ;(
            entity.userData as { lazySpatialChildren?: AcTrLazySpatialChildren }
          ).lazySpatialChildren = lazyChildren
          registeredChildIndex = true
        } else if (!registeredChildIndex && groupChildBoxes.length > 0) {
          entityUserData.spatialIndexChildBoxes = groupChildBoxes
          registeredChildIndex = true
        }

        // Important:
        // DO NOT USE spread operator when adding objects because it may be one very large array
        // and can result in maximum call stack size exceeded
        for (let i = 0; i < objects.length; i++) {
          entity.add(objects[i])
        }
        entity.updateMatrixWorld(true)
        this._layerAppearance.refreshTextMaterialsInObjectTree(entity)
        const tAdd = performance.now()
        this._scene.addEntity(entity, true)
        this._convertPhaseMs.addEntity += performance.now() - tAdd
        this.applySessionHiddenObjectState(groupObjectId)
        entity.dispose()

        // Progressive open hides the overlay at CONVERSION END while deferred
        // INSERT finalize may still split many layers — time-budgeted yields
        // so pan/zoom handlers can run between layer commits.
        if (
          progressive &&
          epoch === this._convertEpoch &&
          performance.now() - lastGroupYieldAt >=
            AcTrView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS
        ) {
          await yieldToEventLoop()
          lastGroupYieldAt = performance.now()
        }
      }
      group.dispose()

      if (progressive) {
        this.markProgressiveDirty()
        this._progressiveOpenFit.afterGeometryBatch(() =>
          this.getDrawingExtents()
        )
      } else {
        this.markInteractiveOpenDirty()
      }
    } finally {
      this._convertPhaseMs.handleGroup += performance.now() - t0
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
      // Missed images (and fonts already tracked) are collected during convert;
      // notify the Resources / External References palette once the queue is idle.
      eventBus.emit('missed-data-changed', {})
    }
    this.stampEntityProcessingIdle()
  }

  /**
   * Zooms to batch geometry once, after entity convert has drained.
   */
  private frameOpenLineworkIfReady() {
    if (!this._openLineworkFramePending || this.isConvertingEntities) {
      return
    }
    const box = this.getDrawingExtents()
    if (!box || box.isEmpty()) {
      this._openLineworkFramePending = false
      return
    }
    this._openLineworkFramePending = false
    // Programmatic so a progressive open does not treat this as a user zoom
    // and skip the glyph-aware final fit.
    this._progressiveOpenFit.frameProgrammatically(box)
  }

  /**
   * Records the moment convert and deferred glyph jobs are both idle.
   * Intermediate completions (linework done, text still queued) do not stamp.
   */
  private stampEntityProcessingIdle() {
    if (this._numOfEntitiesToProcess === 0 && this._pendingGeometryJobs === 0) {
      this._entityProcessingIdleAt = performance.now()
      // Release block templates after INSERT convert/glyph work finishes.
      // Clearing at converter END was too early (convert still draining);
      // keeping templates until the next open kept baked shells in memory and
      // OOMed large drawings.
      AcDbRenderingCache.instance.clear()
    }
  }
}
