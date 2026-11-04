import {
  createBuiltinProviderConfig,
  createDefaultLlmConfig,
  ensureActiveProvider,
  restoreModelEntries
} from '../src/storage/LlmSettingsStore'
import {
  BUILTIN_PROVIDERS,
  visionAfterIdEdit
} from '../src/storage/modelCatalog'

describe('visionAfterIdEdit', () => {
  it('follows the id guess while typing a new model id', () => {
    // Typed character by character: "g" alone is not a vision model, but the
    // finished id is, so the flag must not freeze at the first keystroke.
    let row = { id: '', vision: false }
    for (const id of ['g', 'gp', 'gpt-4', 'gpt-4o']) {
      row = { id, vision: visionAfterIdEdit(row, id) }
    }
    expect(row.vision).toBe(true)
  })

  it('keeps a flag the user set explicitly', () => {
    expect(
      visionAfterIdEdit({ id: 'my-model', vision: true }, 'my-model-2')
    ).toBe(true)
    expect(
      visionAfterIdEdit({ id: 'gpt-4o', vision: false }, 'gpt-4o-mini')
    ).toBe(false)
  })
})

describe('restoreModelEntries', () => {
  it('drops malformed entries and coerces vision', () => {
    expect(
      restoreModelEntries([
        { id: 'a', vision: true },
        { id: 'b', name: 'B' },
        { id: '' },
        null,
        'c',
        { name: 'no id' }
      ])
    ).toEqual([
      { id: 'a', vision: true },
      { id: 'b', name: 'B', vision: false }
    ])
  })

  it('returns null for a missing catalog', () => {
    expect(restoreModelEntries(undefined)).toBeNull()
  })
})

describe('ensureActiveProvider', () => {
  it('keeps a known active provider', () => {
    const config = createDefaultLlmConfig()
    expect(ensureActiveProvider(config)).toBe(config)
  })

  it('falls back when the active custom provider no longer exists', () => {
    const deepseek = { ...createBuiltinProviderConfig('deepseek'), apiKey: 'k' }
    expect(
      ensureActiveProvider({
        providers: [deepseek],
        activeProviderId: 'gone-gateway',
        activeModel: 'some-model'
      })
    ).toEqual({
      providers: [deepseek],
      activeProviderId: 'deepseek',
      activeModel: BUILTIN_PROVIDERS.deepseek.models[0].id
    })
  })
})
