import {
  AcDb3PointAngularDimension,
  AcDbAlignedDimension,
  AcDbArc,
  AcDbArcDimension,
  AcDbCircle,
  AcDbDatabase,
  AcDbDiametricDimension,
  AcDbDimension,
  AcDbEllipse,
  AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbHatchStyle,
  AcDbLine,
  AcDbMText,
  AcDbOrdinateDimension,
  AcDbPoint,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRay,
  AcDbRotatedDimension,
  AcDbSpline,
  AcDbXline,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeTol,
  HATCH_PATTERN_SOLID
} from '@mlightcad/data-model'

import type { DrawingContextSnapshot } from '../context/DrawingContextProvider'
import { getDrawingContext } from '../context/DrawingContextProvider'
import type { CadSession } from '../session/CadSession'
import { requireDocument, requireView } from '../session/documentAccess'
import { getScriptEditDepth } from '../session/editDepth'
import { runSessionEdit } from '../session/runSessionEdit'
import {
  applyDimStyle,
  commitDimBlock,
  inferLinearRotation,
  pointOnCircle
} from './commitDimension'
import type { Point2dInput, ToolResult } from './types'

export type { Point2dInput, ToolResult } from './types'

/**
 * Converts a 2D tool input to a 3D point with the given Z elevation.
 *
 * @param point - WCS x/y coordinates.
 * @param z - Z coordinate (defaults to 0).
 * @returns A new {@link AcGePoint3d}.
 */
function toPoint3d(point: Point2dInput, z = 0): AcGePoint3d {
  return new AcGePoint3d(point.x, point.y, z)
}

/**
 * Assigns a layer name to an entity when the tool input specifies one.
 *
 * @param entity - Entity about to be appended to model space.
 * @param layer - Optional layer name from tool input.
 */
function applyLayer(entity: AcDbEntity, layer?: string): void {
  if (layer) {
    entity.layer = layer
  }
}

type DimWithBlock = AcDbDimension & {
  createDimBlock(
    name: string
  ): import('@mlightcad/data-model').AcDbBlockTableRecord
}

interface DimCommonInput {
  text?: string
  styleName?: string
  layer?: string
}

/**
 * Applies style/text/layer, builds the anonymous dim block, and appends to model space.
 */
function appendDimension(
  db: AcDbDatabase,
  dim: DimWithBlock,
  input: DimCommonInput
): string {
  applyDimStyle(dim, db, input.styleName)
  if (input.text != null) {
    dim.dimensionText = input.text
  }
  applyLayer(dim, input.layer)
  commitDimBlock(db, dim)
  db.tables.blockTable.modelSpace.appendEntity(dim)
  return dim.objectId
}

const POSITIVE_NORMAL = { x: 0, y: 0, z: 1 }

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Builds a unit direction vector from `start` toward `through`, or `undefined` if degenerate.
 */
function resolveUnitDirection(
  start: Point2dInput,
  through: Point2dInput
): AcGePoint3d | undefined {
  const direction = new AcGePoint3d(through.x, through.y, 0).sub(
    new AcGePoint3d(start.x, start.y, 0)
  )
  if (!AcGeTol.isPositive(direction.length())) {
    return undefined
  }
  return direction.normalize()
}

function resolveDiameterPoints(input: {
  center?: Point2dInput
  radius?: number
  angleDeg?: number
  chordPoint?: Point2dInput
  farChordPoint?: Point2dInput
}):
  | { chordPoint: Point2dInput; farChordPoint: Point2dInput }
  | { error: ToolResult } {
  if (input.chordPoint && input.farChordPoint) {
    return {
      chordPoint: input.chordPoint,
      farChordPoint: input.farChordPoint
    }
  }
  if (
    input.center &&
    typeof input.radius === 'number' &&
    Number.isFinite(input.radius) &&
    input.radius > 0
  ) {
    const angleDeg = input.angleDeg ?? 0
    return {
      chordPoint: pointOnCircle(input.center, input.radius, angleDeg),
      farChordPoint: pointOnCircle(input.center, input.radius, angleDeg + 180)
    }
  }
  return {
    error: {
      success: false,
      message:
        'Diameter requires chordPoint+farChordPoint, or center+radius (> 0)',
      error: 'invalid_diameter_points'
    }
  }
}

