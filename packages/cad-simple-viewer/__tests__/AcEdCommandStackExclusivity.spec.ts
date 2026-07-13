jest.mock('../src/app/AcApDocManager', () => ({
  AcApDocManager: {
    instance: {
      editor: { showMessage: jest.fn() },
      showBusyIndicator: jest.fn(),
      hideBusyIndicator: jest.fn(),
      withBusyIndicator: jest.fn(async (work: () => unknown) => work())
    }
  }
}))

import { AcEdCommand } from '../src/editor/command/AcEdCommand'
import { AcEdCommandStack } from '../src/editor/command/AcEdCommandStack'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

/**
 * Minimal stub for the view→editor chain used by AcEdCommandStack.cancelActive.
 * Only `editor.cancelActiveInput` is reached, so everything else can be left
 * undefined.
 */
const makeStubView = (cancelSpy: jest.Mock) =>
  ({
    editor: { cancelActiveInput: cancelSpy }
  }) as unknown as AcEdBaseView

class DummyCommand extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'DUMMY'
    this.localName = 'DUMMY'
  }
}

describe('AcEdCommandStack — command exclusivity', () => {
  test('activeCommand is null before any command is marked active', () => {
    const stack = new AcEdCommandStack()
    expect(stack.activeCommand).toBeNull()
  })

  test('markActive records the active command and clearActive releases it', () => {
    const stack = new AcEdCommandStack()
    const cmd = new DummyCommand()
    const view = makeStubView(jest.fn())
    const promise = Promise.resolve()

    stack.markActive(cmd, view, promise)
    expect(stack.activeCommand).toBe(cmd)

    stack.clearActive(cmd)
    expect(stack.activeCommand).toBeNull()
  })

  test('clearActive ignores stale commands (identity guard)', () => {
    const stack = new AcEdCommandStack()
    const first = new DummyCommand()
    const second = new DummyCommand()
    const view = makeStubView(jest.fn())

    stack.markActive(first, view, Promise.resolve())
    stack.markActive(second, view, Promise.resolve())

    // Trying to clear the prior active should NOT release the current slot.
    stack.clearActive(first)
    expect(stack.activeCommand).toBe(second)

    stack.clearActive(second)
    expect(stack.activeCommand).toBeNull()
  })

  test('cancelActive is a no-op when no command is active', async () => {
    const stack = new AcEdCommandStack()
    await expect(stack.cancelActive()).resolves.toBeUndefined()
  })

  test('cancelActive invokes editor.cancelActiveInput and awaits the active promise', async () => {
    const stack = new AcEdCommandStack()
    const cmd = new DummyCommand()
    const cancelSpy = jest.fn()
    const view = makeStubView(cancelSpy)

    let resolveTrigger!: () => void
    const triggerPromise = new Promise<void>(resolve => {
      resolveTrigger = resolve
    })

    stack.markActive(cmd, view, triggerPromise)

    let cancelSettled = false
    const cancelPromise = stack.cancelActive().then(() => {
      cancelSettled = true
    })

    // The editor must be told to cancel synchronously.
    expect(cancelSpy).toHaveBeenCalledTimes(1)
    // But the call should not resolve until the in-flight trigger settles.
    await Promise.resolve()
    expect(cancelSettled).toBe(false)

    resolveTrigger()
    await cancelPromise
    expect(cancelSettled).toBe(true)
  })

  test('cancelActive swallows errors from the cancelled command trigger', async () => {
    const stack = new AcEdCommandStack()
    const cmd = new DummyCommand()
    const view = makeStubView(jest.fn())
    const failingPromise = Promise.reject(new Error('boom'))
    // Pre-handle so node doesn't flag the rejection.
    failingPromise.catch(() => undefined)

    stack.markActive(cmd, view, failingPromise)

    await expect(stack.cancelActive()).resolves.toBeUndefined()
  })
})
