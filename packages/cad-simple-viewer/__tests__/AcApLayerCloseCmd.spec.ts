jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class AcEdCommand {}

  return {
    AcEdCommand,
    eventBus: {
      emit: jest.fn()
    }
  }
})

import { AcApLayerCloseCmd } from '../src/command/layer/AcApLayerCloseCmd'
import { eventBus } from '../src/editor'

describe('AcApLayerCloseCmd', () => {
  test('emits close-layer-manager when executed', async () => {
    const cmd = new AcApLayerCloseCmd()
    const emit = jest.mocked(eventBus.emit)

    await cmd.execute({} as never)

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('close-layer-manager', {})
  })
})
