import {
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
  AcGePoint2d,
  AcGePoint2dLike,
  AcGiSubEntityTraits,
  log
} from '@mlightcad/data-model'
import { AcDbSystemVariables } from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrGroup,
  AcTrHtmlTransientManager,
  AcTrRenderer,
  AcTrViewportView,
  getMaterialMetadata,
  hasByLayerBinding,
  setMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import { AcApDocManager, AcApSettingManager } from '../app'
import {
  AcEdBaseView,
  AcEdCalculateSizeCallback,
  AcEdConditionWaiter,
  AcEdCorsorType,
  AcEdMTextEditor,
  AcEdOpenMode,
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx,
  AcEdViewMode,
  eventBus,
  resolvePointerSelectionAction
} from '../editor'
import {
  isModelSpaceDatabase,
  MODEL_SPACE_BACKGROUND,
  readLayoutBackgroundColor
} from '../editor/global/AcEdUiColor'
import { AcTrGeometryUtil } from '../util'
import { AcTrLayoutView } from './AcTrLayoutView'
import { AcTrLayoutViewManager } from './AcTrLayoutViewManager'
import { sortPickResults } from './AcTrPickResultUtil'
import { AcTrScene } from './AcTrScene'

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
  background: MODEL_SPACE_BACKGROUND
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
  /** Flag indicating if the view needs to be re-rendered */
  private _isDirty: boolean
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
   * re-entrant calls before the `setTimeout` callback flips
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

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    container.appendChild(renderer.domElement)

    super(renderer.domElement, container)
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
    // Initialize background color through setter to keep renderer/cursor in sync.
    this.backgroundColor = mergedOptions.background ?? MODEL_SPACE_BACKGROUND
    this._stats = this.createStats(AcApSettingManager.instance.isShowStats)

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
        !AcEdMTextEditor.getActiveInputBox()
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
      if (!selectionStartWcs || !selectionStartCanvas) return

      const endCanvas = this.viewportToCanvas({
        x: e.clientX,
        y: e.clientY
      })
      const endWcs = this.screenToWorld(endCanvas)
      clearSelectionPreview()

      const action = this.getPointerSelectionAction(e)

      if (this.isSelectionClick(selectionStartCanvas, endCanvas)) {
        const picked = this.pick(endWcs)
        if (picked.length > 0) {
          this.applySelection([picked[0].id], action)
        } else if (action === 'replace') {
          this.selectionSet.clear()
        }
      } else {
        const box = new AcGeBox2d()
          .expandByPoint(selectionStartWcs)
          .expandByPoint(endWcs)
        const mode = this.getSelectionMode(selectionStartCanvas, endCanvas)
        this.selectByBoxWithMode(box, mode, action)
      }

      selectionStartWcs = null
      selectionStartCanvas = null
    })

    this.canvas.addEventListener('dblclick', e => {
      if (e.button !== 0) return
      if (!canHandleSelectionGesture()) return
      if (AcApDocManager.instance.curDocument.openMode !== AcEdOpenMode.Write) {
        return
      }
      void this.openPickedMTextEditor(e)
    })
    // When using OrbitControls in THREE.js, it attaches its own event listeners to the DOM elements,
    // such as the canvas or the entire document. This can interfere with other event listeners you
    // add, including the keydown event.
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore global shortcuts while typing or during IME composition.
      const target = e.target as HTMLElement | null
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true
      // keyCode 229 is commonly reported by IME composing key events.
      const isImeComposing = e.isComposing || e.keyCode === 229
      if (isEditableTarget || isImeComposing) {
        return
      }

      switch (e.code) {
        case 'Escape':
          this.selectionSet.clear()
          break

        case 'Delete':
        case 'Backspace':
          // Only dispatch erase when no command is currently active.
          // Dispatching erase mid-command (e.g. while LINE awaits the next
          // point) corrupts the active command's input pipeline because
          // sendStringToExecute clears scripted inputs unconditionally.
          if (!this.editor.isActive) {
            AcApDocManager.instance.sendStringToExecute('erase')
          }
          break
      }
    })
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
      args => {
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

        // Clear measurement overlays before swapping layouts.
        // Measurements are screen/coordinate-anchored — their dimension
        // text, hatch indicators, and HTML overlays were laid out in
        // the previous layout's WCS (paper coords, ~unit scale) and
        // would render at nonsense positions in a different layout
        // (model WCS is typically O(10^5) larger, paper layouts use
        // their own sheet coords). Selection state is intentionally
        // **not** cleared here: it is entity-id-based and the same
        // entity stays selected wherever it is rendered (the model
        // entity drilled through a paper viewport remains visually
        // selected when the user returns to model space, matching
        // AutoCAD desktop's behaviour).
        //
        // Dynamic import avoids a circular dependency: the cleanup
        // module already imports `AcTrView2d` for its
        // `htmlTransientManager` cast, so a static import here would
        // create a cycle. The cost (one extra microtask) is
        // negligible for a layout switch.
        void import('../command/measure/AcApClearMeasurementsCmd').then(
          ({ clearAllMeasurements }) => clearAllMeasurements(this)
        )

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
    this._css2dRenderer.domElement.style.zIndex = '99998'
    container.appendChild(this._css2dRenderer.domElement)

    this._missedImages = new Map()
    this._layoutViewManager = new AcTrLayoutViewManager()
    this.initialize()
    this.onWindowResize()
    this._isDirty = true
    this.startAnimationLoop()
    this._numOfEntitiesToProcess = 0
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
   * Gets the Three.js renderer wrapper used for CAD rendering.
   *
   * @returns The renderer instance
   */
  get renderer() {
    return this._renderer
  }

  /**
   * Gets whether the view needs to be re-rendered.
   *
   * @returns True if the view is dirty and needs re-rendering
   */
  get isDirty() {
    return this._isDirty
  }

  /**
   * Sets whether the view needs to be re-rendered.
   *
   * @param value - True to mark the view as needing re-rendering
   */
  set isDirty(value: boolean) {
    this._isDirty = value
  }

  /**
   * Gets information about missing data during rendering (fonts and images).
   *
   * @returns Object containing maps of missing fonts and images
   */
  get missedData() {
    return {
      fonts: this._renderer.missedFonts,
      images: this._missedImages
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
    this._renderer.setClearColor(value)
    this._renderer.currentBackgroundColor = value
    this._renderer.changeBackground(value)
    this.editor.syncCursorBackground(value)
    this._isDirty = true
  }

  private isModelSpaceLayout(database?: AcDbDatabase): boolean {
    if (!database) {
      return this.activeLayoutBtrId === this.modelSpaceBtrId
    }
    return isModelSpaceDatabase(database)
  }

  /**
   * Re-reads layout background sysvars from the active database. Called after
   * a document is opened so DWG-stored values take effect.
   */
  syncDisplaySysVars(database: AcDbDatabase) {
    this.applyCanvasBackground(
      readLayoutBackgroundColor(database, this.isModelSpaceLayout(database))
    )
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
    this._layoutViewManager.activeLayoutBtrId = value
    this._scene.activeLayoutBtrId = value
    this._isDirty = true
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
  zoomToFitDrawing(timeout: number = 0) {
    const waiter = new AcEdConditionWaiter(
      () => this._numOfEntitiesToProcess <= 0,
      () => {
        if (this._scene.box) {
          const box = AcTrGeometryUtil.threeBox3dToGeBox2d(this._scene.box)
          this.zoomTo(box)
          this._isDirty = true
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

  private async openPickedMTextEditor(e: MouseEvent) {
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
    if (!(entity instanceof AcDbMText)) return

    e.preventDefault()
    await this.editMTextEntity(entity)
  }

  private async editMTextEntity(mtext: AcDbMText) {
    if (mtext.lineSpacingFactor !== AcEdMTextEditor.defaultLineSpacingFactor) {
      mtext.lineSpacingFactor = AcEdMTextEditor.defaultLineSpacingFactor
      mtext.triggerModifiedEvent()
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

      mtext.location = result.location
      mtext.contents = result.contents
      mtext.width = result.width
      mtext.height = result.height
      mtext.lineSpacingFactor = result.lineSpacingFactor
      mtext.attachmentPoint = result.attachmentPoint
      mtext.triggerModifiedEvent()
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
        if (modelLayout.isIntersectWith(item.id, vpRaycaster)) {
          results.push(item)
        }
      })
    }
  }

  /**
   * @inheritdoc
   */
  search(box: AcGeBox2d | AcGeBox3d) {
    return this._scene.search(box)
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
    const updatedLayers = this._scene.addLayer({
      name: layer.name,
      isFrozen: layer.isFrozen,
      isOff: layer.isOff,
      color: layer.color
    })

    const traits: Partial<AcGiSubEntityTraits> = {
      layer: layer.name,
      color: layer.color.clone(),
      rgbColor: layer.color.RGB,
      lineType: layer.lineStyle,
      lineWeight: layer.lineWeight,
      transparency: layer.transparency
    }
    const materials = this._renderer.updateLayerMaterial(layer.name, traits)
    updatedLayers.forEach(updatedLayer => {
      for (const id in materials) {
        const material = materials[id]
        updatedLayer.updateMaterial(Number(id), material)
      }
    })
    this._isDirty = true
  }

  /**
   * @inheritdoc
   */
  updateLayer(
    layer: AcDbLayerTableRecord,
    changes: Partial<AcDbLayerTableRecordAttrs>
  ) {
    const updatedLayers = this._scene.updateLayer({
      name: layer.name,
      isFrozen: layer.isFrozen,
      isOff: layer.isOff,
      color: layer.color
    })
    const traits: Record<string, unknown> = {}
    if (changes.color) {
      traits.color = changes.color.clone()
      traits.rgbColor = changes.color.RGB
    }
    if (changes.lineStyle) {
      traits.lineType = layer.lineStyle
    }
    if (changes.lineWeight !== undefined) {
      traits.lineWeight = changes.lineWeight
    }
    if (changes.transparency !== undefined) {
      traits.transparency = changes.transparency
    }
    traits.layer = layer.name // always present

    const materials = this._renderer.updateLayerMaterial(layer.name, traits)
    updatedLayers.forEach(layer => {
      for (const id in materials) {
        const material = materials[id]
        layer.updateMaterial(Number(id), material)
      }
    })
    this._isDirty = true
  }

  /**
   * Add the specified transient entity or entities into this view
   * @param entity Input one or multiple transient entities
   */
  addTransientEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i]
      const threeEntity: AcTrEntity | null = this.drawEntity(entity, true)
      if (threeEntity) {
        threeEntity.objectId = entity.objectId
        this._scene.addTransientEntity(threeEntity)
        this._isDirty = true
      }
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
   * @inheritdoc
   */
  addEntity(entity: AcDbEntity | AcDbEntity[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    this._numOfEntitiesToProcess += entities.length
    setTimeout(async () => {
      await this.batchConvert(entities)
    })
    this._isDirty = true
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
  updateEntity(entity: AcDbEntity | AcDbEntity[]) {
    let entities: AcDbEntity[] = []
    if (Array.isArray(entity)) {
      entities = entity
    } else {
      entities.push(entity)
    }

    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i]
      const threeEntity = entity.worldDraw(this._renderer) as AcTrEntity
      if (threeEntity) {
        threeEntity.objectId = entity.objectId
        threeEntity.ownerId = entity.ownerId
        threeEntity.layerName = entity.layer
        threeEntity.visible = entity.visibility
        this._scene.updateEntity(threeEntity)
      }
    }
    this._isDirty = true
    // Not sure why texture for image entity isn't updated even if 'isDirty' flag is already set to true.
    // So add one timeout event to set 'isDirty' flag to true again to make it work
    setTimeout(() => {
      this._isDirty = true
    }, 100)
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
   * layout right after parsing). Subsequent `layoutSwitched` events
   * for this btrId will skip their initial zoom-to-fit so the user's
   * camera state on the startup layout is preserved when they click
   * back to that tab.
   *
   * This is the public counterpart of the `_initializedLayouts` set —
   * exposed so the application layer can stay in sync with the view's
   * notion of "which layouts have been framed already" without
   * needing access to private state.
   */
  markLayoutAsInitialized(layoutBtrId: AcDbObjectId) {
    this._initializedLayouts.add(layoutBtrId)
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
   * 4. **`zoomToFitDrawing`** (entity extents from spatial index) —
   *    last-resort fallback for layouts with no viewports and no
   *    sensible limits/extents (e.g. a freshly created empty paper).
   *    Vulnerable to scale-mismatch outliers, but better than no zoom.
   *
   * **Critically, this runs through `AcEdConditionWaiter`**: at the
   * moment `layoutSwitched` fires, the layout's entities (including its
   * `AcDbViewport`s) have not yet been batch-converted into the scene
   * — `loadLayoutEntitiesIfNeeded` chunked-converts via `setTimeout`.
   * Without the waiter, `viewportsBoundingBox` returns undefined and
   * the strategy degrades into (1) zooming to garbage `limits`, or
   * (4) zooming to an empty scene box. The waiter polls
   * `_numOfEntitiesToProcess` and only fires the heuristic once the
   * conversion is done.
   */
  private applyInitialZoom(btrId: AcDbObjectId, layout: AcDbLayout) {
    const waiter = new AcEdConditionWaiter(
      () => this._numOfEntitiesToProcess <= 0,
      () => {
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
        } else if (this._scene.box) {
          this.zoomTo(AcTrGeometryUtil.threeBox3dToGeBox2d(this._scene.box))
        }
        this._isDirty = true
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
    this._scene.clear()
    this._isDirty = true
    this._missedImages.clear()
    this._renderer.dispose()
  }

  /**
   * @inheritdoc
   */
  highlight(ids: AcDbObjectId[]) {
    this._isDirty = this._scene.select(ids)
  }

  /**
   * @inheritdoc
   */
  unhighlight(ids: AcDbObjectId[]) {
    this._isDirty = this._scene.unselect(ids)
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
    if (!this._isDirty && !stillLoading) return

    const needsRedraw = this._layoutViewManager.render(this._scene)
    if (this.internalCamera) {
      this._css2dRenderer.render(this._scene.internalScene, this.internalCamera)
    }
    this._stats?.update()
    this._isDirty = stillLoading || needsRedraw
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
   *    `setTimeout` chunked-convert callback is still in flight. Without it,
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

      // Load entities asynchronously
      this._loadingLayouts.add(layoutBtrId)
      this._numOfEntitiesToProcess += entities.length
      setTimeout(async () => {
        try {
          await this.batchConvert(entities)
          const layout = this._scene.layouts.get(layoutBtrId)
          if (layout) {
            layout.isLoaded = true
          }
        } finally {
          this._loadingLayouts.delete(layoutBtrId)
        }
      })
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

  private drawEntity(entity: AcDbEntity, delay?: boolean) {
    return entity.worldDraw(this._renderer, delay) as AcTrEntity | null
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
   * undefined). Without this recovery, `viewportsBoundingBox` stays
   * `undefined` on first user visit, the initial-zoom strategy
   * degrades to the bogus `limits` branch, and the layout renders as
   * a "grain in the corner" with empty viewport scissors. See the
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
  private async batchConvert(entities: AcDbEntity[]) {
    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i]
      try {
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

        const threeEntity: AcTrEntity | null = this.drawEntity(entity, true)
        if (!threeEntity) continue

        threeEntity.objectId = entity.objectId
        threeEntity.ownerId = entity.ownerId
        threeEntity.layerName = entity.layer
        threeEntity.visible = entity.visibility
        if (
          threeEntity instanceof AcTrGroup &&
          (threeEntity as AcTrGroup).isOnTheSameLayer
        ) {
          // Even when a block expands to a single layer bucket, children authored on
          // layer "0" still inherit the INSERT layer for ByLayer traits (color, etc.).
          this.remapInheritedLayerObjects(
            (threeEntity as AcTrGroup).children,
            '0',
            threeEntity.layerName
          )
        }
        if (
          threeEntity instanceof AcTrGroup &&
          !(threeEntity as AcTrGroup).isOnTheSameLayer
        ) {
          this.handleGroup(threeEntity as AcTrGroup)
        } else {
          const isExtendBbox = !(
            entity instanceof AcDbRay || entity instanceof AcDbXline
          )

          await threeEntity.draw()
          this._scene.addEntity(threeEntity, isExtendBbox)
          // Release memory occupied by this entity
          threeEntity.dispose()
          this._isDirty = true
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
          const fileName = entity.imageFileName
          if (fileName) this._missedImages.set(entity.objectId, fileName)
        }
      } catch (error) {
        log.error(
          `[AcTrView2d] Failed to convert entity ${entity.objectId} (${entity.type}):`,
          error
        )
      } finally {
        this.decreaseNumOfEntitiesToProcess()
      }
    }
  }

  private handleGroup(group: AcTrGroup) {
    const children = group.children
    const objectsGroupByLayer: Map<string, THREE.Object3D[]> = new Map()
    children.forEach(child => {
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

    const styleManager = group.styleManager
    const groupObjectId = group.objectId
    const groupLayerName = group.layerName
    const groupBox = group.box
    const groupChildBoxes: AcEdSpatialQueryResultItem[] = group.boxes.map(
      box => ({
        ...box
      })
    )
    objectsGroupByLayer.forEach((objects, layerName) => {
      // AutoCAD block rule: entities authored on layer "0" inherit the INSERT's layer.
      // Non-zero layers keep their original layer name.
      const effectiveLayerName = layerName === '0' ? groupLayerName : layerName

      // Keep runtime layer metadata/material cache aligned with the inherited layer so
      // later layer style edits (color, linetype, lineweight, transparency) target this
      // object set correctly.
      this.remapInheritedLayerObjects(objects, layerName, effectiveLayerName)

      // One INSERT can expand to children from multiple layers. Here we create one
      // render entity per layer bucket but preserve the INSERT object id for all
      // buckets, so selection/highlight still maps back to the same database object.
      // Within each layer bucket, the object id remains unique in scene indexing.
      const entity = new AcTrEntity(styleManager)
      entity.applyMatrix4(group.matrix)
      entity.objectId = groupObjectId
      entity.ownerId = group.ownerId
      // If block-definition entities are on layer "0", this bucket now uses the layer
      // of the block reference itself (effectiveLayerName).
      entity.layerName = effectiveLayerName
      entity.box = groupBox
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
      this._scene.addEntity(entity, true)
      entity.dispose()
    })
    group.dispose()

    this._isDirty = true
  }

  /**
   * Remaps layer metadata/material bindings from a source layer to the effective render layer.
   *
   * During block decomposition, one INSERT may be split into multiple layer buckets. For
   * children authored on layer "0", AutoCAD requires inheriting the INSERT's own layer.
   * This method applies that inheritance by mutating each child's `userData.layerName` and
   * re-binding materials via renderer cache, so subsequent layer-level style changes still
   * hit the correct material instances.
   *
   * @param objects - Root objects in the current layer bucket to traverse and remap.
   * @param sourceLayerName - Layer name found in block definition before inheritance.
   * @param effectiveLayerName - Final layer name used by rendering and style updates.
   */
  private remapInheritedLayerObjects(
    objects: THREE.Object3D[],
    sourceLayerName: string,
    effectiveLayerName: string
  ) {
    if (sourceLayerName === effectiveLayerName) return

    const renderer = this._renderer
    const layerTraits = this.getEffectiveLayerTraits(effectiveLayerName)
    for (const object of objects) {
      object.traverse(child => {
        if (child.userData.layerName === sourceLayerName) {
          child.userData.layerName = effectiveLayerName
        }

        if (!('material' in child)) return

        const material = child.material
        if (Array.isArray(material)) {
          const materials = material as THREE.Material[]
          child.material = materials.map(entry =>
            renderer.getLayerBoundMaterial(
              this.promoteLayerZeroByLayerColor(entry, sourceLayerName),
              effectiveLayerName,
              layerTraits
            )
          )
          return
        }

        const remappedMaterial = renderer.getLayerBoundMaterial(
          this.promoteLayerZeroByLayerColor(
            material as THREE.Material,
            sourceLayerName
          ),
          effectiveLayerName,
          layerTraits
        )
        child.material = remappedMaterial
        child.userData.styleMaterialId = remappedMaterial.id
      })
    }
  }

  /**
   * Some DXF conversion paths lose `isByLayerColor` on layer-0 block contents while still
   * retaining other ByLayer markers (lineType/lineWeight/transparency). For AutoCAD-compatible
   * INSERT inheritance, treat such colors as inheritable when remapping from layer "0".
   */
  private promoteLayerZeroByLayerColor(
    material: THREE.Material,
    sourceLayerName: string
  ): THREE.Material {
    const metadata = getMaterialMetadata(material)
    const hasAnyOtherByLayerBinding =
      hasByLayerBinding(metadata) && metadata.isByLayerColor !== true

    if (sourceLayerName === '0' && hasAnyOtherByLayerBinding) {
      setMaterialMetadata(material, { isByLayerColor: true })
    }
    return material
  }

  /**
   * Builds the resolved layer traits used when layer-0 block content inherits an INSERT layer.
   */
  private getEffectiveLayerTraits(
    layerName: string
  ): Partial<AcGiSubEntityTraits> | undefined {
    const layer =
      AcApDocManager.instance.curDocument.database.tables.layerTable.getAt(
        layerName
      )
    if (!layer) return undefined

    return {
      layer: layer.name,
      color: layer.color.clone(),
      rgbColor: layer.color.RGB,
      lineType: layer.lineStyle,
      lineWeight: layer.lineWeight,
      transparency: layer.transparency
    }
  }

  private decreaseNumOfEntitiesToProcess() {
    this._numOfEntitiesToProcess--
    if (this._numOfEntitiesToProcess < 0) {
      this._numOfEntitiesToProcess = 0
      log.warn(
        'Something wrong! The number of entities to process should not be less than 0.'
      )
    }
  }
}
