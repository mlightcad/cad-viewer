import {
  acdbHostApplicationServices,
  AcDbOsnapMode,
  AcGeBox2d,
  AcGePoint2dLike,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApI18n } from '../../../i18n'
import { AcEdBaseView } from '../../view'
import { AcEdPreviewJig } from '../AcEdPreviewJig'
import {
  AcEdAngleHandler,
  AcEdDistanceHandler,
  AcEdDoubleHandler,
  AcEdInputHandler,
  AcEdIntegerHandler,
  AcEdNumericalHandler,
  AcEdPointHandler,
  AcEdStringHandler
} from '../handler'
import { AcEdMarkerManager } from '../marker'
import {
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptNumericalOptions,
  AcEdPromptPointOptions,
  AcEdPromptStringOptions
} from '../prompt'
import { AcEdFloatingInput } from './AcEdFloatingInput'
import {
  AcEdFloatingInputDrawPreviewCallback,
  AcEdFloatingInputDynamicValueCallback,
  AcEdFloatingInputRawData
} from './AcEdFloatingInputTypes'
import { AcEdRubberBand } from './AcEdRubberBand'

/**
 * A fully type-safe TypeScript class providing CAD-style interactive user input
 * using floating HTML input boxes and mouse events. Supports collecting points,
 * distances, angles, numbers, strings, and selecting a 2-point rectangular box
 * using an HTML overlay rectangle (suitable when the main canvas is a THREE.js
 * WebGL canvas).
 */
export class AcEdInputManager {
  /** Inject styles only once */
  private static stylesInjected = false

  /** The view associated with this input operation */
  protected view: AcEdBaseView

  /** Stores last confirmed point from getPoint() or getBox() */
  private lastPoint: AcGePoint3dLike | null = null

  /** Stores last confirmed osnap point */
  private lastOSnapPoint?: AcGePoint3dLike

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  private active: boolean = false

  /**
   * Construct the manager and attach mousemove listener used for floating input
   * positioning and live preview updates.
   *
   * @param canvas The canvas element (usually THREE.js renderer.domElement)
   */
  constructor(view: AcEdBaseView) {
    this.view = view
    this.injectCSS()
  }

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  get isActive() {
    return this.active
  }

