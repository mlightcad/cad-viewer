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
  '[System note: an image is attached. If it clearly shows a sheet border / ' +
  'title block (图框) and the user has not yet said whether to include it, reply ' +
  'with ONE short question only (e.g. also redraw the border and title block?) ' +
  'and do NOT call execute_cad_script or cad.redraw.draw in this turn — do not ' +
  'silently omit the frame. After they answer, or if they already stated a ' +
  'preference / the image has no frame: build a cad.redraw spec and run ' +
  'validate → draw → inspect → cad.redraw.compare inside execute_cad_script — ' +
  'not hand-placed tx.draw* calls. Every redraw spec needs a calibration that ' +
  'maps image pixels to CAD (even when entities use CAD coordinates) so compare ' +
  'can register the reference; finish only after redrawCompare is in the tool ' +
  'result, and report its verdict with the status. Pick the profile from the ' +
  'image (general for a dimensioned drawing, visual-trace for sketches or ' +
  'pictures without readable sizes). Ignore this note if the user is only asking ' +
  'a question about the image.]'

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

/** True when a message already started CAD tools (redraw in progress or done). */
function hasToolActivity(message: ModelMessage): boolean {
  if (message.role === 'tool') return true
  if (message.role !== 'assistant' || !Array.isArray(message.content)) {
    return false
  }
  return message.content.some(part => part.type === 'tool-call')
}

/**
 * Whether the latest user turn should receive {@link IMAGE_REDRAW_HINT}.
 *
 * Besides an image on that turn, also hint after a text-only FRAME GATE reply
 * while a prior image is still in context and no tools have run yet.
 */
function shouldAppendRedrawHint(
  messages: ModelMessage[],
  lastUser: number
): boolean {
  if (hasImage(messages[lastUser])) return true

  let imageUser = -1
  for (let index = lastUser - 1; index >= 0; index--) {
    if (hasImage(messages[index])) {
      imageUser = index
      break
    }
  }
  if (imageUser < 0) return false

  for (let index = imageUser + 1; index < lastUser; index++) {
    if (hasToolActivity(messages[index])) return false
  }
  return true
}

/**
 * Appends {@link IMAGE_REDRAW_HINT} to the latest user message when that
 * message includes an image, or when it answers a pending FRAME GATE question
 * for an earlier image that has not yet started drawing. Earlier turns are
 * left untouched so the hint is not repeated for every historical attachment.
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
  if (lastUser < 0 || !shouldAppendRedrawHint(messages, lastUser)) {
    return messages
  }
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
