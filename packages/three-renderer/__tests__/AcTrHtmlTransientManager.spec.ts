/** @jest-environment jsdom */

import * as THREE from 'three'

import { AcTrHtmlCanvasOverlay } from '../src/html/AcTrHtmlCanvasOverlay'
import { AcTrHtmlElement } from '../src/html/AcTrHtmlElement'
import { AcTrHtmlGroup } from '../src/html/AcTrHtmlGroup'
import { AcTrHtmlTransientManager } from '../src/html/AcTrHtmlTransientManager'

function getEntry(manager: AcTrHtmlTransientManager, id: string) {
  return manager.get(id)!
}

describe('AcTrHtmlTransientManager', () => {
  it('composes applyTransforms with the baseline placement matrix', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const element = document.createElement('div')

    manager.add(
      new AcTrHtmlElement(element, {
        id: 'label-1',
        worldPosition: { x: 100, y: 50 }
      })
    )

    const delta = new THREE.Matrix4().makeTranslation(10, 20, 0)
    expect(manager.applyTransforms([{ id: 'label-1', matrix: delta }])).toBe(
      true
    )

    const expected = new THREE.Matrix4()
      .makeTranslation(10, 20, 0)
      .multiply(new THREE.Matrix4().makeTranslation(100, 50, 0))
    const object = getEntry(manager, 'label-1').object

    expect(object.matrix.equals(expected)).toBe(true)
    expect(object.matrixAutoUpdate).toBe(false)

    manager.dispose()
  })

  it('keeps screen size constant when scaleWithView is false (default)', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const element = document.createElement('div')
    element.style.transform = 'translate(-50%, -50%) translate(10px, 20px)'

    manager.add(
      new AcTrHtmlElement(element, {
        id: 'label-1',
        worldPosition: { x: 0, y: 0 }
      })
    )

    const entry = getEntry(manager, 'label-1')
    expect(entry.scaleWithView).toBe(false)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.zoom = 2
    entry.object.onAfterRender(null!, null!, camera)
    camera.zoom = 4
    element.style.transform = 'translate(-50%, -50%) translate(10px, 20px)'
    entry.object.onAfterRender(null!, null!, camera)
    expect(element.style.transform.includes('scale(')).toBe(false)

    manager.dispose()
  })

  it('appends view-synced scale when scaleWithView is true', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const element = document.createElement('div')
    element.style.transform = 'translate(-50%, -50%) translate(10px, 20px)'

    manager.add(
      new AcTrHtmlElement(element, {
        id: 'label-1',
        worldPosition: { x: 0, y: 0 },
        scaleWithView: true
      })
    )

    const entry = getEntry(manager, 'label-1')
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.zoom = 2
    entry.object.onAfterRender(null!, null!, camera)
    // First paint anchors baseZoom=2 → scale factor 1
    expect(element.style.transform.includes('scale(')).toBe(false)

    camera.zoom = 4
    element.style.transform = 'translate(-50%, -50%) translate(10px, 20px)'
    entry.object.onAfterRender(null!, null!, camera)
    expect(element.style.transform).toContain('scale(2, 2)')

    manager.dispose()
  })

  it('preserves authored baseZoom when the overlay is moved', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const element = document.createElement('div')
    element.style.transform = 'translate(-50%, -50%)'

    manager.add(
      new AcTrHtmlElement(element, {
        id: 'wcs-label',
        worldPosition: { x: 0, y: 0 },
        scaleWithView: true
      })
    )

    const entry = getEntry(manager, 'wcs-label')
    entry.baseZoom = 1
    entry.setPosition({ x: 10, y: 20 })
    expect(entry.baseZoom).toBe(1)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.zoom = 2
    entry.object.onAfterRender(null!, null!, camera)
    expect(element.style.transform).toContain('scale(2, 2)')

    manager.dispose()
  })

  it('adds a selectable group and selects it on child click', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)

    const group = new AcTrHtmlGroup({
      id: 'g1',
      layer: 'measurement',
      selectable: true
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'g1-a',
        worldPosition: { x: 0, y: 0 },
        layer: 'measurement'
      }),
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'g1-b',
        worldPosition: { x: 1, y: 1 },
        layer: 'measurement'
      })
    )

    manager.add(group)
    expect(manager.getGroup('g1')).toBe(group)
    expect(manager.get('g1-a')).toBeDefined()
    expect(manager.hasSelection()).toBe(false)

    manager.get('g1-a')!.element.dispatchEvent(new MouseEvent('click'))
    expect(manager.hasSelection()).toBe(true)
    expect(group.selected).toBe(true)
    expect(manager.get('g1-a')!.selected).toBe(true)
    expect(manager.get('g1-b')!.selected).toBe(true)

    expect(manager.deleteSelected()).toBe(true)
    expect(manager.getGroup('g1')).toBeUndefined()
    expect(manager.get('g1-a')).toBeUndefined()

    manager.dispose()
  })

  it('fires onSelectedChanged(false) when deleteSelected removes a group', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const selectedChanges: boolean[] = []

    const group = new AcTrHtmlGroup({
      id: 'g-del',
      layer: 'measurement',
      selectable: true,
      onSelectedChanged: selected => {
        selectedChanges.push(selected)
      }
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'g-del-child',
        worldPosition: { x: 0, y: 0 },
        layer: 'measurement'
      })
    )

    manager.add(group)
    manager.selectGroup('g-del')
    expect(selectedChanges).toEqual([true])

    expect(manager.deleteSelected()).toBe(true)
    expect(selectedChanges).toEqual([true, false])
    expect(manager.hasSelection()).toBe(false)

    manager.dispose()
  })

  it('selectGroup is exclusive by default and additive when requested', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)

    const groupA = new AcTrHtmlGroup({
      id: 'ga',
      layer: 'measurement',
      selectable: true
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'ga-child',
        worldPosition: { x: 0, y: 0 },
        layer: 'measurement'
      })
    )
    const groupB = new AcTrHtmlGroup({
      id: 'gb',
      layer: 'measurement',
      selectable: true
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'gb-child',
        worldPosition: { x: 1, y: 1 },
        layer: 'measurement'
      })
    )

    manager.add(groupA)
    manager.add(groupB)

    manager.selectGroup('ga')
    manager.selectGroup('gb')
    expect(groupA.selected).toBe(false)
    expect(groupB.selected).toBe(true)

    manager.selectGroup('ga', false)
    expect(groupA.selected).toBe(true)
    expect(groupB.selected).toBe(true)

    expect(manager.deselectGroup('gb')).toBe(true)
    expect(groupB.selected).toBe(false)
    expect(groupA.selected).toBe(true)
    expect(manager.deselectGroup('gb')).toBe(false)

    manager.dispose()
  })

  it('toggles layout-scoped group visibility without removing overlays', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const visibility: boolean[] = []

    manager.setActiveLayoutId('layout-a')

    const groupA = new AcTrHtmlGroup({
      id: 'ga',
      layer: 'measurement',
      layoutId: 'layout-a',
      selectable: true,
      onVisibleChanged: visible => {
        visibility.push(visible)
      }
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'ga-child',
        worldPosition: { x: 0, y: 0 },
        layer: 'measurement'
      })
    )
    const groupB = new AcTrHtmlGroup({
      id: 'gb',
      layer: 'measurement',
      layoutId: 'layout-b',
      selectable: true
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'gb-child',
        worldPosition: { x: 1, y: 1 },
        layer: 'measurement'
      })
    )

    manager.add(groupA)
    manager.add(groupB)

    expect(groupA.visible).toBe(true)
    expect(groupB.visible).toBe(false)
    expect(manager.get('ga-child')!.object.visible).toBe(true)
    expect(manager.get('gb-child')!.object.visible).toBe(false)

    manager.selectGroup('ga')
    manager.setActiveLayoutId('layout-b')

    expect(groupA.visible).toBe(false)
    expect(groupB.visible).toBe(true)
    expect(manager.hasSelection()).toBe(false)
    expect(visibility).toEqual([false])
    expect(manager.getGroup('ga')).toBe(groupA)
    expect(manager.getGroup('gb')).toBe(groupB)

    manager.setActiveLayoutId('layout-a')
    expect(groupA.visible).toBe(true)
    expect(groupB.visible).toBe(false)
    expect(visibility).toEqual([false, true])

    manager.dispose()
  })

  it('owns group canvas overlays for selection, layout, and dispose', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const container = document.createElement('div')

    manager.setActiveLayoutId('layout-a')

    const canvas = new AcTrHtmlCanvasOverlay({
      id: 'gc',
      container,
      layer: 'measurement',
      layoutId: 'layout-a'
    })
    const group = new AcTrHtmlGroup({
      id: 'g-canvas',
      layer: 'measurement',
      layoutId: 'layout-a',
      selectable: true
    })
      .add(
        new AcTrHtmlElement(document.createElement('div'), {
          id: 'g-canvas-child',
          worldPosition: { x: 0, y: 0 },
          layer: 'measurement'
        })
      )
      .addCanvas(canvas)

    manager.add(group)
    expect(container.contains(canvas.canvas)).toBe(true)

    manager.selectGroup('g-canvas')
    expect(canvas.selected).toBe(true)

    manager.setActiveLayoutId('layout-b')
    expect(group.visible).toBe(false)
    expect(canvas.visible).toBe(false)
    expect(canvas.canvas.style.display).toBe('none')
    expect(manager.hasSelection()).toBe(false)

    manager.remove('g-canvas')
    expect(manager.getGroup('g-canvas')).toBeUndefined()
    expect(container.contains(canvas.canvas)).toBe(false)

    manager.dispose()
  })

  it('detaches a group without disposing children and reattaches it', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    let disposed = false

    const child = new AcTrHtmlElement(document.createElement('div'), {
      id: 'g-detach-child',
      worldPosition: { x: 0, y: 0 },
      layer: 'measurement'
    })
    const dispose = child.dispose.bind(child)
    child.dispose = () => {
      disposed = true
      dispose()
    }

    const group = new AcTrHtmlGroup({
      id: 'g-detach',
      layer: 'measurement',
      selectable: true
    }).add(child)

    manager.add(group)
    expect(manager.detach('g-detach')).toBe(group)
    expect(manager.getGroup('g-detach')).toBeUndefined()
    expect(manager.get('g-detach-child')).toBeUndefined()
    expect(disposed).toBe(false)
    expect(group.visible).toBe(false)

    manager.reattach(group)
    expect(manager.getGroup('g-detach')).toBe(group)
    expect(manager.get('g-detach-child')).toBe(child)
    expect(group.visible).toBe(true)
    expect(disposed).toBe(false)

    manager.dispose()
  })

  it('groupsOnLayer lists currently published groups', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const group = new AcTrHtmlGroup({
      id: 'g-layer',
      layer: 'measurement'
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'g-layer-child',
        worldPosition: { x: 0, y: 0 },
        layer: 'measurement'
      })
    )
    manager.add(group)
    expect(manager.groupsOnLayer('measurement')).toEqual([group])
    expect(manager.groupsOnLayer('markup')).toEqual([])
    manager.dispose()
  })

  it('highlights selection with glow without recoloring text', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const group = new AcTrHtmlGroup({
      id: 'g-style',
      selectable: true
    }).add(
      new AcTrHtmlElement(document.createElement('div'), {
        id: 'g-style-child',
        worldPosition: { x: 0, y: 0 }
      })
    )
    manager.add(group)
    manager.selectGroup('g-style')

    const style = document.head.querySelector(
      'style[data-ml-html-selection]'
    ) as HTMLStyleElement | null
    const css = style?.textContent ?? ''
    expect(css).toContain('drop-shadow(0 0 1.5px #ffd54f)')
    expect(css).toContain('drop-shadow(0 0 4px rgba(255, 213, 79, 0.95))')
    expect(css).toContain('drop-shadow(0 0 8px rgba(255, 213, 79, 0.55))')
    expect(css).toContain('outline: 2px solid rgba(255, 213, 79, 0.85)')
    expect(css).not.toContain('color: #ffd54f')

    manager.dispose()
  })

  it('disables overlay pointer hits so clicks can pass through to the canvas', () => {
    const scene = new THREE.Scene()
    const manager = new AcTrHtmlTransientManager(scene)
    const child = new AcTrHtmlElement(document.createElement('div'), {
      id: 'hit-child',
      worldPosition: { x: 0, y: 0 }
    })
    const group = new AcTrHtmlGroup({
      id: 'hit-group',
      selectable: true
    }).add(child)
    manager.add(group)
    expect(child.element.style.pointerEvents).toBe('auto')

    manager.setHitTestEnabled(false)
    expect(child.element.style.pointerEvents).toBe('none')

    child.element.style.pointerEvents = 'auto'
    manager.syncHitTest()
    expect(child.element.style.pointerEvents).toBe('none')

    manager.setHitTestEnabled(true)
    expect(child.element.style.pointerEvents).toBe('auto')
    manager.dispose()
  })
})
