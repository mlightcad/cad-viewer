import type { AcApContext } from '../src/app/AcApContext'
import { AcApMarkupDrawCmd } from '../src/command/markup/AcApMarkupDrawCmd'
import {
  AcApMeasureDrawCmd,
  withMeasureInput
} from '../src/command/measure/AcApMeasureDrawCmd'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'
import {
  acapRegisterDrawStyleSessionHost,
  acapUnregisterDrawStyleSessionHost
} from '../src/ui/AcApDrawStyle'

class MeasureDrawStub extends AcApMeasureDrawCmd {
  async execute(): Promise<void> {
    return
  }
}

class MarkupDrawStub extends AcApMarkupDrawCmd {
  async execute(): Promise<void> {
    return
  }
}

describe('AcApMeasureDrawCmd', () => {
  it('sets Read mode and binds the draw-style session accessory', () => {
    const view = {}
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    acapRegisterDrawStyleSessionHost(view as never, {
      createSessionAccessory: () => accessory
    })
    const cmd = new MeasureDrawStub()
    expect(cmd.mode).toBe(AcEdOpenMode.Read)
    expect(cmd.createSessionAccessory({ view } as AcApContext)).toBe(accessory)
    acapUnregisterDrawStyleSessionHost(view as never)
    expect(cmd.createSessionAccessory({ view } as AcApContext)).toBeNull()
  })

  it('runs the body in selection mode with a crosshair cursor', async () => {
    const withCursor = jest.fn(async (_type, fn: () => Promise<void>) => {
      await fn()
    })
    const withMode = jest.fn(async (_mode, fn: () => Promise<void>) => {
      await fn()
    })
    const context = {
      view: {
        withMode,
        editor: { withCursor }
      }
    } as unknown as AcApContext
    const body = jest.fn()
    await withMeasureInput(context, body)
    expect(withMode).toHaveBeenCalledWith(0, expect.any(Function))
    expect(withCursor).toHaveBeenCalledWith(0, body)
    expect(body).toHaveBeenCalledTimes(1)
  })
})

describe('AcApMarkupDrawCmd', () => {
  it('sets Review mode, skips empty undo marks, and binds the accessory', () => {
    const view = {}
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    acapRegisterDrawStyleSessionHost(view as never, {
      createSessionAccessory: () => accessory
    })
    const cmd = new MarkupDrawStub()
    expect(cmd.mode).toBe(AcEdOpenMode.Review)
    expect(cmd.recordsUndoStack).toBe(false)
    expect(cmd.createSessionAccessory({ view } as AcApContext)).toBe(accessory)
    acapUnregisterDrawStyleSessionHost(view as never)
  })
})
