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
    expect(mockEventBusEmit).toHaveBeenLastCalledWith('open-file-progress', second)
    expect(progress.show).toHaveBeenCalled()
  })

  it('resets peak percentage when moving from FETCH_FILE to CONVERSION', () => {
    const database = {}

    controller.handle({
      database,
      percentage: 80,
      stage: 'FETCH_FILE',
      subStageStatus: 'IN-PROGRESS'
    })

    const conversion = controller.handle({
      database,
      percentage: 10,
      stage: 'CONVERSION',
      subStage: 'ENTITY',
      subStageStatus: 'IN-PROGRESS'
    })

    expect(conversion.percentage).toBe(10)
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
})
