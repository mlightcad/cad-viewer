import type { ModelMessage } from 'ai'

/**
 * Splits a data URL into media type and raw base64 payload.
 *
 * @returns `null` when the string is not a well-formed data URL.
 */
function splitDataUrl(dataUrl: string): {
  mediaType: string | undefined
  data: string
} | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0 || !dataUrl.startsWith('data:')) return null
  const header = dataUrl.slice(0, comma)
  const data = dataUrl.slice(comma + 1)
  if (!data) return null
  const mediaType = header.slice('data:'.length).split(';')[0] || undefined
  return { mediaType, data }
}

/**
 * Rewrites file/image parts that still carry `data:...;base64,...` strings into
 * raw base64 + mediaType so AI SDK `downloadAssets` does not treat them as
 * remote URLs (and so providers do not double-wrap the data URL prefix).
 */
export function normalizeInlineFileData(
  messages: ModelMessage[]
): ModelMessage[] {
  return messages.map(message => {
    if (
      (message.role !== 'user' && message.role !== 'assistant') ||
      !Array.isArray(message.content)
    ) {
      return message
    }

    const content = message.content.map(part => {
      if (part.type === 'file' && typeof part.data === 'string') {
        const split = splitDataUrl(part.data)
        if (!split) return part
        return {
          ...part,
          data: split.data,
          mediaType: split.mediaType || part.mediaType
        }
      }

      if (part.type === 'image' && typeof part.image === 'string') {
        const split = splitDataUrl(part.image)
        if (!split) return part
        return {
          ...part,
          image: split.data,
          mediaType: split.mediaType || part.mediaType
        }
      }

      return part
    })

    return { ...message, content } as ModelMessage
  })
}
