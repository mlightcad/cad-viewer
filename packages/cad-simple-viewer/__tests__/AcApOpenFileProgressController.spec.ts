// @ts-nocheck
const mockProgressInstances: Array<{
  hide: jest.Mock
  show: jest.Mock
  setMessage: jest.Mock
}> = []

const mockEventBusEmit = jest.fn()

jest.mock('../src/app/AcApProgress', () => ({
  AcApProgress: jest.fn().mockImplementation(() => {
    const instance = {
      hide: jest.fn(),
      show: jest.fn(),
      setMessage: jest.fn()
    }
    mockProgressInstances.push(instance)
    return instance
  })
}))

jest.mock('../src/editor', () => ({
  eventBus: {
    emit: mockEventBusEmit
  }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: jest.fn((key: string) => key)
  }
}))

jest.mock('../src/util/yieldToMain', () => ({
  yieldToMain: jest.fn(() => Promise.resolve())
}))

import { yieldToMain } from '../src/util/yieldToMain'
import { AcApOpenFileProgressController } from '../src/app/AcApOpenFileProgressController'

describe('AcApOpenFileProgressController', () => {
  let controller: AcApOpenFileProgressController
  let progress: {
    hide: jest.Mock
    show: jest.Mock
    setMessage: jest.Mock
  }

  beforeEach(() => {
    mockProgressInstances.length = 0
    mockEventBusEmit.mockClear()
    ;(yieldToMain as jest.Mock).mockClear()
    controller = new AcApOpenFileProgressController({} as HTMLElement)
    progress = mockProgressInstances[0]
    progress.hide.mockClear()
    progress.show.mockClear()
    progress.setMessage.mockClear()
  })

  it('emits normalized monotonic open-file progress', () => {
    const database = {}

    const first = controller.handle({
      database,
      percentage: 40,
      stage: 'FETCH_FILE',
      subStageStatus: 'IN-PROGRESS'
    })
    const second = controller.handle({
      database,
      percentage: 30,
      stage: 'FETCH_FILE',
      subStageStatus: 'IN-PROGRESS'
    })

    expect(first.percentage).toBe(40)
    expect(second.percentage).toBe(40)
    expect(mockEventBusEmit).toHaveBeenLastCalledWith(
      'open-file-progress',
      second
    )
    expect(progress.show).toHaveBeenCalled()
  })

  it('resets peak percentage when moving from FETCH_FILE to CONVERSION', () => {
    const database = {}

    controller.handle({
      database,
      percentage: 100,
      stage: 'FETCH_FILE',
      subStageStatus: 'END'
    })
    const next = controller.handle({
      database,
      percentage: 5,
      stage: 'CONVERSION',
      subStage: 'PARSE',
      subStageStatus: 'START'
    })

    expect(next.percentage).toBe(5)
  })

  it('hides the overlay when open-file progress completes', () => {
    controller.handle({
      database: {},
      percentage: 100,
      stage: 'CONVERSION',
      subStage: 'END',
      subStageStatus: 'END'
    })

    expect(progress.hide).toHaveBeenCalledTimes(1)
  })

  it('reset clears tracked progress state', () => {
    const database = {}

    controller.handle({
      database,
      percentage: 50,
      stage: 'FETCH_FILE',
      subStageStatus: 'IN-PROGRESS'
    })
    controller.reset()

    const next = controller.handle({
      database,
      percentage: 20,
      stage: 'FETCH_FILE',
      subStageStatus: 'IN-PROGRESS'
    })

    expect(next.percentage).toBe(20)
  })

  it('beginOpen shows the overlay and yields for paint', async () => {
    await controller.beginOpen({})

    expect(progress.show).toHaveBeenCalled()
    expect(yieldToMain).toHaveBeenCalled()
    expect(mockEventBusEmit).toHaveBeenCalledWith(
      'open-file-progress',
      expect.objectContaining({
        percentage: 0,
        stage: 'CONVERSION',
        subStage: 'START',
        subStageStatus: 'START'
      })
    )
  })

  it('emits fonts-not-loaded when font loading fails but parsing continues', () => {
    controller.handle({
      database: {},
      percentage: 5,
      stage: 'CONVERSION',
      subStage: 'FONT',
      subStageStatus: 'ERROR',
      data: {
        code: 'font_load_failed',
        error: 'Failed to fetch',
        fonts: ['arial', 'simkai']
      }
    })

    expect(mockEventBusEmit).toHaveBeenCalledWith('fonts-not-loaded', {
      fonts: [
        { fontName: 'arial', url: '' },
        { fontName: 'simkai', url: '' }
      ]
    })
  })
})
