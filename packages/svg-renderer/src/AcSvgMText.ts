import { AcGiMTextData, AcGiTextStyle } from '@mlightcad/data-model'

import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG mtext entity: renders multiline text as a `<text>` SVG element.
 * This is an MVP implementation that handles plain-text content
 * without full MText format-code parsing.
 */
export class AcSvgMText extends AcSvgEntity {
  constructor(mtext: AcGiMTextData, style: AcGiTextStyle) {
    super()
    const { text, height, position, rotation } = mtext
    const x = position.x
    const y = position.y

    // Strip simple MText format codes (e.g. {\fArial;...}, \P, \~)
    const plain = text
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/\\[PpNn]/g, ' ')
      .replace(/\\~/g, '\u00A0')
      .trim()

    const fontFamily = style.extendedFont || style.font || 'sans-serif'
    const rotDeg = rotation != null ? (rotation * 180) / Math.PI : 0

    // SVG coordinate system is Y-down; the parent <g> already flips Y with
    // matrix(1,0,0,-1,0,0), so we need to re-flip the text to keep it readable.
    const transform =
      rotDeg !== 0
        ? `translate(${x},${y}) scale(1,-1) rotate(${-rotDeg})`
        : `translate(${x},${y}) scale(1,-1)`

    this.svg = `<text font-size="${height}" font-family="${fontFamily}" transform="${transform}">${escapeXml(plain)}</text>`

    // Approximate bounding box
    const w = plain.length * height * 0.6
    this._box.expandByPoint({ x, y })
    this._box.expandByPoint({ x: x + w, y: y + height })
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
