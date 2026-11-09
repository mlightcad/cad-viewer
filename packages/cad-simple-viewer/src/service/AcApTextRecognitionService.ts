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
   * non-empty answer. Errors are swallowed so OCR never breaks a command.
   */
  static async recognize(
    request: AcApTextRecognitionRequest
  ): Promise<string | undefined> {
    for (const recognizer of this.recognizers.values()) {
      if (request.signal?.aborted) return undefined
      try {
        const text = (await recognizer.recognize(request))?.trim()
        if (text) return text
      } catch {
        // Fall through to the next recognizer or to manual input.
      }
    }
    return undefined
  }
}
