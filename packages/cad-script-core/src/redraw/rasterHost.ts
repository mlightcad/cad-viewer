import type { Point2dInput } from '../tools/types.js'
import type { CadRasterImage } from './pixelCompare.js'

/**
 * Raster services a host supplies so `cad.redraw.compare` can run.
 *
 * The comparison math is pure (see `pixelCompare.ts`); decoding the user's
 * reference image, rendering the drawing, and encoding result images need a
 * browser canvas / WebGL (or an image library on Node), so they live here.
 */
export interface CadRedrawRasterHost {
  /**
   * Returns the reference image the user attached, decoded to RGBA at its
   * original pixel size (the pixel frame calibrations use).
   *
   * @param index - 0-based reference index (most recent attachment first is
   *   not assumed; hosts keep attachment order).
   * @returns The image, or `undefined` when there is no such reference.
   */
  getReferenceImage(index: number): Promise<CadRasterImage | undefined>
  /**
   * Renders model space framed exactly to `box` (edge to edge, no margin) at
   * `width` × `height`, on a light background with dark lines.
   */
  renderDrawing(
    box: { min: Point2dInput; max: Point2dInput },
    width: number,
    height: number
  ): Promise<CadRasterImage | undefined>
  /** Encodes RGBA to a PNG data URL for the model. */
  encodePng(image: CadRasterImage): Promise<string>
}
