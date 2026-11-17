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
      label: 'Test',
      recognize: async () => {
        throw new Error('offline')
      }
    })
    AcApTextRecognitionService.register({
      id: 'b',
      label: 'Test',
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
      label: 'Test',
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
      label: 'Test',
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
      label: 'Test',
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
      label: 'Test',
        recognize: async () => undefined,
        recognizeBatch: async () => ['A', '', undefined]
      })
      const seen: string[] = []
      AcApTextRecognitionService.register({
        id: 'b',
      label: 'Test',
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
      label: 'Test',
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
      label: 'Test',
      recognize: async () => undefined
    })
    expect(AcApTextRecognitionService.hasRecognizer).toBe(true)
    expect(AcApTextRecognitionService.has('a')).toBe(true)
    dispose()
    expect(AcApTextRecognitionService.hasRecognizer).toBe(false)
    expect(AcApTextRecognitionService.has('a')).toBe(false)
  })

  it('dispatches events.changed on register and unregister', () => {
    const seen: Array<{ id: string; type: string }> = []
    const listener = (args: { id: string; type: string }) => {
      seen.push({ id: args.id, type: args.type })
    }
    AcApTextRecognitionService.events.changed.addEventListener(listener)
    AcApTextRecognitionService.register({
      id: 'a',
      label: 'Test',
      recognize: async () => undefined
    })
    AcApTextRecognitionService.unregister('a')
    AcApTextRecognitionService.events.changed.removeEventListener(listener)
    expect(seen).toEqual([
      { id: 'a', type: 'register' },
      { id: 'a', type: 'unregister' }
    ])
  })

  it('lists only available recognizers', async () => {
    AcApTextRecognitionService.register({
      id: 'a',
      label: 'Alpha',
      isAvailable: async () => false,
      recognize: async () => 'a'
    })
    AcApTextRecognitionService.register({
      id: 'b',
      label: () => 'Beta',
      isAvailable: async () => true,
      recognize: async () => 'b'
    })
    await expect(AcApTextRecognitionService.listAvailable()).resolves.toEqual([
      { id: 'b', label: 'Beta' }
    ])
  })

  it('honors recognizerId and skips other providers', async () => {
    const a = jest.fn(async () => 'FROM-A')
    const b = jest.fn(async () => 'FROM-B')
    AcApTextRecognitionService.register({
      id: 'a',
      label: 'A',
      recognize: a
    })
    AcApTextRecognitionService.register({
      id: 'b',
      label: 'B',
      recognize: b
    })
    await expect(
      AcApTextRecognitionService.recognize(
        { image: 'data:' },
        { recognizerId: 'b' }
      )
    ).resolves.toBe('FROM-B')
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('skips auto:false recognizers unless recognizerId is set', async () => {
    const auto = jest.fn(async () => 'AUTO')
    const picker = jest.fn(async () => 'PICKER')
    AcApTextRecognitionService.register({
      id: 'a',
      label: 'Auto',
      recognize: auto
    })
    AcApTextRecognitionService.register({
      id: 'b',
      label: 'Picker',
      auto: false,
      recognize: picker
    })
    await expect(
      AcApTextRecognitionService.recognize({ image: 'data:' })
    ).resolves.toBe('AUTO')
    expect(picker).not.toHaveBeenCalled()
    await expect(
      AcApTextRecognitionService.recognize(
        { image: 'data:' },
        { recognizerId: 'b' }
      )
    ).resolves.toBe('PICKER')
  })

  it('runs refresh before listing available recognizers', async () => {
    const refresh = jest.fn(async () => {
      AcApTextRecognitionService.register({
        id: 'b',
        label: 'Added',
        recognize: async () => 'b'
      })
    })
    AcApTextRecognitionService.register({
      id: 'a',
      label: 'Seed',
      isAvailable: () => false,
      refresh,
      recognize: async () => undefined
    })
    await expect(AcApTextRecognitionService.listAvailable()).resolves.toEqual([
      { id: 'b', label: 'Added' }
    ])
    expect(refresh).toHaveBeenCalled()
    AcApTextRecognitionService.unregister('b')
  })
})
