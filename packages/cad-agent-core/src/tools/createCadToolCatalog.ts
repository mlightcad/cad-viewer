import { z } from 'zod'

import { executeCadScript } from '../script/executeCadScript'
import { CAD_SCRIPT_API_SUMMARY } from '../script/scriptApi'
import type { CadSession } from '../session/CadSession'
import { createDocManagerSession } from '../session/createDocManagerSession'
import { CadActionExecutor } from './CadActionExecutor'
import type { CadToolDefinition } from './types'

const pointSchema = z.object({
  x: z.number(),
  y: z.number()
})

function call<T>(fn: (input: T) => unknown): (input: unknown) => unknown {
  return input => fn(input as T)
}

/**
 * Builds the tool catalog for one session.
 *
 * Chat, MCP, and WebMCP adapters should call this instead of declaring tools
 * themselves. The default session reads the live document manager.
 *
 * @param session - Drawing access captured by every tool in the catalog.
 * @returns Tool definitions in a stable order.
 */
export function createCadToolCatalog(
  session: CadSession = createDocManagerSession()
): CadToolDefinition[] {
  const executor = new CadActionExecutor(session)
  const tools = [
    {
      name: 'get_drawing_context',
      description: 'Get current drawing context: units, layers, and extents',
      access: 'read',
      inputSchema: z.object({}),
      execute: () => executor.getDrawingContext()
    },
    {
      name: 'draw_line',
      description: 'Draw a straight line segment in model space',
      access: 'write',
      inputSchema: z.object({
        start: pointSchema,
        end: pointSchema,
        layer: z.string().optional()
      }),
      execute: call(executor.drawLine.bind(executor))
    },
    {
      name: 'draw_circle',
      description: 'Draw a circle by center and radius',
      access: 'write',
      inputSchema: z.object({
        center: pointSchema,
        radius: z.number().positive(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawCircle.bind(executor))
    },
    {
      name: 'draw_arc',
      description:
        'Draw an arc by center, radius, and start/end angles in degrees',
      access: 'write',
      inputSchema: z.object({
        center: pointSchema,
        radius: z.number().positive(),
        startAngleDeg: z.number(),
        endAngleDeg: z.number(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawArc.bind(executor))
    },
    {
      name: 'draw_rectangle',
      description: 'Draw a rectangle from two opposite corners',
      access: 'write',
      inputSchema: z.object({
        corner1: pointSchema,
        corner2: pointSchema,
        layer: z.string().optional()
      }),
      execute: call(executor.drawRectangle.bind(executor))
    },
    {
      name: 'draw_polyline',
      description: 'Draw a polyline through a list of points',
      access: 'write',
      inputSchema: z.object({
        points: z.array(pointSchema).min(2),
        closed: z.boolean().optional(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawPolyline.bind(executor))
    },
    {
      name: 'draw_ellipse',
      description:
        'Draw an ellipse or elliptical arc by center, major/minor radii, optional rotation (degrees), and optional start/end angles (degrees)',
      access: 'write',
      inputSchema: z.object({
        center: pointSchema,
        majorRadius: z.number().positive(),
        minorRadius: z.number().positive(),
        rotationDeg: z.number().optional(),
        startAngleDeg: z.number().optional(),
        endAngleDeg: z.number().optional(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawEllipse.bind(executor))
    },
    {
      name: 'draw_hatch',
      description:
        'Draw a hatch fill inside a closed polygon boundary. Use patternName "SOLID" for solid fill, or a predefined pattern name such as ANSI31',
      access: 'write',
      inputSchema: z.object({
        boundary: z.array(pointSchema).min(3),
        patternName: z.string().optional(),
        patternScale: z.number().positive().optional(),
        patternAngleDeg: z.number().optional(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawHatch.bind(executor))
    },
    {
      name: 'draw_point',
      description: 'Draw a point entity at a position',
      access: 'write',
      inputSchema: z.object({
        position: pointSchema,
        layer: z.string().optional()
      }),
      execute: call(executor.drawPoint.bind(executor))
    },
    {
      name: 'draw_ray',
      description:
        'Draw a ray (half-line) from a start point through another point',
      access: 'write',
      inputSchema: z.object({
        start: pointSchema,
        through: pointSchema,
        layer: z.string().optional()
      }),
      execute: call(executor.drawRay.bind(executor))
    },
    {
      name: 'draw_xline',
      description:
        'Draw a construction line (xline) through two points, extending infinitely both ways',
      access: 'write',
      inputSchema: z.object({
        start: pointSchema,
        through: pointSchema,
        layer: z.string().optional()
      }),
      execute: call(executor.drawXline.bind(executor))
    },
    {
      name: 'draw_spline',
      description: 'Draw a smooth spline curve through a list of fit points',
      access: 'write',
      inputSchema: z.object({
        points: z.array(pointSchema).min(2),
        closed: z.boolean().optional(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawSpline.bind(executor))
    },
    {
      name: 'draw_text',
      description: 'Draw single-line MTEXT at a position',
      access: 'write',
      inputSchema: z.object({
        position: pointSchema,
        text: z.string().min(1),
        height: z.number().positive().optional(),
        layer: z.string().optional()
      }),
      execute: call(executor.drawText.bind(executor))
    },
    {
      name: 'set_current_layer',
      description: 'Set the current drawing layer (CLAYER)',
      access: 'write',
      inputSchema: z.object({
        layerName: z.string().min(1)
      }),
      execute: call((input: { layerName: string }) =>
        executor.setCurrentLayer(input.layerName)
      )
    },
    {
      name: 'create_layer',
      description: 'Create a new layer if it does not exist',
      access: 'write',
      inputSchema: z.object({
        layerName: z.string().min(1)
      }),
      execute: call((input: { layerName: string }) =>
        executor.createLayer(input.layerName)
      )
    },
    {
      name: 'delete_entities',
      description:
        'Delete one or more entities by object id. Use entityIds returned from previous drawing tool calls to remove incorrect geometry before redrawing.',
      access: 'write',
      inputSchema: z.object({
        entityIds: z.array(z.string().min(1)).min(1)
      }),
      execute: call(executor.deleteEntities.bind(executor))
    },
    {
      name: 'zoom_extents',
      description: 'Zoom the view to show the full drawing extents',
      access: 'view',
      inputSchema: z.object({}),
      execute: () => executor.zoomExtents()
    },
    {
      name: 'execute_cad_script',
      description: CAD_SCRIPT_API_SUMMARY,
      access: 'write',
      inputSchema: z.object({
        code: z.string().min(1),
        intent: z.string().min(1)
      }),
      execute: call((input: { code: string; intent: string }) =>
        executeCadScript(input, session)
      )
    }
  ]
  return tools as CadToolDefinition[]
}
