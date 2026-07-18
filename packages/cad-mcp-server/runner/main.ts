import {
  cadActionExecutor,
  getDrawingContext,
  type Point2dInput,
  type ToolResult
} from '@mlightcad/cad-agent-plugin'
import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

declare global {
  interface Window {
    __cadMcp: {
      ensure: () => Promise<void>
      openDrawing: (fileName: string, base64: string) => Promise<ToolResult>
      getDrawingContext: () => Promise<unknown>
      drawLine: (input: {
        start: Point2dInput
        end: Point2dInput
        layer?: string
      }) => Promise<ToolResult>
      drawCircle: (input: {
        center: Point2dInput
        radius: number
        layer?: string
      }) => Promise<ToolResult>
      drawArc: (input: {
        center: Point2dInput
        radius: number
        startAngleDeg: number
        endAngleDeg: number
        layer?: string
      }) => Promise<ToolResult>
      drawRectangle: (input: {
        corner1: Point2dInput
        corner2: Point2dInput
        layer?: string
      }) => Promise<ToolResult>
      drawPolyline: (input: {
        points: Point2dInput[]
        closed?: boolean
        layer?: string
      }) => Promise<ToolResult>
      drawText: (input: {
        position: Point2dInput
        text: string
        height?: number
        layer?: string
      }) => Promise<ToolResult>
      setCurrentLayer: (layerName: string) => Promise<ToolResult>
      createLayer: (layerName: string) => Promise<ToolResult>
      zoomExtents: () => Promise<ToolResult>
    }
  }
}

let ready = false

async function ensureViewer(): Promise<void> {
  if (ready) {
    return
  }
  const container = document.getElementById('cad-root') as HTMLDivElement
  AcApDocManager.createInstance({
    container,
    width: 1280,
    height: 720,
    autoResize: false,
    baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/',
    useMainThreadDraw: true,
    webworkerFileUrls: {
      dxfParser: './workers/dxf-parser-worker.js',
      dwgParser: './workers/libredwg-parser-worker.js',
      mtextRender: './workers/mtext-renderer-worker.js'
    }
  })
  ready = true
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

window.__cadMcp = {
  ensure: ensureViewer,

  async openDrawing(fileName, base64) {
    await ensureViewer()
    try {
      const buffer = base64ToArrayBuffer(base64)
      const opened = await AcApDocManager.instance.openDocument(
        fileName,
        buffer,
        { mode: AcEdOpenMode.Write, minimumChunkSize: 1000 }
      )
      return opened
        ? { success: true, message: `Opened "${fileName}"` }
        : {
            success: false,
            message: `Failed to open "${fileName}"`,
            error: 'open_failed'
          }
    } catch (error) {
      return {
        success: false,
        message: `Failed to open "${fileName}"`,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  },

  async getDrawingContext() {
    await ensureViewer()
    return getDrawingContext()
  },

  drawLine: async input => {
    await ensureViewer()
    return cadActionExecutor.drawLine(input)
  },
  drawCircle: async input => {
    await ensureViewer()
    return cadActionExecutor.drawCircle(input)
  },
  drawArc: async input => {
    await ensureViewer()
    return cadActionExecutor.drawArc(input)
  },
  drawRectangle: async input => {
    await ensureViewer()
    return cadActionExecutor.drawRectangle(input)
  },
  drawPolyline: async input => {
    await ensureViewer()
    return cadActionExecutor.drawPolyline(input)
  },
  drawText: async input => {
    await ensureViewer()
    return cadActionExecutor.drawText(input)
  },
  setCurrentLayer: async layerName => {
    await ensureViewer()
    return cadActionExecutor.setCurrentLayer(layerName)
  },
  createLayer: async layerName => {
    await ensureViewer()
    return cadActionExecutor.createLayer(layerName)
  },
  zoomExtents: async () => {
    await ensureViewer()
    return cadActionExecutor.zoomExtents()
  }
}
