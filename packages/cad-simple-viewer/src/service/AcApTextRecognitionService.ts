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
}

/**
 * Optical text recognizer, typically backed by a vision-capable LLM.
 *
 * Implementations return `undefined` when they cannot help (not configured,
 * no vision model, request failed) so callers fall back to manual input.
 */
export interface AcApTextRecognizer {
  /** Unique id, e.g. `'cad-agent'`. */
  id: string
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
   * Registers (or replaces) a recognizer.
   *
   * @returns A function that unregisters it.
   */
  static register(recognizer: AcApTextRecognizer): () => void {
    this.recognizers.set(recognizer.id, recognizer)
    return () => {
      if (this.recognizers.get(recognizer.id) === recognizer) {
        this.recognizers.delete(recognizer.id)
      }
    }
  }

  /** Removes the recognizer with `id`. */
  static unregister(id: string): void {
    this.recognizers.delete(id)
  }

  /** True when at least one recognizer is registered. */
  static get hasRecognizer(): boolean {
    return this.recognizers.size > 0
  }

  /**
   * Asks registered recognizers in registration order and returns the first
   * non-empty answer. Errors never break the command: they go to
   * `options.onError` and the next recognizer is tried.
   *
   * @param request - Image and context to recognize.
   * @param options - Error callback.
   */
  static async recognize(
    request: AcApTextRecognitionRequest,
    options: AcApTextRecognitionOptions = {}
  ): Promise<string | undefined> {
    for (const recognizer of this.recognizers.values()) {
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
   * Reads several images at once. Each recognizer in registration order gets
   * the images still unread: in one {@link AcApTextRecognizer.recognizeBatch}
   * call when it has one, otherwise as parallel single-image requests.
   * Errors never break the command: they go to `options.onError` and the
   * affected images stay unread.
   *
   * @param request - Images and context to recognize.
   * @param options - Error callback.
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
    for (const recognizer of this.recognizers.values()) {
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
