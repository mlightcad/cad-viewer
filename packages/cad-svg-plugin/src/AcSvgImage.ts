import { AcGiImageStyle, AcGiSubEntityTraits } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'
import { AcSvgExportUtil } from './AcSvgExportUtil'
import { AcSvgStyleContext } from './AcSvgStyleUtil'

/**
 * SVG image entity: embeds a raster image as a base64 `<image>` element.
 */
export class AcSvgImage extends AcSvgEntity {
  constructor(
    dataUrl: string,
    style: AcGiImageStyle,
    _traits: AcGiSubEntityTraits,
    _ctx: AcSvgStyleContext
  ) {
    super()
    const { boundary } = style

    if (boundary.length < 2 || !AcSvgExportUtil.isSafeEmbeddedUrl(dataUrl)) {
      return
    }

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
    const href = escapeAttr(dataUrl)

    this._localSvg = `<image x="${minX}" y="${minY}" width="${w}" height="${h}" href="${href}" xlink:href="${href}" transform="scale(1,-1) translate(0,${-(minY * 2 + h)})"/>`
  }

  static async fromBlob(
    blob: Blob,
    style: AcGiImageStyle,
    traits: AcGiSubEntityTraits,
    ctx: AcSvgStyleContext
  ): Promise<AcSvgImage> {
    let dataUrl = await blobToDataUrl(blob)
    if (
      blob.type === 'image/svg+xml' ||
      dataUrl.startsWith('data:image/svg+xml')
    ) {
      try {
        dataUrl = await AcSvgExportUtil.rasterizeSvgDataUrl(dataUrl)
      } catch {
        return new AcSvgImage('', style, traits, ctx)
      }
    }
    return new AcSvgImage(dataUrl, style, traits, ctx)
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

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
