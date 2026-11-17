/** Registered name of the AI model settings plugin. */
export const LLM_PLUGIN_NAME = 'LlmPlugin'

/** Trigger commands handled by {@link LLM_PLUGIN_NAME}. */
export const LLM_PLUGIN_TRIGGERS = ['llmsettings'] as const

/**
 * Id of the settings provider and of the auto OCR fallback recognizer
 * (`pdftext` chain). Per-model picker entries use
 * {@link acapLlmOcrRecognizerId}.
 */
export const LLM_SERVICE_ID = 'cad-llm'

/**
 * Prefix of one OCR recognizer id per vision-capable LLM model
 * (`cad-llm:<provider>/<model>`, both segments URI-encoded).
 */
export const LLM_OCR_ID_PREFIX = `${LLM_SERVICE_ID}:`

/** Builds the OCR recognizer id for one provider + model pair. */
export function acapLlmOcrRecognizerId(
  providerId: string,
  modelId: string
): string {
  return `${LLM_OCR_ID_PREFIX}${encodeURIComponent(providerId)}/${encodeURIComponent(modelId)}`
}

/** True when `id` is a per-model LLM OCR recognizer. */
export function acapLlmIsOcrRecognizerId(id: string): boolean {
  return id.startsWith(LLM_OCR_ID_PREFIX) && id.includes('/')
}

/** Provider and model encoded in a per-model OCR recognizer id, if any. */
export function acapLlmParseOcrRecognizerId(
  id: string
): { providerId: string; modelId: string } | undefined {
  if (!id.startsWith(LLM_OCR_ID_PREFIX)) return undefined
  const rest = id.slice(LLM_OCR_ID_PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash < 0) return undefined
  try {
    return {
      providerId: decodeURIComponent(rest.slice(0, slash)),
      modelId: decodeURIComponent(rest.slice(slash + 1))
    }
  } catch {
    return undefined
  }
}
