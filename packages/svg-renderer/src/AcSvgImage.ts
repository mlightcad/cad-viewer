import { AcGiImageStyle } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG image entity: embeds a raster image as a base64 `<image>` element.
 * The boundary array is expected to contain the corner points of the image.
 */
export class AcSvgImage extends AcSvgEntity {
  constructor(dataUrl: string, style: AcGiImageStyle) {
    super()
    const { boundary } = style

    if (boundary.length < 2) {
      return
    }

    // Compute axis-aligned bounding rect from boundary points
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const pt of boundary) {
      if (pt.x < minX) minX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.x > maxX) maxX = pt.x
      if (pt.y > maxY) maxY = pt.y
      this._box.expandByPoint(pt)
    }

    const w = maxX - minX
    const h = maxY - minY

    // Parent <g> flips Y; compensate so the image renders right-side-up
    this.svg = `<image x="${minX}" y="${minY}" width="${w}" height="${h}" href="${dataUrl}" transform="scale(1,-1) translate(0,${-(minY * 2 + h)})"/>`
  }

  /**
   * Async factory: converts a Blob to a data URL, then creates the entity.
   */
  static async fromBlob(blob: Blob, style: AcGiImageStyle): Promise<AcSvgImage> {
    const dataUrl = await blobToDataUrl(blob)
    return new AcSvgImage(dataUrl, style)
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
