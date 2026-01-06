import {
  AcDbEntity,
  acdbHostApplicationServices,
  acdbMaskToOsnapModes,
  AcDbObjectId,
  AcDbOsnapMode,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../../../app'
import { AcEdBaseView } from '../../view'
import { AcEdMarkerManager } from '../marker'
import { AcEdFloatingInputBoxes } from './AcEdFloatingInputBoxes'
import {
  AcEdFloatingInputCancelCallback,
  AcEdFloatingInputChangeCallback,
  AcEdFloatingInputCommitCallback,
  AcEdFloatingInputDrawPreviewCallback,
  AcEdFloatingInputDynamicValueCallback,
  AcEdFloatingInputOptions,
  AcEdFloatingInputValidationCallback
} from './AcEdFloatingInputTypes'
import { AcEdFloatingMessage } from './AcEdFloatingMessage'
import { AcEdRubberBand } from './AcEdRubberBand'

type AcEdOsnapPoint = AcGePoint3dLike & {
  type: AcDbOsnapMode
}

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

  /** Callbacks */
  private onCommit?: AcEdFloatingInputCommitCallback<T>
  private onChange?: AcEdFloatingInputChangeCallback<T>
  private onCancel?: AcEdFloatingInputCancelCallback

  /** Validation and dynamic value providers */
  private validateFn: AcEdFloatingInputValidationCallback<T>
  private getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>
  private drawPreview?: AcEdFloatingInputDrawPreviewCallback

  /** Cached click handler */
  private boundOnClick: (e: MouseEvent) => void

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
        color: '#0f0',
        showBaseLineOnly: options.showBaseLineOnly
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

    // -----------------------------
    // Input boxes
    // -----------------------------
    if (options.inputCount !== 0) {
      this.inputs = new AcEdFloatingInputBoxes<T>({
        parent: this.container,
        twoInputs: options.inputCount === 2,
        validate: this.validateFn,
        onCancel: this.onCancel,
        onCommit: this.onCommit,
        onChange: this.onChange
      })
    }

    // -----------------------------
    // Click commit
    // -----------------------------
    this.boundOnClick = e => this.handleClick(e)
    this.parent.addEventListener('click', this.boundOnClick)
    this.injectInputCSS()
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
        background: #888;
        border: 1px solid #666;
        border-radius: 2px;
      }
  
      .ml-floating-input input.invalid {
        border-color: red;
        color: red;
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
    this.inputs?.dispose()
    this.rubberBand?.dispose()
    this.osnapMarkerManager?.clear()
  }

  /**
   * Mouse move handler.
   * Updates dynamic input values, rubber-band preview, OSNAP marker,
   * and optional preview drawing.
   */
  protected override handleMouseMove(e: MouseEvent) {
    if (!this.visible) return

    const wcsPos = this.getPosition(e)
    const defaults = this.getDynamicValue(wcsPos)

    this.inputs?.setValue(defaults.raw)

    // Ensure focus stays in input boxes
    if (this.inputs && !this.inputs.focused) {
      this.inputs.focus()
    }

    this.rubberBand?.update(wcsPos)
    this.drawPreview?.(wcsPos)
  }

  // ---------------------------------------------------------------------------
  // Click / Commit
  // ---------------------------------------------------------------------------

  private handleClick(e: MouseEvent) {
    if (!this.visible) return

    const wcsPos = this.getPosition(e)
    const defaults = this.getDynamicValue(wcsPos)

    this.lastPoint = wcsPos
    this.onCommit?.(defaults.value, wcsPos)
  }

  // ---------------------------------------------------------------------------
  // Position & OSNAP
  // ---------------------------------------------------------------------------

  /**
   * Gets the current cursor position in WCS, considering OSNAP.
   */
  private getPosition(e: MouseEvent) {
    // Update floating UI position (screen space)
    const mousePos = super.setPosition(e)

    // Convert cursor to WCS
    const wcsPos = this.view.cwcs2Wcs(mousePos)

    // Apply OSNAP
    if (this.osnapMarkerManager) {
      this.osnapMarkerManager.hideMarker()
      this.lastOsnapPoint = this.getOsnapPoint()

      if (this.lastOsnapPoint) {
        wcsPos.x = this.lastOsnapPoint.x
        wcsPos.y = this.lastOsnapPoint.y

        this.osnapMarkerManager.showMarker(
          this.lastOsnapPoint,
          this.osnapMode2MarkerType(this.lastOsnapPoint.type)
        )
      }
    }
    return wcsPos
  }

  private osnapMode2MarkerType(osnapMode: AcDbOsnapMode) {
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        return 'rect'
      case AcDbOsnapMode.MidPoint:
        return 'triangle'
      case AcDbOsnapMode.Center:
        return 'circle'
      case AcDbOsnapMode.Quadrant:
        return 'diamond'
      default:
        return 'rect'
    }
  }

  // ---------------------------------------------------------------------------
  // OSNAP calculation
  // ---------------------------------------------------------------------------

  private getOsnapPoint(point?: AcGePoint2dLike, hitRadius = 20) {
    const snapPoints = this.getOsnapPoints(point, hitRadius)

    let minDist = Number.MAX_VALUE
    let index = -1

    for (let i = 0; i < snapPoints.length; i++) {
      const d = this.view.curPos.distanceTo(snapPoints[i])
      if (d < minDist) {
        minDist = d
        index = i
      }
    }

    if (index !== -1) {
      const p1 = this.view.cwcs2Wcs({ x: 0, y: 0 })
      const p2 = this.view.cwcs2Wcs({ x: hitRadius, y: 0 })
      if (minDist < p2.x - p1.x) {
        return snapPoints[index]
      }
    }
    return undefined
  }

  private getOsnapPoints(point?: AcGePoint2dLike, hitRadius = 20) {
    const results = this.view.pick(point, hitRadius)

    const db = acdbHostApplicationServices().workingDatabase
    const modelSpace = db.tables.blockTable.modelSpace
    const osnapPoints: AcEdOsnapPoint[] = []

    results.forEach(item => {
      const entity = modelSpace.getIdAt(item.id)
      if (!entity) return

      if (item.children) {
        item.children.forEach(child =>
          this.getOsnapPointsInAvailableModes(entity, osnapPoints, child.id)
        )
      } else {
        this.getOsnapPointsInAvailableModes(entity, osnapPoints)
      }
    })

    return osnapPoints
  }

  private getOsnapPointsInAvailableModes(
    entity: AcDbEntity,
    osnapPoints: AcEdOsnapPoint[],
    gsMark?: AcDbObjectId
  ) {
    const modes = acdbMaskToOsnapModes(
      AcApSettingManager.instance.osnapModes
    )
    modes.forEach(mode =>
      this.getOsnapPointsByMode(entity, mode, osnapPoints, gsMark)
    )
  }

  private getOsnapPointsByMode(
    entity: AcDbEntity,
    osnapMode: AcDbOsnapMode,
    osnapPoints: AcEdOsnapPoint[],
    gsMark?: AcDbObjectId
  ) {
    const start = osnapPoints.length
    entity.subGetOsnapPoints(
      osnapMode,
      { ...this.view.curPos, z: 0 },
      this.lastPoint,
      osnapPoints,
      gsMark
    )

    for (let i = start; i < osnapPoints.length; i++) {
      osnapPoints[i].type = osnapMode
    }
  }
}
