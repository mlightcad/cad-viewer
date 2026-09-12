import type {
  AcGiMTextData,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'
import type {
  AcPdfGlyphBox,
  AcPdfGlyphPrimitive,
  AcPdfGlyphProvider,
  AcPdfMTextGlyphResult,
  AcPdfShapeGlyphResult
} from '@mlightcad/pdf-renderer'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

type BufferAttr = {
  count: number
  getX(i: number): number
  getY(i: number): number
  getZ(i: number): number
}

type Geom = {
  getAttribute(name: string): BufferAttr | undefined
  getIndex(): { count: number; getX(i: number): number } | null
}

type SceneNode = {
  matrixWorld?: { elements: number[] }
  geometry?: Geom
  isMesh?: boolean
  isLine?: boolean
  updateMatrixWorld?(force?: boolean): void
  traverse(callback: (object: SceneNode) => void): void
}

/**
 * Turns the viewer's already-initialized mtext renderer into PDF stroke/fill
 * primitives so TEXT/MTEXT are not dropped during export.
 */
export function createViewerPdfGlyphProvider(): AcPdfGlyphProvider {
  const emptyBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  return {
    async renderMText(data: AcGiMTextData, style: AcGiTextStyle) {
      try {
        const renderer = AcTrMTextRenderer.getInstance()
        const object = (await renderer.asyncRenderMText(
          data,
          style
        )) as SceneNode
        const contents =
          (data as { contents?: string }).contents ??
          (data as { text?: string }).text ??
          ''
        return extractGlyphResult(object, contents) as AcPdfMTextGlyphResult
      } catch {
        return { primitives: [], actualText: '', box: emptyBox }
      }
    },
    async renderShape(shape: AcGiShapeData, style?: AcGiTextStyle) {
      try {
        const renderer = AcTrMTextRenderer.getInstance()
        const object = (await renderer.asyncRenderShape(
          shape,
          style ?? {}
        )) as SceneNode
        return extractGlyphResult(object) as AcPdfShapeGlyphResult
      } catch {
        return { primitives: [], box: emptyBox }
      }
    }
  }
}

function applyWorldMatrix(
  elements: number[],
  x: number,
  y: number,
  z: number
): { x: number; y: number } {
  const w = elements[3] * x + elements[7] * y + elements[11] * z + elements[15]
  const invW = w === 0 ? 1 : 1 / w
  return {
    x: (elements[0] * x + elements[4] * y + elements[8] * z + elements[12]) * invW,
    y: (elements[1] * x + elements[5] * y + elements[9] * z + elements[13]) * invW
  }
}

function extractGlyphResult(
  root: SceneNode,
  actualText = ''
): {
  primitives: AcPdfGlyphPrimitive[]
  actualText: string
  box: AcPdfGlyphBox
} {
  const primitives: AcPdfGlyphPrimitive[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  root.updateMatrixWorld?.(true)
  root.traverse(node => {
    const geom = node.geometry
    if (!geom) {
      return
    }
    const pos = geom.getAttribute('position')
    if (!pos || pos.count < 1) {
      return
    }
    const elements = node.matrixWorld?.elements
    const expand = (x: number, y: number) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    const worldPoint = (i: number) => {
      const p = elements
        ? applyWorldMatrix(elements, pos.getX(i), pos.getY(i), pos.getZ(i))
        : { x: pos.getX(i), y: pos.getY(i) }
      expand(p.x, p.y)
      return p
    }
    if (node.isMesh) {
      const index = geom.getIndex()
      const triCount = index ? index.count / 3 : Math.floor(pos.count / 3)
      for (let t = 0; t < triCount; t++) {
        const points = [0, 1, 2].map(k =>
          worldPoint(index ? index.getX(t * 3 + k) : t * 3 + k)
        )
        primitives.push({ kind: 'fill', points })
      }
      return
    }
    if (node.isLine) {
      const points: Array<{ x: number; y: number }> = []
      for (let i = 0; i < pos.count; i++) {
        points.push(worldPoint(i))
      }
      if (points.length >= 2) {
        primitives.push({ kind: 'stroke', points })
      }
    }
  })
  if (!Number.isFinite(minX)) {
    return {
      primitives,
      actualText,
      box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
    }
  }
  return {
    primitives,
    actualText,
    box: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
  }
}
