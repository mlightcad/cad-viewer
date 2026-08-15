import type {
  AcDbObjectId,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3dLike
} from '@mlightcad/data-model'
import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../view'

/**
 * Result of building one overlay's visuals (HTML group + optional CAD extras).
 *
 * The framework publishes the group and wires selection; the entity owns
 * {@link dispose} and optional deferred {@link bindGrips}.
 */
export interface AcApOverlayWorldDrawResult {
  /** Selectable HTML group that owns leaf overlays and canvases. */
  group: AcTrHtmlGroup
  /** CAD transient entity ids owned by this overlay (for highlight / visibility). */
  entityIds: AcDbObjectId[]
  /** Tear down listeners and non-HTML resources; HTML is disposed with the group. */
  dispose: () => void
  /**
   * Bind grip pointer handlers after the group is added to the HTML transient
   * manager (avoids racing manager attach).
   */
  bindGrips?: () => void
}

/**
 * Domain overlay entity protocol (markup / measure), analogous to AcDbEntity
 * template methods — not an {@link AcTrHtmlElement} subclass.
 *
 * Leaves such as Dot / Badge / Callout remain render primitives; concrete
 * overlay types compose them inside {@link subWorldDraw}.
 *
 * Persistable overlays also implement
 * {@link import('./AcApOverlaySerializable').AcApOverlaySerializable} with a
 * domain record type; deserialize via domain factories, not this base class.
 */
export abstract class AcApOverlayEntity {
  /**
   * Stable overlay identifier used as the HTML group id and store key.
   */
  abstract get id(): string

  /**
   * Framework entry: builds visuals via {@link subWorldDraw}.
   * Subclasses should override {@link subWorldDraw}, not this method.
   *
   * @param view - Active 2D view that hosts HTML / CAD transients.
   * @returns Built group, entity ids, and cleanup hooks.
   */
  worldDraw(view: AcTrView2d): AcApOverlayWorldDrawResult {
    return this.subWorldDraw(view)
  }

  /**
   * Emit HTML + CAD + canvas visuals for this overlay.
   *
   * @param view - Active 2D view that hosts HTML / CAD transients.
   * @returns Built group, entity ids, and cleanup hooks.
   */
  protected abstract subWorldDraw(
    view: AcTrView2d
  ): AcApOverlayWorldDrawResult

  /**
   * Grip points in WCS.
   *
   * @returns Grip locations; empty array means no move grips.
   */
  subGetGripPoints(): AcGePoint3d[] {
    return []
  }

  /**
   * Apply a grip edit. Default is a no-op; subclasses mutate internal geometry.
   *
   * @param _indices - Zero-based grip indices to move.
   * @param _offset - World-space translation applied to each selected grip.
   * @returns This entity for chaining.
   */
  subMoveGripPointsAt(
    _indices: number[],
    _offset: AcGeVector3dLike
  ): this {
    return this
  }

  /**
   * Screen-space stroke / fill hit test (not HTML capsules).
   *
   * @param _canvas - Pick location in canvas / CSS pixel space.
   * @param _worldToScreen - Converts a world XY point to canvas space.
   * @param _threshold - Hit slop in pixels.
   * @returns `true` when the canvas pick hits this overlay's drawn geometry.
   */
  hitTest(
    _canvas: { x: number; y: number },
    _worldToScreen: (point: { x: number; y: number }) => { x: number; y: number },
    _threshold: number
  ): boolean {
    return false
  }

  /**
   * Primary world point for focus / zoom.
   *
   * @returns Anchor point, or `undefined` when the overlay has no focus point.
   */
  primaryPoint(): AcGePoint3dLike | undefined {
    return undefined
  }
}
