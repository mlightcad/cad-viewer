import type { AcApContext } from '../src/app/AcApContext'
import { AcApMarkupDrawCmd } from '../src/command/markup/AcApMarkupDrawCmd'
import {
  AcApMeasureDrawCmd,
  withMeasureInput
} from '../src/command/measure/AcApMeasureDrawCmd'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'

jest.mock('../src/app/AcApSettingManager', () => ({
  AcApSettingManager: {
    instance: {
      isShowRibbon: false,
      events: {
        modified: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }
    }
  }
}))

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
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const setActiveKind = jest.fn()
    const view = {
      container,
      drawStyleSessionHost: {
        setActiveKind,
        createSessionAccessory: () => accessory
      }
    }
    const cmd = new MeasureDrawStub()
    cmd.globalName = 'measuredistance'
    expect(cmd.mode).toBe(AcEdOpenMode.Read)
    expect(cmd.sessionAccessory?.id).toBe('draw-style')
    cmd.sessionAccessory!.mount({
      host: container,
      type: 'desktop',
      view: view as never
    })
    expect(setActiveKind).toHaveBeenCalledWith('measure')
    expect(accessory.mount).toHaveBeenCalled()
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
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const setActiveKind = jest.fn()
    const view = {
      container,
      drawStyleSessionHost: {
        setActiveKind,
        createSessionAccessory: () => accessory
      }
    }
    const cmd = new MarkupDrawStub()
    cmd.globalName = 'markuptext'
    expect(cmd.mode).toBe(AcEdOpenMode.Review)
    expect(cmd.recordsUndoStack).toBe(false)
    expect(cmd.sessionAccessory?.id).toBe('draw-style')
    cmd.sessionAccessory!.mount({
      host: container,
      type: 'desktop',
      view: view as never
    })
    expect(setActiveKind).toHaveBeenCalledWith('markup')
  })
})
