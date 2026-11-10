import type { AcApLlmStatus } from '@mlightcad/cad-simple-viewer'

import {
  ACAP_LLM_BUILTIN_PROVIDERS,
  type AcApLlmApiProtocol,
  type AcApLlmBuiltinProviderId,
  acapLlmGuessModelVision,
  acapLlmIsBuiltinProviderId,
  type AcApLlmModelEntry
} from './AcApLlmModelCatalog'
import { decryptApiKey, encryptApiKey } from './apiKeyCrypto'

/** Whether a provider ships with the plugin or was declared by the user. */
export type AcApLlmProviderKind = 'builtin' | 'custom'

/**
 * Persisted configuration of one LLM provider.
 *
 * A built-in provider takes its protocol, default base URL and default model
 * catalog from {@link ACAP_LLM_BUILTIN_PROVIDERS}; the user only supplies a key and,
 * optionally, a base URL or model override. A custom provider declares all of
 * them.
 */
export interface AcApLlmProviderConfig {
  /** Built-in id, or the user-chosen lowercase slug of a custom provider. */
  id: string
  /** Built-in or user-declared. */
  kind: AcApLlmProviderKind
  /** Optional label for custom providers; the id is shown when absent. */
  displayName?: string
  /** Wire protocol (fixed for built-in providers). */
  protocol: AcApLlmApiProtocol
  /** Base URL; empty means the built-in default. */
  baseUrl: string
  /** Secret API key. */
  apiKey: string
  /**
   * Model catalog. `null` means "use the built-in defaults" and is only
   * meaningful for built-in providers.
   */
  models: AcApLlmModelEntry[] | null
}

/** Every configured provider plus the model currently used for chat. */
export interface AcApLlmConfig {
  /** Configured providers in the order they were added. */
  providers: AcApLlmProviderConfig[]
  /** Provider whose model is used for chat. */
  activeProviderId: string
  /** Model id used for chat. */
  activeModel: string
}

/**
 * Fully resolved settings for one chat request, derived from {@link AcApLlmConfig}.
 */
export interface AcApLlmSettings {
  /** Provider id. */
  provider: string
  /** Built-in or custom provider. */
  kind: AcApLlmProviderKind
  /** Wire protocol. */
  protocol: AcApLlmApiProtocol
  /** Secret API key for the provider. */
  apiKey: string
  /** Effective REST API base URL. */
  baseUrl: string
  /** Model identifier passed to the provider SDK. */
  model: string
}

/** On-disk shape of one provider (API key encrypted). */
interface PersistedProvider {
  id?: string
  kind?: AcApLlmProviderKind
  displayName?: string
  protocol?: AcApLlmApiProtocol
  baseUrl?: string
  apiKeyEnc?: string
  models?: AcApLlmModelEntry[] | null
}

/** On-disk shape of {@link AcApLlmConfig}. */
interface PersistedLlmConfig {
  version?: number
  providers?: PersistedProvider[]
  activeProviderId?: string
  activeModel?: string
}

/** Settings shape stored by plugin versions before multi-provider support. */
export interface AcApLlmLegacySettings {
  provider?: string
  baseUrl?: string
  model?: string
  apiKey?: string
}

/** On-disk shape of {@link AcApLlmLegacySettings}. */
interface PersistedLegacySettings extends Omit<
  AcApLlmLegacySettings,
  'apiKey'
> {
  /** Encrypted API key (preferred). */
  apiKeyEnc?: string
  /** Legacy plaintext API key. */
  apiKey?: string
}

/** `localStorage` key for the serialized {@link AcApLlmConfig}. */
const STORAGE_KEY = 'cad-agent-plugin.llm-config'

/** `localStorage` key of the single-provider settings it replaces. */
const LEGACY_STORAGE_KEY = 'cad-agent-plugin.llm-settings'

/** Provider used for chat before the user configures anything. */
const DEFAULT_PROVIDER: AcApLlmBuiltinProviderId = 'deepseek'

