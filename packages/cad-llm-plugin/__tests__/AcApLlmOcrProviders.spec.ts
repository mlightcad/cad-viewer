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

const registerCalls: string[] = []

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApTextRecognitionService: {
    has: (id: string) => recognizers.has(id),
    register: (recognizer: {
      id: string
      label: string | (() => string)
      auto?: boolean
      recognize: (request: { image: string }) => Promise<string | undefined>
    }) => {
      registerCalls.push(recognizer.id)
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

import { acapLlmSyncOcrRecognizers } from '../src/AcApLlmOcrProviders'
import { acapLlmOcrRecognizerId } from '../src/constants'

describe('acapLlmSyncOcrRecognizers', () => {
  beforeEach(() => {
    recognizers.clear()
    registerCalls.length = 0
  })

  it('does not re-register unchanged recognizers on a repeated sync', async () => {
    await acapLlmSyncOcrRecognizers()
    const first = registerCalls.length
    expect(first).toBeGreaterThan(0)

    // Each register fires `changed`; the PDF dropdown answers with
    // `listAvailable()`, which syncs again. A no-op sync must stay silent or
    // the two keep triggering each other forever.
    await acapLlmSyncOcrRecognizers()
    expect(registerCalls).toHaveLength(first)

    // An entry removed elsewhere is registered again.
    const id = acapLlmOcrRecognizerId('openai', 'gpt-4o')
    recognizers.delete(id)
    await acapLlmSyncOcrRecognizers()
    expect(registerCalls.slice(first)).toEqual([id])
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
