import { generateObject } from 'ai'
import { z } from 'zod'

import type { LlmSettings } from '../storage/LlmSettingsStore'
import { createModelFromSettings } from './createModel'

/** Maximum number of screenshot verification rounds per user message. */
export const MAX_VERIFICATION_ATTEMPTS = 8

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

Tool limitations — NEVER fail a drawing for any of these, they are impossible with the available tools:
- The tools can only draw solid, continuous lines. They cannot produce dashed, dotted, or "hidden" line styles. Treat every edge as solid; do not ask for hidden or dashed lines.
- The tools cannot create dimensions, dimension lines, extension lines, arrows, or tolerance/GD&T symbols. Ignore these entirely.
- Ignore missing annotations, labels, hatching styles, or line weights unless the user explicitly asked for text entities.

Memory and progress:
- You may be shown the issues you reported in previous rounds and the previous screenshot (before the latest edits). Use them to judge PROGRESS.
- Confirm whether each previously reported issue is now resolved. Do NOT re-raise an issue that has already been fixed.
- Do NOT introduce new nitpicks each round to keep failing the drawing. Only report issues that genuinely remain and are fixable with the tools above.
- If the only remaining differences are unfixable (line style, dimensions, cosmetic) or the drawing already captures the requested geometry and layout, set passed = true.

Verdict:
- Pass when the drawing reasonably captures the requested shape, features, and layout.
- Fail only when important geometry is missing, wrong, or clearly misaligned AND it can be fixed with solid-line drawing tools.
- In feedback, list only the concrete remaining issues and the specific fix for each. Keep it short.`

export type DrawingVerificationResult = z.infer<typeof verificationSchema>

/**
 * Prior-round context that gives the verifier memory across verification rounds.
 */
export interface VerificationHistory {
  /** Feedback strings reported in previous rounds, oldest first. */
  previousFeedback: string[]
  /** Screenshot data URL from before the latest round of edits, if available. */
  previousDrawingImage?: string
}

/**
 * Sends the current drawing screenshot to the LLM for visual verification.
 *
 * @param settings - LLM provider configuration (must support vision).
 * @param userRequest - Original user drawing request text.
 * @param referenceImages - User-attached reference image data URLs, if any.
 * @param drawingImage - PNG data URL of the current drawing.
 * @param history - Previous rounds' feedback and screenshot for progress-aware review.
 */
export async function verifyDrawing(
  settings: LlmSettings,
  userRequest: string,
  referenceImages: string[],
  drawingImage: string,
  history?: VerificationHistory,
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

  if (history && history.previousFeedback.length > 0) {
    userContent.push({
      type: 'text',
      text:
        'Issues you reported in previous rounds (oldest first). Check whether each is now resolved and do not re-raise fixed or unfixable ones:\n' +
        history.previousFeedback
          .map((f, i) => `Round ${i + 1}: ${f.trim()}`)
          .join('\n')
    })
  }

  if (history?.previousDrawingImage) {
    userContent.push({
      type: 'text',
      text: 'Previous drawing screenshot (before the latest edits), for comparing progress:'
    })
    userContent.push({ type: 'image', image: history.previousDrawingImage })
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
    `Drawing verification (attempt ${attempt}/${maxAttempts}) found remaining issues:`,
    feedback.trim(),
    'Fix ONLY these issues. Do not delete or redraw geometry that is already correct — modify or add just what is needed, using the entityIds you recorded. The tools draw solid continuous lines only, so do not attempt hidden, dashed, or dimension lines.'
  ]
    .filter(Boolean)
    .join('\n\n')
}
