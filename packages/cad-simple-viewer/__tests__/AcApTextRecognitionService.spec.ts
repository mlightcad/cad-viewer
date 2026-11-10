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

  it('reports recognizer errors to onError, but not aborts', async () => {
    const error = new Error('Invalid API key')
    AcApTextRecognitionService.register({
      id: 'a',
      recognize: async () => {
        throw error
      }
    })
    const onError = jest.fn()
    await expect(
      AcApTextRecognitionService.recognize({ image: 'data:' }, { onError })
    ).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledWith(error, 'a')

    const controller = new AbortController()
    AcApTextRecognitionService.register({
      id: 'a',
      recognize: async () => {
        controller.abort()
        throw new DOMException('aborted', 'AbortError')
      }
    })
    onError.mockClear()
    await AcApTextRecognitionService.recognize(
      { image: 'data:', signal: controller.signal },
      { onError }
    )
    expect(onError).not.toHaveBeenCalled()
  })

  describe('recognizeBatch', () => {
    it('reads all images in one call of a batch recognizer', async () => {
      const recognizeBatch = jest.fn(async () => [' A ', undefined, 'C'])
      AcApTextRecognitionService.register({
        id: 'a',
        recognize: async () => 'single',
        recognizeBatch
      })
      await expect(
        AcApTextRecognitionService.recognizeBatch({ images: ['1', '2', '3'] })
      ).resolves.toEqual(['A', undefined, 'C'])
      expect(recognizeBatch).toHaveBeenCalledTimes(1)
    })

    it('asks the next recognizer only for images still unread', async () => {
      AcApTextRecognitionService.register({
        id: 'a',
        recognize: async () => undefined,
        recognizeBatch: async () => ['A', '', undefined]
      })
      const seen: string[] = []
      AcApTextRecognitionService.register({
        id: 'b',
        recognize: async request => {
          seen.push(request.image)
          return `b${request.image}`
        }
      })
      await expect(
        AcApTextRecognitionService.recognizeBatch({ images: ['1', '2', '3'] })
      ).resolves.toEqual(['A', 'b2', 'b3'])
      expect(seen.sort()).toEqual(['2', '3'])
    })

    it('reports a failed batch and leaves its images unread', async () => {
      const error = new Error('quota exceeded')
      AcApTextRecognitionService.register({
        id: 'a',
        recognize: async () => undefined,
        recognizeBatch: async () => {
          throw error
        }
      })
      const onError = jest.fn()
      await expect(
        AcApTextRecognitionService.recognizeBatch(
          { images: ['1', '2'] },
          { onError }
        )
      ).resolves.toEqual([undefined, undefined])
      expect(onError).toHaveBeenCalledWith(error, 'a')
    })
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
