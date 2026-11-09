import type { AcApTextRecognitionRequest } from '@mlightcad/cad-simple-viewer'
import { generateText } from 'ai'

import {
  activeModelSupportsVision,
  loadLlmConfig,
  resolveActiveSettings
} from '../storage/LlmSettingsStore'
import { createModelFromSettings } from './createModel'
import { skipDataUrlDownload } from './skipDataUrlDownload'

const TEXT_RECOGNITION_SYSTEM_PROMPT = `You read text from images of CAD drawings.

The image shows one line of text drawn as strokes (for example SHX single-line
fonts), dark on white, upright. Reply with exactly the text shown, preserving
case, digits, punctuation, CAD symbols such as Ø ± ° and spaces between words.
Do not explain, translate, quote or add anything else. If nothing is legible,
reply with an empty message.`

/**
 * Reads the text in a rendered stroke image with the configured LLM.
 *
 * Returns `undefined` when no API key is configured or the active model does
 * not accept images, so callers fall back to manual input. Registered as the
 * `cad-agent` recognizer in `AcApTextRecognitionService` by
 * `registerLazyAgentPlugin`.
 *
 * @param request - Image, optional context hint, locale and abort signal.
 * @returns Recognized text, or `undefined`.
 */
export async function acapAgentRecognizeText(
  request: AcApTextRecognitionRequest
): Promise<string | undefined> {
  const config = await loadLlmConfig()
  const settings = resolveActiveSettings(config)
  if (!settings.apiKey.trim() || !activeModelSupportsVision(config)) {
    return undefined
  }

  const hints = [
    request.locale ? `UI language: ${request.locale}.` : '',
    request.hint
      ? `The previous line of this drawing read: "${request.hint}".`
      : ''
  ].filter(Boolean)

  const { text } = await generateText({
    model: createModelFromSettings(settings),
    system: TEXT_RECOGNITION_SYSTEM_PROMPT,
    abortSignal: request.signal,
    experimental_download: skipDataUrlDownload,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: ['Read the text in this image.', ...hints].join(' ')
          },
          { type: 'image', image: request.image }
        ]
      }
    ]
  })
  return cleanRecognizedText(text)
}

/** Strips wrapping quotes / code fences some models add despite the prompt. */
export function cleanRecognizedText(text: string): string | undefined {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```[a-z]*\s*|\s*```$/gi, '').trim()
  if (/^(["'“”‘’`]).*\1$/.test(cleaned) || /^“.*”$/.test(cleaned)) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned || undefined
}
