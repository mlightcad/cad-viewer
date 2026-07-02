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
      description: 'Get current drawing context: units, layers, and extents',
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
      description:
        'Draw an arc by center, radius, and start/end angles in degrees',
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
    draw_ellipse: tool({
      description:
        'Draw an ellipse or elliptical arc by center, major/minor radii, optional rotation (degrees), and optional start/end angles (degrees)',
      inputSchema: z.object({
        center: pointSchema,
        majorRadius: z.number().positive(),
        minorRadius: z.number().positive(),
        rotationDeg: z.number().optional(),
        startAngleDeg: z.number().optional(),
        endAngleDeg: z.number().optional(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawEllipse(input)
    }),
    draw_hatch: tool({
      description:
        'Draw a hatch fill inside a closed polygon boundary. Use patternName "SOLID" for solid fill, or a predefined pattern name such as ANSI31',
      inputSchema: z.object({
        boundary: z.array(pointSchema).min(3),
        patternName: z.string().optional(),
        patternScale: z.number().positive().optional(),
        patternAngleDeg: z.number().optional(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawHatch(input)
    }),
    draw_point: tool({
      description: 'Draw a point entity at a position',
      inputSchema: z.object({
        position: pointSchema,
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawPoint(input)
    }),
    draw_ray: tool({
      description:
        'Draw a ray (half-line) from a start point through another point',
      inputSchema: z.object({
        start: pointSchema,
        through: pointSchema,
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawRay(input)
    }),
    draw_xline: tool({
      description:
        'Draw a construction line (xline) through two points, extending infinitely both ways',
      inputSchema: z.object({
        start: pointSchema,
        through: pointSchema,
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawXline(input)
    }),
    draw_spline: tool({
      description: 'Draw a smooth spline curve through a list of fit points',
      inputSchema: z.object({
        points: z.array(pointSchema).min(2),
        closed: z.boolean().optional(),
        layer: z.string().optional()
      }),
      execute: async input => cadActionExecutor.drawSpline(input)
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
      execute: async input => cadActionExecutor.setCurrentLayer(input.layerName)
    }),
    create_layer: tool({
      description: 'Create a new layer if it does not exist',
      inputSchema: z.object({
        layerName: z.string().min(1)
      }),
      execute: async input => cadActionExecutor.createLayer(input.layerName)
    }),
    delete_entities: tool({
      description:
        'Delete one or more entities by object id. Use entityIds returned from previous drawing tool calls to remove incorrect geometry before redrawing.',
      inputSchema: z.object({
        entityIds: z.array(z.string().min(1)).min(1)
      }),
      execute: async input => cadActionExecutor.deleteEntities(input)
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
