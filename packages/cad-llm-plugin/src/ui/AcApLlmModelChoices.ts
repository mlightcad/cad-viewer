import {
  type AcApLlmConfig,
  acapLlmEffectiveModels,
  acapLlmFindProvider
} from '../storage/AcApLlmConfigStore'
import { acapLlmModelLabel } from '../storage/AcApLlmModelCatalog'
import { acapLlmProviderLabel } from './AcApLlmProviderLabels'

/** One selectable model in a model picker. */
export interface AcApLlmModelChoice {
  /** Provider that serves the model. */
  providerId: string
  /** Model id sent to the provider. */
  modelId: string
  /** Display label. */
  label: string
  /** Whether the model accepts image input. */
  vision: boolean
}

/** Models of one provider, for an `<optgroup>`. */
export interface AcApLlmModelChoiceGroup {
  /** Provider id. */
  providerId: string
  /** Localized provider name. */
  label: string
  /** Models in catalog order. */
  options: AcApLlmModelChoice[]
}

/**
 * Lists the models a user can switch between: every model of every provider
 * that has a key, plus the active provider, grouped by provider. The active
 * model is listed even when its provider's catalog no longer names it.
 *
 * @param config - Current config.
 * @returns Groups in provider order, active provider first when it has no key.
 */
export function acapLlmModelChoices(
  config: AcApLlmConfig
): AcApLlmModelChoiceGroup[] {
  const { activeProviderId, activeModel } = config
  const ids = config.providers
    .filter(provider => provider.apiKey.trim())
    .map(provider => provider.id)
  if (!ids.includes(activeProviderId)) ids.unshift(activeProviderId)

  return ids.flatMap(id => {
    const provider = acapLlmFindProvider(config, id)
    if (!provider) return []
    const models = [...acapLlmEffectiveModels(provider)]
    if (
      id === activeProviderId &&
      activeModel &&
      !models.some(model => model.id === activeModel)
    ) {
      models.push({ id: activeModel, vision: false })
    }
    return [
      {
        providerId: id,
        label: acapLlmProviderLabel(provider),
        options: models.map(model => ({
          providerId: id,
          modelId: model.id,
          label: acapLlmModelLabel(model),
          vision: model.vision
        }))
      }
    ]
  })
}
