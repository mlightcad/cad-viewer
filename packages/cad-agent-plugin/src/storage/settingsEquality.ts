import type { LlmProviderConfig } from './LlmSettingsStore'
import type { LlmModelEntry } from './modelCatalog'

/**
 * Compares two model catalogs entry by entry.
 *
 * @param left - First catalog (`null` = built-in defaults).
 * @param right - Second catalog.
 * @returns `true` when both hold the same entries in the same order.
 */
function areModelListsEqual(
  left: readonly LlmModelEntry[] | null,
  right: readonly LlmModelEntry[] | null
): boolean {
  if (left === null || right === null) return left === right
  return (
    left.length === right.length &&
    left.every(
      (model, index) =>
        model.id === right[index].id &&
        (model.name ?? '') === (right[index].name ?? '') &&
        model.vision === right[index].vision
    )
  )
}

/**
 * Compares two provider configs, e.g. a settings draft with its saved copy.
 *
 * @param left - First provider config.
 * @param right - Second provider config.
 * @returns `true` when all persisted fields match.
 */
export function areProviderConfigsEqual(
  left: LlmProviderConfig,
  right: LlmProviderConfig
): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    (left.displayName ?? '') === (right.displayName ?? '') &&
    left.protocol === right.protocol &&
    left.baseUrl === right.baseUrl &&
    left.apiKey === right.apiKey &&
    areModelListsEqual(left.models, right.models)
  )
}
