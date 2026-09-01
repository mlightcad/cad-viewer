import type { AcApContext } from '../src/app/AcApContext'
import { AcApMarkupDrawCmd } from '../src/command/markup/AcApMarkupDrawCmd'
import {
  AcApMeasureDrawCmd,
  withMeasureInput
} from '../src/command/measure/AcApMeasureDrawCmd'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'
import {
  acuiRegisterDrawStyleSessionHost,
  acuiUnregisterDrawStyleSessionHost
} from '../src/ui/AcUiDrawStyle'

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
    const setActiveKind = jest.fn()
    acuiRegisterDrawStyleSessionHost(view as never, {
      setActiveKind,
      createSessionAccessory: () => accessory
    })
    const cmd = new MeasureDrawStub()
    cmd.globalName = 'measuredistance'
    expect(cmd.mode).toBe(AcEdOpenMode.Read)
    expect(cmd.createSessionAccessory({ view } as AcApContext)).toBe(accessory)
    expect(setActiveKind).toHaveBeenCalledWith('measure')
    acuiUnregisterDrawStyleSessionHost(view as never)
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
    const setActiveKind = jest.fn()
    acuiRegisterDrawStyleSessionHost(view as never, {
      setActiveKind,
      createSessionAccessory: () => accessory
    })
    const cmd = new MarkupDrawStub()
    cmd.globalName = 'markuptext'
    expect(cmd.mode).toBe(AcEdOpenMode.Review)
    expect(cmd.recordsUndoStack).toBe(false)
    expect(cmd.createSessionAccessory({ view } as AcApContext)).toBe(accessory)
    expect(setActiveKind).toHaveBeenCalledWith('markup')
    acuiUnregisterDrawStyleSessionHost(view as never)
  })
})