/**
 * Lowercase slug a custom provider id must match. It starts with a letter so
 * it can never collide with numeric keys and reads well in the model picker.
 */
export const ACAP_LLM_CUSTOM_PROVIDER_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * Returns a config with no providers configured.
 *
 * @returns Fresh default config.
 */
export function acapLlmCreateDefaultConfig(): AcApLlmConfig {
  return {
    providers: [],
    activeProviderId: DEFAULT_PROVIDER,
    activeModel: ACAP_LLM_BUILTIN_PROVIDERS[DEFAULT_PROVIDER].models[0].id
  }
}

/**
 * Creates an unconfigured built-in provider entry.
 *
 * @param id - Built-in provider id.
 * @returns A provider with an empty key, default URL and default catalog.
 */
export function acapLlmCreateBuiltinProvider(
  id: AcApLlmBuiltinProviderId
): AcApLlmProviderConfig {
  return {
    id,
    kind: 'builtin',
    protocol: ACAP_LLM_BUILTIN_PROVIDERS[id].protocol,
    baseUrl: '',
    apiKey: '',
    models: null
  }
}

/**
 * Creates an empty custom provider draft.
 *
 * @returns A custom provider with no id, URL, key or models.
 */
export function acapLlmCreateCustomProvider(): AcApLlmProviderConfig {
  return {
    id: '',
    kind: 'custom',
    displayName: '',
    protocol: 'openai-chat',
    baseUrl: '',
    apiKey: '',
    models: []
  }
}

/**
 * Looks up a provider in a config, falling back to an unconfigured built-in.
 *
 * @param config - Current config.
 * @param id - Provider id.
 * @returns The stored provider, a blank built-in entry, or `undefined` for an
 *   unknown custom id.
 */
export function acapLlmFindProvider(
  config: AcApLlmConfig,
  id: string
): AcApLlmProviderConfig | undefined {
  const stored = config.providers.find(provider => provider.id === id)
  if (stored) return stored
  return acapLlmIsBuiltinProviderId(id)
    ? acapLlmCreateBuiltinProvider(id)
    : undefined
}

/**
 * Returns the models a provider offers in the model selector.
 *
 * @param provider - Provider config.
 * @returns The custom catalog, or the built-in defaults when not customized.
 */
export function acapLlmEffectiveModels(
  provider: AcApLlmProviderConfig
): readonly AcApLlmModelEntry[] {
  if (provider.models) return provider.models
  return provider.kind === 'builtin' && acapLlmIsBuiltinProviderId(provider.id)
    ? ACAP_LLM_BUILTIN_PROVIDERS[provider.id].models
    : []
}

/**
 * Returns the base URL requests are sent to.
 *
 * @param provider - Provider config.
 * @returns The configured URL, or the built-in default when blank.
 */
export function acapLlmEffectiveBaseUrl(
  provider: AcApLlmProviderConfig
): string {
  const configured = provider.baseUrl.trim()
  if (configured) return configured
  return provider.kind === 'builtin' && acapLlmIsBuiltinProviderId(provider.id)
    ? ACAP_LLM_BUILTIN_PROVIDERS[provider.id].baseUrl
    : ''
}

/**
 * Resolves the active provider and model into per-request settings.
 *
 * @param config - Current config.
 * @returns Settings for the active model (empty key when unconfigured).
 */
export function acapLlmResolveActiveSettings(
  config: AcApLlmConfig
): AcApLlmSettings {
  const provider =
    acapLlmFindProvider(config, config.activeProviderId) ??
    acapLlmCreateBuiltinProvider(DEFAULT_PROVIDER)
  return {
    provider: provider.id,
    kind: provider.kind,
    protocol: provider.protocol,
    apiKey: provider.apiKey,
    baseUrl: acapLlmEffectiveBaseUrl(provider),
    model: config.activeModel
  }
}

