import {
  AcGeBox2d,
  AcGeVector3dLike,
  AcGiShapeData,
  AcGiSubEntityTraits,
  AcGiTextStyle
} from '@mlightcad/data-model'
import {
  BaseTextShape,
  FontManager,
  ShxFontData,
  ShxParserFont
} from '@mlightcad/mtext-renderer'

import { normalizeCadFontName } from './AcSvgFontMap'
import { AcSvgStyleContext, AcSvgStyleUtil } from './AcSvgStyleUtil'

/**
 * Utilities for exporting AutoCAD SHAPE entities to SVG stroke geometry.
 *
 * SHAPE entities reference a single glyph from an SHX font (by {@link AcGiShapeData.name}
 * and/or {@link AcGiShapeData.shapeNumber}). The glyph is defined as pen-down polylines,
 * not filled outlines. This module resolves those polylines through the shared
 * {@link FontManager} pipeline used by {@link @mlightcad/mtext-renderer}, applies the
 * same width factor, oblique, anchor, and placement transforms as the Three.js viewer,
 * and emits one or more stroked SVG `<path>` elements in CAD world coordinates (Y-up;
 * the root export flip is applied later by {@link AcSvgRenderer}).
 *
 * @packageDocumentation
 */

/**
 * One vertex in an SHX shape polyline, in local glyph coordinates after font scaling.
 *
 * Coordinates use the same axis convention as AutoCAD / {@link @mlightcad/mtext-renderer}:
 * origin at the shape insertion frame, X to the right, Y upward.
 */
export interface ShxPolylinePoint {
  /** Horizontal pen coordinate in local glyph space. */
  x: number
  /** Vertical pen coordinate in local glyph space. */
  y: number
}

/**
 * Result of converting one SHAPE entity into local SVG markup.
 *
 * Returned by {@link buildSvgShape} and consumed by {@link AcSvgShape}. The bounding
 * box is accumulated in world coordinates after all placement transforms are applied.
 */
export interface BuiltSvgShape {
  /**
   * Local SVG fragment (one or more `<path>` tags) without wrapping transforms.
   * Empty when the glyph cannot be resolved or has no drawable segments.
   */
  localSvg: string
  /** Axis-aligned bounds of the rendered stroke geometry in world coordinates. */
  box: AcGeBox2d
}

/**
 * Translation applied so a SHAPE glyph's baseline-left anchor coincides with the
 * insertion point before rotation and world translation.
 *
 * @see {@link computeBaselineLeftAnchor}
 */
export interface ShapeBaselineAnchor {
  /** Horizontal offset added to each vertex (typically `-minX` of the glyph bbox). */
  x: number
  /** Vertical offset added to each vertex (typically `-minY` / baseline for shapes). */
  y: number
}

/**
 * Builds SVG stroke paths for one AutoCAD SHAPE entity from SHX font polylines.
 *
 * Resolution order for the glyph:
 * 1. {@link FontManager.getShapeByName} when {@link AcGiShapeData.name} is set
 * 2. {@link FontManager.getShapeByCode} when {@link AcGiShapeData.shapeNumber} is non-zero
 * 3. Fallback parse via {@link ShxParserFont} on already-loaded SHX font bytes
 *
 * Each drawable polyline becomes a separate `<path>` with `fill="none"` and stroke
 * attributes from {@link AcSvgStyleUtil.strokeAttributes}.
 *
 * @param shape - SHAPE geometry and placement from {@link AcGiShapeData}.
 * @param style - Text style referencing the SHX font (after SVG font-name mapping).
 * @param traits - Entity colour, linetype, and lineweight traits for stroke styling.
 * @param ctx - Export-wide style context (LTSCALE, LWDISPLAY, foreground/background).
 * @returns Local SVG markup and world bounding box; both are empty when export is skipped.
 *
 * @remarks
 * Returns an empty result when `size <= 0`, the insertion point is missing, the font
 * is unavailable, or the resolved glyph has no segments with at least two points.
 * Callers should ensure required SHX fonts are loaded in {@link FontManager} before
 * export (typically satisfied when exporting from an open viewer session).
 *
 * @see {@link AcSvgShape}
 * @see {@link transformPolylines}
 * @see {@link computeBaselineLeftAnchor}
 * @see {@link resolveShapeRotation}
 */
