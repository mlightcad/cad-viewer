import { generateObject } from 'ai'
import { z } from 'zod'

import type { LlmSettings } from '../storage/LlmSettingsStore'
import { createModelFromSettings } from './createModel'

/** Maximum number of screenshot verification rounds per user message. */
export const MAX_VERIFICATION_ATTEMPTS = 5

const verificationSchema = z.object({
  passed: z
    .boolean()
    .describe(
      'True when the current drawing satisfactorily matches the user request and reference images.'
    ),
  feedback: z
    .string()
    .describe(
      'When passed is false, concise issues and concrete fixes. Empty when passed is true.'
    )
})

const VERIFICATION_SYSTEM_PROMPT = `You verify CAD drawings produced by an automated drawing assistant.

Compare the current drawing screenshot against the user's request and any reference images.
Focus on overall geometry, topology, proportions, and layout — not exact pixel alignment.

Rules:
- Ignore dimensions, dimension lines, and dimension text in reference images. The drawing tools cannot create dimensions, so do not require them in the output drawing.
- Ignore missing annotations or labels unless the user explicitly asked for text entities.
- Pass when the drawing reasonably captures the requested shape and layout.
- Fail only when important geometry is missing, wrong, or clearly misaligned.`

export type DrawingVerificationResult = z.infer<typeof verificationSchema>

/**
 * Sends the current drawing screenshot to the LLM for visual verification.
 *
 * @param settings - LLM provider configuration (must support vision).
 * @param userRequest - Original user drawing request text.
 * @param referenceImages - User-attached reference image data URLs, if any.
 * @param drawingImage - PNG data URL of the current drawing.
 */
export async function verifyDrawing(
  settings: LlmSettings,
  userRequest: string,
  referenceImages: string[],
  drawingImage: string,
  abortSignal?: AbortSignal
): Promise<DrawingVerificationResult> {
  const model = createModelFromSettings(settings)
  const userContent: Array<
    { type: 'text'; text: string } | { type: 'image'; image: string }
  > = [
    {
      type: 'text',
      text: `User request:\n${userRequest || '(no text request)'}`
    }
  ]

  if (referenceImages.length > 0) {
    userContent.push({
      type: 'text',
      text: 'Reference image(s) supplied by the user:'
    })
    for (const image of referenceImages) {
      userContent.push({ type: 'image', image })
    }
  }

  userContent.push({
    type: 'text',
    text: 'Current drawing screenshot to verify:'
  })
  userContent.push({ type: 'image', image: drawingImage })

  const { object } = await generateObject({
    model,
    system: VERIFICATION_SYSTEM_PROMPT,
    schema: verificationSchema,
    abortSignal,
    messages: [
      {
        role: 'user',
        content: userContent
      }
    ]
  })

  return object
}

/** Builds the follow-up user message when verification fails. */
export function buildVerificationFeedbackMessage(
  attempt: number,
  maxAttempts: number,
  feedback: string
): string {
  return [
    `Drawing verification failed (attempt ${attempt}/${maxAttempts}).`,
    feedback.trim(),
    'Please update the drawing to address these issues.'
  ]
    .filter(Boolean)
    .join('\n\n')
}
