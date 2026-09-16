import type {
  AcGiMTextData,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'
import type {
  AcPdfGlyphBox,
  AcPdfGlyphPrimitives,
  AcPdfGlyphProvider
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
 * Turns the viewer's already-initialized mtext renderer into PDF glyph
 * geometry so TEXT/MTEXT are not dropped during export.
 *
 * Geometry is emitted as flat float32 buffers relative to the text's own
 * insertion point. Large drawings carry tens of thousands of MTEXT instances;
 * the previous per-triangle object graphs (`{x, y}` points inside
 * per-primitive arrays) retained ~25 objects per triangle in the renderer's
 * glyph cache and exhausted the tab's heap. Buffers are shared by reference
 * across identical texts, so a drawing's unique text content costs ~24 bytes
 * per triangle.
 */
export function createViewerPdfGlyphProvider(): AcPdfGlyphProvider {
  const empty: AcPdfGlyphPrimitives = {
    triangles: new Float32Array(0),
    polylines: new Float32Array(0)
  }
  const emptyBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  return {
    async renderMText(data: AcGiMTextData, style: AcGiTextStyle) {
      try {
        const renderer = AcTrMTextRenderer.getInstance()
        const object = (await renderer.asyncRenderMText(
          // AcGi and mtext-renderer attachment enums are structurally compatible
          // at runtime but diverge in the TypeScript type graph.
          data as never,
          style as never
        )) as SceneNode
        const contents =
          (data as { contents?: string }).contents ??
          (data as { text?: string }).text ??
          ''
        const { primitives, box } = extractGlyphPrimitives(
          object,
          data.position?.x ?? 0,
          data.position?.y ?? 0
        )
        return { primitives, actualText: contents, box }
      } catch {
        return { primitives: empty, actualText: '', box: emptyBox }
      }
    },
    async renderShape(shape: AcGiShapeData, style?: AcGiTextStyle) {
      try {
        const renderer = AcTrMTextRenderer.getInstance()
        const object = (await renderer.asyncRenderShape(
          shape as never,
          (style ?? {}) as never
        )) as SceneNode
        const { primitives, box } = extractGlyphPrimitives(
          object,
          shape.position?.x ?? 0,
          shape.position?.y ?? 0
        )
        return { primitives, box }
      } catch {
        return { primitives: empty, box: emptyBox }
      }
    }
  }
}

interface GlyphExtraction {
  primitives: AcPdfGlyphPrimitives
  box: AcPdfGlyphBox
}

/**
 * Builds flat triangle/polyline buffers from the rendered scene graph,
 * baking each node's world matrix and translating the result so (0,0) is the
 * text's insertion point.
 */
function extractGlyphPrimitives(
  root: SceneNode,
  originX: number,
  originY: number
): GlyphExtraction {
  root.updateMatrixWorld?.(true)

  type Source = {
    elements?: number[]
    pos: BufferAttr
    index: { count: number; getX(i: number): number } | null
    isMesh: boolean
  }
  const sources: Source[] = []
  let triangleFloats = 0
  let lineFloats = 0

  root.traverse(node => {
    const geom = node.geometry
    if (!geom) {
      return
    }
    const pos = geom.getAttribute('position')
    if (!pos || pos.count < 1) {
      return
    }
    if (node.isMesh) {
      const index = geom.getIndex()
      const triCount = index ? index.count / 3 : Math.floor(pos.count / 3)
      if (triCount < 1) {
        return
      }
      sources.push({
        elements: node.matrixWorld?.elements,
        pos,
        index,
        isMesh: true
      })
      triangleFloats += triCount * 6
      return
    }
    if (node.isLine) {
      sources.push({
        elements: node.matrixWorld?.elements,
        pos,
        index: null,
        isMesh: false
      })
      lineFloats += pos.count * 2 + 1
    }
  })

  const triangles = new Float32Array(triangleFloats)
  const polylines = new Float32Array(lineFloats)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const expand = (x: number, y: number) => {
    if (x < minX) {
      minX = x
    }
    if (y < minY) {
      minY = y
    }
    if (x > maxX) {
      maxX = x
    }
    if (y > maxY) {
      maxY = y
    }
  }
  let triOffset = 0
  let lineOffset = 0

  for (const source of sources) {
    const el = source.elements
    const pos = source.pos
    // Full 4x4 transform with perspective divide, matching the previous
    // per-point `applyWorldMatrix` behavior.
    const world = (i: number): { x: number; y: number } => {
      const x = pos.getX(i)
      const y = pos.getY(i)
      if (!el) {
        return { x, y }
      }
      const z = pos.getZ(i)
      const w = el[3] * x + el[7] * y + el[11] * z + el[15]
      const invW = w === 0 ? 1 : 1 / w
      return {
        x: (el[0] * x + el[4] * y + el[8] * z + el[12]) * invW,
        y: (el[1] * x + el[5] * y + el[9] * z + el[13]) * invW
      }
    }
    if (source.isMesh) {
      const count = source.index
        ? source.index.count / 3
        : Math.floor(pos.count / 3)
      for (let t = 0; t < count; t++) {
        for (let k = 0; k < 3; k++) {
          const vi = source.index ? source.index.getX(t * 3 + k) : t * 3 + k
          const p = world(vi)
          const x = p.x - originX
          const y = p.y - originY
          triangles[triOffset++] = x
          triangles[triOffset++] = y
          expand(x, y)
        }
      }
    } else {
      polylines[lineOffset++] = pos.count
      for (let i = 0; i < pos.count; i++) {
        const p = world(i)
        const x = p.x - originX
        const y = p.y - originY
        polylines[lineOffset++] = x
        polylines[lineOffset++] = y
        expand(x, y)
      }
    }
  }

  const primitives: AcPdfGlyphPrimitives = { triangles, polylines }
  const box: AcPdfGlyphBox = Number.isFinite(minX)
    ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
    : { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  return { primitives, box }
}