  /**
   * Injects minimal CSS required for the floating input and preview rectangle.
   * Useful when you do not have a separate CSS file.
   */
  private injectCSS() {
    if (AcEdInputManager.stylesInjected) return
    AcEdInputManager.stylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-jig-preview-rect {
        position: absolute;
        border: 1px dashed var(--line-color, #0f0);
        background: rgba(0, 255, 0, 0.04);
        pointer-events: none;
        z-index: 9999;
      }
      .ml-jig-preview-line {
        position: absolute;
        height: 1px;
        background: var(--line-color, #0f0);
        transform-origin: 0 0;
        pointer-events: none;
        z-index: 9999;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Format a number for display in input box.
   * Default: 3 decimal places for points/distance, 2 decimal places for angles.
   * @param value The numeric value
   * @param type Optional type: 'point' | 'distance' | 'angle'
   */
  private formatNumber(
    value: number,
    type: 'point' | 'distance' | 'angle'
  ): string {
    switch (type) {
      case 'angle':
        return value.toFixed(2)
      case 'distance':
      case 'point':
      default:
        return value.toFixed(3)
    }
  }

  /**
   * Public point input API.
   */
  getPoint(options: AcEdPromptPointOptions): Promise<AcGePoint3dLike> {
    return this.getPointInternal(options)
  }

  /**
   * Prompt the user to type a numeric value. If integerOnly is true, integers
   * are enforced. The input is validated and the box will be marked invalid if
   * the typed value does not conform, allowing the user to retype.
   */
  private getNumberTyped(
    options: AcEdPromptNumericalOptions,
    handler: AcEdNumericalHandler | AcEdAngleHandler
  ): Promise<number> {
    const getDynamicValue = () => {
      return {
        value: 0,
        raw: { x: '' }
      }
    }

    return this.makePromise<number>({
      message: options.message,
      twoInputs: false,
      jig: options.jig,
      showBaseLineOnly: false,
      useBasePoint: false,
      handler,
      getDynamicValue
    })
  }

  /** Request a distance (number) from the user. */
  getDistance(options: AcEdPromptDistanceOptions): Promise<number> {
    // If no base point defined → fall back to typed numeric input
    if (!this.lastPoint) {
      // fallback to normal numeric input
      return this.getNumberTyped(options, new AcEdDistanceHandler(options))
    }

    const getDynamicValue = (x: number, y: number) => {
      const mouseWorld = this.view.cwcs2Wcs({ x, y })
      const dx = mouseWorld.x - this.lastPoint!.x
      const dy = mouseWorld.y - this.lastPoint!.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      return {
        value: dist,
        raw: { x: this.formatNumber(dist, 'distance') }
      }
    }

    const handler = new AcEdDistanceHandler(options)
    return this.makePromise<number>({
      message: options.message,
      twoInputs: false,
      jig: options.jig,
      showBaseLineOnly: false,
      useBasePoint: true,
      handler,
      getDynamicValue
    })
  }

  /** Request an angle in degrees from the user. */
  getAngle(options: AcEdPromptAngleOptions): Promise<number> {
    const getDynamicValue = (x: number, y: number) => {
      const cur = this.view.cwcs2Wcs({ x, y })
      const dx = cur.x - this.lastPoint!.x
      const dy = cur.y - this.lastPoint!.y
      const angleRad = Math.atan2(dy, dx)
      const angleDeg = (angleRad * 180) / Math.PI
      return {
        value: angleDeg,
        raw: { x: this.formatNumber(angleDeg, 'angle') }
      }
    }

    const handler = new AcEdAngleHandler(options)
    return this.makePromise<number>({
      message: options.message,
      twoInputs: false,
      jig: options.jig,
      showBaseLineOnly: false,
      useBasePoint: true,
      handler,
      getDynamicValue
    })
  }

  /** Request a double/float from the user. */
  getDouble(options: AcEdPromptDistanceOptions): Promise<number> {
    return this.getNumberTyped(options, new AcEdDoubleHandler(options))
  }

  /** Request an integer from the user. */
  getInteger(options: AcEdPromptIntegerOptions): Promise<number> {
    return this.getNumberTyped(options, new AcEdIntegerHandler(options))
  }

  /**
   * Prompt the user to type an arbitrary string. Resolved when Enter is pressed.
   */
  getString(options: AcEdPromptStringOptions): Promise<string> {
    const getDynamicValue = () => {
      return {
        value: '',
        raw: { x: '' }
      }
    }

    const handler = new AcEdStringHandler(options)
    return this.makePromise<string>({
      message: options.message,
      twoInputs: false,
      jig: options.jig,
      showBaseLineOnly: false,
      useBasePoint: false,
      handler,
      getDynamicValue
    })
  }

  /**
   * Prompt the user to specify a rectangular box by selecting two corners.
   * Each corner may be specified by clicking on the canvas or typing "x,y".
   * A live HTML overlay rectangle previews the box as the user moves the mouse.
   */
  async getBox(): Promise<AcGeBox2d> {
    // Get first point
    const message1 = AcApI18n.t('main.inputManager.firstCorner')
    const options1 = new AcEdPromptPointOptions(message1)
    options1.useDashedLine = false
    options1.useBasePoint = false
    const p1 = await this.getPoint(options1)
    const cwcsP1 = this.view.wcs2Cwcs(p1)

    // Create preview rectangle
    const previewEl = document.createElement('div')
    previewEl.className = 'ml-jig-preview-rect'
    document.body.appendChild(previewEl)

    const cleanup = () => {
      previewEl.remove()
    }

    const drawPreview = (x: number, y: number) => {
      const left = Math.min(x, cwcsP1.x)
      const top = Math.min(y, cwcsP1.y)
      const width = Math.abs(x - cwcsP1.x)
      const height = Math.abs(y - cwcsP1.y)

      Object.assign(previewEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      })
    }

    // Second point
    const message2 = AcApI18n.t('main.inputManager.secondCorner')
    const options2 = new AcEdPromptPointOptions(message2)
    options2.useDashedLine = false
    options2.useBasePoint = true
    const p2 = await this.getPointInternal(options2, cleanup, drawPreview)

    return new AcGeBox2d().expandByPoint(p1).expandByPoint(p2)
  }

  /**
   * Shared point input logic used by getPoint() and getBox(). Accepts "x,y"
   * typed input OR mouse click.
   */
  private getPointInternal(
    options: AcEdPromptPointOptions,
    cleanup?: () => void,
    drawPreview?: AcEdFloatingInputDrawPreviewCallback
  ) {
    const getDynamicValue = (x: number, y: number) => {
      const mouseWorld = this.view.cwcs2Wcs({ x, y })
      return {
        value: { ...mouseWorld, z: 0 },
        raw: {
          x: this.formatNumber(mouseWorld.x, 'point'),
          y: this.formatNumber(mouseWorld.y, 'point')
        }
      }
    }

    const handler = new AcEdPointHandler(options)
    return this.makePromise<AcGePoint3dLike>({
      message: options.message,
      twoInputs: true,
      jig: options.jig,
      showBaseLineOnly: !options.useDashedLine,
      useBasePoint: options.useBasePoint,
      cleanup,
      handler,
      getDynamicValue,
      drawPreview
    })
  }

  /**
   * Creates a Promise that will be resolved or rejected by user input.
   *
   * This method centralizes the lifecycle of an interactive input operation,
   * including handling the Escape key to cancel, resolving with user-provided
   * values, and guaranteeing cleanup of UI elements and event handlers.
   */
  private makePromise<T>(options: {
    message?: string
    twoInputs?: boolean
    jig?: AcEdPreviewJig<T>
    showBaseLineOnly?: boolean
    useBasePoint?: boolean
    disableOSnap?: boolean
    handler: AcEdInputHandler<T>
    cleanup?: () => void
    getDynamicValue: AcEdFloatingInputDynamicValueCallback<T>
    drawPreview?: AcEdFloatingInputDrawPreviewCallback
  }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.active = true
      const validate = (raw: AcEdFloatingInputRawData) => {
        const value = options.handler.parse(raw.x, raw.y)
        return {
          isValid: value != null,
          value: value ?? undefined
        }
      }

      // OSNAP marker manager to display and hide OSNAP marker
      let osnapMarkerManager: AcEdMarkerManager | undefined = undefined
      if (!options.disableOSnap) {
        osnapMarkerManager = new AcEdMarkerManager(this.view)
      }

      const floatingInput = new AcEdFloatingInput({
        parent: this.view.canvas,
        twoInputs: options.twoInputs,
        message: options.message,
        validate: validate,
        getDynamicValue: options.getDynamicValue,
        drawPreview: (x: number, y: number) => {
          if (options.jig) {
            const defaults = options.getDynamicValue(x, y)
            options.jig.update(defaults.value)
            options.jig.render()
          }
          if (rubberBand) {
            const cur = this.view.cwcs2Wcs({ x, y })
            rubberBand?.update(cur)
          }

          // Show OSNAP Point
          if (osnapMarkerManager) {
            osnapMarkerManager.hideMarker()
            this.lastOSnapPoint = this.getOSnapPoint()
            if (this.lastOSnapPoint) {
              osnapMarkerManager.showMarker(this.lastOSnapPoint)
            }
          }

          options.drawPreview?.(x, y)
        },
        onCommit: (val: T) => {
          resolver(val)
          if (floatingInput.mousePos) {
            this.lastPoint = {
              ...this.view.cwcs2Wcs(floatingInput.mousePos),
              z: 0
            }
          }
        },
        onCancel: () => rejector()
      })

      let rubberBand: AcEdRubberBand | undefined = undefined
      if (this.lastPoint && options.useBasePoint) {
        rubberBand = new AcEdRubberBand(this.view)
        rubberBand.start(this.lastPoint, {
          color: '#0f0',
          showBaseLineOnly: options.showBaseLineOnly
        })
      }

      const cleanup = () => {
        this.active = false
        options.cleanup?.()
        options.jig?.end()
        document.removeEventListener('keydown', escHandler)
        osnapMarkerManager?.clear()
        rubberBand?.dispose()
        floatingInput.dispose()
      }

      const resolver = (value: T) => {
        cleanup()
        resolve(value)
      }

      const rejector = () => {
        cleanup()
        reject(new Error('cancelled'))
      }

      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          rejector()
        }
      }
      document.addEventListener('keydown', escHandler)
      floatingInput.showAt(this.view.curMousePos)
    })
  }

  /**
   * Picks entities that intersect a hit-region centered at the specified point
   * in world coordinates.
   *
   * The hit-region is defined as a square (or bounding box) centered at the
   * input point, whose half-size is determined by the `hitRadius` parameter.
   * Only entities whose geometry intersects this region are returned.
   *
   * @param point The center point of the hit-region in world coordinates.
   * If omitted, the current cursor position is used.
   *
   * @param hitRadius The half-width (in world coordinate system) of the
   * hit-region around the point. This creates a square bounding box:
   * [point.x ± hitRadius, point.y ± hitRadius].
   * A larger value increases the pick sensitivity. If omitted, a reasonable
   * default is used.
   * @returns - Returns The OSNAP point in the specified position in world coordinate system
   * if found. Return undefined if no OSNAP point found.
   */
  /**
   * Gets OSNAP point of entities that intersect a hit-region centered at the
   * specified point in world coordinates.
   *
   * The hit-region is defined as a square (or bounding box) centered at the
   * input point, whose half-size is determined by the `hitRadius` parameter.
   * Only entities whose geometry intersects this region are returned.
   *
   * @param point The center point of the hit-region in world coordinates.
   * If omitted, the current cursor position is used.
   *
   * @param hitRadius The half-width (in pixel size) of the hit-region around
   * the point. It will be converted on one value in the world
   * coordinate 'wcsHitRadius' and creates a square bounding box:
   * [point.x ± wcsHitRadius, point.y ± wcsHitRadius].
   * A larger value increases the pick sensitivity. If omitted, a reasonable
   * default is used.
   *
   * @returns An array of object IDs representing the entities that intersect
   * the hit-region.
   */
  private getOSnapPoint(point?: AcGePoint2dLike, hitRadius: number = 20) {
    const results = this.view.pick(point, hitRadius)
    if (results.length > 0) {
      // TODO: Is there one better way to get current working database
      const db = acdbHostApplicationServices().workingDatabase
      const entity = db.tables.blockTable.modelSpace.getIdAt(results[0])
      if (entity) {
        const snapPoints: AcGePoint3d[] = []
        entity.subGetOsnapPoints(
          AcDbOsnapMode.EndPoint,
          { ...this.view.curPos, z: 0 },
          this.lastPoint,
          snapPoints
        )

        // Find the nearest osnap point
        let minDist = Number.MAX_VALUE
        let minDistIndex = -1
        for (let i = 0; i < snapPoints.length; ++i) {
          const distance = this.view.curPos.distanceTo(snapPoints[i])
          if (distance < minDist) {
            minDist = distance
            minDistIndex = i
          }
        }
        if (minDistIndex != -1) {
          const p1 = this.view.cwcs2Wcs({ x: 0, y: 0 })
          const p2 = this.view.cwcs2Wcs({ x: hitRadius, y: 0 })
          if (minDist < p2.x - p1.x) {
            return snapPoints[minDistIndex]
          }
        }
      }
    }
    return undefined
  }
}
