/**
 * @jest-environment jsdom
 */
import { AcEdMarkerManager } from '../src/editor/input/marker/AcEdOSnapMarkerManager'
import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

function mockView(): AcEdBaseView {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return {
    container,
    worldToScreen: (pos: { x: number; y: number }) => ({ x: pos.x, y: pos.y }),
    canvasToContainer: (pos: { x: number; y: number }) => pos
  } as unknown as AcEdBaseView
}

describe('AcEdMarkerManager hint markers', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('reuses DOM nodes when the acquired-center set is unchanged', () => {
    const view = mockView()
    const manager = new AcEdMarkerManager(view)
    const positions = [
      { x: 10, y: 20 },
      { x: 30, y: 40 }
    ]
    manager.setHintMarkers(positions)
    const first = [...view.container.querySelectorAll('.ml-marker')]
    expect(first).toHaveLength(2)

    manager.setHintMarkers(positions.map(pos => ({ ...pos })))
    const second = [...view.container.querySelectorAll('.ml-marker')]
    expect(second).toHaveLength(2)
    expect(second[0]).toBe(first[0])
    expect(second[1]).toBe(first[1])

    manager.clear()
  })

  it('adds and removes only the changed ticks instead of rebuilding the set', () => {
    const view = mockView()
    const manager = new AcEdMarkerManager(view)
    manager.setHintMarkers([
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ])
    const first = view.container.querySelector('.ml-marker')

    manager.setHintMarkers([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 }
    ])
    const grown = [...view.container.querySelectorAll('.ml-marker')]
    expect(grown).toHaveLength(3)
    expect(grown[0]).toBe(first)

    manager.setHintMarkers([{ x: 9, y: 9 }])
    expect(view.container.querySelectorAll('.ml-marker')).toHaveLength(1)

    manager.clear()
  })

  it('repositions the snap marker instead of recreating it', () => {
    const view = mockView()
    const manager = new AcEdMarkerManager(view)
    manager.showOrRepositionMarker({ x: 1, y: 2 }, 'circle')
    const el = view.container.querySelector('.ml-marker') as HTMLElement
    expect(el).not.toBeNull()

    manager.showOrRepositionMarker({ x: 8, y: 9 }, 'circle')
    expect(view.container.querySelector('.ml-marker')).toBe(el)
    expect(el.style.left).toBe('8px')
    expect(el.style.top).toBe('9px')

    manager.clear()
  })
})
