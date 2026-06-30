import {
  AcApDocManager,
  acapRunDatabaseEdit
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbArc,
  AcDbCircle,
  AcDbEntity,
  AcDbLine,
  AcDbMText,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { requireDocument, requireView } from './documentAccess'
import type { DrawingContextSnapshot } from './DrawingContextProvider'
import { getDrawingContext } from './DrawingContextProvider'

/** 2D point in WCS used by agent tool inputs. */
export interface Point2dInput {
  x: number
  y: number
}

/**
 * Outcome of a CAD agent tool invocation.
 *
 * Serialized back to the LLM as JSON from each tool's `execute` handler.
 */
export interface ToolResult {
  /** Whether the operation completed without error. */
  success: boolean
  /** Short human-readable summary for the model. */
  message: string
  /** Object ids of entities created, when applicable. */
  entityIds?: string[]
  /** Machine-readable error code or message when `success` is false. */
  error?: string
}

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

/**
 * Verifies that a layer exists before creating geometry on it.
 *
 * @param layer - Optional layer name from tool input.
 * @returns A failed {@link ToolResult} when the layer is missing; otherwise `undefined`.
 */
function validateLayer(layer?: string): ToolResult | undefined {
  if (!layer) {
    return undefined
  }
  const layerNames = AcApDocManager.instance.curDocument.layerStore
    .getLayers()
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
function runEdit<T>(label: string, fn: () => T): T {
  const db = AcApDocManager.instance.curDocument.database
  let result!: T
  acapRunDatabaseEdit(db, label, () => {
    result = fn()
  })
  return result
}

/**
 * Executes CAD drawing operations on behalf of the LLM agent tools.
 *
 * All geometry is created in model space of the active document.
 */
export class CadActionExecutor {
  /**
   * Returns a snapshot of the active drawing for the `get_drawing_context` tool.
   *
   * @returns Layer list, units, and extents.
   */
  getDrawingContext(): DrawingContextSnapshot | ToolResult {
    const accessError = requireDocument(false)
    if (accessError) {
      return accessError
    }
    try {
      return getDrawingContext()
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_line', () => {
        const db = AcApDocManager.instance.curDocument.database
        const line = new AcDbLine(
          toPoint3d(input.start),
          toPoint3d(input.end)
        )
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_circle', () => {
        const db = AcApDocManager.instance.curDocument.database
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_arc', () => {
        const db = AcApDocManager.instance.curDocument.database
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_rectangle', () => {
        const db = AcApDocManager.instance.curDocument.database
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
    const accessError = requireDocument(true)
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
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_polyline', () => {
        const db = AcApDocManager.instance.curDocument.database
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    const layerError = validateLayer(input.layer)
    if (layerError) {
      return layerError
    }
    try {
      const entityIds: string[] = []
      runEdit('Agent: draw_text', () => {
        const db = AcApDocManager.instance.curDocument.database
        const mtext = new AcDbMText()
        mtext.location = toPoint3d(input.position)
        mtext.contents = input.text
        mtext.textHeight = input.height ?? 2.5
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
   * Sets the document current layer (CLAYER).
   *
   * @param layerName - Existing layer name.
   * @returns Success when the layer exists; otherwise `layer_not_found`.
   */
  setCurrentLayer(layerName: string): ToolResult {
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    try {
      const changed = runEdit('Agent: set_current_layer', () => {
        return AcApDocManager.instance.curDocument.layerService.setCurrentLayer(
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
    const accessError = requireDocument(true)
    if (accessError) {
      return accessError
    }
    try {
      const result = runEdit('Agent: create_layer', () => {
        return AcApDocManager.instance.curDocument.layerService.createLayers([
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
   * Zooms the active view to the full drawing extents.
   *
   * @returns Success when the view zoom completes.
   */
  zoomExtents(): ToolResult {
    const accessError = requireView()
    if (accessError) {
      return accessError
    }
    try {
      AcApDocManager.instance.context.view.zoomToFitDrawing()
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

/** Shared singleton used by {@link createCadTools}. */
export const cadActionExecutor = new CadActionExecutor()
