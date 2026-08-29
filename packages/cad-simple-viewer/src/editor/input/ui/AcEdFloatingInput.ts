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
import { AcEdRubberBand } from './AcEdRubberBand'
import { AcEdSnapLoupe } from './AcEdSnapLoupe'
import { AcEdTouchPointSession } from './AcEdTouchPointSession'

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
  /** Cached `pointercancel` handler that aborts the pick. */
  private boundOnPointerCancel: (e: PointerEvent) => void
  /** Long-press / short-tap state for one-finger point picking. */
  private readonly touchSession = new AcEdTouchPointSession()
  /** Magnifier HUD shown after a long-press on touch. */
  private snapLoupe?: AcEdSnapLoupe
  /** When true, the synthetic `click` that follows a touch `pointerup` is ignored. */
  private ignoreNextClick = false
  /** Whether to suppress UI display while keeping input active */
  private suppressDisplay: boolean = false
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
    this.parent.addEventListener('pointerdown', this.boundOnPointerDown)
    this.parent.addEventListener('pointermove', this.boundOnPointerMove)
    // Release can happen off-canvas; listen on window like the HTML viewer.
    window.addEventListener('pointerup', this.boundOnPointerUp)
    window.addEventListener('pointercancel', this.boundOnPointerCancel)
    this.snapLoupe = new AcEdSnapLoupe(view)

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
      // Seed preview so modifier toggles can refresh immediately.
      const wcsPos = this.view.screenToWorld(this.view.viewportToCanvas(pos))
      this.updateDynamicPreview(wcsPos)
      return
    }

    this.visible = true
    this.container.style.display = 'none'
    this.setPosition(pos)
    this.parent.addEventListener('mousemove', this.boundOnMouseMove)
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
    this.parent.removeEventListener('pointerdown', this.boundOnPointerDown)
    this.parent.removeEventListener('pointermove', this.boundOnPointerMove)
    window.removeEventListener('pointerup', this.boundOnPointerUp)
    window.removeEventListener('pointercancel', this.boundOnPointerCancel)
    this.releaseTouchCapture()
    this.touchSession.cancel()
    this.snapLoupe?.dispose()
    this.view.setNavigationEnabled(true)
    this.view.setSnapLoupe(null)
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
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false
      return
    }

    const wcsPos = this.getPosition({ x: e.clientX, y: e.clientY })
    const defaults = this.getDynamicValue(wcsPos)
    const committed = this.onCommit?.(defaults.value, wcsPos) ?? true
    if (committed) {
      this.lastPoint = wcsPos
    }
  }

  /**
   * Starts a one-finger pick. Short taps still commit on `pointerup`; a
   * long-press opens the snap loupe and disables navigation until release.
   *
   * @param e - Pointer event; only `touch` with button 0 is handled.
   */
  private handlePointerDown(e: PointerEvent) {
    if (!this.visible || e.pointerType !== 'touch') return
    if (e.button !== 0) return
    this.touchSession.start(e.pointerId, e.clientX, e.clientY, () => {
      this.view.setNavigationEnabled(false)
      this.applyClientSample(this.touchSession.x, this.touchSession.y)
      this.refreshLoupe()
    })
    this.applyClientSample(e.clientX, e.clientY)
    this.parent.setPointerCapture(e.pointerId)
  }

  /**
   * Updates the pick preview while the finger is down. Movement past the
   * cancel threshold before the long-press fires is treated as a pan.
   *
   * @param e - Pointer event for the active touch session.
   */
  private handlePointerMove(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (e.pointerId !== this.touchSession.pointerId) return
    const moved = this.touchSession.move(e.clientX, e.clientY, true)
    if (moved === 'panning') return
    if (!this.visible || !this.touchSession.isPicking) return
    this.applyClientSample(e.clientX, e.clientY)
    if (this.touchSession.isLoupe) this.refreshLoupe()
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
    this.ignoreNextClick = true
    this.releaseTouchCapture()
    const action = this.touchSession.end()
    this.view.setNavigationEnabled(true)
    this.snapLoupe?.hide()
    if (!this.visible || action !== 'commit') return
    this.applyClientSample(e.clientX, e.clientY)
    const wcsPos = this.lastDynamicPoint
      ? new AcGePoint2d(this.lastDynamicPoint.x, this.lastDynamicPoint.y)
      : this.getPosition({ x: e.clientX, y: e.clientY })
    const defaults = this.getDynamicValue(wcsPos)
    const committed = this.onCommit?.(defaults.value, wcsPos) ?? true
    if (committed) {
      this.lastPoint = wcsPos
    }
  }

  /**
   * Aborts the touch pick without committing (for example on `pointercancel`).
   *
   * @param e - Pointer event; only `touch` is handled.
   */
  private handlePointerCancel(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (this.touchSession.phase === 'idle') return
    if (e.pointerId !== this.touchSession.pointerId) return
    this.ignoreNextClick = true
    this.releaseTouchCapture()
    this.touchSession.cancel()
    this.view.setNavigationEnabled(true)
    this.snapLoupe?.hide()
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
   * Positions the snap-loupe HUD and overlay viewport around the current
   * touch sample, including an OSNAP glyph when a snap is active.
   */
  private refreshLoupe() {
    if (!this.snapLoupe) return
    const canvas = this.view.viewportToCanvas({
      x: this.touchSession.x,
      y: this.touchSession.y
    })
    if (this.lastOsnapPoint) {
      const snapScreen = this.view.worldToScreen(this.lastOsnapPoint)
      this.snapLoupe.show(
        canvas.x,
        canvas.y,
        { x: snapScreen.x, y: snapScreen.y },
        AcEdOsnapResolver.osnapModeToMarkerType(this.lastOsnapPoint.type)
      )
    } else {
      this.snapLoupe.show(canvas.x, canvas.y)
    }
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

  private updateDynamicPreview(wcsPos: AcGePoint2dLike) {
    this.lastDynamicPoint = { x: wcsPos.x, y: wcsPos.y }
    const defaults = this.getDynamicValue(wcsPos)

    this.inputs?.setValue(defaults.raw)

    // Ensure focus stays in input boxes
    if (this.inputs && !this.inputs.focused && !this.suppressDisplay) {
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
      this.osnapMarkerManager.hideMarker()
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

        this.osnapMarkerManager.showMarker(
          this.lastOsnapPoint,
          AcEdOsnapResolver.osnapModeToMarkerType(this.lastOsnapPoint.type)
        )
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
      if (this.inputs && !this.inputs.focused) {
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
