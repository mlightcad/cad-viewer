import {
  acapLlmResolveVisionSettingsForModel,
  type AcApLlmConfig
} from '../src/storage/AcApLlmConfigStore'

describe('acapLlmResolveVisionSettingsForModel', () => {
  const config: AcApLlmConfig = {
    providers: [
      {
        id: 'kkidc',
        kind: 'custom',
        displayName: 'kkidc',
        protocol: 'openai-chat',
        baseUrl: 'https://example.com/v1',
        apiKey: 'sk-test',
        models: [
          { id: 'vision-a', vision: true },
          { id: 'vision-b', vision: true },
          { id: 'text-only', vision: false }
        ]
      }
    ],
    activeProviderId: 'kkidc',
    activeModel: 'vision-a'
  }

  it('pins the requested vision model', () => {
    expect(
      acapLlmResolveVisionSettingsForModel(config, 'kkidc', 'vision-b')
    ).toEqual(
      expect.objectContaining({
        provider: 'kkidc',
        model: 'vision-b',
        apiKey: 'sk-test'
      })
    )
  })

  it('rejects text-only models', () => {
    expect(
      acapLlmResolveVisionSettingsForModel(config, 'kkidc', 'text-only')
    ).toBeUndefined()
  })
})
