import {
  type AcDbObjectId,
  AcGePoint3d,
  type AcGePoint3dLike,
  type AcGeVector3dLike,
  type AcGiLineWeight
} from '@mlightcad/data-model'
import { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../../view'
import {
  AcApOverlayEntity,
  type AcApOverlaySerializable,
  type AcApOverlayWorldDrawResult
} from '../../overlay'
import {
  hitTestMarkupGeometry,
  markupGeometryCenter,
  translateMarkupGeometry
} from '../AcApMarkupGeometry'
import { MARKUP_LAYER } from '../AcApMarkupStore'
import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import {
  cssToMarkupColor,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth
} from '../AcApMarkupUtil'

/**
 * Shared draw state derived from a markup record for HTML / CAD styling.
 */
export interface AcApMarkupDrawStyle {
  /** Resolved AutoCAD-style color for HTML and CAD transients. */
  color: ReturnType<typeof cssToMarkupColor>
  /** CAD line weight applied to transient entities. */
  lineWeight: AcGiLineWeight
  /** Canvas stroke width in CSS pixels corresponding to {@link lineWeight}. */
  canvasLineWidth: number
  /** HTML transient layer name for this markup. */
  layer: string
  /** Layout BTR id, or `undefined` when visible on every layout. */
  layoutId: string | undefined
}

/**
 * Build {@link AcApMarkupDrawStyle} from a store record's style fields.
 *
 * @param record - Markup record whose style and layout are read.
 * @returns Resolved color, weights, layer, and layout for drawing.
 */
export function markupDrawStyleFromRecord(
  record: AcApMarkupRecord
): AcApMarkupDrawStyle {
  const lineWeight =
    record.style.lineWeight != null && record.style.lineWeight > 0
      ? (record.style.lineWeight as AcGiLineWeight)
      : MARKUP_LINE_WEIGHT
  return {
    color: cssToMarkupColor(record.style.color),
    lineWeight,
    canvasLineWidth: markupCanvasLineWidth(lineWeight),
    layer: MARKUP_LAYER,
    layoutId: record.layoutId
  }
}

/**
 * Base class for Design Review markup overlays.
 *
 * Concrete types implement {@link subWorldDraw} and optional grip protocols.
 * Geometry and metadata live on {@link record}; render primitives are composed
 * into an {@link AcTrHtmlGroup}.
 *
 * Implements {@link AcApOverlaySerializable} via {@link toRecord}. Rehydrate
 * with {@link import('./AcApMarkupEntityFactory').createMarkupEntityFromRecord}.
 */
export abstract class AcApMarkupEntity
  extends AcApOverlayEntity
  implements AcApOverlaySerializable<AcApMarkupRecord>
{
  /** Current store snapshot driving this entity's geometry and metadata. */
  protected record: AcApMarkupRecord

  /**
   * @param record - Initial markup store record.
   */
  constructor(record: AcApMarkupRecord) {
    super()
    this.record = record
  }

  /**
   * Markup id from the store record (also the HTML group id).
   */
  get id(): string {
    return this.record.id
  }

  /**
   * Sidecar / store snapshot of this markup (same object as the live record).
   *
   * @returns Current {@link AcApMarkupRecord}.
   */
  toRecord(): AcApMarkupRecord {
    return this.record
  }

  /**
   * Current store record held by this entity (alias of {@link toRecord}).
   */
  get markupRecord(): AcApMarkupRecord {
    return this.toRecord()
  }

  /**
   * Replace the in-memory record (e.g. after store update before republish).
   *
   * @param record - Next store snapshot.
   */
  setRecord(record: AcApMarkupRecord): void {
    this.record = record
  }

  /**
   * Resolve draw style from the current record.
   *
   * @returns Color, line weight, layer, and layout for publishing.
   */
  protected style(): AcApMarkupDrawStyle {
    return markupDrawStyleFromRecord(this.record)
  }

  /**
   * Hit-test this markup's stroke / fill via {@link hitTestMarkupGeometry}.
   *
   * @param canvas - Pick location in canvas space.
   * @param worldToScreen - World → canvas converter.
   * @param threshold - Hit slop in pixels.
   * @returns Whether the pick hits drawn geometry.
   */
  override hitTest(
    canvas: { x: number; y: number },
    worldToScreen: (point: { x: number; y: number }) => {
      x: number
      y: number
    },
    threshold: number
  ): boolean {
    return hitTestMarkupGeometry(
      this.record.geometry,
      canvas,
      worldToScreen,
      threshold
    )
  }

  /**
   * Focus point at the geometry center (or type-specific primary point).
   *
   * @returns World point for zoom / focus, or `undefined`.
   */
  override primaryPoint(): AcGePoint3dLike | undefined {
    const center = markupGeometryCenter(this.record.geometry)
    if (!center) return undefined
    return { x: center.x, y: center.y, z: 0 }
  }

  /**
   * Default single center grip for whole-markup move.
   *
   * @returns Center grip, or empty when geometry has no center.
   */
  override subGetGripPoints(): AcGePoint3d[] {
    const center = markupGeometryCenter(this.record.geometry)
    return center ? [new AcGePoint3d(center.x, center.y, 0)] : []
  }

  /**
   * Translate the whole markup when grip index `0` is moved.
   *
   * @param indices - Grip indices to move.
   * @param offset - World-space translation.
   * @returns This entity for chaining.
   */
  override subMoveGripPointsAt(
    indices: number[],
    offset: AcGeVector3dLike
  ): this {
    if (indices.length === 0) return this
    if (!indices.includes(0)) return this
    this.record = {
      ...this.record,
      geometry: translateMarkupGeometry(
        this.record.geometry,
        offset.x,
        offset.y
      )
    }
    return this
  }

  /**
   * Build an empty world-draw result for an already-created group.
   *
   * @param group - HTML group shell.
   * @returns Result with no CAD entities and a no-op dispose.
   */
  protected emptyResult(group: AcTrHtmlGroup): AcApOverlayWorldDrawResult {
    return {
      group,
      entityIds: [] as AcDbObjectId[],
      dispose: () => undefined
    }
  }

  /**
   * Create a selectable markup group shell for {@link id}.
   *
   * @returns New empty {@link AcTrHtmlGroup} on the markup layer.
   */
  protected createGroup(): AcTrHtmlGroup {
    const { layer, layoutId } = this.style()
    return new AcTrHtmlGroup({
      id: this.record.id,
      layer,
      layoutId,
      selectable: true
    })
  }

  /**
   * Emit HTML + CAD + canvas visuals for this markup type.
   *
   * @param view - Active 2D view.
   * @returns Built visuals and cleanup hooks.
   */
  protected abstract subWorldDraw(
    view: AcTrView2d
  ): AcApOverlayWorldDrawResult
}
