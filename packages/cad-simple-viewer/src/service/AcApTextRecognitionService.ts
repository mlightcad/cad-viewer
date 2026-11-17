import { AcCmEventManager } from '@mlightcad/data-model'

/** Payload for {@link AcApTextRecognitionService.events.changed}. */
export interface AcApTextRecognitionChangedEventArgs {
  /** Id that was registered or unregistered. */
  id: string
  /** Whether the recognizer was added (`register`) or removed. */
  type: 'register' | 'unregister'
}

/**
 * Request passed to an {@link AcApTextRecognizer}.
 */
export interface AcApTextRecognitionRequest {
  /** PNG data URL of the strokes to read: dark ink, white background, upright. */
  image: string
  /** Optional context, e.g. the text recognized for a neighboring line. */
  hint?: string
  /** UI locale, so the recognizer can bias toward the user's language. */
  locale?: string
  /** Cancels the request when the user stops the command. */
  signal?: AbortSignal
}

/**
 * Request passed to {@link AcApTextRecognizer.recognizeBatch}: several images
 * read in one go.
 */
export interface AcApTextBatchRecognitionRequest {
  /** PNG data URLs, one text line each: dark ink, white background, upright. */
  images: string[]
  /** UI locale, so the recognizer can bias toward the user's language. */
  locale?: string
  /** Cancels the request when the user stops the command. */
  signal?: AbortSignal
}

/** Most single-image requests in flight when a recognizer has no batch mode. */
const SINGLE_IMAGE_CONCURRENCY = 4

/**
 * Options of {@link AcApTextRecognitionService.recognize} and
 * {@link AcApTextRecognitionService.recognizeBatch}.
 */
export interface AcApTextRecognitionOptions {
  /**
   * Called for each recognizer that throws (bad API key, network error,
   * quota, ...), so the caller can tell the user why no suggestion came.
   * Not called for requests cancelled through the request `signal`.
   *
   * @param error - The thrown error.
   * @param recognizerId - Id of the recognizer that failed.
   */
  onError?: (error: unknown, recognizerId: string) => void
  /**
   * When set, only this recognizer is used (no fall-through to others).
   * Typical for PDF import when the user picks one OCR provider.
   */
  recognizerId?: string
}

/**
 * Keyword shown in command-line prompts (e.g. `-pdfimport` Text option).
 * Same shape as jig keyword objects: `global` stays English.
 */
export interface AcApTextRecognizerKeyword {
  display: string
  local: string
  global: string
}

/** Snapshot of a recognizer that is registered and currently usable. */
export interface AcApTextRecognizerInfo {
  id: string
  label: string
  keyword?: AcApTextRecognizerKeyword
}

/**
 * Optical text recognizer (local OCR engine, vision LLM, …).
 *
 * Implementations return `undefined` when they cannot help (not configured,
 * no vision model, request failed) so callers fall back to manual input.
 */
export interface AcApTextRecognizer {
  /** Unique id, e.g. `'cad-llm'` or `'paddleocr'`. */
  id: string
  /**
   * Localized label for UI (PDF import dialog, prompts). Plain string or a
   * getter so locale changes are picked up.
   */
  label: string | (() => string)
  /**
   * Optional command-line keyword when the user picks this provider.
   * When omitted, {@link id} is used as `global` / `local`.
   */
  keyword?: AcApTextRecognizerKeyword | (() => AcApTextRecognizerKeyword)
  /**
   * Whether this recognizer can run now (for example a vision LLM is
   * configured). When omitted, the recognizer is treated as available.
   * Unavailable providers are hidden from the PDF import OCR list.
   */
  isAvailable?: () => boolean | Promise<boolean>
  /**
   * When `false`, skipped by {@link AcApTextRecognitionService.recognize} /
   * {@link AcApTextRecognitionService.recognizeBatch} unless the caller
   * passes this recognizer's id. Use for picker-only options (e.g. one entry
   * per LLM provider) while a separate auto fallback stays in the chain.
   * Default `true`.
   */
  auto?: boolean
  /**
   * Optional hook run at the start of
   * {@link AcApTextRecognitionService.listAvailable} so a package can refresh
   * dynamic options (e.g. re-register one recognizer per LLM provider).
   */
  refresh?: () => void | Promise<void>
  /**
   * Reads the text shown in the image.
   *
   * @returns Recognized text, or `undefined` when unavailable.
   */
  recognize(request: AcApTextRecognitionRequest): Promise<string | undefined>
  /**
   * Optional: reads several images in as few requests as possible (for an
   * LLM, one prompt instead of one per image, which is faster and spends
   * fewer tokens).
   *
   * @returns One entry per image, in order; `undefined` or empty for images
   * it could not read.
   */
  recognizeBatch?(
    request: AcApTextBatchRecognitionRequest
  ): Promise<Array<string | undefined>>
}

/**
 * Registry of optional text recognizers.
 *
 * Lets features that need OCR (for example PDF text recovery) use whatever
 * recognizer the host installed, without depending on the package that
 * provides it.
 */
export class AcApTextRecognitionService {
  private static readonly recognizers = new Map<string, AcApTextRecognizer>()

  /**
   * Fired when a recognizer is registered or unregistered so hosts can refresh
   * OCR pickers (ribbon Recover Text, PDF import dialog, …).
   */
  static readonly events = {
    changed: new AcCmEventManager<AcApTextRecognitionChangedEventArgs>()
  }

  /**
   * Registers (or replaces) a recognizer.
   *
   * @returns A function that unregisters it.
   */
  static register(recognizer: AcApTextRecognizer): () => void {
    this.recognizers.set(recognizer.id, recognizer)
    this.events.changed.dispatch({ id: recognizer.id, type: 'register' })
    return () => {
      if (this.recognizers.get(recognizer.id) === recognizer) {
        this.recognizers.delete(recognizer.id)
        this.events.changed.dispatch({
          id: recognizer.id,
          type: 'unregister'
        })
      }
    }
  }

