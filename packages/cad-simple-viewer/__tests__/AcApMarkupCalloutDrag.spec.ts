/** @jest-environment jsdom */

jest.mock('../src/command/markup/AcApMarkupShapeCallout', () => ({
  computeLeaderTipOnShape: (
    _outline: unknown,
    point: { x: number; y: number }
  ) => point
}))

import { bindMarkupPointerDrag } from '../src/command/markup/AcApMarkupCalloutDrag'
import type { AcTrView2d } from '../src/view'

function mockView(): AcTrView2d {
  return {
    viewportToCanvas: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    screenToWorld: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    isDirty: false
  } as unknown as AcTrView2d
}

function dispatchPointer(
  target: EventTarget,
  type: string,
  clientX: number,
  clientY: number,
  extra?: { button?: number; detail?: number; pointerId?: number }
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: extra?.button ?? 0,
    clientX,
    clientY,
    detail: extra?.detail ?? 0
  })
  Object.assign(event, { pointerId: extra?.pointerId ?? 1 })
  target.dispatchEvent(event)
}

describe('bindMarkupPointerDrag', () => {
  it('tracks a second drag across the window after the handle leaves the pointer', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const view = mockView()
    const moves: Array<{ x: number; y: number }> = []
    const commits: number[] = []

    const unbind = bindMarkupPointerDrag({
      view,
      el,
      onMove: world => {
        moves.push({ x: world.x, y: world.y })
      },
      onCommit: () => {
        commits.push(moves.length)
      }
    })

    const dragFar = (
      startX: number,
      startY: number,
      endX: number,
      endY: number
    ) => {
      dispatchPointer(el, 'pointerdown', startX, startY)
      dispatchPointer(window, 'pointermove', startX + 10, startY)
      dispatchPointer(window, 'pointermove', endX, endY)
      dispatchPointer(window, 'pointerup', endX, endY)
    }

    dragFar(20, 20, 400, 300)
    dragFar(400, 300, 50, 80)

    expect(commits).toEqual([2, 4])
    expect(moves[0]).toEqual({ x: 30, y: 20 })
    expect(moves[1]).toEqual({ x: 400, y: 300 })
    expect(moves[2]).toEqual({ x: 410, y: 300 })
    expect(moves[3]).toEqual({ x: 50, y: 80 })

    unbind()
    el.remove()
  })

  it('does not start a drag for a click below the move threshold', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const view = mockView()
    const onMove = jest.fn()
    const onCommit = jest.fn()

    const unbind = bindMarkupPointerDrag({
      view,
      el,
      onMove,
      onCommit
    })

    dispatchPointer(el, 'pointerdown', 10, 10)
    dispatchPointer(window, 'pointermove', 12, 11)
    dispatchPointer(window, 'pointerup', 12, 11)

    expect(onMove).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()

    unbind()
    el.remove()
  })
})
