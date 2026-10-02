import type {
  AcGiMTextData,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { MTextColor } from '@mlightcad/mtext-parser'
import type {
  AcPdfGlyphBox,
  AcPdfGlyphColorGroup,
  AcPdfGlyphColorSettings,
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

type MaterialLike = {
  color?: { getHex?: () => number }
}

type SceneNode = {
  matrixWorld?: { elements: number[] }
  geometry?: Geom
  material?: MaterialLike | MaterialLike[]
  isMesh?: boolean
  isLine?: boolean
  isLineSegments?: boolean
  isLineLoop?: boolean
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
    async renderMText(
      data: AcGiMTextData,
      style: AcGiTextStyle,
      colorSettings?: AcPdfGlyphColorSettings
    ) {
      try {
        const renderer = AcTrMTextRenderer.getInstance()
        const object = (await renderer.asyncRenderMText(
          // AcGi and mtext-renderer attachment enums are structurally compatible
          // at runtime but diverge in the TypeScript type graph.
          data as never,
          style as never,
          toMTextColorSettings(colorSettings) as never
        )) as SceneNode
        const contents =
          (data as { contents?: string }).contents ??
          (data as { text?: string }).text ??
          ''
        const { primitives, colorGroups, box } = extractGlyphPrimitives(
          object,
          data.position?.x ?? 0,
          data.position?.y ?? 0
        )
        return { primitives, colorGroups, actualText: contents, box }
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

function toMTextColorSettings(settings?: AcPdfGlyphColorSettings): {
  color: MTextColor
  byLayerColor: number
  byBlockColor: number
  layer?: string
} | undefined {
  if (!settings) {
    return undefined
  }
  const color = new MTextColor()
  if (settings.entityIsByLayer) {
    color.aci = 256
  } else if (settings.entityIsByBlock) {
    color.aci = 0
  } else if (settings.entityIsForeground) {
    color.aci = 7
  } else if (typeof settings.entityAci === 'number') {
    color.aci = settings.entityAci
  } else if (typeof settings.entityRgb === 'number') {
    color.rgbValue = settings.entityRgb
  } else {
    color.aci = 7
  }
  return {
    color,
    byLayerColor: settings.byLayerColor,
    byBlockColor: settings.byBlockColor,
    layer: settings.layer
  }
}

interface GlyphExtraction {
  primitives: AcPdfGlyphPrimitives
  colorGroups?: AcPdfGlyphColorGroup[]
  box: AcPdfGlyphBox
}

type Source = {
  elements?: number[]
  pos: BufferAttr
  index: { count: number; getX(i: number): number } | null
  isMesh: boolean
  isSegments: boolean
  rgb: number
}

/**
 * Builds flat triangle/polyline buffers from the rendered scene graph,
 * baking each node's world matrix and translating the result so (0,0) is the
 * text's insertion point. Geometry is also grouped by material colour so
 * inline `\C` overrides survive vector PDF export.
 */
function extractGlyphPrimitives(
  root: SceneNode,
  originX: number,
  originY: number
): GlyphExtraction {
  root.updateMatrixWorld?.(true)

  const sources: Source[] = []
  const triangleFloatsByColor = new Map<number, number>()
  const lineFloatsByColor = new Map<number, number>()

  root.traverse(node => {
    const geom = node.geometry
    if (!geom) {
      return
    }
    const pos = geom.getAttribute('position')
    if (!pos || pos.count < 1) {
      return
    }
    const rgb = readMaterialRgb(node) ?? 0xffffff
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
        isMesh: true,
        isSegments: false,
        rgb
      })
      triangleFloatsByColor.set(
        rgb,
        (triangleFloatsByColor.get(rgb) ?? 0) + triCount * 6
      )
      return
    }
    if (node.isLine) {
      const segments = !!node.isLineSegments
      sources.push({
        elements: node.matrixWorld?.elements,
        pos,
        index: null,
        isMesh: false,
        isSegments: segments,
        rgb
      })
      const floats = segments
        ? Math.floor(pos.count / 2) * 5
        : pos.count * 2 + 1
      lineFloatsByColor.set(rgb, (lineFloatsByColor.get(rgb) ?? 0) + floats)
    }
  })

  const colors = [
    ...new Set([
      ...triangleFloatsByColor.keys(),
      ...lineFloatsByColor.keys()
    ])
  ]
  const groups = new Map<
    number,
    {
      triangles: Float32Array
      polylines: Float32Array
      triOffset: number
      lineOffset: number
    }
  >()
  for (const rgb of colors) {
    groups.set(rgb, {
      triangles: new Float32Array(triangleFloatsByColor.get(rgb) ?? 0),
      polylines: new Float32Array(lineFloatsByColor.get(rgb) ?? 0),
      triOffset: 0,
      lineOffset: 0
    })
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const expand = (x: number, y: number) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  for (const source of sources) {
    const group = groups.get(source.rgb)
    if (!group) continue
    const el = source.elements
    const pos = source.pos
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
          group.triangles[group.triOffset++] = x
          group.triangles[group.triOffset++] = y
          expand(x, y)
        }
      }
    } else if (source.isSegments) {
      const pairCount = Math.floor(pos.count / 2)
      for (let s = 0; s < pairCount; s++) {
        group.polylines[group.lineOffset++] = 2
        for (let k = 0; k < 2; k++) {
          const p = world(s * 2 + k)
          const x = p.x - originX
          const y = p.y - originY
          group.polylines[group.lineOffset++] = x
          group.polylines[group.lineOffset++] = y
          expand(x, y)
        }
      }
    } else {
      group.polylines[group.lineOffset++] = pos.count
      for (let i = 0; i < pos.count; i++) {
        const p = world(i)
        const x = p.x - originX
        const y = p.y - originY
        group.polylines[group.lineOffset++] = x
        group.polylines[group.lineOffset++] = y
        expand(x, y)
      }
    }
  }

  const colorGroups: AcPdfGlyphColorGroup[] = []
  let totalTri = 0
  let totalLine = 0
  for (const [rgb, group] of groups) {
    const primitives: AcPdfGlyphPrimitives = {
      triangles: group.triangles,
      polylines: group.polylines
    }
    if (primitives.triangles.length >= 6 || primitives.polylines.length >= 2) {
      colorGroups.push({ rgb, primitives })
    }
    totalTri += group.triangles.length
    totalLine += group.polylines.length
  }

  // Combined buffers keep callers that ignore colorGroups working.
  const triangles = new Float32Array(totalTri)
  const polylines = new Float32Array(totalLine)
  let triOffset = 0
  let lineOffset = 0
  for (const group of colorGroups) {
    triangles.set(group.primitives.triangles, triOffset)
    triOffset += group.primitives.triangles.length
    polylines.set(group.primitives.polylines, lineOffset)
    lineOffset += group.primitives.polylines.length
  }

  const primitives: AcPdfGlyphPrimitives = { triangles, polylines }
  const box: AcPdfGlyphBox = Number.isFinite(minX)
    ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
    : { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  return {
    primitives,
    // Always surface groups when present so a lone `\C256` green run is not
    // painted with the entity fill (often ACI 7 white).
    colorGroups: colorGroups.length > 0 ? colorGroups : undefined,
    box
  }
}

function readMaterialRgb(node: SceneNode): number | undefined {
  const material = node.material
  if (!material) {
    return undefined
  }
  const first = Array.isArray(material) ? material[0] : material
  const hex = first?.color?.getHex?.()
  return typeof hex === 'number' ? hex : undefined
}