/**
 * Determines whether the active model accepts image attachments.
 *
 * Uses the catalog entry when the model is listed, otherwise guesses from the
 * model id.
 *
 * @param config - Current config.
 * @returns `true` when image attachments are allowed.
 */
export function acapLlmActiveModelSupportsVision(
  config: AcApLlmConfig
): boolean {
  const provider = acapLlmFindProvider(config, config.activeProviderId)
  const entry = provider
    ? acapLlmEffectiveModels(provider).find(
        model => model.id === config.activeModel
      )
    : undefined
  return entry ? entry.vision : acapLlmGuessModelVision(config.activeModel)
}

/**
 * Resolves the settings used for image input such as OCR.
 *
 * Prefers the active model when it has a key and accepts images, so a user who
 * picked a vision model gets exactly that one. Otherwise falls back to the
 * first vision-capable model of any provider with a key, so text recognition
 * still works while chat runs on a text-only model.
 *
 * @param config - Current config.
 * @returns Settings for a vision-capable model, or `undefined` when no
 *   configured provider offers one.
 */
export function acapLlmResolveVisionSettings(
  config: AcApLlmConfig
): AcApLlmSettings | undefined {
  const active = acapLlmResolveActiveSettings(config)
  if (active.apiKey.trim() && acapLlmActiveModelSupportsVision(config)) {
    return active
  }
  for (const provider of config.providers) {
    if (!provider.apiKey.trim()) continue
    const model = acapLlmEffectiveModels(provider).find(entry => entry.vision)
    if (!model) continue
    return {
      provider: provider.id,
      kind: provider.kind,
      protocol: provider.protocol,
      apiKey: provider.apiKey,
      baseUrl: acapLlmEffectiveBaseUrl(provider),
      model: model.id
    }
  }
  return undefined
}

/**
 * Inserts or replaces a provider and makes it the active one.
 *
 * The active model is kept when the provider still offers it; otherwise the
 * provider's first model is selected.
 *
 * @param config - Current config.
 * @param provider - Provider to save.
 * @returns A new config.
 */
export function acapLlmUpsertProvider(
  config: AcApLlmConfig,
  provider: AcApLlmProviderConfig
): AcApLlmConfig {
  const exists = config.providers.some(entry => entry.id === provider.id)
  const providers = exists
    ? config.providers.map(entry =>
        entry.id === provider.id ? provider : entry
      )
    : [...config.providers, provider]
  const models = acapLlmEffectiveModels(provider)
  const keepModel =
    config.activeProviderId === provider.id &&
    (models.length === 0 ||
      models.some(model => model.id === config.activeModel))
  return {
    providers,
    activeProviderId: provider.id,
    activeModel: keepModel ? config.activeModel : (models[0]?.id ?? '')
  }
}

/**
 * Removes a provider. When it was active, chat switches to the first
 * remaining provider that has a key, or to the default provider.
 *
 * @param config - Current config.
 * @param id - Provider id to remove.
 * @returns A new config.
 */
export function acapLlmRemoveProvider(
  config: AcApLlmConfig,
  id: string
): AcApLlmConfig {
  const providers = config.providers.filter(provider => provider.id !== id)
  if (config.activeProviderId !== id) return { ...config, providers }
  return acapLlmEnsureActiveProvider({
    providers,
    activeProviderId: '',
    activeModel: ''
  })
}

/**
 * Converts pre-multi-provider settings into a {@link AcApLlmConfig}.
 *
 * `openai-compatible` becomes a custom provider of the same id that lists the
 * saved model; the other providers become built-in entries that keep a base
 * URL only when it differs from the default.
 *
 * @param legacy - Settings in the old single-provider shape.
 * @returns The equivalent config.
 */