function resolveRadiusChord(input: {
  center?: Point2dInput
  chordPoint?: Point2dInput
  radius?: number
  angleDeg?: number
}): { chordPoint: Point2dInput } | { error: ToolResult } {
  if (!input.center) {
    return {
      error: {
        success: false,
        message: 'Radius requires center with chordPoint, or center+radius (> 0)',
        error: 'invalid_radius_points'
      }
    }
  }
  if (input.chordPoint) {
    return { chordPoint: input.chordPoint }
  }
  if (
    typeof input.radius === 'number' &&
    Number.isFinite(input.radius) &&
    input.radius > 0
  ) {
    return {
      chordPoint: pointOnCircle(input.center, input.radius, input.angleDeg ?? 0)
    }
  }
  return {
    error: {
      success: false,
      message: 'Radius requires chordPoint, or radius (> 0) with center',
      error: 'invalid_radius_points'
    }
  }
}

/**
 * Creates a closed polyline hatch boundary loop from WCS vertices.
 */
function createClosedBoundaryLoop(points: Point2dInput[]): AcGeLoop2d {
  const loop = new AcGeLoop2d()
  for (let index = 0; index < points.length; index++) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    loop.add(
      new AcGeLine2d(
        new AcGePoint2d(start.x, start.y),
        new AcGePoint2d(end.x, end.y)
      )
    )
  }
  return loop
}

/**
 * Verifies that a layer exists before creating geometry on it.
 *
 * @param layer - Optional layer name from tool input.
 * @returns A failed {@link ToolResult} when the layer is missing; otherwise `undefined`.
 */
function validateLayer(
  session: CadSession,
  layer?: string
): ToolResult | undefined {
  if (!layer) {
    return undefined
  }
  const layerNames = session
    .getDocument()!
    .layerStore.getLayers()
    .map(entry => entry.name)
  if (!layerNames.includes(layer)) {
    return {
      success: false,
      message: `Layer not found: ${layer}`,
      error: 'layer_not_found'
    }
  }
  return undefined
}

/**
 * Runs a database mutation inside an undoable edit transaction.
 *
 * @param label - Undo stack label shown in the editor.
 * @param fn - Callback that performs the edit and returns a result.
 * @returns The value returned by `fn`.
 */
function runEdit<T>(session: CadSession, label: string, fn: () => T): T {
  if (getScriptEditDepth() > 0) {
    return fn()
  }
  return runSessionEdit(session, session.getDocument()!.database, label, fn)
}

/**
 * Executes CAD drawing operations on behalf of the LLM agent tools.
 *
 * All geometry is created in model space of the active document.
 */
export class CadActionExecutor {
  /**
   * @param session - Drawing access. Edits go through {@link CadSession.runEdit}
   *   when the session provides it.
   */
  constructor(private readonly session: CadSession) {}

