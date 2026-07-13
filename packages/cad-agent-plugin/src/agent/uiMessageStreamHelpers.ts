import { generateId, type InferUIMessageChunk, type UIMessage } from 'ai'

export type UIMessageChunkWriter = (
  chunk: InferUIMessageChunk<UIMessage>
) => void

/** Appends a text part to the current assistant message in the active stream. */
export function appendAssistantText(
  write: UIMessageChunkWriter,
  text: string,
  partId = generateId()
) {
  write({ type: 'text-start', id: partId })
  write({ type: 'text-delta', id: partId, delta: text })
  write({ type: 'text-end', id: partId })
}

/** Appends an image file part to the current assistant message in the active stream. */
export function appendAssistantImage(
  write: UIMessageChunkWriter,
  dataUrl: string,
  mediaType = 'image/png'
) {
  write({ type: 'file', mediaType, url: dataUrl })
}

/**
 * Appends a verification review block (text, reference images, drawing screenshot)
 * to the current assistant message so it appears in the chat history.
 */
export function appendVerificationReview(
  write: UIMessageChunkWriter,
  options: {
    title: string
    attempt: number
    maxAttempts: number
    statusText: string
    referenceImages: string[]
    referenceLabel: string
    drawingLabel: string
    drawingDataUrl?: string
  }
) {
  appendAssistantText(
    write,
    `\n\n--- ${options.title} (${options.attempt}/${options.maxAttempts}) ---\n${options.statusText}`
  )

  if (options.referenceImages.length > 0) {
    appendAssistantText(write, `\n${options.referenceLabel}:`)
    for (const imageUrl of options.referenceImages) {
      appendAssistantImage(write, imageUrl)
    }
  }

  if (options.drawingDataUrl) {
    appendAssistantText(write, `\n${options.drawingLabel}:`)
    appendAssistantImage(write, options.drawingDataUrl)
  }
}
