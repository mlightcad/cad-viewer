import { tool } from 'ai'
import { z } from 'zod'

import { cadActionExecutor } from './CadActionExecutor'

/** Zod schema for 2D WCS points in agent tool arguments. */
const pointSchema = z.object({
  x: z.number(),
  y: z.number()
})

/**
 * Creates the tool set exposed to the CAD agent LLM.
 *
 * Each tool delegates to {@link cadActionExecutor} and returns a {@link ToolResult}.
 *
 * @returns AI SDK tool definitions keyed by tool name.
 */
export function createCadTools() {
  return {
    get_drawing_context: tool({
      description:
        'Get current drawing context: units, layers, extents, entity count',
      inputSchema: z.object({}),
      execute: async () => cadActionExecutor.getDrawingContext()
    }),
    draw_line: tool({
      description: 'Draw a straight line segment in model space',
      inputSchema: z.object({
        start: pointSchema,
        end: pointSchema,
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawLine(input)
    }),
    draw_circle: tool({
      description: 'Draw a circle by center and radius',
      inputSchema: z.object({
        center: pointSchema,
        radius: z.number().positive(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawCircle(input)
    }),
    draw_arc: tool({
      description: 'Draw an arc by center, radius, and start/end angles in degrees',
      inputSchema: z.object({
        center: pointSchema,
        radius: z.number().positive(),
        startAngleDeg: z.number(),
        endAngleDeg: z.number(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawArc(input)
    }),
    draw_rectangle: tool({
      description: 'Draw a rectangle from two opposite corners',
      inputSchema: z.object({
        corner1: pointSchema,
        corner2: pointSchema,
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawRectangle(input)
    }),
    draw_polyline: tool({
      description: 'Draw a polyline through a list of points',
      inputSchema: z.object({
        points: z.array(pointSchema).min(2),
        closed: z.boolean().optional(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawPolyline(input)
    }),
    draw_text: tool({
      description: 'Draw single-line MTEXT at a position',
      inputSchema: z.object({
        position: pointSchema,
        text: z.string().min(1),
        height: z.number().positive().optional(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawText(input)
    }),
    set_current_layer: tool({
      description: 'Set the current drawing layer (CLAYER)',
      inputSchema: z.object({
        layerName: z.string().min(1)
      }),
      execute: async input =>
        cadActionExecutor.setCurrentLayer(input.layerName)
    }),
    create_layer: tool({
      description: 'Create a new layer if it does not exist',
      inputSchema: z.object({
        layerName: z.string().min(1)
      }),
      execute: async input => cadActionExecutor.createLayer(input.layerName)
    }),
    zoom_extents: tool({
      description: 'Zoom the view to show the full drawing extents',
      inputSchema: z.object({}),
      execute: async () => cadActionExecutor.zoomExtents()
    })
  }
}

/** Inferred tool map type returned by {@link createCadTools}. */
export type CadTools = ReturnType<typeof createCadTools>
