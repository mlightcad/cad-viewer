/**
 * @jest-environment jsdom
 */

const recognizers = new Map<
  string,
  {
    id: string
    label: string | (() => string)
    auto?: boolean
    recognize: (request: { image: string }) => Promise<string | undefined>
  }
>()

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApTextRecognitionService: {
    register: (recognizer: {
      id: string
      label: string | (() => string)
      auto?: boolean
      recognize: (request: { image: string }) => Promise<string | undefined>
    }) => {
      recognizers.set(recognizer.id, recognizer)
      return () => recognizers.delete(recognizer.id)
    },
    unregister: (id: string) => {
      recognizers.delete(id)
    }
  }
}))

jest.mock('../src/AcApLlmTextRecognizer', () => ({
  acapLlmRecognizeText: jest.fn(async () => 'ok'),
  acapLlmRecognizeTextBatch: jest.fn(async () => ['ok'])
}))

jest.mock('../src/storage/AcApLlmConfigStore', () => ({
  acapLlmLoadConfig: jest.fn(async () => ({
    providers: [
      {
        id: 'kkidc',
        kind: 'custom',
        displayName: 'kkidc',
        protocol: 'openai-chat',
        baseUrl: 'https://example.com/v1',
        apiKey: 'key-1',
        models: [
          { id: 'vision-a', vision: true },
          { id: 'vision-b', vision: true },
          { id: 'text-only', vision: false }
        ]
      },
      {
        id: 'openai',
        kind: 'builtin',
        protocol: 'openai-chat',
        baseUrl: '',
        apiKey: 'key-2',
        models: [{ id: 'gpt-4o', vision: true }]
      },
      {
        id: 'deepseek',
        kind: 'builtin',
        protocol: 'openai-chat',
        baseUrl: '',
        apiKey: 'key-3',
        models: [{ id: 'chat', vision: false }]
      },
      {
        id: 'no-key',
        kind: 'custom',
        displayName: 'No Key',
        protocol: 'openai-chat',
        baseUrl: 'https://example.com/v1',
        apiKey: '',
        models: [{ id: 'x', vision: true }]
      }
    ],
    activeProviderId: 'deepseek',
    activeModel: 'chat'
  })),
  acapLlmOnConfigChange: jest.fn(() => () => undefined),
  acapLlmEffectiveModels: (provider: {
    models: Array<{ id: string; vision: boolean }> | null
  }) => provider.models ?? []
}))

jest.mock('../src/ui/AcApLlmProviderLabels', () => ({
  acapLlmProviderLabel: (provider: { id: string; displayName?: string }) =>
    provider.displayName?.trim() || provider.id
}))

import { acapLlmOcrRecognizerId } from '../src/constants'
import { acapLlmSyncOcrRecognizers } from '../src/AcApLlmOcrProviders'

describe('acapLlmSyncOcrRecognizers', () => {
  beforeEach(() => {
    recognizers.clear()
  })

  it('registers one picker entry per keyed vision model', async () => {
    await acapLlmSyncOcrRecognizers()
    expect([...recognizers.keys()].sort()).toEqual(
      [
        acapLlmOcrRecognizerId('kkidc', 'vision-a'),
        acapLlmOcrRecognizerId('kkidc', 'vision-b'),
        acapLlmOcrRecognizerId('openai', 'gpt-4o')
      ].sort()
    )
    const kkidcA = recognizers.get(acapLlmOcrRecognizerId('kkidc', 'vision-a'))
    expect(kkidcA?.auto).toBe(false)
    expect(
      typeof kkidcA?.label === 'function'
        ? (kkidcA.label as () => string)()
        : kkidcA?.label
    ).toBe('kkidc — vision-a')
  })
})
