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

jest.mock('../src/util/yieldToMain', () => ({
  yieldToMain: jest.fn(() => Promise.resolve())
}))

jest.mock('../src/editor', () => ({
  eventBus: {
    emit: mockEventBusEmit
  }
}))

import { AcApBusyIndicator } from '../src/app/AcApBusyIndicator'
import { yieldToMain } from '../src/util/yieldToMain'

describe('AcApBusyIndicator', () => {
  let indicator: AcApBusyIndicator
  let progress: {
    hide: jest.Mock
    show: jest.Mock
    setMessage: jest.Mock
  }

  beforeEach(() => {
    mockProgressInstances.length = 0
    mockEventBusEmit.mockClear()
    ;(yieldToMain as jest.Mock).mockClear()
    ;(yieldToMain as jest.Mock).mockImplementation(() => Promise.resolve())
    indicator = new AcApBusyIndicator({} as HTMLElement)
    progress = mockProgressInstances[0]
    progress.hide.mockClear()
    progress.show.mockClear()
    progress.setMessage.mockClear()
  })

  it('shows and hides the busy overlay with an optional message', () => {
    indicator.show('Exporting DXF ...')

    expect(progress.setMessage).toHaveBeenCalledWith('Exporting DXF ...')
    expect(progress.show).toHaveBeenCalledTimes(1)
    expect(mockEventBusEmit).toHaveBeenCalledWith('busy-indicator', {
      visible: true,
      message: 'Exporting DXF ...'
    })

    indicator.hide()

    expect(progress.hide).toHaveBeenCalledTimes(1)
    expect(mockEventBusEmit).toHaveBeenLastCalledWith('busy-indicator', {
      visible: false,
      message: undefined
    })
  })

  it('keeps the overlay visible until nested show/hide calls unwind', () => {
    indicator.show('Outer')
    indicator.show('Inner')

    expect(progress.show).toHaveBeenCalledTimes(1)
    expect(progress.setMessage).toHaveBeenLastCalledWith('Inner')

    indicator.hide()
    expect(progress.hide).not.toHaveBeenCalled()

    indicator.hide()
    expect(progress.hide).toHaveBeenCalledTimes(1)
  })

  it('updates the message while the overlay is active', () => {
    indicator.show('Starting ...')
    indicator.setMessage('Almost done ...')

    expect(progress.setMessage).toHaveBeenLastCalledWith('Almost done ...')
    expect(mockEventBusEmit).toHaveBeenLastCalledWith('busy-indicator', {
      visible: true,
      message: 'Almost done ...'
    })
  })

  it('hides the overlay when withBusyIndicator work throws', async () => {
    await expect(
      indicator.withBusyIndicator(async () => {
        throw new Error('failed')
      }, 'Working ...')
    ).rejects.toThrow('failed')

    expect(progress.show).toHaveBeenCalledTimes(1)
    expect(progress.hide).toHaveBeenCalledTimes(1)
  })

  it('returns the work result from withBusyIndicator', async () => {
    const result = await indicator.withBusyIndicator(async () => 'done', 'Working ...')

    expect(result).toBe('done')
    expect(progress.hide).toHaveBeenCalledTimes(1)
  })

  it('yields to the browser after show and before work runs', async () => {
    const order: string[] = []
    ;(yieldToMain as jest.Mock).mockImplementation(async () => {
      order.push('yield')
    })

    await indicator.withBusyIndicator(() => {
      order.push('work')
      return 'done'
    })

    expect(order).toEqual(['yield', 'work'])
    expect(yieldToMain).toHaveBeenCalledTimes(1)
    expect(progress.show).toHaveBeenCalledTimes(1)
  })

  it('ignores extra hide calls when the reference count is already zero', () => {
    indicator.hide()

    expect(progress.hide).not.toHaveBeenCalled()
  })
})
