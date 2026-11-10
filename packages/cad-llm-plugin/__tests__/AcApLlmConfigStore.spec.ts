import {
  acapLlmActiveModelSupportsVision,
  acapLlmCreateBuiltinProvider,
  acapLlmCreateCustomProvider,
  acapLlmCreateDefaultConfig,
  acapLlmEffectiveBaseUrl,
  acapLlmEffectiveModels,
  type AcApLlmConfig,
  acapLlmMigrateLegacySettings,
  acapLlmRemoveProvider,
  acapLlmResolveActiveSettings,
  acapLlmResolveVisionSettings,
  acapLlmUpsertProvider
} from '../src/storage/AcApLlmConfigStore'
import { ACAP_LLM_BUILTIN_PROVIDERS } from '../src/storage/AcApLlmModelCatalog'

const gateway = {
  ...acapLlmCreateCustomProvider(),
  id: 'acme-gateway',
  baseUrl: 'https://gateway.example/v1',
  apiKey: 'sk-gw',
  protocol: 'anthropic-messages' as const,
  models: [
    { id: 'claude-x', vision: true },
    { id: 'text-only', vision: false }
  ]
}

describe('acapLlmMigrateLegacySettings', () => {
  it('turns a built-in provider into a provider entry with its key', () => {
    const config = acapLlmMigrateLegacySettings({
      provider: 'deepseek',
      baseUrl: ACAP_LLM_BUILTIN_PROVIDERS.deepseek.baseUrl,
      model: 'deepseek-v4-pro',
      apiKey: 'sk-1'
    })
    expect(config.activeProviderId).toBe('deepseek')
    expect(config.activeModel).toBe('deepseek-v4-pro')
    expect(config.providers).toEqual([
      { ...acapLlmCreateBuiltinProvider('deepseek'), apiKey: 'sk-1' }
    ])
  })

  it('keeps a non-default base URL as an override', () => {
    const config = acapLlmMigrateLegacySettings({
      provider: 'openai',
      baseUrl: 'https://proxy.example/v1',
      model: 'gpt-5.5',
      apiKey: 'sk-2'
    })
    expect(config.providers[0].baseUrl).toBe('https://proxy.example/v1')
  })

  it('turns openai-compatible into a custom provider listing the model', () => {
    const config = acapLlmMigrateLegacySettings({
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
    expect(acapLlmMigrateLegacySettings({ provider: 'nope' })).toEqual(
      acapLlmCreateDefaultConfig()
    )
  })
})

describe('provider resolution', () => {
  it('uses built-in defaults until the catalog or URL is customized', () => {
    const provider = acapLlmCreateBuiltinProvider('anthropic')
    expect(acapLlmEffectiveBaseUrl(provider)).toBe(
      ACAP_LLM_BUILTIN_PROVIDERS.anthropic.baseUrl
    )
    expect(acapLlmEffectiveModels(provider)).toBe(
      ACAP_LLM_BUILTIN_PROVIDERS.anthropic.models
    )

    const custom = { ...provider, models: [{ id: 'm', vision: false }] }
    expect(acapLlmEffectiveModels(custom)).toEqual([{ id: 'm', vision: false }])
  })

  it('resolves the active custom provider into request settings', () => {
    const config: AcApLlmConfig = {
      providers: [gateway],
      activeProviderId: 'acme-gateway',
      activeModel: 'claude-x'
    }
    expect(acapLlmResolveActiveSettings(config)).toEqual({
      provider: 'acme-gateway',
      kind: 'custom',
      protocol: 'anthropic-messages',
      apiKey: 'sk-gw',
      baseUrl: 'https://gateway.example/v1',
      model: 'claude-x'
    })
    expect(acapLlmActiveModelSupportsVision(config)).toBe(true)
    expect(
      acapLlmActiveModelSupportsVision({ ...config, activeModel: 'text-only' })
    ).toBe(false)
  })

  it('guesses vision for models outside the catalog', () => {
    const config: AcApLlmConfig = {
      providers: [],
      activeProviderId: 'deepseek',
      activeModel: 'gpt-4o-mini'
    }
    expect(acapLlmActiveModelSupportsVision(config)).toBe(true)
  })
})

describe('acapLlmUpsertProvider / acapLlmRemoveProvider', () => {
  it('activates a saved provider and picks its first model', () => {
    const config = acapLlmUpsertProvider(acapLlmCreateDefaultConfig(), gateway)
    expect(config.providers).toEqual([gateway])
    expect(config.activeProviderId).toBe('acme-gateway')
    expect(config.activeModel).toBe('claude-x')
  })

  it('keeps the active model when the provider still offers it', () => {
    const config = acapLlmUpsertProvider(
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
    const deepseek = {
      ...acapLlmCreateBuiltinProvider('deepseek'),
      apiKey: 'k'
    }
    const config = acapLlmRemoveProvider(
      {
        providers: [deepseek, gateway],
        activeProviderId: gateway.id,
        activeModel: 'claude-x'
      },
      gateway.id
    )
    expect(config.providers).toEqual([deepseek])
    expect(config.activeProviderId).toBe('deepseek')
    expect(config.activeModel).toBe(
      ACAP_LLM_BUILTIN_PROVIDERS.deepseek.models[0].id
    )
  })
})

describe('acapLlmResolveVisionSettings', () => {
  const deepseek = {
    ...acapLlmCreateBuiltinProvider('deepseek'),
    apiKey: 'sk-text'
  }

  it('uses the active model when it accepts images', () => {
    const config = acapLlmUpsertProvider(acapLlmCreateDefaultConfig(), gateway)
    expect(acapLlmResolveVisionSettings(config)?.model).toBe('claude-x')
  })

  it('falls back to a vision model of another configured provider', () => {
    const config: AcApLlmConfig = {
      providers: [deepseek, gateway],
      activeProviderId: 'deepseek',
      activeModel: 'deepseek-v4-flash'
    }
    expect(acapLlmResolveVisionSettings(config)).toEqual({
      provider: 'acme-gateway',
      kind: 'custom',
      protocol: 'anthropic-messages',
      apiKey: 'sk-gw',
      baseUrl: 'https://gateway.example/v1',
      model: 'claude-x'
    })
  })

  it('returns undefined without a configured vision model', () => {
    const config: AcApLlmConfig = {
      providers: [deepseek, { ...gateway, apiKey: '' }],
      activeProviderId: 'deepseek',
      activeModel: 'deepseek-v4-flash'
    }
    expect(acapLlmResolveVisionSettings(config)).toBeUndefined()
  })
})
