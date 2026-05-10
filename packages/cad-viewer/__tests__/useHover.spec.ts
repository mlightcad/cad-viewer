const unmountCallbacks: Array<() => void> = []

jest.mock('vue', () => {
  const actual = jest.requireActual<typeof import('vue')>('vue')

  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
    onUnmounted: (callback: () => void) => unmountCallbacks.push(callback)
  }
})

class MockEventManager<T> {
  private listeners = new Set<(args: T) => void>()

  addEventListener(listener: (args: T) => void) {
    this.listeners.add(listener)
  }

  removeEventListener(listener: (args: T) => void) {
    this.listeners.delete(listener)
  }

  dispatch(args: T) {
    this.listeners.forEach(listener => listener(args))
  }

  get listenerCount() {
    return this.listeners.size
  }
}

const hoverEvent = new MockEventManager<{ id: string; x: number; y: number }>()
const unhoverEvent = new MockEventManager<{
  id: string
  x: number
  y: number
}>()
const canvasToViewport = jest.fn()
const getIdAt = jest.fn()

const mockDocManager = {
  curDocument: {
    database: {
      tables: {
        blockTable: {
          modelSpace: {
            getIdAt
          }
        }
      }
    }
  },
  curView: {
    canvasToViewport,
    events: {
      hover: hoverEvent,
      unhover: unhoverEvent
    }
  }
}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: mockDocManager
  }
}))

import { useHover } from '../src/composable/useHover'

describe('useHover', () => {
  afterEach(() => {
    while (unmountCallbacks.length > 0) {
      unmountCallbacks.pop()?.()
    }
    canvasToViewport.mockReset()
    getIdAt.mockReset()
  })

  it('tracks hovered entity and converts canvas-local mouse coordinates to viewport coordinates', () => {
    const entity = { objectId: 'entity-1', type: 'LINE' }
    getIdAt.mockReturnValue(entity)
    canvasToViewport.mockReturnValue({ x: 120, y: 80 })

    const hover = useHover()

    hoverEvent.dispatch({ id: 'entity-1', x: 20, y: 30 })

    expect(getIdAt).toHaveBeenCalledWith('entity-1')
    expect(canvasToViewport).toHaveBeenCalledWith({ x: 20, y: 30 })
    expect(hover.hovered.value).toBe(true)
    expect(hover.entity.value).toEqual(entity)
    expect(hover.id.value).toBe('entity-1')
    expect(hover.mouse.value).toEqual({ x: 120, y: 80 })
  })

  it('clears hover state on unhover', () => {
    getIdAt.mockReturnValue({ objectId: 'entity-1', type: 'LINE' })
    canvasToViewport.mockReturnValue({ x: 120, y: 80 })

    const hover = useHover()
    hoverEvent.dispatch({ id: 'entity-1', x: 20, y: 30 })
    unhoverEvent.dispatch({ id: 'entity-1', x: 20, y: 30 })

    expect(hover.hovered.value).toBe(false)
    expect(hover.entity.value).toBeNull()
    expect(hover.id.value).toBeNull()
  })

  it('removes event listeners when unmounted', () => {
    useHover()

    expect(hoverEvent.listenerCount).toBe(1)
    expect(unhoverEvent.listenerCount).toBe(1)

    while (unmountCallbacks.length > 0) {
      unmountCallbacks.pop()?.()
    }

    expect(hoverEvent.listenerCount).toBe(0)
    expect(unhoverEvent.listenerCount).toBe(0)
  })
})
