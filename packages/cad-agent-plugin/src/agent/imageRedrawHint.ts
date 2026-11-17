import type { ModelMessage } from 'ai'

/**
 * Reminder appended to the latest user turn when it carries an image.
 *
 * The system prompt already routes image drawing to `cad.redraw`, but models
 * tend to fall back to hand-placed `tx.draw*` calls once the prompt is long.
 * Repeating the rule next to the image, where the model reads it last, makes
 * the routing reliable without changing what the user sees in the chat.
 */
export const IMAGE_REDRAW_HINT =
  '[System note: an image is attached. If this message asks you to draw, redraw, ' +
  'reproduce, or convert it into a drawing (in any language), build a cad.redraw ' +
  'spec and draw it with cad.redraw.draw inside execute_cad_script — not with ' +
  'hand-placed tx.draw* calls. Pick the profile from the image (general for a ' +
  'dimensioned drawing, visual-trace for sketches or pictures without readable ' +
  'sizes) and report the returned status. Ignore this note if the user is only ' +
  'asking a question about the image.]'

function hasImage(message: ModelMessage): boolean {
  if (message.role !== 'user' || !Array.isArray(message.content)) return false
  return message.content.some(
    part =>
      part.type === 'image' ||
      (part.type === 'file' &&
        typeof part.mediaType === 'string' &&
        part.mediaType.startsWith('image/'))
  )
}

/**
 * Appends {@link IMAGE_REDRAW_HINT} to the latest user message when that
 * message includes an image. Earlier turns are left untouched so the hint is
 * not repeated for every historical attachment.
 *
 * @param messages - Model messages about to be sent.
 * @returns A new array; the input is not mutated.
 */
export function appendImageRedrawHint(
  messages: ModelMessage[]
): ModelMessage[] {
  let lastUser = -1
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === 'user') {
      lastUser = index
      break
    }
  }
  if (lastUser < 0 || !hasImage(messages[lastUser])) return messages
  const target = messages[lastUser] as Extract<ModelMessage, { role: 'user' }>
  const content = Array.isArray(target.content) ? target.content : []
  const updated: ModelMessage = {
    ...target,
    content: [...content, { type: 'text', text: IMAGE_REDRAW_HINT }]
  }
  return messages.map((message, index) =>
    index === lastUser ? updated : message
  )
}
