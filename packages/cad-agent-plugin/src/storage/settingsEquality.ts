import type { LlmSettings } from './LlmSettingsStore'

/**
 * Compares two LLM settings snapshots for chat/session equality.
 *
 * @param left - First settings object.
 * @param right - Second settings object.
 * @returns `true` when all persisted fields match.
 */
export function areLlmSettingsEqual(
  left: LlmSettings,
  right: LlmSettings
): boolean {
  return (
    left.provider === right.provider &&
    left.baseUrl === right.baseUrl &&
    left.model === right.model &&
    left.apiKey === right.apiKey
  )
}
