import { AcSvgEntity } from './AcSvgEntity'

/**
 * SVG line-segments entity: renders pairs of vertices from an indexed
 * Float32Array as individual `<line>` elements.
 *
 * @param array   - Flat vertex buffer (x0,y0,z0, x1,y1,z1, …)
 * @param itemSize - Number of components per vertex (typically 3)
 * @param indices  - Pairs of vertex indices defining each segment
 */
export class AcSvgLineSegments extends AcSvgEntity {
  constructor(array: Float32Array, itemSize: number, indices: Uint16Array) {
    super()
    const lines: string[] = []

    for (let i = 0; i + 1 < indices.length; i += 2) {
      const ai = indices[i] * itemSize
      const bi = indices[i + 1] * itemSize
      const x1 = array[ai]
      const y1 = array[ai + 1]
      const x2 = array[bi]
      const y2 = array[bi + 1]
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`)
      this._box.expandByPoint({ x: x1, y: y1 })
      this._box.expandByPoint({ x: x2, y: y2 })
    }

    this.svg = lines.join('\n')
  }
}
