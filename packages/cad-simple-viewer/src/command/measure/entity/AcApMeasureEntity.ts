import type {
  AcDbDatabase,
  AcGePoint3dLike
} from '@mlightcad/data-model'
import {
  type AcTrHtmlElement,
  AcTrHtmlGroup} from '@mlightcad/three-renderer'

import {
  acapMeasurementCanvasLineWidth,
  type AcApMeasurementStyle
} from '../../../util'
import type { AcTrView2d } from '../../../view'
import {
  AcApOverlayEntity,
  type AcApOverlaySerializable,
  type AcApOverlayWorldDrawResult,
  acapSeedOverlaySizesFromWcs
} from '../../overlay'
import { hitTestMeasurementGeometry } from '../AcApMeasurementGeometry'
import { serializeMeasurementStyle } from '../AcApMeasurementSidecar'
import {
  type AcApMeasurementGroupExtras,
  commitMeasurementGroup,
  MEASUREMENT_LAYER
} from '../AcApMeasurementStore'
import type {
  AcApMeasurementRecord,
  AcApMeasurementSidecarStyle
} from '../AcApMeasurementTypes'

/**
 * Unique overlay id for a measurement group.
 *
 * `Date.now()` alone collides when several distances are committed in the
 * same millisecond (continuous measure). The HTML manager replaces groups
 * with the same id, which drops earlier segments.
 */
export function newMeasureOverlayId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Options shared by measurement entity constructors.
 *
 * Concrete measure entities pass these into {@link AcApMeasureEntity} so id,
 * layout, and visual style are consistent across distance, angle, area, arc,
 * and point measurements.
 */
export interface AcApMeasureEntityOptions {
  /** Optional stable id; when omitted, subclasses generate a typed timestamp id. */
  id?: string
  /** Layout BTR id to bind the HTML group to, or omit for the active layout. */
  layoutId?: string
  /** Visual style (color, line weight, font size) for CAD and HTML overlays. */
  style: AcApMeasurementStyle
  /** World-space badge height from sidecar import (optional). */
  textHeightWcs?: number
  /** World-space stroke width from sidecar import (optional). */
  strokeWidthWcs?: number
  /** World-space arrow-head length from sidecar import (optional). */
  arrowSizeWcs?: number
}

/**
 * Result of drawing a measurement: HTML group plus store extras for commit.
 *
 * Extends the overlay world-draw result with {@link extras} consumed by
 * {@link commitMeasurementGroup} when persisting the measurement.
 *
 * Put CAD / listener teardown on {@link AcApOverlayWorldDrawResult.dispose};
 * {@link AcApMeasureEntity.commit} wires that into `extras.dispose` so the
 * store always runs it. Do not duplicate cleanup in `extras.dispose`.
 */
export interface AcApMeasureWorldDrawResult extends AcApOverlayWorldDrawResult {
  /** Store payload (style, value, snapshot, redraw) for commit. */
  extras: AcApMeasurementGroupExtras
}

/**
 * Base class for measurement overlays (distance / angle / area / arc / point).
 *
 * Not an HTML leaf — composes {@link AcTrHtmlGroup} and canvas / badge / dot
 * children. Subclasses implement {@link toRecord} and
 * {@link subWorldDrawWithDb}; callers should use {@link commit} rather than
 * the generic overlay `worldDraw` path because unit labels need the database.
 *
 * Implements {@link AcApOverlaySerializable} via {@link toRecord}. Rehydrate
 * with {@link import('./AcApMeasureEntityFactory').createMeasureEntityFromRecord}.
 */
