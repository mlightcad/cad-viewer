import { type AcApLlmLabelKey, llmT } from '../i18n'
import type { AcApLlmProviderConfig } from '../storage/AcApLlmConfigStore'
import {
  type AcApLlmBuiltinProviderId,
  acapLlmIsBuiltinProviderId
} from '../storage/AcApLlmModelCatalog'

/** i18n key of each built-in provider's display name. */
const BUILTIN_PROVIDER_LABEL_KEYS: Record<
  AcApLlmBuiltinProviderId,
  AcApLlmLabelKey
> = {
  deepseek: 'providerDeepseek',
  'deepseek-vl': 'providerDeepseekVl',
  openai: 'providerOpenai',
  anthropic: 'providerAnthropic'
}

/**
 * Returns the localized name of a built-in provider.
 *
 * @param id - Built-in provider id.
 * @returns Display name in the current locale.
 */
export function acapLlmBuiltinProviderLabel(
  id: AcApLlmBuiltinProviderId
): string {
  return llmT(BUILTIN_PROVIDER_LABEL_KEYS[id])
}

/**
 * Returns the name shown for a provider in the settings dialog and the model
 * pickers.
 *
 * @param provider - Provider id, kind and optional display name.
 * @returns The localized built-in name, or a custom provider's display name
 *   falling back to its id.
 */
export function acapLlmProviderLabel(
  provider: Pick<AcApLlmProviderConfig, 'id' | 'kind' | 'displayName'>
): string {
  if (provider.kind === 'builtin' && acapLlmIsBuiltinProviderId(provider.id)) {
    return acapLlmBuiltinProviderLabel(provider.id)
  }
  return provider.displayName?.trim() || provider.id
}
