import {
  createCadToolCatalog,
  type ToolResult
} from '@mlightcad/cad-agent-core'
import { tool } from 'ai'

/**
 * Strips bulky image payloads from a tool result before JSON text for the model.
 */
function toolResultWithoutImages(result: ToolResult): Omit<ToolResult, 'images'> {
  const { images: _images, ...rest } = result
  return rest
}

/**
 * Converts a CAD tool result into AI SDK multimodal tool-result output.
 *
 * Screenshots from `cad.view.capturePreview` are sent as `media` parts so the
 * model can see them; the JSON summary omits data URLs.
 */
function toCadToolModelOutput(output: unknown) {
  const result = output as ToolResult
  if (!result || typeof result !== 'object') {
    return { type: 'json' as const, value: output as never }
  }

  if (!result.images?.length) {
    return { type: 'json' as const, value: result as never }
  }

  const summary = toolResultWithoutImages(result)
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'media'; data: string; mediaType: string }
  > = [
    {
      type: 'text',
      text: JSON.stringify({
        ...summary,
        imageCount: result.images.length,
        note: 'Screenshot(s) attached as media parts for visual review.'
      })
    }
  ]

  for (const image of result.images) {
    const data = image.dataUrl.includes(',')
      ? image.dataUrl.slice(image.dataUrl.indexOf(',') + 1)
      : image.dataUrl
    content.push({
      type: 'media',
      data,
      mediaType: image.mediaType || 'image/png'
    })
  }

  return { type: 'content' as const, value: content }
}

/**
 * Creates the tool set exposed to the CAD agent LLM.
 *
 * Schemas and execution live in `@mlightcad/cad-agent-core`. This adapter only
 * maps that catalog onto the AI SDK tool format and forwards screenshots via
 * {@link tool}'s `toModelOutput`.
 *
 * @returns AI SDK tool definitions keyed by tool name.
 */
export function createCadTools() {
  return Object.fromEntries(
    createCadToolCatalog().map(entry => [
      entry.name,
      tool({
        description: entry.description,
        inputSchema: entry.inputSchema,
        execute: async (input: unknown) => entry.execute(input),
        toModelOutput: toCadToolModelOutput
      })
    ])
  )
}

/** Inferred tool map type returned by {@link createCadTools}. */
export type CadTools = ReturnType<typeof createCadTools>
