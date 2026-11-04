import { decryptApiKey, encryptApiKey } from './apiKeyCrypto'
import {
  BUILTIN_PROVIDERS,
  type BuiltinProviderId,
  guessModelVision,
  isBuiltinProviderId,
  type LlmApiProtocol,
  type LlmModelEntry
} from './modelCatalog'

/** Whether a provider ships with the plugin or was declared by the user. */
export type LlmProviderKind = 'builtin' | 'custom'

/**
 * Persisted configuration of one LLM provider.
 *
 * A built-in provider takes its protocol, default base URL and default model
 * catalog from {@link BUILTIN_PROVIDERS}; the user only supplies a key and,
 * optionally, a base URL or model override. A custom provider declares all of
 * them.
 */
export interface LlmProviderConfig {
  /** Built-in id, or the user-chosen lowercase slug of a custom provider. */
  id: string
  /** Built-in or user-declared. */
  kind: LlmProviderKind
  /** Optional label for custom providers; the id is shown when absent. */
  displayName?: string
  /** Wire protocol (fixed for built-in providers). */
  protocol: LlmApiProtocol
  /** Base URL; empty means the built-in default. */
  baseUrl: string
  /** Secret API key. */
  apiKey: string
  /**
   * Model catalog. `null` means "use the built-in defaults" and is only
   * meaningful for built-in providers.
   */
  models: LlmModelEntry[] | null
}

/** Every configured provider plus the model currently used for chat. */
export interface LlmConfig {
  /** Configured providers in the order they were added. */
  providers: LlmProviderConfig[]
  /** Provider whose model is used for chat. */
  activeProviderId: string
  /** Model id used for chat. */
  activeModel: string
}

/**
 * Fully resolved settings for one chat request, derived from {@link LlmConfig}.
 */
export interface LlmSettings {
  /** Provider id. */
  provider: string
  /** Built-in or custom provider. */
  kind: LlmProviderKind
  /** Wire protocol. */
  protocol: LlmApiProtocol
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
  kind?: LlmProviderKind
  displayName?: string
  protocol?: LlmApiProtocol
  baseUrl?: string
  apiKeyEnc?: string
  models?: LlmModelEntry[] | null
}

/** On-disk shape of {@link LlmConfig}. */
interface PersistedLlmConfig {
  version?: number
  providers?: PersistedProvider[]
  activeProviderId?: string
  activeModel?: string
}

/** Settings shape stored by plugin versions before multi-provider support. */
export interface LegacyLlmSettings {
  provider?: string
  baseUrl?: string
  model?: string
  apiKey?: string
}

/** On-disk shape of {@link LegacyLlmSettings}. */
interface PersistedLegacySettings extends Omit<LegacyLlmSettings, 'apiKey'> {
  /** Encrypted API key (preferred). */
  apiKeyEnc?: string
  /** Legacy plaintext API key. */
  apiKey?: string
}

/** `localStorage` key for the serialized {@link LlmConfig}. */
const STORAGE_KEY = 'cad-agent-plugin.llm-config'

/** `localStorage` key of the single-provider settings it replaces. */
const LEGACY_STORAGE_KEY = 'cad-agent-plugin.llm-settings'

/** Provider used for chat before the user configures anything. */
const DEFAULT_PROVIDER: BuiltinProviderId = 'deepseek'

/**
 * Lowercase slug a custom provider id must match. It starts with a letter so
 * it can never collide with numeric keys and reads well in the model picker.
 */
export const CUSTOM_PROVIDER_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * Returns a config with no providers configured.
 *
 * @returns Fresh default config.
 */
export function createDefaultLlmConfig(): LlmConfig {
  return {
    providers: [],
    activeProviderId: DEFAULT_PROVIDER,
    activeModel: BUILTIN_PROVIDERS[DEFAULT_PROVIDER].models[0].id
  }
}

/**
 * Creates an unconfigured built-in provider entry.
 *
 * @param id - Built-in provider id.
 * @returns A provider with an empty key, default URL and default catalog.
 */
