import { AcDbEntity } from '@mlightcad/data-model'

import { AcEdBaseView } from '../view/AcEdBaseView'

/**
 * @class AcEdPreviewJig<T>
 * @template T
 *
 * @description
 * A generic, TypeScript-based version of AutoCAD’s AcEdJig system for
 * interactive previews during editor input.
 *
 * This class manages a *transient preview entity* that updates dynamically
 * as the user moves the cursor or provides other incremental input.
 *
 * ## Why Generic?
 * AutoCAD’s jig can sample different types of values:
 *  - a 3D point   → during acquirePoint()
 *  - a distance   → during acquireDistance()
 *  - an angle     → during acquireAngle()
 *
 * Using a generic type parameter `T` allows the jig to update entities
 * based on different input types while sharing the same structure.
 *
 * ## Method Mapping vs AutoCAD AcEdJig
 * | AutoCAD AcEdJig Method | Purpose | This Class |
 * |-------------------------|---------|------------|
 * | `sampler()`            | Sample new input | `update(value: T)` |
 * | `worldDraw()`          | Draw geometry    | `render()` |
 * | `startJig()`           | Begin preview    | `setEntity()` |
 * | `drag()`               | Main loop        | Controlled externally via JS events |
 *
 * ## Entity Integration
 * The preview entity may optionally implement:
 * ```ts
 * onJigUpdate(value: T): void
 * ```
 * When present, the jig will call it whenever the input changes.
 *
 * ## Example Use Cases
 * - Point acquisition (`T = AcGePoint3d`)
 * - Distance jig (`T = number`)
 * - Angle jig (`T = number`)
 *
 * Example:
 * ```ts
 * const jig = new AcEdPreviewJig<AcGePoint3d>(view)
 * jig.setEntity(circleEntity)
 * await editor.getPoint("Specify center:", { jig })
 * ```
 */
export abstract class AcEdPreviewJig<T> {
  private view: AcEdBaseView

  /**
   * Construct a new preview jig.
   *
   * @param view The CAD drawing view responsible for rendering transient graphics.
   *             Called via `view.draw(entity)` on each update.
   */
  constructor(view: AcEdBaseView) {
    this.view = view
  }

  /**
   * Assign the preview entity used by the jig.
   *
   * The entity should be transient (not yet added to the model database).
   *
   * @param ent The preview entity to display.
   */
  abstract get entity(): AcDbEntity | null

  /**
   * Update the preview entity based on incremental input.
   *
   * This method replaces the older `updatePoint()` and now accepts any type `T`,
   * enabling use for point, distance, angle, or custom parameter updates.
   *
   * This function performs the conceptual role of AutoCAD’s `sampler()`:
   * the editor triggers this method whenever the user’s input changes.
   *
   * If the preview entity implements:
   * ```ts
   * onJigUpdate(value: T)
   * ```
   * then it will be invoked here to recompute geometry.
   *
   * @param value Incremental value of type `T` describing new jig input.
   *              Examples:
   *                - world point
   *                - radius/distance
   *                - angle in radians
   */
  abstract update(value: T): void

  /**
   * Render the preview entity through the associated view.
   *
   * Equivalent to AutoCAD’s `worldDraw()` — called after each `update(value)`.
   */
  render(): void {
    if (this.entity) {
      this.view.addTransientEntity(this.entity)
    }
  }

  /**
   * End the jig and clear any transient preview state.
   *
   * Should be called when the user finalizes input (mouse click or Enter)
   * to prevent further updates and allow garbage collection.
   */
  end(): void {
    if (this.entity) {
      this.view.removeTransientEntity(this.entity.objectId)
    }
  }
}
