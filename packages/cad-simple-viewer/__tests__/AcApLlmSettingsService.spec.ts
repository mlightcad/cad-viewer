import {
  AcApLlmSettingsService,
  type AcApLlmSettingsProvider
} from '../src/service/AcApLlmSettingsService'

function createProvider(
  id: string,
  overrides: Partial<AcApLlmSettingsProvider> = {}
): AcApLlmSettingsProvider {
  return {
    id,
    open: jest.fn(async () => undefined),
    getStatus: jest.fn(async () => ({ configured: true, vision: false })),
    ...overrides
  }
}

describe('AcApLlmSettingsService', () => {
  afterEach(() => {
    AcApLlmSettingsService.unregister('a')
    AcApLlmSettingsService.unregister('b')
  })

  it('reports nothing without a provider', async () => {
    expect(AcApLlmSettingsService.isAvailable).toBe(false)
    await expect(AcApLlmSettingsService.open()).resolves.toBe(false)
    await expect(AcApLlmSettingsService.getStatus()).resolves.toBeUndefined()
  })

  it('opens the latest registered provider', async () => {
    const first = createProvider('a')
    const second = createProvider('b')
    AcApLlmSettingsService.register(first)
    AcApLlmSettingsService.register(second)

    await expect(AcApLlmSettingsService.open()).resolves.toBe(true)
    expect(second.open).toHaveBeenCalledTimes(1)
    expect(first.open).not.toHaveBeenCalled()
  })

  it('swallows status errors', async () => {
    AcApLlmSettingsService.register(
      createProvider('a', {
        getStatus: async () => {
          throw new Error('storage unavailable')
        }
      })
    )
    await expect(AcApLlmSettingsService.getStatus()).resolves.toBeUndefined()
  })

  it('unregisters only its own provider', () => {
    const first = createProvider('a')
    const dispose = AcApLlmSettingsService.register(first)
    AcApLlmSettingsService.register(createProvider('b'))
    dispose()
    expect(AcApLlmSettingsService.isAvailable).toBe(true)
  })
})