  /** Removes the recognizer with `id`. */
  static unregister(id: string): void {
    if (!this.recognizers.delete(id)) return
    this.events.changed.dispatch({ id, type: 'unregister' })
  }

  /** True when at least one recognizer is registered. */
  static get hasRecognizer(): boolean {
    return this.recognizers.size > 0
  }

  /** True when a recognizer with `id` is registered. */
  static has(id: string): boolean {
    return this.recognizers.has(id)
  }

  /**
   * Registered recognizers that report {@link AcApTextRecognizer.isAvailable}
   * (or omit it), in registration order. Used to build the PDF import OCR
   * list — unavailable providers are omitted entirely.
   *
   * Runs every recognizer's {@link AcApTextRecognizer.refresh} first so
   * dynamic sets (one entry per LLM provider) stay in sync with settings.
   */
  static async listAvailable(): Promise<AcApTextRecognizerInfo[]> {
    for (const recognizer of [...this.recognizers.values()]) {
      try {
        await recognizer.refresh?.()
      } catch {
        // A failed refresh must not break the picker.
      }
    }
    const result: AcApTextRecognizerInfo[] = []
    for (const recognizer of this.recognizers.values()) {
      if (!(await isRecognizerAvailable(recognizer))) continue
      const keyword = resolveKeyword(recognizer)
      result.push({
        id: recognizer.id,
        label: resolveLabel(recognizer),
        ...(keyword ? { keyword } : {})
      })
    }
    return result
  }

  /**
   * Asks registered recognizers in registration order and returns the first
   * non-empty answer. When {@link AcApTextRecognitionOptions.recognizerId} is
   * set, only that recognizer is tried. Errors never break the command: they
   * go to `options.onError` and the next recognizer is tried (unless a single
   * id was requested).
   *
   * @param request - Image and context to recognize.
   * @param options - Error callback and optional recognizer filter.
   */
  static async recognize(
    request: AcApTextRecognitionRequest,
    options: AcApTextRecognitionOptions = {}
  ): Promise<string | undefined> {
    for (const recognizer of this.selected(options.recognizerId)) {
      if (request.signal?.aborted) return undefined
      try {
        const text = (await recognizer.recognize(request))?.trim()
        if (text) return text
      } catch (error) {
        // Fall through to the next recognizer or to manual input.
        if (!request.signal?.aborted) options.onError?.(error, recognizer.id)
      }
    }
    return undefined
  }

  /**
   * Reads several images at once. Each selected recognizer in registration
   * order gets the images still unread: in one
   * {@link AcApTextRecognizer.recognizeBatch} call when it has one, otherwise
   * as parallel single-image requests. When
   * {@link AcApTextRecognitionOptions.recognizerId} is set, only that
   * recognizer runs. Errors never break the command: they go to
   * `options.onError` and the affected images stay unread.
   *
   * @param request - Images and context to recognize.
   * @param options - Error callback and optional recognizer filter.
   * @returns One entry per image, in order; `undefined` when unread.
   */
  static async recognizeBatch(
    request: AcApTextBatchRecognitionRequest,
    options: AcApTextRecognitionOptions = {}
  ): Promise<Array<string | undefined>> {
    const results: Array<string | undefined> = request.images.map(
      () => undefined
    )
    const report = (error: unknown, id: string) => {
      if (!request.signal?.aborted) options.onError?.(error, id)
    }
    for (const recognizer of this.selected(options.recognizerId)) {
      const pending = results
        .map((text, index) => (text ? -1 : index))
        .filter(index => index >= 0)
      if (pending.length === 0 || request.signal?.aborted) break
      const images = pending.map(index => request.images[index])
      let texts: Array<string | undefined>
      if (recognizer.recognizeBatch) {
        try {
          texts = await recognizer.recognizeBatch({ ...request, images })
        } catch (error) {
          report(error, recognizer.id)
          continue
        }
      } else {
        texts = await mapLimited(images, SINGLE_IMAGE_CONCURRENCY, image =>
          recognizer
            .recognize({
              image,
              locale: request.locale,
              signal: request.signal
            })
            .catch(error => {
              report(error, recognizer.id)
              return undefined
            })
        )
      }
      pending.forEach((index, i) => {
        const text = texts[i]?.trim()
        if (text) results[index] = text
      })
    }
    return results
  }

  private static selected(
    recognizerId: string | undefined
  ): AcApTextRecognizer[] {
    if (recognizerId) {
      const one = this.recognizers.get(recognizerId)
      return one ? [one] : []
    }
    // Picker-only entries (`auto: false`) stay out of the default chain.
    return [...this.recognizers.values()].filter(
      recognizer => recognizer.auto !== false
    )
  }
}

async function isRecognizerAvailable(
  recognizer: AcApTextRecognizer
): Promise<boolean> {
  if (!recognizer.isAvailable) return true
  try {
    return !!(await recognizer.isAvailable())
  } catch {
    return false
  }
}

function resolveLabel(recognizer: AcApTextRecognizer): string {
  return typeof recognizer.label === 'function'
    ? recognizer.label()
    : recognizer.label
}

function resolveKeyword(
  recognizer: AcApTextRecognizer
): AcApTextRecognizerKeyword | undefined {
  if (!recognizer.keyword) return undefined
  return typeof recognizer.keyword === 'function'
    ? recognizer.keyword()
    : recognizer.keyword
}

/** Maps `items` with at most `limit` calls of `fn` running at a time. */
async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}
