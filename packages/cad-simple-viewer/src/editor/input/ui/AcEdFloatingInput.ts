import {
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGePoint2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { AcEdBaseView } from '../../view'
import { AcEdOsnapPoint, AcEdOsnapResolver } from '../AcEdOsnapResolver'
import { constrainToTracking } from '../AcEdPolarTracking'
import { AcEdMarkerManager } from '../marker'
import { AcEdFloatingInputBoxes } from './AcEdFloatingInputBoxes'
import {
  AcEdFloatingInputCancelCallback,
  AcEdFloatingInputChangeCallback,
  AcEdFloatingInputCommitCallback,
  AcEdFloatingInputDrawPreviewCallback,
  AcEdFloatingInputDynamicValueCallback,
  AcEdFloatingInputNoneCallback,
  AcEdFloatingInputOptions,
  AcEdFloatingInputValidationCallback
} from './AcEdFloatingInputTypes'
import { AcEdFloatingMessage } from './AcEdFloatingMessage'
import { acedInteractionStrategy } from './AcEdInteractionStrategy'
import { AcEdRubberBand } from './AcEdRubberBand'
import {
  acedHideSimulatedMouseCursor,
  acedRefreshSimulatedMouseCursor
} from './AcEdSimulatedMouseCursor'
import {
  type AcEdTouchPickHudHost,
  acedTouchPickStrategy
} from './AcEdTouchPickStrategy'
import {
  acedArmTouchMouseGuard,
  acedIsGhostClientOrigin,
  acedIsTouchDerivedMouseEvent,
  acedIsTouchLongPressContextMenu,
  acedShouldIgnoreCompatMouse,
  acedSinkFollowingClick,
  AcEdTouchPointSession
} from './AcEdTouchPointSession'

/**
 * A UI component providing a small floating input box used inside CAD editing
 * workflows. It supports both single-input (distance, angle, etc.) and
 * double-input (coordinate entry) modes.
 *
 * The component is responsible for:
 *
 * - Creating, styling, and destroying its HTML structure
 * - Handling keyboard events (Enter, Escape)
 * - Managing live validation (via built-in or custom callback)
 * - Emitting commit/change/cancel events
 * - Ensuring no memory leaks via `dispose()`
 *
 * This abstraction allows higher-level objects such as AcEdInputManager to
 * remain clean and free from DOM-handling logic.
 */
export class AcEdFloatingInput<T> extends AcEdFloatingMessage {
  /** Stores last confirmed WCS point */
  lastPoint: AcGePoint2d | null = null

  /** Inject styles only once */
  private static inputStylesInjected = false

  /** Input box container (single or double input) */
  private inputs?: AcEdFloatingInputBoxes<T>

  /** Provides a temporary CAD-style rubber-band preview. */
  private rubberBand?: AcEdRubberBand

  /** OSNAP marker manager to display and hide OSNAP marker */
  private osnapMarkerManager?: AcEdMarkerManager

  /** Stores last confirmed osnap point */
  private lastOsnapPoint?: AcEdOsnapPoint
  /** Stores last dynamic WCS point used for preview updates */
  private lastDynamicPoint?: AcGePoint2dLike

  /** Reference point for ORTHOMODE cursor locking */
  private orthoReferencePoint?: AcGePoint2dLike

  /** Callbacks */
  private onCommit?: AcEdFloatingInputCommitCallback<T>
  private onChange?: AcEdFloatingInputChangeCallback<T>
  private onCancel?: AcEdFloatingInputCancelCallback
  private onNone?: AcEdFloatingInputNoneCallback

  /** Validation and dynamic value providers */
  private validateFn: AcEdFloatingInputValidationCallback<T>
  private getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>
  private drawPreview?: AcEdFloatingInputDrawPreviewCallback

  /** Cached click handler */
  private boundOnClick: (e: MouseEvent) => void
  /** Cached touch `pointerdown` handler for delayed pick / snap loupe. */
  private boundOnPointerDown: (e: PointerEvent) => void
  /** Cached touch `pointermove` handler for pick preview and loupe tracking. */
  private boundOnPointerMove: (e: PointerEvent) => void
  /** Cached touch `pointerup` handler that commits the pick. */
  private boundOnPointerUp: (e: PointerEvent) => void
  /** Cached `pointercancel` handler that aborts a pan or keeps a long-press. */
  private boundOnPointerCancel: (e: PointerEvent) => void
  /** Cached one-finger `touchstart` so the OS long-press menu does not win. */
  private boundOnTouchStart: (e: TouchEvent) => void
  /** Cached `touchmove` used after `pointercancel` while the finger is down. */
  private boundOnTouchMove: (e: TouchEvent) => void
  /** Cached `touchend` that commits when `pointerup` was swallowed. */
  private boundOnTouchEnd: (e: TouchEvent) => void
  /** Cached `contextmenu` handler that blocks touch long-press Enter. */
  private boundOnContextMenu: (e: MouseEvent) => void
  /** Long-press / short-tap state for one-finger point picking. */
  private readonly touchSession = new AcEdTouchPointSession()
  /**
   * When true, a left-button mouse/pen `pointerdown` landed on this prompt's
   * canvas, so the following `click` may commit. Touch never sets this:
   * phone/pad hide dynamic input, so a leftover compatibility `click` would
   * otherwise hit the canvas and commit the next point prompt.
   */
  private mouseClickArmed = false
  /** Whether to suppress UI display while keeping input active */
  private suppressDisplay: boolean = false
  /** Set once typing moved to the command line: the fields must not steal
   * focus back on the next preview refresh. */
  private focusHeld = false
  /** Cached sysvar handler */
  private boundOnInputSysVarChanged: (args: {
    name: string
    database: unknown
  }) => void
  /** Cached view change handler */
  private boundOnViewChanged: () => void

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  /**
   * Constructs a new floating input widget with the given options.
   *
   * @param view - The view associated with the floating input
   * @param options Configuration object controlling behavior, callbacks,
   *                validation, and display mode.
   */
  constructor(view: AcEdBaseView, options: AcEdFloatingInputOptions<T>) {
    super(view, options)

    this.allowPrompt = options.allowPrompt !== false
    this.suppressDisplay = !this.isDynamicInputEnabled()
    this.orthoReferencePoint =
      options.orthoReferencePoint ?? options.basePoint ?? undefined

    // -----------------------------
    // OSNAP
    // -----------------------------
    if (!options.disableOSnap) {
      this.osnapMarkerManager = new AcEdMarkerManager(view)
    }

    // -----------------------------
    // Rubber band
    // -----------------------------
    if (options.basePoint) {
      this.rubberBand = new AcEdRubberBand(view)
      this.rubberBand.start(options.basePoint, {
        color: 'var(--ml-ui-canvas-line, #0f0)',
        showBaseLineOnly: options.showBaseLineOnly,
        baseAngle: options.baseAngle
      })
    }

    // -----------------------------
    // Callbacks
    // -----------------------------
    this.validateFn = options.validate
    this.getDynamicValue = options.getDynamicValue
    this.drawPreview = options.drawPreview

    this.onCommit = options.onCommit
    this.onChange = options.onChange
    this.onCancel = options.onCancel
    this.onNone = options.onNone

    // -----------------------------
    // Input boxes
    // -----------------------------
    if (options.inputCount !== 0) {
      this.inputs = new AcEdFloatingInputBoxes<T>({
        parent: this.container,
        twoInputs: options.inputCount === 2,
        validate: this.validateFn,
        onCancel: this.onCancel,
        onLetter: options.onLetter,
        onNone: this.onNone,
        onCommit: this.onCommit,
        onChange: this.onChange,
        autoFocus: this.isDynamicInputEnabled(),
        allowNone: options.allowNone,
        useDefaultValue: options.useDefaultValue,
        defaultValue: options.defaultValue
      })
    }

    // -----------------------------
    // Click commit
    // -----------------------------
    this.boundOnClick = e => this.handleClick(e)
    this.parent.addEventListener('click', this.boundOnClick)
    this.boundOnPointerDown = e => this.handlePointerDown(e)
    this.boundOnPointerMove = e => this.handlePointerMove(e)
    this.boundOnPointerUp = e => this.handlePointerUp(e)
    this.boundOnPointerCancel = e => this.handlePointerCancel(e)
    this.boundOnTouchStart = e => this.handleTouchStart(e)
    this.boundOnTouchMove = e => this.handleTouchMove(e)
    this.boundOnTouchEnd = e => this.handleTouchEnd(e)
    this.boundOnContextMenu = e => this.handleContextMenu(e)
    // Capture + non-passive: run before OrbitControls and keep the browser
    // from turning a still finger into scroll / context-menu `pointercancel`.
    this.parent.addEventListener('pointerdown', this.boundOnPointerDown, {
      passive: false,
      capture: true
    })
    this.parent.addEventListener('pointermove', this.boundOnPointerMove)
    this.parent.addEventListener('touchstart', this.boundOnTouchStart, {
      passive: false
    })
    this.parent.addEventListener('contextmenu', this.boundOnContextMenu, true)
    // Release / leftover touch tracking can happen off-canvas.
    window.addEventListener('pointerup', this.boundOnPointerUp)
    window.addEventListener('pointercancel', this.boundOnPointerCancel)
    window.addEventListener('touchmove', this.boundOnTouchMove, {
      passive: false
    })
    window.addEventListener('touchend', this.boundOnTouchEnd)

    // -----------------------------
    // Dynamic input settings listener
    // -----------------------------
    this.boundOnInputSysVarChanged = args => {
      const name = args.name?.toLowerCase()
      if (
        name === AcDbSystemVariables.DYNMODE.toLowerCase() ||
        name === AcDbSystemVariables.DYNPROMPT.toLowerCase()
      ) {
        this.updateDynamicInputDisplay()
      } else if (
        name === AcDbSystemVariables.ORTHOMODE.toLowerCase() ||
        name === AcDbSystemVariables.POLARMODE.toLowerCase() ||
        name === AcDbSystemVariables.POLARANG.toLowerCase() ||
        name === AcDbSystemVariables.POLARADDANG.toLowerCase()
      ) {
        this.requestPreviewRefresh()
      }
    }
    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this.boundOnInputSysVarChanged
    )
    this.boundOnViewChanged = () => this.requestPreviewRefresh()
    this.view.events.viewChanged.addEventListener(this.boundOnViewChanged)
    this.view.events.viewResize.addEventListener(this.boundOnViewChanged)
    this.updateDynamicInputDisplay()

    this.injectInputCSS()
  }

  override showAt(pos: AcGePoint2dLike) {
    if (this.disposed) return
    this.updateDynamicInputDisplay()
    if (!this.suppressDisplay) {
      super.showAt(pos)
    } else {
      this.visible = true
      this.container.style.display = 'none'
      this.setPosition(pos)
      this.parent.addEventListener('mousemove', this.boundOnMouseMove)
    }
    // Phone/pad have no hover. Do not seed the measure jig from a dummy
    // canvas-(0,0) or leftover finger sample; wait for a real pointer.
    if (!this.view.hasCursorPos) return
    if (acedShouldIgnoreCompatMouse()) return
    const wcsPos = this.view.screenToWorld(this.view.viewportToCanvas(pos))
    this.updateDynamicPreview(wcsPos)
  }

  private injectInputCSS() {
    if (AcEdFloatingInput.inputStylesInjected) return
    AcEdFloatingInput.inputStylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-floating-input input {
        font-size: 12px;
        padding: 2px 4px;
        margin-left: 6px;
        height: 22px;
        width: 90px;
        background: var(--ml-ui-bg, #888);
        border: 1px solid var(--ml-ui-border, #666);
        color: var(--ml-ui-text, #fff);
        border-radius: 2px;
      }
  
      .ml-floating-input input.invalid {
        border-color: var(--ml-ui-danger, red);
        color: var(--ml-ui-danger, red);
      }
    `
    document.head.appendChild(style)
  }

  // ---------------------------------------------------------------------------
  // Overrides
  // ---------------------------------------------------------------------------

  override dispose() {
    if (this.disposed) return
    super.dispose()

    this.parent.removeEventListener('click', this.boundOnClick)
    this.parent.removeEventListener(
      'pointerdown',
      this.boundOnPointerDown,
      true
    )
    this.parent.removeEventListener('pointermove', this.boundOnPointerMove)
    this.parent.removeEventListener('touchstart', this.boundOnTouchStart)
    this.parent.removeEventListener(
      'contextmenu',
      this.boundOnContextMenu,
      true
    )
    window.removeEventListener('pointerup', this.boundOnPointerUp)
    window.removeEventListener('pointercancel', this.boundOnPointerCancel)
    window.removeEventListener('touchmove', this.boundOnTouchMove)
    window.removeEventListener('touchend', this.boundOnTouchEnd)
    this.releaseTouchCapture()
    this.touchSession.cancel()
    this.hideTouchPreciseHud()
    this.view.setNavigationEnabled(true)
    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this.boundOnInputSysVarChanged
    )
    this.view.events.viewChanged.removeEventListener(this.boundOnViewChanged)
    this.view.events.viewResize.removeEventListener(this.boundOnViewChanged)
    this.inputs?.dispose()
    this.rubberBand?.dispose()
    this.osnapMarkerManager?.clear()
    this.view.osnapResolver.clearAcquiredCenters()
  }

  /**
   * Mouse move handler.
   * Updates dynamic input values, rubber-band preview, OSNAP marker,
   * and optional preview drawing.
   */
  protected override handleMouseMove(e: MouseEvent) {
    if (!this.visible) return
    if (this.touchSession.isPicking) return
    if (acedShouldIgnoreCompatMouse()) return
    if (acedIsGhostClientOrigin(e) || acedIsTouchDerivedMouseEvent(e)) return

    const wcsPos = this.getPosition({ x: e.clientX, y: e.clientY })
    this.updateDynamicPreview(wcsPos)
  }

  /**
   * Re-render the current preview using the most recent cursor position.
   * Useful when modifier keys change without mouse movement.
   */
  requestPreviewRefresh() {
    if (!this.visible || !this.lastDynamicPoint) return
    this.updateDynamicPreview(this.lastDynamicPoint)

    if (this.osnapMarkerManager && this.lastOsnapPoint) {
      this.osnapMarkerManager.repositionTop(this.lastOsnapPoint)
    }
    this.osnapMarkerManager?.repositionHints()

    if (!this.suppressDisplay && this.view.curMousePos) {
      this.setPosition(this.view.canvasToViewport(this.view.curMousePos))
    }
  }

  // ---------------------------------------------------------------------------
  // Click / Commit
  // ---------------------------------------------------------------------------

  private handleClick(e: MouseEvent) {
    if (!this.visible) return
    // Mouse/pen: commit only after this prompt saw a canvas pointerdown.
    // Touch commits on pointerup. Compatibility mouse events after a long-press
    // (including while the finger is still moving the loupe) must not commit
    // a second nearby point on the next prompt.
    if (this.touchSession.isPicking) return
    if (acedShouldIgnoreCompatMouse()) return
    if (!this.mouseClickArmed) return
    this.mouseClickArmed = false
    if (acedIsGhostClientOrigin(e) || acedIsTouchDerivedMouseEvent(e)) return

    const wcsPos = this.getPosition({ x: e.clientX, y: e.clientY })
    const defaults = this.getDynamicValue(wcsPos)
    const committed = this.onCommit?.(defaults.value, wcsPos) ?? true
    if (committed) {
      this.lastPoint = wcsPos
    }
  }

  /**
   * Starts a one-finger pick on touch, or arms a mouse/pen click commit.
   *
   * Pointer type, not layout: a pad with a mouse still clicks; a desktop
   * with a touch screen still long-presses. Session chrome / marks are
   * {@link acedInteractionStrategy} point policy. Loupe vs simulated mouse
   * is {@link acedTouchPickStrategy}.
   *
   * @param e - Pointer event; button 0 only. Touch is handled here; mouse and
   *   pen arm {@link mouseClickArmed} so the following `click` can commit.
   */
  private handlePointerDown(e: PointerEvent) {
    if (!this.visible || e.button !== 0) return
    if (e.pointerType !== 'touch') {
      // Long-press (and finger move while the loupe is open) must not arm a
      // mouse click. Compatibility `pointerdown` after touch `pointerup` also
      // must not clear the click sink — that was committing a second nearby
      // point on the next measure-distance prompt.
      if (this.touchSession.isPicking) return
      if (acedShouldIgnoreCompatMouse()) return
      if (acedIsGhostClientOrigin(e) || acedIsTouchDerivedMouseEvent(e)) {
        return
      }
      this.mouseClickArmed = true
      return
    }
    e.preventDefault()
    this.mouseClickArmed = false
    acedArmTouchMouseGuard()
    // A leftover precise HUD from a previous pointercancel must not stay on
    // screen when a new finger-down starts.
    this.hideTouchPreciseHud()
    this.touchSession.start(e.pointerId, e.clientX, e.clientY, () => {
      // Precise capture only: disable pan and start the jig / HUD.
      // Before the long-press, one-finger drag is navigation — no rubber-band.
      this.view.setNavigationEnabled(false)
      this.applyTouchPreciseSample(this.touchSession.x, this.touchSession.y)
      this.refreshTouchPreciseHud()
    })
    this.parent.setPointerCapture(e.pointerId)
  }

  /**
   * Updates the pick preview while the finger is down. Movement past the
   * cancel threshold before the long-press fires is treated as a pan.
   * Jig / rubber-band updates wait until precise capture opens.
   *
   * @param e - Pointer event for the active touch session.
   */
  private handlePointerMove(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (e.pointerId !== this.touchSession.pointerId) return
    const moved = this.touchSession.move(e.clientX, e.clientY, true)
    if (moved === 'panning') return
    if (!this.visible || !this.touchSession.isLoupe) return
    this.applyTouchPreciseSample(e.clientX, e.clientY)
    this.refreshTouchPreciseHud()
  }

  /**
   * Ends the touch pick. A short tap or loupe release commits the point;
   * a pan-aborted gesture does not. The following `click` is swallowed.
   *
   * @param e - Pointer event that ended the gesture.
   */
  private handlePointerUp(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (this.touchSession.phase === 'idle') return
    if (e.pointerId !== this.touchSession.pointerId) return
    this.completeTouchPick(e.clientX, e.clientY)
  }

  /**
   * Aborts a pan-converted gesture. A still-finger OS long-press also fires
   * `pointercancel`; keep that pick alive so `touchend` can commit.
   *
   * @param e - Pointer event; only `touch` is handled.
   */
  private handlePointerCancel(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (this.touchSession.phase === 'idle') return
    if (e.pointerId !== this.touchSession.pointerId) return
    this.mouseClickArmed = false
    acedSinkFollowingClick()
    this.releaseTouchCapture()
    if (this.touchSession.isPicking) return
    this.touchSession.cancel()
    this.view.setNavigationEnabled(true)
    this.hideTouchPreciseHud()
    this.view.clearCursorPos()
  }

  /**
   * Blocks the OS long-press callout so it does not scroll the canvas or
   * synthesize a leftover mouse click.
   *
   * @param e - Touch start; one-finger picks only.
   */
  private handleTouchStart(e: TouchEvent) {
    if (!this.visible) return
    if (e.touches.length !== 1) return
    e.preventDefault()
  }

  /**
   * Continues the pick after `pointercancel` (Chrome/Safari long-press) when
   * pointer events stop arriving.
   *
   * @param e - Window-level touch move.
   */
  private handleTouchMove(e: TouchEvent) {
    if (!this.touchSession.isPicking) return
    const touch = e.touches[0] ?? e.changedTouches[0]
    if (!touch) return
    const moved = this.touchSession.move(touch.clientX, touch.clientY, true)
    if (moved === 'panning') return
    if (!this.touchSession.isLoupe) return
    e.preventDefault()
    if (!this.visible) return
    this.applyTouchPreciseSample(touch.clientX, touch.clientY)
    this.refreshTouchPreciseHud()
  }

  /**
   * Commits the pick when `pointerup` was lost after `pointercancel`.
   *
   * @param e - Window-level touch end.
   */
  private handleTouchEnd(e: TouchEvent) {
    if (this.touchSession.phase === 'idle') return
    if (e.touches.length > 0) return
    const touch = e.changedTouches[0]
    if (!touch) return
    this.completeTouchPick(touch.clientX, touch.clientY)
  }

  /**
   * Stops touch long-press `contextmenu` from reaching the prompt's
   * right-click-Enter handler.
   *
   * @param e - Context-menu event on the canvas.
   */
  private handleContextMenu(e: MouseEvent) {
    if (!this.visible) return
    if (
      !acedIsTouchLongPressContextMenu(e) &&
      !acedInteractionStrategy().point.swallowsPromptContextMenu
    ) {
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  /**
   * Ends the active touch session: commit a short tap / loupe release, or
   * ignore a pan.
   *
   * @param clientX - Sample X in client CSS pixels.
   * @param clientY - Sample Y in client CSS pixels.
   */
  private completeTouchPick(clientX: number, clientY: number) {
    this.mouseClickArmed = false
    acedSinkFollowingClick()
    this.releaseTouchCapture()
    const wasPrecise = this.touchSession.isLoupe
    const action = this.touchSession.end()
    this.view.setNavigationEnabled(true)
    this.hideTouchPreciseHud()
    // Finger-up coords must not seed the next prompt's jig preview.
    this.view.clearCursorPos()
    if (!this.visible || action !== 'commit') return
    if (wasPrecise) {
      this.applyTouchPreciseSample(clientX, clientY)
    } else {
      this.applyClientSample(clientX, clientY)
    }
    const wcsPos = this.lastDynamicPoint
      ? new AcGePoint2d(this.lastDynamicPoint.x, this.lastDynamicPoint.y)
      : this.getPosition({ x: clientX, y: clientY })
    const defaults = this.getDynamicValue(wcsPos)
    const committed = this.onCommit?.(defaults.value, wcsPos) ?? true
    if (committed) {
      this.lastPoint = wcsPos
    }
  }

  /**
   * Releases pointer capture taken in {@link handlePointerDown}, if any.
   */
  private releaseTouchCapture() {
    const pointerId = this.touchSession.pointerId
    if (pointerId === -1) return
    if (this.parent.hasPointerCapture(pointerId)) {
      this.parent.releasePointerCapture(pointerId)
    }
  }

  /**
   * Converts a client sample to WCS (with OSNAP) and refreshes the dynamic
   * preview / rubber band.
   *
   * @param clientX - Sample X in client CSS pixels.
   * @param clientY - Sample Y in client CSS pixels.
   */
  private applyClientSample(clientX: number, clientY: number) {
    const wcsPos = this.getPosition({ x: clientX, y: clientY })
    this.updateDynamicPreview(wcsPos)
  }

  /**
   * Applies the active {@link acedTouchPickStrategy} finger→sample mapping
   * during precise capture (loupe or simulated mouse).
   *
   * @param fingerX - Finger X in client CSS pixels.
   * @param fingerY - Finger Y in client CSS pixels.
   */
  private applyTouchPreciseSample(fingerX: number, fingerY: number) {
    const sample = acedTouchPickStrategy().mapFingerToSample(fingerX, fingerY)
    this.applyClientSample(sample.x, sample.y)
  }

  /** HUD host wiring loupe / simulated-mouse helpers to this view. */
  private readonly touchPickHudHost: AcEdTouchPickHudHost = {
    refreshSnapLoupe: (clientX, clientY, snap) => {
      this.view.refreshMobileSnapLoupe(clientX, clientY, snap)
    },
    hideSnapLoupe: () => {
      this.view.hideMobileSnapLoupe()
    },
    refreshSimulatedCursor: (clientX, clientY) => {
      acedRefreshSimulatedMouseCursor(this.view, clientX, clientY)
    },
    hideSimulatedCursor: () => {
      acedHideSimulatedMouseCursor(this.view)
    }
  }

  /**
   * Positions the active touch-pick HUD (loupe or simulated mouse) around the
   * mapped pick sample, including an OSNAP glyph when a snap is active.
   */
  private refreshTouchPreciseHud() {
    const strategy = acedTouchPickStrategy()
    const sample = strategy.mapFingerToSample(
      this.touchSession.x,
      this.touchSession.y
    )
    strategy.showPreciseHud(
      this.touchPickHudHost,
      sample.x,
      sample.y,
      this.lastOsnapPoint ?? null
    )
  }

  /** Hides both touch precise HUDs (safe if the setting toggled mid-gesture). */
  private hideTouchPreciseHud() {
    this.view.hideMobileSnapLoupe()
    acedHideSimulatedMouseCursor(this.view)
  }

  /**
   * Rubber-band origin after the prompt has started, if any.
   * Used by the mobile session panel for length / angle / Δ metrics.
   */
  get sessionBasePoint(): AcGePoint2dLike | undefined {
    return this.rubberBand ? this.orthoReferencePoint : undefined
  }

  /**
   * Starts rubber-band preview from a base point after the prompt has already begun.
   * Used by two-point distance acquisition when the first point is picked by click.
   */
  setBasePoint(
    basePoint: AcGePoint2dLike,
    options?: {
      color?: string
      showBaseLineOnly?: boolean
      baseAngle?: number
    }
  ) {
    if (this.disposed || this.rubberBand) return
    this.rubberBand = new AcEdRubberBand(this.view)
    this.rubberBand.start(basePoint, {
      color: options?.color ?? 'var(--ml-ui-canvas-line, #0f0)',
      showBaseLineOnly: options?.showBaseLineOnly,
      baseAngle: options?.baseAngle
    })
    this.orthoReferencePoint = basePoint
    this.requestPreviewRefresh()
  }

  /**
   * Hands typing over to the command line for the rest of this prompt.
   *
   * Without this the next preview refresh refocuses the fields as soon as the
   * mouse moves, so characters the user started typing in the command line
   * would land back in the number fields.
   */
  releaseFocusToCommandLine() {
    this.focusHeld = true
    this.inputs?.blur()
  }

  private updateDynamicPreview(wcsPos: AcGePoint2dLike) {
    this.lastDynamicPoint = { x: wcsPos.x, y: wcsPos.y }
    const defaults = this.getDynamicValue(wcsPos)

    this.inputs?.setValue(defaults.raw)

    // Ensure focus stays in input boxes
    if (
      this.inputs &&
      !this.inputs.focused &&
      !this.suppressDisplay &&
      !this.focusHeld
    ) {
      this.inputs.focus()
    }

    this.rubberBand?.update(wcsPos)
    this.drawPreview?.(wcsPos)
  }

  // ---------------------------------------------------------------------------
  // Position & OSNAP
  // ---------------------------------------------------------------------------

  /**
   * Gets the current cursor position in WCS, considering OSNAP.
   */
  private getPosition(e: AcGePoint2dLike) {
    // Update floating UI position (screen space)
    const mousePos = super.setPosition(e)

    // Convert cursor to WCS
    const wcsPos = this.view.screenToWorld(mousePos)

    // Apply OSNAP
    if (this.osnapMarkerManager) {
      this.lastOsnapPoint = this.view.osnapResolver.resolve({
        cursorWcs: wcsPos,
        lastPoint: this.lastPoint
          ? { x: this.lastPoint.x, y: this.lastPoint.y, z: 0 }
          : undefined
      })
      this.osnapMarkerManager.setHintMarkers(
        AcEdOsnapResolver.displayCenterMarks(
          this.view.osnapResolver.acquiredCenterMarks,
          this.lastOsnapPoint
        )
      )

      if (this.lastOsnapPoint) {
        wcsPos.x = this.lastOsnapPoint.x
        wcsPos.y = this.lastOsnapPoint.y

        this.osnapMarkerManager.showOrRepositionMarker(
          this.lastOsnapPoint,
          AcEdOsnapResolver.osnapModeToMarkerType(this.lastOsnapPoint.type)
        )
      } else {
        this.osnapMarkerManager.hideMarker()
      }
    }

    if (this.orthoReferencePoint) {
      const constrained = constrainToTracking(wcsPos, this.orthoReferencePoint)
      wcsPos.x = constrained.x
      wcsPos.y = constrained.y
    }

    return wcsPos
  }

  // ---------------------------------------------------------------------------
  // Dynamic Input Settings
  // ---------------------------------------------------------------------------

  private updateDynamicInputDisplay() {
    const dynamicEnabled = this.isDynamicInputEnabled()
    const promptEnabled = this.isDynamicPromptEnabled()

    this.setSuppressDisplay(!dynamicEnabled)
    this.setPromptVisible(this.allowPrompt && dynamicEnabled && promptEnabled)
  }

  private setSuppressDisplay(suppress: boolean) {
    if (this.suppressDisplay === suppress) return
    this.suppressDisplay = suppress

    if (!this.visible) return

    if (this.suppressDisplay) {
      this.container.style.display = 'none'
      this.inputs?.blur()
    } else {
      this.container.style.display = 'flex'
      if (this.inputs && !this.inputs.focused && !this.focusHeld) {
        this.inputs.focus()
      }
    }
  }

  private setPromptVisible(show: boolean) {
    const hasMessage = !!this.label.textContent?.trim()
    if (!hasMessage) {
      this.label.style.display = 'none'
      return
    }
    this.label.style.display = show ? 'inline' : 'none'
  }
}
