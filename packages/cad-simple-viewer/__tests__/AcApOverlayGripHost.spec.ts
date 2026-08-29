/** @jest-environment jsdom */

import { acapBindOverlayPointerDrag } from '../src/command/overlay/AcApOverlayGripHost'
import type { AcTrView2d } from '../src/view'

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

function mockView(overrides: Record<string, unknown> = {}): AcTrView2d {
  return {
    viewportToCanvas: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    screenToWorld: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    worldToScreen: (pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y }),
    canvasToContainer: (pos: { x: number; y: number }) => pos,
    isHtmlDirty: false,
    container: document.body,
    osnapResolver: {
      resolve: jest.fn(() => undefined),
      clearAcquiredCenters: jest.fn(),
      acquiredCenterMarks: []
    },
    ...overrides
  } as unknown as AcTrView2d
}

describe('acapBindOverlayPointerDrag osnap', () => {
  it('snaps endpoint drags to the osnap resolver result', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const resolve = jest.fn(() => ({
      x: 100,
      y: 200,
      z: 0,
      type: 1
    }))
    const view = mockView({
      osnapResolver: {
        resolve,
        clearAcquiredCenters: jest.fn(),
        acquiredCenterMarks: []
      }
    })
    const moves: Array<{ x: number; y: number }> = []

    const unbind = acapBindOverlayPointerDrag({
      view,
      el,
      onMove: world => {
        moves.push({ x: world.x, y: world.y })
      },
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(resolve).toHaveBeenCalled()
    expect(moves[0]).toEqual({ x: 100, y: 200 })

    unbind()
    el.remove()
  })

  it('keeps raw world points when useOsnap is false', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const resolve = jest.fn()
    const view = mockView({
      osnapResolver: {
        resolve,
        clearAcquiredCenters: jest.fn(),
        acquiredCenterMarks: []
      }
    })
    const moves: Array<{ x: number; y: number }> = []

    const unbind = acapBindOverlayPointerDrag({
      view,
      el,
      useOsnap: false,
      onMove: world => {
        moves.push({ x: world.x, y: world.y })
      },
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(resolve).not.toHaveBeenCalled()
    expect(moves[0]).toEqual({ x: 30, y: 20 })

    unbind()
    el.remove()
  })

  it('prefers resolveOverlayGripPoint when the view implements it', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const resolve = jest.fn()
    const resolveOverlayGripPoint = jest.fn(
      (cursor: { x: number; y: number }) => ({
        x: cursor.x + 5,
        y: cursor.y + 7
      })
    )
    const clearOverlayGripOsnap = jest.fn()
    const view = mockView({
      resolveOverlayGripPoint,
      clearOverlayGripOsnap,
      osnapResolver: {
        resolve,
        clearAcquiredCenters: jest.fn(),
        acquiredCenterMarks: []
      }
    })
    const moves: Array<{ x: number; y: number }> = []

    const unbind = acapBindOverlayPointerDrag({
      view,
      el,
      onMove: world => {
        moves.push({ x: world.x, y: world.y })
      },
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(resolve).not.toHaveBeenCalled()
    expect(resolveOverlayGripPoint).toHaveBeenCalled()
    expect(clearOverlayGripOsnap).toHaveBeenCalled()
    expect(moves[0]).toEqual({ x: 35, y: 27 })

    unbind()
    el.remove()
  })

  it('falls back to the cursor when the view has no osnap resolver', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const view = mockView({ osnapResolver: undefined })
    const moves: Array<{ x: number; y: number }> = []

    const unbind = acapBindOverlayPointerDrag({
      view,
      el,
      onMove: world => {
        moves.push({ x: world.x, y: world.y })
      },
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(moves[0]).toEqual({ x: 30, y: 20 })

    unbind()
    el.remove()
  })
})

describe('acapBindOverlayPointerDrag overlay grips', () => {
  it('does not start a drag on an unselected overlay grip', () => {
    const el = document.createElement('div')
    el.className = 'ml-html-grip'
    document.body.appendChild(el)
    const onMove = jest.fn()
    const onDragStart = jest.fn()
    const onCommit = jest.fn()

    const unbind = acapBindOverlayPointerDrag({
      view: mockView(),
      el,
      onDragStart,
      onMove,
      onCommit
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(onDragStart).not.toHaveBeenCalled()
    expect(onMove).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()

    unbind()
    el.remove()
  })

  it('hides overlay grips while dragging and restores them after commit', () => {
    const el = document.createElement('div')
    el.className = 'ml-html-grip ml-html-selected'
    const other = document.createElement('div')
    other.className = 'ml-html-grip ml-html-selected'
    document.body.appendChild(el)
    document.body.appendChild(other)

    const unbind = acapBindOverlayPointerDrag({
      view: mockView(),
      el,
      onMove: () => undefined,
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    expect(el.classList.contains('ml-html-grip-dragging')).toBe(true)
    expect(other.classList.contains('ml-html-grip-dragging')).toBe(true)

    dispatchPointer(window, 'pointerup', 30, 20)
    expect(el.classList.contains('ml-html-grip-dragging')).toBe(false)
    expect(other.classList.contains('ml-html-grip-dragging')).toBe(false)

    unbind()
    el.remove()
    other.remove()
  })

  it('respects isEnabled when it returns false', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const onMove = jest.fn()

    const unbind = acapBindOverlayPointerDrag({
      view: mockView(),
      el,
      isEnabled: () => false,
      onMove,
      onCommit: () => undefined
    })

    dispatchPointer(el, 'pointerdown', 20, 20)
    dispatchPointer(window, 'pointermove', 30, 20)
    dispatchPointer(window, 'pointerup', 30, 20)

    expect(onMove).not.toHaveBeenCalled()

    unbind()
    el.remove()
  })
})
