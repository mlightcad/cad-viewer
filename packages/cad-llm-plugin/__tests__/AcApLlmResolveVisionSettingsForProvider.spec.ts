import {
  acapLlmResolveVisionSettingsForProvider,
  type AcApLlmConfig
} from '../src/storage/AcApLlmConfigStore'

describe('acapLlmResolveVisionSettingsForProvider', () => {
  const config: AcApLlmConfig = {
    providers: [
      {
        id: 'openai',
        kind: 'builtin',
        protocol: 'openai-chat',
        baseUrl: '',
        apiKey: 'sk-test',
        models: [
          { id: 'gpt-4o', vision: true },
          { id: 'gpt-4o-mini', vision: true }
        ]
      },
      {
        id: 'deepseek',
        kind: 'builtin',
        protocol: 'openai-chat',
        baseUrl: '',
        apiKey: 'sk-other',
        models: [{ id: 'chat', vision: false }]
      }
    ],
    activeProviderId: 'openai',
    activeModel: 'gpt-4o-mini'
  }

  it('prefers the active vision model when that provider is active', () => {
    expect(acapLlmResolveVisionSettingsForProvider(config, 'openai')).toEqual(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test'
      })
    )
  })

  it('returns undefined when the provider has no vision model', () => {
    expect(
      acapLlmResolveVisionSettingsForProvider(config, 'deepseek')
    ).toBeUndefined()
  })
})
