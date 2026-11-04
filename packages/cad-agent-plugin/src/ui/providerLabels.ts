import type { AgentChatLabelKey, AgentChatLabels } from '../i18n'
import type { LlmProviderConfig } from '../storage/LlmSettingsStore'
import {
  type BuiltinProviderId,
  isBuiltinProviderId
} from '../storage/modelCatalog'

/** i18n key of each built-in provider's display name. */
const BUILTIN_PROVIDER_LABEL_KEYS: Record<
  BuiltinProviderId,
  AgentChatLabelKey
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
 * @param labels - Current agent labels.
 * @returns Display name.
 */
export function builtinProviderLabel(
  id: BuiltinProviderId,
  labels: AgentChatLabels
): string {
  return labels[BUILTIN_PROVIDER_LABEL_KEYS[id]]
}

/**
 * Returns the name shown for a provider in the settings card and model picker.
 *
 * @param provider - Provider id, kind and optional display name.
 * @param labels - Current agent labels.
 * @returns The localized built-in name, or a custom provider's display name
 *   falling back to its id.
 */
export function providerLabel(
  provider: Pick<LlmProviderConfig, 'id' | 'kind' | 'displayName'>,
  labels: AgentChatLabels
): string {
  if (provider.kind === 'builtin' && isBuiltinProviderId(provider.id)) {
    return builtinProviderLabel(provider.id, labels)
  }
  return provider.displayName?.trim() || provider.id
}