  /**
   * Returns a snapshot of the active drawing (same data as script `cad.drawing`).
   *
   * @returns Layer list, units, and extents.
   */
  getDrawingContext(): DrawingContextSnapshot | ToolResult {
    const accessError = requireDocument(this.session, false)
    if (accessError) {
      return accessError
    }
    try {
      return getDrawingContext(this.session)
    } catch (error) {
      return {
        success: false,
        message: 'Failed to read drawing context',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a line entity between two WCS points.
   *
   * @param input - Start and end points and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawLine(input: {
    start: Point2dInput
    end: Point2dInput
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_line', () => {
        const db = this.session.getDocument()!.database
        const line = new AcDbLine(toPoint3d(input.start), toPoint3d(input.end))
        applyLayer(line, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(line)
        entityIds.push(line.objectId)
      })
      return {
        success: true,
        message: 'Line created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw line',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a circle by center and radius.
   *
   * @param input - Center, radius, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawCircle(input: {
    center: Point2dInput
    radius: number
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_circle', () => {
        const db = this.session.getDocument()!.database
        const circle = new AcDbCircle(toPoint3d(input.center), input.radius)
        applyLayer(circle, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(circle)
        entityIds.push(circle.objectId)
      })
      return {
        success: true,
        message: 'Circle created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw circle',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates an arc by center, radius, and start/end angles in degrees.
   *
   * @param input - Arc parameters and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawArc(input: {
    center: Point2dInput
    radius: number
    startAngleDeg: number
    endAngleDeg: number
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_arc', () => {
        const db = this.session.getDocument()!.database
        const arc = new AcDbArc(
          toPoint3d(input.center),
          input.radius,
          input.startAngleDeg,
          input.endAngleDeg
        )
        applyLayer(arc, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(arc)
        entityIds.push(arc.objectId)
      })
      return {
        success: true,
        message: 'Arc created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw arc',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a closed rectangular polyline from two opposite corners.
   *
   * @param input - Corner points and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawRectangle(input: {
    corner1: Point2dInput
    corner2: Point2dInput
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_rectangle', () => {
        const db = this.session.getDocument()!.database
        const x1 = input.corner1.x
        const y1 = input.corner1.y
        const x2 = input.corner2.x
        const y2 = input.corner2.y
        const polyline = new AcDbPolyline()
        const corners = [
          new AcGePoint2d(x1, y1),
          new AcGePoint2d(x2, y1),
          new AcGePoint2d(x2, y2),
          new AcGePoint2d(x1, y2)
        ]
        corners.forEach((point, index) => {
          polyline.addVertexAt(index, point)
        })
        polyline.closed = true
        applyLayer(polyline, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(polyline)
        entityIds.push(polyline.objectId)
      })
      return {
        success: true,
        message: 'Rectangle created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw rectangle',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a polyline through an ordered list of vertices.
   *
   * @param input - Vertices, optional closed flag, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawPolyline(input: {
    points: Point2dInput[]
    closed?: boolean
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    if (input.points.length < 2) {
      return {
        success: false,
        message: 'Polyline requires at least 2 points',
        error: 'invalid_points'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_polyline', () => {
        const db = this.session.getDocument()!.database
        const polyline = new AcDbPolyline()
        input.points.forEach((point, index) => {
          polyline.addVertexAt(index, new AcGePoint2d(point.x, point.y))
        })
        if (input.closed) {
          polyline.closed = true
        }
        applyLayer(polyline, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(polyline)
        entityIds.push(polyline.objectId)
      })
      return {
        success: true,
        message: 'Polyline created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw polyline',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates MTEXT at a WCS position.
   *
   * @param input - Position, string contents, optional height, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawText(input: {
    position: Point2dInput
    text: string
    height?: number
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_text', () => {
        const db = this.session.getDocument()!.database
        const mtext = new AcDbMText()
        mtext.location = toPoint3d(input.position)
        mtext.contents = input.text
        ;(mtext as AcDbMText & { textHeight: number }).textHeight =
          input.height ?? 2.5
        applyLayer(mtext, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(mtext)
        entityIds.push(mtext.objectId)
      })
      return {
        success: true,
        message: 'Text created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw text',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates an ellipse or elliptical arc by center, radii, and optional rotation.
   *
   * @param input - Ellipse parameters and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawEllipse(input: {
    center: Point2dInput
    majorRadius: number
    minorRadius: number
    rotationDeg?: number
    startAngleDeg?: number
    endAngleDeg?: number
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    if (
      !Number.isFinite(input.majorRadius) ||
      !Number.isFinite(input.minorRadius) ||
      input.majorRadius <= 0 ||
      input.minorRadius <= 0
    ) {
      return {
        success: false,
        message: 'Ellipse requires positive major and minor radii',
        error: 'invalid_radii'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_ellipse', () => {
        const db = this.session.getDocument()!.database
        const rotationRad = degToRad(input.rotationDeg ?? 0)
        const majorAxis = {
          x: Math.cos(rotationRad),
          y: Math.sin(rotationRad),
          z: 0
        }
        const hasArcAngles =
          input.startAngleDeg !== undefined && input.endAngleDeg !== undefined
        const startAngle = hasArcAngles ? degToRad(input.startAngleDeg!) : 0
        const endAngle = hasArcAngles ? degToRad(input.endAngleDeg!) : 0
        const ellipse = new AcDbEllipse(
          toPoint3d(input.center),
          POSITIVE_NORMAL,
          majorAxis,
          input.majorRadius,
          input.minorRadius,
          startAngle,
          endAngle
        )
        applyLayer(ellipse, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(ellipse)
        entityIds.push(ellipse.objectId)
      })
      const isArc =
        input.startAngleDeg !== undefined && input.endAngleDeg !== undefined
      return {
        success: true,
        message: isArc ? 'Elliptical arc created' : 'Ellipse created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw ellipse',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a hatch fill inside a closed polygon boundary.
   *
   * @param input - Boundary vertices, optional pattern settings, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawHatch(input: {
    boundary: Point2dInput[]
    patternName?: string
    patternScale?: number
    patternAngleDeg?: number
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    if (input.boundary.length < 3) {
      return {
        success: false,
        message: 'Hatch boundary requires at least 3 points',
        error: 'invalid_boundary'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_hatch', () => {
        const db = this.session.getDocument()!.database
        const hatch = new AcDbHatch()
        if (db instanceof AcDbDatabase) {
          hatch.database = db
        }
        const patternName = input.patternName?.trim() || HATCH_PATTERN_SOLID
        const isSolidFill = patternName === HATCH_PATTERN_SOLID
        hatch.patternName = patternName
        hatch.patternType = AcDbHatchPatternType.Predefined
        hatch.patternScale = input.patternScale ?? 1
        hatch.patternAngle = degToRad(input.patternAngleDeg ?? 0)
        hatch.hatchStyle = AcDbHatchStyle.Normal
        hatch.isSolidFill = isSolidFill
        hatch.add(createClosedBoundaryLoop(input.boundary))
        applyLayer(hatch, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(hatch)
        entityIds.push(hatch.objectId)
      })
      return {
        success: true,
        message: 'Hatch created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw hatch',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a point entity at a WCS position.
   *
   * @param input - Position and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawPoint(input: { position: Point2dInput; layer?: string }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_point', () => {
        const db = this.session.getDocument()!.database
        const point = new AcDbPoint()
        point.position = toPoint3d(input.position)
        applyLayer(point, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(point)
        entityIds.push(point.objectId)
      })
      return {
        success: true,
        message: 'Point created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw point',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a ray from a start point through another point.
   *
   * @param input - Start point, through point, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawRay(input: {
    start: Point2dInput
    through: Point2dInput
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const unitDir = resolveUnitDirection(input.start, input.through)
    if (!unitDir) {
      return {
        success: false,
        message: 'Ray requires distinct start and through points',
        error: 'invalid_direction'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_ray', () => {
        const db = this.session.getDocument()!.database
        const ray = new AcDbRay()
        ray.basePoint = toPoint3d(input.start)
        ray.unitDir = unitDir
        applyLayer(ray, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(ray)
        entityIds.push(ray.objectId)
      })
      return {
        success: true,
        message: 'Ray created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw ray',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a construction line (xline) from a start point through another point.
   *
   * @param input - Start point, through point, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawXline(input: {
    start: Point2dInput
    through: Point2dInput
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const unitDir = resolveUnitDirection(input.start, input.through)
    if (!unitDir) {
      return {
        success: false,
        message: 'Xline requires distinct start and through points',
        error: 'invalid_direction'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_xline', () => {
        const db = this.session.getDocument()!.database
        const xline = new AcDbXline()
        xline.basePoint = toPoint3d(input.start)
        xline.unitDir = unitDir
        applyLayer(xline, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(xline)
        entityIds.push(xline.objectId)
      })
      return {
        success: true,
        message: 'Xline created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw xline',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a fit spline through an ordered list of control/fit points.
   *
   * @param input - Vertices, optional closed flag, and optional layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawSpline(input: {
    points: Point2dInput[]
    closed?: boolean
    layer?: string
  }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    if (input.points.length < 2) {
      return {
        success: false,
        message: 'Spline requires at least 2 points',
        error: 'invalid_points'
      }
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, 'Agent: draw_spline', () => {
        const db = this.session.getDocument()!.database
        const points3d = input.points.map(point => toPoint3d(point))
        const degree = Math.min(3, Math.max(1, points3d.length - 1))
        const isClosed = Boolean(input.closed && points3d.length >= 3)
        const spline = new AcDbSpline(points3d, 'Chord', degree, isClosed)
        applyLayer(spline, input.layer)
        db.tables.blockTable.modelSpace.appendEntity(spline)
        entityIds.push(spline.objectId)
      })
      return {
        success: true,
        message: 'Spline created',
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to draw spline',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates an aligned dimension between two definition points.
   *
   * @param input - Extension-line ends, dim-line point, optional text/style/layer.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimAligned(input: {
    xLine1Point: Point2dInput
    xLine2Point: Point2dInput
    dimLinePoint: Point2dInput
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    return this.createDimension(
      'aligned',
      'Agent: draw_dim_aligned',
      input,
      () =>
        new AcDbAlignedDimension(
          toPoint3d(input.xLine1Point),
          toPoint3d(input.xLine2Point),
          toPoint3d(input.dimLinePoint)
        )
    )
  }

  /**
   * Creates a linear (rotated) dimension. Omitting `rotationDeg` picks horizontal
   * or vertical from the dim-line placement, matching AutoCAD DIMLINEAR.
   *
   * @param input - Extension-line ends, dim-line point, optional rotation in degrees.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimLinear(input: {
    xLine1Point: Point2dInput
    xLine2Point: Point2dInput
    dimLinePoint: Point2dInput
    rotationDeg?: number
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    return this.createDimension('linear', 'Agent: draw_dim_linear', input, () => {
      const dim = new AcDbRotatedDimension(
        toPoint3d(input.xLine1Point),
        toPoint3d(input.xLine2Point),
        toPoint3d(input.dimLinePoint)
      )
      dim.rotation =
        input.rotationDeg != null
          ? degToRad(input.rotationDeg)
          : inferLinearRotation(
              input.xLine1Point,
              input.xLine2Point,
              input.dimLinePoint
            )
      return dim
    })
  }

  /**
   * Creates a diametric dimension on a circle or arc.
   *
   * Pass either `chordPoint` + `farChordPoint`, or `center` + `radius` (optional
   * `angleDeg`, default 0) to place the diameter chord.
   *
   * @param input - Diameter definition points or center/radius, optional leader.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimDiameter(input: {
    center?: Point2dInput
    radius?: number
    angleDeg?: number
    chordPoint?: Point2dInput
    farChordPoint?: Point2dInput
    leaderLength?: number
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    const resolved = resolveDiameterPoints(input)
    if ('error' in resolved) {
      return resolved.error
    }
    return this.createDimension(
      'diameter',
      'Agent: draw_dim_diameter',
      input,
      () =>
        new AcDbDiametricDimension(
          toPoint3d(resolved.chordPoint),
          toPoint3d(resolved.farChordPoint),
          Math.max(0, input.leaderLength ?? 0)
        )
    )
  }

  /**
   * Creates a radial dimension on a circle or arc.
   *
   * Pass `center` plus either `chordPoint`, or `radius` with optional `angleDeg`
   * (default 0) to place the chord point on the curve.
   *
   * @param input - Center and chord (or radius/angle), optional leader length.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimRadius(input: {
    center: Point2dInput
    chordPoint?: Point2dInput
    radius?: number
    angleDeg?: number
    leaderLength?: number
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    const chord = resolveRadiusChord(input)
    if ('error' in chord) {
      return chord.error
    }
    return this.createDimension('radius', 'Agent: draw_dim_radius', input, () =>
      new AcDbRadialDimension(
        toPoint3d(input.center),
        toPoint3d(chord.chordPoint),
        Math.max(0, input.leaderLength ?? 0)
      )
    )
  }

  /**
   * Creates a three-point angular dimension.
   *
   * @param input - Angle vertex, two ray points, and a point on the dimension arc.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimAngular(input: {
    center: Point2dInput
    xLine1Point: Point2dInput
    xLine2Point: Point2dInput
    arcPoint: Point2dInput
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    return this.createDimension(
      'angular',
      'Agent: draw_dim_angular',
      input,
      () =>
        new AcDb3PointAngularDimension(
          toPoint3d(input.center),
          toPoint3d(input.xLine1Point),
          toPoint3d(input.xLine2Point),
          toPoint3d(input.arcPoint)
        )
    )
  }

  /**
   * Creates an arc-length dimension.
   *
   * @param input - Arc center, start/end points, and a point on the arc.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimArc(input: {
    center: Point2dInput
    xLine1Point: Point2dInput
    xLine2Point: Point2dInput
    arcPoint: Point2dInput
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    return this.createDimension('arc', 'Agent: draw_dim_arc', input, () =>
      new AcDbArcDimension(
        toPoint3d(input.center),
        toPoint3d(input.xLine1Point),
        toPoint3d(input.xLine2Point),
        toPoint3d(input.arcPoint)
      )
    )
  }

  /**
   * Creates an ordinate dimension measuring X or Y from an origin.
   *
   * When `useXAxis` is omitted, the axis is inferred from which offset between
   * `definingPoint` and `leaderEndPoint` is larger (X if |dx| >= |dy|).
   *
   * @param input - Feature point, leader end, optional axis and origin.
   * @returns {@link ToolResult} with created entity ids on success.
   */
  drawDimOrdinate(input: {
    definingPoint: Point2dInput
    leaderEndPoint: Point2dInput
    useXAxis?: boolean
    origin?: Point2dInput
    text?: string
    styleName?: string
    layer?: string
  }): ToolResult {
    return this.createDimension(
      'ordinate',
      'Agent: draw_dim_ordinate',
      input,
      () => {
        const dim = new AcDbOrdinateDimension(
          toPoint3d(input.definingPoint),
          toPoint3d(input.leaderEndPoint)
        )
        dim.useXAxis =
          input.useXAxis ??
          Math.abs(input.leaderEndPoint.x - input.definingPoint.x) >=
            Math.abs(input.leaderEndPoint.y - input.definingPoint.y)
        if (input.origin) {
          dim.origin = toPoint3d(input.origin)
        }
        return dim
      }
    )
  }

  /**
   * Shared create path for every dimension draw tool.
   */
  private createDimension(
    kind: string,
    label: string,
    input: DimCommonInput,
    factory: (db: AcDbDatabase) => DimWithBlock
  ): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(this.session, input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit(this.session, label, () => {
        const db = this.session.getDocument()!.database
        const dim = factory(db)
        entityIds.push(appendDimension(db, dim, input))
      })
      return {
        success: true,
        message: `${kind} dimension created`,
        entityIds
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to draw ${kind} dimension`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Sets the document current layer (CLAYER).
   *
   * @param layerName - Existing layer name.
   * @returns Success when the layer exists; otherwise `layer_not_found`.
   */
  setCurrentLayer(layerName: string): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    try {
      const changed = runEdit(this.session, 'Agent: set_current_layer', () => {
        return this.session.getDocument()!.layerService.setCurrentLayer(
          layerName
        )
      })
      return changed
        ? { success: true, message: `Current layer set to ${layerName}` }
        : {
            success: false,
            message: `Layer not found: ${layerName}`,
            error: 'layer_not_found'
          }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to set current layer',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Creates a layer when it does not already exist.
   *
   * @param layerName - Name of the layer to create.
   * @returns Success when created or already present.
   */
  createLayer(layerName: string): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    try {
      const result = runEdit(this.session, 'Agent: create_layer', () => {
        return this.session.getDocument()!.layerService.createLayers([
          layerName
        ])
      })
      if (result.created > 0) {
        return { success: true, message: `Layer created: ${layerName}` }
      }
      if (result.existed.includes(layerName)) {
        return {
          success: true,
          message: `Layer already exists: ${layerName}`
        }
      }
      return {
        success: false,
        message: `Failed to create layer: ${layerName}`,
        error: 'create_layer_failed'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create layer',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Erases entities by object id.
   *
   * @param input - Entity ids previously returned by drawing tools.
   * @returns {@link ToolResult} with the number of deleted entities on success.
   */
  deleteEntities(input: { entityIds: string[] }): ToolResult {
    const accessError = requireDocument(this.session, true)
    if (accessError) {
      return accessError
    }
    if (input.entityIds.length === 0) {
      return {
        success: false,
        message: 'At least one entity id is required',
        error: 'invalid_entity_ids'
      }
    }
    try {
      const requestedIds = [...new Set(input.entityIds)]
      let erasedCount = 0
      runEdit(this.session, 'Agent: delete_entities', () => {
        erasedCount =
          this.session.getDocument()!.entityService.eraseEntities(
            requestedIds
          )
      })
      if (erasedCount === 0) {
        return {
          success: false,
          message: 'No entities found for the given ids',
          error: 'entity_not_found'
        }
      }
      const notFoundCount = requestedIds.length - erasedCount
      const message =
        notFoundCount > 0
          ? `Deleted ${erasedCount} entity(ies); ${notFoundCount} id(s) not found`
          : `Deleted ${erasedCount} entity(ies)`
      return {
        success: true,
        message
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete entities',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Zooms the active view to the full drawing extents.
   *
   * @returns Success when the view zoom completes.
   */
  zoomExtents(): ToolResult {
    const accessError = requireView(this.session)
    if (accessError) {
      return accessError
    }
    try {
      this.session.getView()!.zoomToFitDrawing()
      return { success: true, message: 'Zoomed to drawing extents' }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to zoom extents',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
