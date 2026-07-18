#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { CadBrowserSession } from './browserSession.js'

const session = new CadBrowserSession()

const server = new McpServer({
  name: 'cad-mcp-server',
  version: '1.5.7'
})

const pointSchema = z.object({ x: z.number(), y: z.number() })

function jsonResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] }
}

// The `registerTool` overload's InputArgs/OutputArgs conditional generics hit
// TypeScript's type-instantiation depth limit (TS2589) on some of these calls
// under @modelcontextprotocol/sdk 1.29 + zod 3.25 + TS 5.9, independent of
// schema complexity (even the empty-schema tool below can trip it). Runtime
// behavior is unaffected; suppress until upstream resolves the generic depth.
// @ts-expect-error TS2589: excessive type instantiation depth (SDK generics)
server.registerTool(
  'open_drawing',
  {
    description:
      'Open a DXF or DWG file from a local path into the active CAD session',
    inputSchema: {
      filePath: z.string().min(1)
    }
  },
  async ({ filePath }) => {
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath
    const result = await session.openDrawing(fileName, filePath)
    return jsonResult(result)
  }
)

server.registerTool(
  'get_drawing_context',
  {
    description: 'Get current drawing context: units, layers, and extents',
    inputSchema: {}
  },
  async () => jsonResult(await session.getDrawingContext())
)

// @ts-expect-error TS2589: excessive type instantiation depth (SDK generics)
server.registerTool(
  'draw_line',
  {
    description: 'Draw a straight line segment in model space',
    inputSchema: {
      start: pointSchema,
      end: pointSchema,
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawLine(input))
)

server.registerTool(
  'draw_circle',
  {
    description: 'Draw a circle by center and radius',
    inputSchema: {
      center: pointSchema,
      radius: z.number().positive(),
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawCircle(input))
)

server.registerTool(
  'draw_arc',
  {
    description: 'Draw an arc by center, radius, and start/end angles in degrees',
    inputSchema: {
      center: pointSchema,
      radius: z.number().positive(),
      startAngleDeg: z.number(),
      endAngleDeg: z.number(),
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawArc(input))
)

server.registerTool(
  'draw_rectangle',
  {
    description: 'Draw a rectangle from two opposite corners',
    inputSchema: {
      corner1: pointSchema,
      corner2: pointSchema,
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawRectangle(input))
)

// @ts-expect-error TS2589: excessive type instantiation depth (SDK generics)
server.registerTool(
  'draw_polyline',
  {
    description: 'Draw a polyline through a list of points',
    inputSchema: {
      points: z.array(pointSchema).min(2),
      closed: z.boolean().optional(),
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawPolyline(input))
)

// @ts-expect-error TS2589: excessive type instantiation depth (SDK generics)
server.registerTool(
  'draw_text',
  {
    description: 'Draw single-line MTEXT at a position',
    inputSchema: {
      position: pointSchema,
      text: z.string().min(1),
      height: z.number().positive().optional(),
      layer: z.string().optional()
    }
  },
  async input => jsonResult(await session.drawText(input))
)

server.registerTool(
  'set_current_layer',
  {
    description: 'Set the current drawing layer (CLAYER)',
    inputSchema: {
      layerName: z.string().min(1)
    }
  },
  async ({ layerName }) => jsonResult(await session.setCurrentLayer(layerName))
)

server.registerTool(
  'create_layer',
  {
    description: 'Create a new layer if it does not exist',
    inputSchema: {
      layerName: z.string().min(1)
    }
  },
  async ({ layerName }) => jsonResult(await session.createLayer(layerName))
)

server.registerTool(
  'zoom_extents',
  {
    description: 'Zoom the view to show the full drawing extents',
    inputSchema: {}
  },
  async () => jsonResult(await session.zoomExtents())
)

async function shutdown() {
  await session.stop()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

const transport = new StdioServerTransport()
await server.connect(transport)