export function createBuiltinProviderConfig(
  id: BuiltinProviderId
): LlmProviderConfig {
  return {
    id,
    kind: 'builtin',
    protocol: BUILTIN_PROVIDERS[id].protocol,
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
export function createCustomProviderConfig(): LlmProviderConfig {
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
export function findProvider(
  config: LlmConfig,
  id: string
): LlmProviderConfig | undefined {
  const stored = config.providers.find(provider => provider.id === id)
  if (stored) return stored
  return isBuiltinProviderId(id) ? createBuiltinProviderConfig(id) : undefined
}

/**
 * Returns the models a provider offers in the model selector.
 *
 * @param provider - Provider config.
 * @returns The custom catalog, or the built-in defaults when not customized.
 */
export function effectiveModels(
  provider: LlmProviderConfig
): readonly LlmModelEntry[] {
  if (provider.models) return provider.models
  return provider.kind === 'builtin' && isBuiltinProviderId(provider.id)
    ? BUILTIN_PROVIDERS[provider.id].models
    : []
}

/**
 * Returns the base URL requests are sent to.
 *
 * @param provider - Provider config.
 * @returns The configured URL, or the built-in default when blank.
 */
export function effectiveBaseUrl(provider: LlmProviderConfig): string {
  const configured = provider.baseUrl.trim()
  if (configured) return configured
  return provider.kind === 'builtin' && isBuiltinProviderId(provider.id)
    ? BUILTIN_PROVIDERS[provider.id].baseUrl
    : ''
}

/**
 * Resolves the active provider and model into per-request settings.
 *
 * @param config - Current config.
 * @returns Settings for the active model (empty key when unconfigured).
 */
export function resolveActiveSettings(config: LlmConfig): LlmSettings {
  const provider =
    findProvider(config, config.activeProviderId) ??
    createBuiltinProviderConfig(DEFAULT_PROVIDER)
  return {
    provider: provider.id,
    kind: provider.kind,
    protocol: provider.protocol,
    apiKey: provider.apiKey,
    baseUrl: effectiveBaseUrl(provider),
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
export function activeModelSupportsVision(config: LlmConfig): boolean {
  const provider = findProvider(config, config.activeProviderId)
  const entry = provider
    ? effectiveModels(provider).find(model => model.id === config.activeModel)
    : undefined
  return entry ? entry.vision : guessModelVision(config.activeModel)
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
export function upsertProvider(
  config: LlmConfig,
  provider: LlmProviderConfig
): LlmConfig {
  const exists = config.providers.some(entry => entry.id === provider.id)
  const providers = exists
    ? config.providers.map(entry =>
        entry.id === provider.id ? provider : entry
      )
    : [...config.providers, provider]
  const models = effectiveModels(provider)
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
export function removeProvider(config: LlmConfig, id: string): LlmConfig {
  const providers = config.providers.filter(provider => provider.id !== id)
  if (config.activeProviderId !== id) return { ...config, providers }
  return ensureActiveProvider({
    providers,
    activeProviderId: '',
    activeModel: ''
  })
}

/**
 * Converts pre-multi-provider settings into a {@link LlmConfig}.
 *
 * `openai-compatible` becomes a custom provider of the same id that lists the
 * saved model; the other providers become built-in entries that keep a base
 * URL only when it differs from the default.
 *
 * @param legacy - Settings in the old single-provider shape.
 * @returns The equivalent config.
 */
export function migrateLegacySettings(legacy: LegacyLlmSettings): LlmConfig {
  const apiKey = legacy.apiKey ?? ''
  const baseUrl = legacy.baseUrl?.trim() ?? ''
  const id = legacy.provider ?? ''

  if (isBuiltinProviderId(id)) {
    const info = BUILTIN_PROVIDERS[id]
    const model = legacy.model?.trim() || info.models[0].id
    return {
      providers: [
        {
          ...createBuiltinProviderConfig(id),
          apiKey,
          baseUrl: baseUrl === info.baseUrl ? '' : baseUrl
        }
      ],
      activeProviderId: id,
      activeModel: model
    }
  }

  const model = legacy.model?.trim()
  if (id !== 'openai-compatible' || !model) return createDefaultLlmConfig()
  return {
    providers: [
      {
        ...createCustomProviderConfig(),
        id,
        baseUrl,
        apiKey,
        models: [{ id: model, vision: guessModelVision(model) }]
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
): LlmProviderConfig | undefined {
  const id = persisted.id ?? ''
  if (persisted.kind === 'builtin' || isBuiltinProviderId(id)) {
    if (!isBuiltinProviderId(id)) return undefined
    return {
      ...createBuiltinProviderConfig(id),
      baseUrl: persisted.baseUrl ?? '',
      apiKey,
      models: restoreModelEntries(persisted.models)
    }
  }
  if (!CUSTOM_PROVIDER_ID_PATTERN.test(id)) return undefined
  return {
    id,
    kind: 'custom',
    displayName: persisted.displayName ?? '',
    protocol: persisted.protocol ?? 'openai-chat',
    baseUrl: persisted.baseUrl ?? '',
    apiKey,
    models: restoreModelEntries(persisted.models) ?? []
  }
}

/**
 * Validates a stored model catalog, dropping entries without a usable id.
 *
 * @param value - Catalog as read from storage.
 * @returns The valid entries, or `null` when no catalog was stored.
 */
export function restoreModelEntries(value: unknown): LlmModelEntry[] | null {
  if (!Array.isArray(value)) return null
  return value.flatMap(item => {
    const entry = item as Partial<LlmModelEntry> | null
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
export function ensureActiveProvider(config: LlmConfig): LlmConfig {
  if (findProvider(config, config.activeProviderId)) return config
  const fallback =
    config.providers.find(provider => provider.apiKey.trim()) ??
    createBuiltinProviderConfig(DEFAULT_PROVIDER)
  return {
    ...config,
    activeProviderId: fallback.id,
    activeModel: effectiveModels(fallback)[0]?.id ?? ''
  }
}

/**
 * Restores the legacy single-provider settings, decrypting the key.
 *
 * @param raw - JSON stored under {@link LEGACY_STORAGE_KEY}.
 * @returns Legacy settings with a plaintext key.
 */
async function readLegacySettings(raw: string): Promise<LegacyLlmSettings> {
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
export async function loadLlmConfig(): Promise<LlmConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      return legacy
        ? migrateLegacySettings(await readLegacySettings(legacy))
        : createDefaultLlmConfig()
    }

    const persisted = JSON.parse(raw) as PersistedLlmConfig
    const providers: LlmProviderConfig[] = []
    for (const entry of persisted.providers ?? []) {
      const apiKey = entry.apiKeyEnc ? await decryptApiKey(entry.apiKeyEnc) : ''
      const provider = restoreProvider(entry, apiKey)
      if (provider && !providers.some(item => item.id === provider.id)) {
        providers.push(provider)
      }
    }
    const defaults = createDefaultLlmConfig()
    return ensureActiveProvider({
      providers,
      activeProviderId: persisted.activeProviderId ?? defaults.activeProviderId,
      activeModel: persisted.activeModel ?? defaults.activeModel
    })
  } catch {
    return createDefaultLlmConfig()
  }
}

/**
 * Persists the LLM config to `localStorage` with encrypted API keys.
 *
 * @param config - Full config to serialize.
 */
export async function saveLlmConfig(config: LlmConfig): Promise<void> {
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
}
