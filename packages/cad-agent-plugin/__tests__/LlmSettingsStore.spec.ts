import {
  activeModelSupportsVision,
  createBuiltinProviderConfig,
  createCustomProviderConfig,
  createDefaultLlmConfig,
  effectiveBaseUrl,
  effectiveModels,
  type LlmConfig,
  migrateLegacySettings,
  removeProvider,
  resolveActiveSettings,
  upsertProvider
} from '../src/storage/LlmSettingsStore'
import { BUILTIN_PROVIDERS } from '../src/storage/modelCatalog'

const gateway = {
  ...createCustomProviderConfig(),
  id: 'acme-gateway',
  baseUrl: 'https://gateway.example/v1',
  apiKey: 'sk-gw',
  protocol: 'anthropic-messages' as const,
  models: [
    { id: 'claude-x', vision: true },
    { id: 'text-only', vision: false }
  ]
}

describe('migrateLegacySettings', () => {
  it('turns a built-in provider into a provider entry with its key', () => {
    const config = migrateLegacySettings({
      provider: 'deepseek',
      baseUrl: BUILTIN_PROVIDERS.deepseek.baseUrl,
      model: 'deepseek-v4-pro',
      apiKey: 'sk-1'
    })
    expect(config.activeProviderId).toBe('deepseek')
    expect(config.activeModel).toBe('deepseek-v4-pro')
    expect(config.providers).toEqual([
      { ...createBuiltinProviderConfig('deepseek'), apiKey: 'sk-1' }
    ])
  })

  it('keeps a non-default base URL as an override', () => {
    const config = migrateLegacySettings({
      provider: 'openai',
      baseUrl: 'https://proxy.example/v1',
      model: 'gpt-5.5',
      apiKey: 'sk-2'
    })
    expect(config.providers[0].baseUrl).toBe('https://proxy.example/v1')
  })

  it('turns openai-compatible into a custom provider listing the model', () => {
    const config = migrateLegacySettings({
      provider: 'openai-compatible',
      baseUrl: 'https://relay.example/v1',
      model: 'qwen-vl-max',
      apiKey: 'sk-3'
    })
    expect(config.activeProviderId).toBe('openai-compatible')
    expect(config.providers[0]).toMatchObject({
      id: 'openai-compatible',
      kind: 'custom',
      protocol: 'openai-chat',
      baseUrl: 'https://relay.example/v1',
      apiKey: 'sk-3',
      models: [{ id: 'qwen-vl-max', vision: true }]
    })
  })

  it('falls back to defaults for unknown providers', () => {
    expect(migrateLegacySettings({ provider: 'nope' })).toEqual(
      createDefaultLlmConfig()
    )
  })
})

describe('provider resolution', () => {
  it('uses built-in defaults until the catalog or URL is customized', () => {
    const provider = createBuiltinProviderConfig('anthropic')
    expect(effectiveBaseUrl(provider)).toBe(BUILTIN_PROVIDERS.anthropic.baseUrl)
    expect(effectiveModels(provider)).toBe(BUILTIN_PROVIDERS.anthropic.models)

    const custom = { ...provider, models: [{ id: 'm', vision: false }] }
    expect(effectiveModels(custom)).toEqual([{ id: 'm', vision: false }])
  })

  it('resolves the active custom provider into request settings', () => {
    const config: LlmConfig = {
      providers: [gateway],
      activeProviderId: 'acme-gateway',
      activeModel: 'claude-x'
    }
    expect(resolveActiveSettings(config)).toEqual({
      provider: 'acme-gateway',
      kind: 'custom',
      protocol: 'anthropic-messages',
      apiKey: 'sk-gw',
      baseUrl: 'https://gateway.example/v1',
      model: 'claude-x'
    })
    expect(activeModelSupportsVision(config)).toBe(true)
    expect(
      activeModelSupportsVision({ ...config, activeModel: 'text-only' })
    ).toBe(false)
  })

  it('guesses vision for models outside the catalog', () => {
    const config: LlmConfig = {
      providers: [],
      activeProviderId: 'deepseek',
      activeModel: 'gpt-4o-mini'
    }
    expect(activeModelSupportsVision(config)).toBe(true)
  })
})

describe('upsertProvider / removeProvider', () => {
  it('activates a saved provider and picks its first model', () => {
    const config = upsertProvider(createDefaultLlmConfig(), gateway)
    expect(config.providers).toEqual([gateway])
    expect(config.activeProviderId).toBe('acme-gateway')
    expect(config.activeModel).toBe('claude-x')
  })

  it('keeps the active model when the provider still offers it', () => {
    const config = upsertProvider(
      {
        providers: [gateway],
        activeProviderId: gateway.id,
        activeModel: 'text-only'
      },
      { ...gateway, apiKey: 'sk-new' }
    )
    expect(config.activeModel).toBe('text-only')
    expect(config.providers[0].apiKey).toBe('sk-new')
  })

  it('switches to another configured provider when the active one is removed', () => {
    const deepseek = { ...createBuiltinProviderConfig('deepseek'), apiKey: 'k' }
    const config = removeProvider(
      {
        providers: [deepseek, gateway],
        activeProviderId: gateway.id,
        activeModel: 'claude-x'
      },
      gateway.id
    )
    expect(config.providers).toEqual([deepseek])
    expect(config.activeProviderId).toBe('deepseek')
    expect(config.activeModel).toBe(BUILTIN_PROVIDERS.deepseek.models[0].id)
  })
})
