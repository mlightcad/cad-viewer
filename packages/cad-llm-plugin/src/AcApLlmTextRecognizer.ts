import type {
  AcApTextBatchRecognitionRequest,
  AcApTextRecognitionRequest
} from '@mlightcad/cad-simple-viewer'
import { generateText } from 'ai'

import { acapLlmCreateModel } from './model/AcApLlmModelFactory'
import { acapLlmSkipDataUrlDownload } from './model/skipDataUrlDownload'
import {
  acapLlmLoadConfig,
  acapLlmResolveVisionSettings
} from './storage/AcApLlmConfigStore'

const TEXT_RECOGNITION_SYSTEM_PROMPT = `You read text from images of CAD drawings.

The image shows one line of text drawn as strokes (for example SHX single-line
fonts), dark on white, upright. Reply with exactly the text shown, preserving
case, digits, punctuation, CAD symbols such as Ø ± ° and spaces between words.
Do not explain, translate, quote or add anything else. If nothing is legible,
reply with an empty message.`

const BATCH_TEXT_RECOGNITION_SYSTEM_PROMPT = `You read text from images of CAD drawings.

You get several numbered images. Each shows one line of text drawn as strokes
(for example SHX single-line fonts), dark on white, upright. Read every image
exactly: preserve case, digits, punctuation, CAD symbols such as Ø ± ° and
spaces between words. Do not explain, translate or correct the text.

Reply with only a JSON array of strings, one per image in the given order,
and exactly as many entries as images. Use "" for an image that is not legible.`

/** Most images sent in one recognition request. */
const BATCH_SIZE = 20

/** Most batch requests in flight at once. */
const BATCH_CONCURRENCY = 3

/**
 * Reads several stroke images, {@link BATCH_SIZE} per LLM request, instead of
 * one request per image: the drawing's lines are recognized in a few
 * prompts, which is faster and repeats the instructions less often.
 *
 * Uses the same model as {@link acapLlmRecognizeText}. Returns no text when
 * no vision-capable model is configured. When every request fails, the first
 * error is thrown so the caller can tell the user; images of a failed request
 * among successful ones are returned unread.
 *
 * @param request - Images, locale and abort signal.
 * @returns One entry per image, in order; `undefined` when unread.
 */
export async function acapLlmRecognizeTextBatch(
  request: AcApTextBatchRecognitionRequest
): Promise<Array<string | undefined>> {
  const config = await acapLlmLoadConfig()
  const settings = acapLlmResolveVisionSettings(config)
  const none = request.images.map(() => undefined)
  if (!settings || request.images.length === 0) return none

  const chunks: string[][] = []
  for (let i = 0; i < request.images.length; i += BATCH_SIZE) {
    chunks.push(request.images.slice(i, i + BATCH_SIZE))
  }
  const readChunk = async (images: string[]) => {
    const { text } = await generateText({
      model: acapLlmCreateModel(settings),
      system: BATCH_TEXT_RECOGNITION_SYSTEM_PROMPT,
      abortSignal: request.signal,
      experimental_download: acapLlmSkipDataUrlDownload,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `Read the text in these ${images.length} images.`,
                request.locale ? `UI language: ${request.locale}.` : ''
              ]
                .filter(Boolean)
                .join(' ')
            },
            ...images.flatMap((image, i) => [
              { type: 'text' as const, text: `Image ${i + 1}:` },
              { type: 'image' as const, image }
            ])
          ]
        }
      ]
    })
    return acapLlmParseBatchText(text, images.length)
  }

  const settled: Array<PromiseSettledResult<Array<string | undefined>>> = []
  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    settled.push(
      ...(await Promise.allSettled(
        chunks.slice(i, i + BATCH_CONCURRENCY).map(readChunk)
      ))
    )
  }
  const failed = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )
  if (failed && settled.every(result => result.status === 'rejected')) {
    throw failed.reason
  }
  return settled.flatMap((result, i) =>
    result.status === 'fulfilled'
      ? result.value
      : chunks[i].map(() => undefined)
  )
}

/**
 * Parses a batch answer: the first JSON array in `text` (code fences and
 * surrounding words are ignored), cleaned and aligned to `count` entries.
 *
 * @throws When the answer holds no JSON array of strings.
 */
export function acapLlmParseBatchText(
  text: string,
  count: number
): Array<string | undefined> {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  const parsed: unknown =
    start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : null
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Unexpected text recognition answer: ${text.trim().slice(0, 80)}`
    )
  }
  return Array.from({ length: count }, (_, i) =>
    typeof parsed[i] === 'string'
      ? acapLlmCleanRecognizedText(parsed[i])
      : undefined
  )
}

/**
 * Reads the text in a rendered stroke image with the configured LLM.
 *
 * Uses the active model when it accepts images, otherwise the first
 * vision-capable model of a configured provider (see
 * {@link acapLlmResolveVisionSettings}). Returns `undefined` when there is
 * none, so callers fall back to manual input. Registered as the `cad-llm`
 * recognizer in `AcApTextRecognitionService` by `registerLazyLlmPlugin`.
 *
 * @param request - Image, optional context hint, locale and abort signal.
 * @returns Recognized text, or `undefined`.
 */
export async function acapLlmRecognizeText(
  request: AcApTextRecognitionRequest
): Promise<string | undefined> {
  const config = await acapLlmLoadConfig()
  const settings = acapLlmResolveVisionSettings(config)
  if (!settings) return undefined

  const hints = [
    request.locale ? `UI language: ${request.locale}.` : '',
    request.hint
      ? `The previous line of this drawing read: "${request.hint}".`
      : ''
  ].filter(Boolean)

  const { text } = await generateText({
    model: acapLlmCreateModel(settings),
    system: TEXT_RECOGNITION_SYSTEM_PROMPT,
    abortSignal: request.signal,
    experimental_download: acapLlmSkipDataUrlDownload,
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
  return acapLlmCleanRecognizedText(text)
}

/** Strips wrapping quotes / code fences some models add despite the prompt. */
export function acapLlmCleanRecognizedText(text: string): string | undefined {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```[a-z]*\s*|\s*```$/gi, '').trim()
  if (/^(["'“”‘’`]).*\1$/.test(cleaned) || /^“.*”$/.test(cleaned)) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned || undefined
}
