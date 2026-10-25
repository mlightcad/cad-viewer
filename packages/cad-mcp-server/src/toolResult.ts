import type { ToolResult } from '@mlightcad/cad-agent-core'

/**
 * MCP tool-result content block (text or image).
 */
export type McpContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

/**
 * Converts a cad-agent-core {@link ToolResult} into MCP content blocks.
 *
 * Screenshot data URLs from `cad.view.capturePreview` become image parts;
 * the JSON summary omits bulky data URLs.
 */
export function toolResultToMcpContent(result: ToolResult): {
  content: McpContentBlock[]
  isError?: boolean
} {
  const { images, ...summary } = result
  const content: McpContentBlock[] = [
    {
      type: 'text',
      text: JSON.stringify({
        ...summary,
        ...(images?.length
          ? {
              imageCount: images.length,
              note: 'Screenshot(s) attached as image parts for visual review.'
            }
          : {})
      })
    }
  ]

  if (images?.length) {
    for (const image of images) {
      const data = image.dataUrl.includes(',')
        ? image.dataUrl.slice(image.dataUrl.indexOf(',') + 1)
        : image.dataUrl
      content.push({
        type: 'image',
        data,
        mimeType: image.mediaType || 'image/png'
      })
    }
  }

  return {
    content,
    ...(result.success ? {} : { isError: true })
  }
}