export function acapLlmMigrateLegacySettings(
  legacy: AcApLlmLegacySettings
): AcApLlmConfig {
  const apiKey = legacy.apiKey ?? ''
  const baseUrl = legacy.baseUrl?.trim() ?? ''
  const id = legacy.provider ?? ''

  if (acapLlmIsBuiltinProviderId(id)) {
    const info = ACAP_LLM_BUILTIN_PROVIDERS[id]
    const model = legacy.model?.trim() || info.models[0].id
    return {
      providers: [
        {
          ...acapLlmCreateBuiltinProvider(id),
          apiKey,
          baseUrl: baseUrl === info.baseUrl ? '' : baseUrl
        }
      ],
      activeProviderId: id,
      activeModel: model
    }
  }

  const model = legacy.model?.trim()
  if (id !== 'openai-compatible' || !model) return acapLlmCreateDefaultConfig()
  return {
    providers: [
      {
        ...acapLlmCreateCustomProvider(),
        id,
        baseUrl,
        apiKey,
        models: [{ id: model, vision: acapLlmGuessModelVision(model) }]
      }
    ],
    activeProviderId: id,
    activeModel: model
  }
}

/**
 * Normalizes one persisted provider, dropping entries that cannot be used.
 *
 * @param persisted - Provider as read from storage.
 * @param apiKey - Decrypted API key.
 * @returns The provider, or `undefined` when its id is unusable.
 */
function restoreProvider(
  persisted: PersistedProvider,
  apiKey: string
): AcApLlmProviderConfig | undefined {
  const id = persisted.id ?? ''
  if (persisted.kind === 'builtin' || acapLlmIsBuiltinProviderId(id)) {
    if (!acapLlmIsBuiltinProviderId(id)) return undefined
    return {
      ...acapLlmCreateBuiltinProvider(id),
      baseUrl: persisted.baseUrl ?? '',
      apiKey,
      models: acapLlmRestoreModelEntries(persisted.models)
    }
  }
  if (!ACAP_LLM_CUSTOM_PROVIDER_ID_PATTERN.test(id)) return undefined
  return {
    id,
    kind: 'custom',
    displayName: persisted.displayName ?? '',
    protocol: persisted.protocol ?? 'openai-chat',
    baseUrl: persisted.baseUrl ?? '',
    apiKey,
    models: acapLlmRestoreModelEntries(persisted.models) ?? []
  }
}

/**
 * Validates a stored model catalog, dropping entries without a usable id.
 *
 * @param value - Catalog as read from storage.
 * @returns The valid entries, or `null` when no catalog was stored.
 */
export function acapLlmRestoreModelEntries(
  value: unknown
): AcApLlmModelEntry[] | null {
  if (!Array.isArray(value)) return null
  return value.flatMap(item => {
    const entry = item as Partial<AcApLlmModelEntry> | null
    if (!entry || typeof entry !== 'object') return []
    if (typeof entry.id !== 'string' || !entry.id.trim()) return []
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    return [{ id: entry.id, ...(name ? { name } : {}), vision: !!entry.vision }]
  })
}

/**
 * Points chat at an existing provider when the stored active one is gone,
 * e.g. a custom provider dropped because its stored entry was invalid.
 *
 * @param config - Config to check.
 * @returns The same config when its active provider exists, otherwise a copy
 *   that activates the first provider with a key (or the default provider).
 */
export function acapLlmEnsureActiveProvider(
  config: AcApLlmConfig
): AcApLlmConfig {
  if (acapLlmFindProvider(config, config.activeProviderId)) return config
  const fallback =
    config.providers.find(provider => provider.apiKey.trim()) ??
    acapLlmCreateBuiltinProvider(DEFAULT_PROVIDER)
  return {
    ...config,
    activeProviderId: fallback.id,
    activeModel: acapLlmEffectiveModels(fallback)[0]?.id ?? ''
  }
}

/**
 * Restores the legacy single-provider settings, decrypting the key.
 *
 * @param raw - JSON stored under {@link LEGACY_STORAGE_KEY}.
 * @returns Legacy settings with a plaintext key.
 */
