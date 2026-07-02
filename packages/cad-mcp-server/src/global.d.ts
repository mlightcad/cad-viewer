import type { ToolResult } from './browserSession'

interface Point2dInput {
  x: number
  y: number
}

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

export {}