export abstract class AcApMeasureEntity
  extends AcApOverlayEntity
  implements AcApOverlaySerializable<AcApMeasurementRecord>
{
  /** Visual style applied to HTML badges/dots and canvas strokes. */
  protected readonly style: AcApMeasurementStyle
  /** Stable measurement id used for HTML group, store, and sidecar records. */
  protected readonly entityId: string
  /** Optional layout override from construction options. */
  protected readonly layoutIdOption: string | undefined
  /** Imported world-space badge height (sidecar). */
  protected readonly textHeightWcs?: number
  /** Imported world-space stroke width (sidecar). */
  protected readonly strokeWidthWcs?: number
  /** Imported world-space arrow-head length (sidecar). */
  protected readonly arrowSizeWcs?: number

  /**
   * Creates a measure entity with the given id, layout, and style.
   *
   * @param id - Stable measurement identifier
   * @param layoutId - Layout BTR id, or `undefined` to resolve from the view
   * @param style - Measurement visual style
   * @param textHeightWcs - Optional imported world-space text height
   * @param strokeWidthWcs - Optional imported world-space stroke width
   * @param arrowSizeWcs - Optional imported world-space arrow-head length
   */
  constructor(
    id: string,
    layoutId: string | undefined,
    style: AcApMeasurementStyle,
    textHeightWcs?: number,
    strokeWidthWcs?: number,
    arrowSizeWcs?: number
  ) {
    super()
    this.entityId = id
    this.layoutIdOption = layoutId
    this.style = style
    this.textHeightWcs = textHeightWcs
    this.strokeWidthWcs = strokeWidthWcs
    this.arrowSizeWcs = arrowSizeWcs
  }

  /**
   * Stable identifier for this measurement entity.
   *
   * @returns The entity id used in the HTML group and store
   */
  get id(): string {
    return this.entityId
  }

  /**
   * Builds a serializable snapshot of this measurement.
   *
   * Geometry is taken from construction-time fields; `layoutId` may override
   * the layout stored on the record. When `view` is provided, style includes
   * world-space text / stroke sizes for camera-independent import.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Sidecar-ready measurement record
   */
  abstract toRecord(
    layoutId?: string,
    view?: AcTrView2d
  ): AcApMeasurementRecord

  /**
   * Hit-tests this measurement's geometry against a canvas point.
   *
   * Delegates to {@link hitTestMeasurementGeometry} using
   * {@link toRecord}'s geometry.
   *
   * @param canvas - Pointer position in canvas/screen coordinates
   * @param worldToScreen - Converts world XY to screen for distance checks
   * @param threshold - Hit tolerance in screen pixels
   * @returns `true` if the point is within threshold of the geometry
   */
  override hitTest(
    canvas: { x: number; y: number },
    worldToScreen: (point: { x: number; y: number }) => {
      x: number
      y: number
    },
    threshold: number
  ): boolean {
    return hitTestMeasurementGeometry(
      this.toRecord().geometry,
      canvas,
      worldToScreen,
      threshold
    )
  }

  /**
   * Builds visuals and commits them to the measurement store / HTML manager.
   *
   * Calls {@link subWorldDrawWithDb}, then {@link commitMeasurementGroup}
   * with the resulting group and extras. Uses {@link AcApOverlayWorldDrawResult.dispose}
   * as the store's dispose hook so entity cleanup cannot be dropped.
   *
   * @param view - Active 2D view hosting HTML overlays and CAD transients
   * @param db - Drawing database used for unit/format labels
   */
  commit(view: AcTrView2d, db: AcDbDatabase): void {
    const drawn = this.subWorldDrawWithDb(view, db)
    commitMeasurementGroup(view, drawn.group, {
      ...drawn.extras,
      dispose: drawn.dispose
    })
    // Bind after manager.add so pointer capture targets a published DOM node.
    drawn.bindGrips?.()
  }

  /**
   * Overlay `worldDraw` hook — not supported for measurements.
   *
   * Prefer {@link commit}; measure draw needs the database for unit labels.
   *
   * @param view - Active 2D view (unused)
   * @returns Never returns; always throws
   * @throws Error directing callers to use {@link commit}
   */
  protected subWorldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    void view
    throw new Error(
      'Use AcApMeasureEntity.commit(view, db) instead of worldDraw'
    )
  }

  /**
   * Builds the HTML group, CAD transients, and store extras for this measure.
   *
   * @param view - Active 2D view
   * @param db - Drawing database for formatting measured values
   * @returns World-draw result including commit extras
   */
  protected abstract subWorldDrawWithDb(
    view: AcTrView2d,
    db: AcDbDatabase
  ): AcApMeasureWorldDrawResult

  /**
   * Creates an empty selectable HTML group on the measurement layer.
   *
   * @param view - View used to resolve the active layout when needed
   * @returns New {@link AcTrHtmlGroup} for this entity id
   */
  protected createGroup(view: AcTrView2d): AcTrHtmlGroup {
    return new AcTrHtmlGroup({
      id: this.entityId,
      layer: MEASUREMENT_LAYER,
      layoutId: this.resolveLayoutId(view),
      selectable: true
    })
  }

  /**
   * Resolves the layout id for HTML overlays.
   *
   * Uses {@link layoutIdOption} when set; otherwise the view's active layout
   * BTR id.
   *
   * @param view - View providing the active layout fallback
   * @returns Layout BTR id, or `undefined` if neither is available
   */
  protected resolveLayoutId(view: AcTrView2d): string | undefined {
    return this.layoutIdOption ?? view.activeLayoutBtrId
  }

  /** Sidecar style including world-space sizes at the current view. */
  protected serializeStyle(view?: AcTrView2d): AcApMeasurementSidecarStyle {
    return serializeMeasurementStyle(this.style, view)
  }

  /**
   * Seeds world-space sizes onto HTML overlays and canvases before first paint.
   *
   * Prefers an explicit import {@link textHeightWcs}. Otherwise resolves from
   * the live style: custom keeps the authored WCS height; Fit-to-screen bakes
   * the current screen font size into WCS at commit time.
   */
  protected seedOverlaySizes(
    view: AcTrView2d,
    elements: readonly AcTrHtmlElement[],
    canvases: readonly HTMLElement[] = []
  ): void {
    const sidecar = this.serializeStyle(view)
    acapSeedOverlaySizesFromWcs(view, {
      textHeightWcs: this.textHeightWcs ?? sidecar.textHeightWcs,
      strokeWidthWcs: this.strokeWidthWcs,
      arrowSizeWcs: this.arrowSizeWcs ?? sidecar.arrowSizeWcs,
      fontSizePx: this.style.fontSize,
      strokeScreenPx: acapMeasurementCanvasLineWidth(this.style.lineWeight),
      elements,
      canvases
    })
  }
}

export type { AcGePoint3dLike }