async function readLegacySettings(raw: string): Promise<AcApLlmLegacySettings> {
  const persisted = JSON.parse(raw) as PersistedLegacySettings
  const apiKey = persisted.apiKeyEnc
    ? await decryptApiKey(persisted.apiKeyEnc)
    : (persisted.apiKey ?? '')
  return { ...persisted, apiKey }
}

/**
 * Loads the LLM config from `localStorage`, migrating legacy settings once.
 *
 * @returns Parsed config with decrypted keys, or defaults when missing or
 *   invalid.
 */
export async function acapLlmLoadConfig(): Promise<AcApLlmConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      return legacy
        ? acapLlmMigrateLegacySettings(await readLegacySettings(legacy))
        : acapLlmCreateDefaultConfig()
    }

    const persisted = JSON.parse(raw) as PersistedLlmConfig
    const providers: AcApLlmProviderConfig[] = []
    for (const entry of persisted.providers ?? []) {
      const apiKey = entry.apiKeyEnc ? await decryptApiKey(entry.apiKeyEnc) : ''
      const provider = restoreProvider(entry, apiKey)
      if (provider && !providers.some(item => item.id === provider.id)) {
        providers.push(provider)
      }
    }
    const defaults = acapLlmCreateDefaultConfig()
    return acapLlmEnsureActiveProvider({
      providers,
      activeProviderId: persisted.activeProviderId ?? defaults.activeProviderId,
      activeModel: persisted.activeModel ?? defaults.activeModel
    })
  } catch {
    return acapLlmCreateDefaultConfig()
  }
}

/**
 * Persists the LLM config to `localStorage` with encrypted API keys.
 *
 * @param config - Full config to serialize.
 */
export async function acapLlmSaveConfig(config: AcApLlmConfig): Promise<void> {
  const providers: PersistedProvider[] = []
  for (const provider of config.providers) {
    providers.push({
      id: provider.id,
      kind: provider.kind,
      ...(provider.kind === 'custom'
        ? { displayName: provider.displayName, protocol: provider.protocol }
        : {}),
      baseUrl: provider.baseUrl,
      models: provider.models,
      apiKeyEnc: provider.apiKey ? await encryptApiKey(provider.apiKey) : ''
    })
  }

  const persisted: PersistedLlmConfig = {
    version: 2,
    providers,
    activeProviderId: config.activeProviderId,
    activeModel: config.activeModel
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  configEvents.dispatchEvent(
    new CustomEvent<AcApLlmConfig>(CONFIG_CHANGE_EVENT, { detail: config })
  )
}

/** Name of the event {@link acapLlmSaveConfig} fires on {@link configEvents}. */
const CONFIG_CHANGE_EVENT = 'change'

/** Notifies in-page listeners, e.g. the agent panel, of saved configs. */
const configEvents = new EventTarget()

/**
 * Subscribes to configs saved by {@link acapLlmSaveConfig}, so every UI that
 * shows the active model (settings dialog, agent panel) stays in sync.
 *
 * @param listener - Receives the saved config.
 * @returns A function that unsubscribes.
 */
export function acapLlmOnConfigChange(
  listener: (config: AcApLlmConfig) => void
): () => void {
  const handler = (event: Event) =>
    listener((event as CustomEvent<AcApLlmConfig>).detail)
  configEvents.addEventListener(CONFIG_CHANGE_EVENT, handler)
  return () => configEvents.removeEventListener(CONFIG_CHANGE_EVENT, handler)
}

/**
 * Loads the config and reports what it can do, for
 * `AcApLlmSettingsService.getStatus`.
 *
 * @returns Whether a provider has a key and whether a configured model
 *   accepts images.
 */
export async function acapLlmGetStatus(): Promise<AcApLlmStatus> {
  const config = await acapLlmLoadConfig()
  return {
    configured: config.providers.some(provider => provider.apiKey.trim()),
    vision: !!acapLlmResolveVisionSettings(config)
  }
}
