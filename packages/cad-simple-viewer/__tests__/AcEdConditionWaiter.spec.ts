jest.mock('@mlightcad/data-model', () => ({
  log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

import { AcEdConditionWaiter } from '../src/editor/global/AcEdConditionWaiter'

describe('AcEdConditionWaiter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('runs the action immediately when the condition is already true', () => {
    const action = jest.fn()
    const waiter = new AcEdConditionWaiter(() => true, action, 300, 0)
    waiter.start()
    expect(action).toHaveBeenCalledTimes(1)
    expect(waiter.isRunning()).toBe(false)
  })

  it('waits for the interval when the condition is initially false', () => {
    let ready = false
    const action = jest.fn()
    const waiter = new AcEdConditionWaiter(() => ready, action, 300, 0)
    waiter.start()
    expect(action).not.toHaveBeenCalled()

    ready = true
    jest.advanceTimersByTime(299)
    expect(action).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(action).toHaveBeenCalledTimes(1)
    expect(waiter.isRunning()).toBe(false)
  })
})