export function buildSvgShape(
  shape: AcGiShapeData,
  style: AcGiTextStyle,
  traits: AcGiSubEntityTraits,
  ctx: AcSvgStyleContext
): BuiltSvgShape {
  const box = new AcGeBox2d()
  const empty: BuiltSvgShape = { localSvg: '', box }

  const size = shape.size
  const position = shape.position
  if (!position || !(size > 0)) {
    return empty
  }

  const polylines = resolveShapePolylines(shape, style)
  if (!polylines?.length) {
    return empty
  }

  const widthFactor = shape.widthFactor ?? style.widthFactor ?? 1
  const obliqueRad = ((style.obliqueAngle ?? 0) * Math.PI) / 180
  const skewTan = obliqueRad !== 0 ? Math.tan(obliqueRad) : 0
  const transformedLines = transformPolylines(polylines, widthFactor, skewTan)
  if (transformedLines.length === 0) {
    return empty
  }

  const anchor = computeBaselineLeftAnchor(transformedLines)
  const rotation = resolveShapeRotation(shape.rotation, shape.directionVector)
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const strokeAttrs = AcSvgStyleUtil.strokeAttributes(traits, ctx)
  const paths: string[] = []

  for (const line of transformedLines) {
    let d = ''
    for (let i = 0; i < line.length; i++) {
      const anchoredX = line[i].x + anchor.x
      const anchoredY = line[i].y + anchor.y
      const x = anchoredX * cos - anchoredY * sin + position.x
      const y = anchoredX * sin + anchoredY * cos + position.y
      d += i === 0 ? `M${x},${y}` : `L${x},${y}`
      box.expandByPoint({ x, y })
    }
    if (d) {
      paths.push(AcSvgStyleUtil.tag('path', { d, ...strokeAttrs }))
    }
  }

  return { localSvg: paths.join('\n'), box }
}

/**
 * Applies horizontal width factor and oblique skew to raw SHX pen coordinates.
 *
 * Matches the first stage of {@link @mlightcad/mtext-renderer}'s
 * `MTextProcessor.buildShapeGeometry`: scale X by `widthFactor`, then shear X by
 * `tan(obliqueAngle)` when the text style oblique angle is non-zero.
 *
 * @param polylines - Drawable segments from an SHX glyph; segments with fewer than
 *   two points are discarded.
 * @param widthFactor - Relative X-scale (DXF group 41 / text-style width factor).
 * @param skewTan - Tangent of the oblique angle in radians (`tan(obliqueAngle)`).
 * @returns Transformed polylines ready for baseline anchoring and world placement.
 */
export function transformPolylines(
  polylines: ShxPolylinePoint[][],
  widthFactor: number,
  skewTan: number
): ShxPolylinePoint[][] {
  const lines: ShxPolylinePoint[][] = []

  for (const line of polylines) {
    if (line.length < 2) {
      continue
    }
    const transformed: ShxPolylinePoint[] = []
    for (const point of line) {
      let x = point.x * widthFactor
      const y = point.y
      if (skewTan !== 0) {
        x += skewTan * y
      }
      transformed.push({ x, y })
    }
    lines.push(transformed)
  }

  return lines
}

/**
 * Computes the baseline-left anchor offset for a SHAPE glyph.
 *
 * AutoCAD SHAPE entities use {@link AcGiMTextAttachmentPoint.BaselineLeft} placement
 * with bottom-to-top flow in {@link @mlightcad/mtext-renderer}. For shapes without
 * line-layout metadata, the baseline coincides with the geometry minimum Y, so the
 * anchor translates by `(-minX, -minY)` so the lower-left of the glyph bbox sits at
 * the insertion origin before rotation.
 *
 * @param lines - Width/oblique-transformed polylines for one glyph.
 * @returns Translation to add to each vertex prior to rotation and insertion translation.
 */
export function computeBaselineLeftAnchor(
  lines: ShxPolylinePoint[][]
): ShapeBaselineAnchor {
  let minX = Infinity
  let minY = Infinity

  for (const line of lines) {
    for (const point of line) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
    }
  }

  return {
    x: Number.isFinite(minX) ? -minX : 0,
    y: Number.isFinite(minY) ? -minY : 0
  }
}

