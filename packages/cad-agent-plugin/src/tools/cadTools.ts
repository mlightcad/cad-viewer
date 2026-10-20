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
 * AI SDK `ModelMessage` JSON tool outputs reject `undefined` fields. Tool
 * results often omit optionals as `undefined` (e.g. `entityIds`, `images`);
 * round-tripping through JSON drops those keys so the next chat turn can
 * pass `convertToModelMessages` / prompt validation.
 */
function toJsonToolValue(value: unknown): unknown {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
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
    return { type: 'json' as const, value: toJsonToolValue(output) as never }
  }

  if (!result.images?.length) {
    return {
      type: 'json' as const,
      value: toJsonToolValue(toolResultWithoutImages(result)) as never
    }
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
