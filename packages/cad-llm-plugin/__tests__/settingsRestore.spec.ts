import {
  acapLlmCreateBuiltinProvider,
  acapLlmCreateDefaultConfig,
  acapLlmEnsureActiveProvider,
  acapLlmRestoreModelEntries
} from '../src/storage/AcApLlmConfigStore'
import {
  ACAP_LLM_BUILTIN_PROVIDERS,
  acapLlmVisionAfterIdEdit
} from '../src/storage/AcApLlmModelCatalog'

describe('acapLlmVisionAfterIdEdit', () => {
  it('follows the id guess while typing a new model id', () => {
    // Typed character by character: "g" alone is not a vision model, but the
    // finished id is, so the flag must not freeze at the first keystroke.
    let row = { id: '', vision: false }
    for (const id of ['g', 'gp', 'gpt-4', 'gpt-4o']) {
      row = { id, vision: acapLlmVisionAfterIdEdit(row, id) }
    }
    expect(row.vision).toBe(true)
  })

  it('keeps a flag the user set explicitly', () => {
    expect(
      acapLlmVisionAfterIdEdit({ id: 'my-model', vision: true }, 'my-model-2')
    ).toBe(true)
    expect(
      acapLlmVisionAfterIdEdit({ id: 'gpt-4o', vision: false }, 'gpt-4o-mini')
    ).toBe(false)
  })
})

describe('acapLlmRestoreModelEntries', () => {
  it('drops malformed entries and coerces vision', () => {
    expect(
      acapLlmRestoreModelEntries([
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
    expect(acapLlmRestoreModelEntries(undefined)).toBeNull()
  })
})

describe('acapLlmEnsureActiveProvider', () => {
  it('keeps a known active provider', () => {
    const config = acapLlmCreateDefaultConfig()
    expect(acapLlmEnsureActiveProvider(config)).toBe(config)
  })

  it('falls back when the active custom provider no longer exists', () => {
    const deepseek = {
      ...acapLlmCreateBuiltinProvider('deepseek'),
      apiKey: 'k'
    }
    expect(
      acapLlmEnsureActiveProvider({
        providers: [deepseek],
        activeProviderId: 'gone-gateway',
        activeModel: 'some-model'
      })
    ).toEqual({
      providers: [deepseek],
      activeProviderId: 'deepseek',
      activeModel: ACAP_LLM_BUILTIN_PROVIDERS.deepseek.models[0].id
    })
  })
})