/**
 * Resolves the in-plane rotation angle (radians) applied when placing a SHAPE entity.
 *
 * @param rotation - Entity rotation relative to the shape OCS X axis (DXF group 50),
 *   in radians.
 * @param directionVector - Extrusion / normal vector (DXF groups 210–230). When omitted,
 *   {@link rotation} is used directly.
 * @returns Rotation angle in radians about +Z applied after baseline anchoring.
 *
 * @remarks
 * When the extrusion is approximately world +Z (typical planar shapes), entity
 * {@link rotation} is preserved. For tilted extrusion directions, the angle is derived
 * from the tilt between the extrusion vector and world +Z, following the same rule as
 * {@link @mlightcad/mtext-renderer}'s `finalizePlacement`.
 */
export function resolveShapeRotation(
  rotation: number | undefined,
  directionVector?: AcGeVector3dLike
): number {
  if (!directionVector) {
    return rotation ?? 0
  }

  const nx = directionVector.x ?? 0
  const ny = directionVector.y ?? 0
  const nz = directionVector.z ?? 1
  const len = Math.hypot(nx, ny, nz)
  if (len < 1e-12) {
    return rotation ?? 0
  }

  const mx = nx / len
  const my = ny / len
  const mz = nz / len

  // WCS XY plane: keep entity rotation (mtext-renderer yields zero tilt for +Z normal).
  if (Math.hypot(mx, my) < 1e-10 && mz > 0) {
    return rotation ?? 0
  }

  const tilt = Math.acos(Math.min(1, Math.max(-1, mz)))
  return tilt
}

/**
 * Loads SHX pen polylines for one SHAPE entity from the active font pipeline.
 *
 * @param shape - SHAPE data containing name and/or numeric shape code plus height.
 * @param style - Text style whose {@link AcGiTextStyle.font} references the SHX file.
 * @returns Scaled polylines at {@link AcGiShapeData.size}, or `undefined` when the
 *   glyph or font cannot be resolved.
 *
 * @remarks
 * Font names are normalized via {@link normalizeCadFontName} before lookup. Named shapes
 * take precedence over numeric {@link AcGiShapeData.shapeNumber} codes, mirroring
 * {@link @mlightcad/mtext-renderer}'s `resolveShapeGlyph`.
 */
function resolveShapePolylines(
  shape: AcGiShapeData,
  style: AcGiTextStyle
): ShxPolylinePoint[][] | undefined {
  const fontName = normalizeCadFontName(style.font)
  const size = shape.size
  const name = shape.name?.trim()
  const code = shape.shapeNumber
  const fontManager = FontManager.instance

  const fromManager =
    (name && fontManager.getShapeByName(name, fontName, size)) ||
    (code != null && code !== 0
      ? fontManager.getShapeByCode(code, fontName, size)
      : undefined)
  if (fromManager) {
    return extractPolylines(fromManager)
  }

  const font = fontManager.getFontByName(fontName, false)
  if (font?.type !== 'shx') {
    return undefined
  }

  const parser = new ShxParserFont(font.data as ShxFontData)
  try {
    const glyph =
      (name && parser.getShapeByName(name, size)) ||
      (code != null && code !== 0 ? parser.getCharShape(code, size) : undefined)
    const polylines = glyph?.polylines
    if (!polylines?.some(line => line.length >= 2)) {
      return undefined
    }
    return polylines
  } finally {
    parser.release()
  }
}

/**
 * Reads raw SHX polylines from a {@link BaseTextShape} wrapper returned by
 * {@link FontManager}.
 *
 * @param textShape - Renderer text-shape wrapper produced by `getShapeByName` /
 *   `getShapeByCode`.
 * @returns Pen polylines when at least one segment has two or more points; otherwise
 *   `undefined`.
 *
 * @remarks
 * {@link BaseTextShape} does not expose polylines on its public TypeScript surface;
 * this helper accesses the internal SHX shape payload used by
 * {@link @mlightcad/mtext-renderer}'s `ShxTextShape`.
 */
function extractPolylines(
  textShape: BaseTextShape
): ShxPolylinePoint[][] | undefined {
  const internal = textShape as {
    shape?: { polylines?: ShxPolylinePoint[][] }
  }
  const polylines = internal.shape?.polylines
  if (!polylines?.some(line => line.length >= 2)) {
    return undefined
  }
  return polylines
}
