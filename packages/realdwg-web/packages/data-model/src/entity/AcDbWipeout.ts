import { AcGeArea2d, AcGePolyline2d } from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbRasterImage } from './AcDbRasterImage'

/**
 * Entity that creates a blank area in the drawing.
 *
 * The AcDbWipeout entity creates a blank area that covers other entities
 * in the drawing. It's commonly used to hide parts of the drawing or
 * create clean areas for annotations. The wipeout area is defined by
 * a boundary path and is rendered as a solid black fill.
 *
 * @example
 * ```typescript
 * const wipeout = new AcDbWipeout();
 * // Set up boundary path and other properties
 * wipeout.draw(renderer);
 * ```
 */
export class AcDbWipeout extends AcDbRasterImage {
  /** The entity type name */
  static override typeName: string = 'Wipeout'
  /**
   * Draws the wipeout entity.
   *
   * This method creates a solid black area based on the boundary path
   * of the wipeout entity. The area covers all entities behind it,
   * effectively "wiping out" that portion of the drawing.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered entity or undefined if rendering failsenderedEntity = wipeout.draw(renderer);
   * ```
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const points = this.boundaryPath()
    const area = new AcGeArea2d()
    area.add(new AcGePolyline2d(points))
    return renderer.area(area)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbWipeout')
    return this
  }
}
