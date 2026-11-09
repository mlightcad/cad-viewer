import { AcApTextRecognitionService } from '../src/service/AcApTextRecognitionService'

describe('AcApTextRecognitionService', () => {
  afterEach(() => {
    AcApTextRecognitionService.unregister('a')
    AcApTextRecognitionService.unregister('b')
  })

  it('returns undefined without recognizers', async () => {
    expect(AcApTextRecognitionService.hasRecognizer).toBe(false)
    await expect(
      AcApTextRecognitionService.recognize({ image: 'data:' })
    ).resolves.toBeUndefined()
  })

  it('falls through empty answers and errors to the next recognizer', async () => {
    AcApTextRecognitionService.register({
      id: 'a',
      recognize: async () => {
        throw new Error('offline')
      }
    })
    AcApTextRecognitionService.register({
      id: 'b',
      recognize: async () => '  LEVEL 1  '
    })
    await expect(
      AcApTextRecognitionService.recognize({ image: 'data:' })
    ).resolves.toBe('LEVEL 1')
  })

  it('unregisters through the returned disposer', () => {
    const dispose = AcApTextRecognitionService.register({
      id: 'a',
      recognize: async () => undefined
    })
    expect(AcApTextRecognitionService.hasRecognizer).toBe(true)
    dispose()
    expect(AcApTextRecognitionService.hasRecognizer).toBe(false)
  })
})
