import {
  expandMarkupBoundsByClientRects,
  hitTestMarkupGeometry,
  hitTestMarkupShapeOutline,
  isAttachableShapeMarkup,
  markupGeometryBounds,
  markupShapeOutlineFromGeometry
} from '../src/command/markup/AcApMarkupGeometry'
import type { AcApMarkupGeometry } from '../src/command/markup/AcApMarkupTypes'

const identity = (point: { x: number; y: number }) => point

describe('hitTestMarkupGeometry', () => {
  const threshold = 4

  it('hits a line on the segment and misses off to the side', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'line',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 }
    }
    expect(
      hitTestMarkupGeometry(geometry, { x: 50, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMarkupGeometry(geometry, { x: 50, y: 20 }, identity, threshold)
    ).toBe(false)
  })

  it('hits a rectangle on the outline but not the hollow interior', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'rect',
      corner1: { x: 0, y: 0 },
      corner2: { x: 40, y: 20 }
    }
    expect(
      hitTestMarkupGeometry(geometry, { x: 20, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMarkupGeometry(geometry, { x: 20, y: 10 }, identity, threshold)
    ).toBe(false)
  })

  it('hits a circle on the circumference but not the center', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'circle',
      center: { x: 0, y: 0 },
      radius: 20
    }
    expect(
      hitTestMarkupGeometry(geometry, { x: 20, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMarkupGeometry(geometry, { x: 0, y: 0 }, identity, threshold)
    ).toBe(false)
  })

  it('hits a callout leader and a highlight fill', () => {
    const callout: AcApMarkupGeometry = {
      type: 'callout',
      tip: { x: 0, y: 0 },
      anchor: { x: 80, y: 0 }
    }
    expect(
      hitTestMarkupGeometry(callout, { x: 40, y: 2 }, identity, threshold)
    ).toBe(true)

    const highlight: AcApMarkupGeometry = {
      type: 'highlight',
      corner1: { x: 0, y: 0 },
      corner2: { x: 30, y: 20 }
    }
    expect(
      hitTestMarkupGeometry(highlight, { x: 15, y: 10 }, identity, threshold)
    ).toBe(true)
  })

  it('hits a shape-attached callout leader', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'cloud',
      corner1: { x: 0, y: 0 },
      corner2: { x: 20, y: 20 },
      callout: {
        tip: { x: 20, y: 10 },
        anchor: { x: 60, y: 10 }
      }
    }
    expect(
      hitTestMarkupGeometry(geometry, { x: 40, y: 10 }, identity, threshold)
    ).toBe(true)
  })
})

describe('isAttachableShapeMarkup', () => {
  it('is true for cloud/rect/circle without an attached callout', () => {
    expect(
      isAttachableShapeMarkup({
        type: 'rect',
        corner1: { x: 0, y: 0 },
        corner2: { x: 10, y: 10 }
      })
    ).toBe(true)
    expect(
      isAttachableShapeMarkup({
        type: 'cloud',
        corner1: { x: 0, y: 0 },
        corner2: { x: 10, y: 10 },
        callout: { tip: { x: 10, y: 5 }, anchor: { x: 20, y: 5 } }
      })
    ).toBe(false)
    expect(
      isAttachableShapeMarkup({
        type: 'callout',
        tip: { x: 0, y: 0 },
        anchor: { x: 10, y: 0 }
      })
    ).toBe(false)
  })
})

describe('hitTestMarkupShapeOutline', () => {
  const threshold = 4

  it('hits a rectangle outer frame but not the hollow interior', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'rect',
      corner1: { x: 0, y: 0 },
      corner2: { x: 40, y: 20 }
    }
    expect(
      hitTestMarkupShapeOutline(geometry, { x: 20, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMarkupShapeOutline(geometry, { x: 20, y: 10 }, identity, threshold)
    ).toBe(false)
  })

  it('hits a circle circumference but not the center', () => {
    const geometry: AcApMarkupGeometry = {
      type: 'circle',
      center: { x: 0, y: 0 },
      radius: 20
    }
    expect(
      hitTestMarkupShapeOutline(geometry, { x: 20, y: 0 }, identity, threshold)
    ).toBe(true)
    expect(
      hitTestMarkupShapeOutline(geometry, { x: 0, y: 0 }, identity, threshold)
    ).toBe(false)
  })
})

describe('markupShapeOutlineFromGeometry', () => {
  it('maps circle and rect geometry to an outline', () => {
    expect(
      markupShapeOutlineFromGeometry({
        type: 'circle',
        center: { x: 1, y: 2 },
        radius: 5
      })
    ).toEqual({ kind: 'circle', center: { x: 1, y: 2 }, radius: 5 })
    expect(
      markupShapeOutlineFromGeometry({
        type: 'rect',
        corner1: { x: 0, y: 0 },
        corner2: { x: 4, y: 6 }
      })
    ).toEqual({
      kind: 'rect',
      corner1: { x: 0, y: 0 },
      corner2: { x: 4, y: 6 }
    })
  })
})

describe('markupGeometryBounds', () => {
  it('returns the AABB of a line', () => {
    const box = markupGeometryBounds({
      type: 'line',
      start: { x: 10, y: 5 },
      end: { x: 40, y: 25 }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(10)
    expect(box!.min.y).toBe(5)
    expect(box!.max.x).toBe(40)
    expect(box!.max.y).toBe(25)
  })

  it('includes circle radius and attached callout', () => {
    const box = markupGeometryBounds({
      type: 'circle',
      center: { x: 0, y: 0 },
      radius: 10,
      callout: { tip: { x: 10, y: 0 }, anchor: { x: 50, y: 20 } }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(-10)
    expect(box!.min.y).toBe(-10)
    expect(box!.max.x).toBe(50)
    expect(box!.max.y).toBe(20)
  })

  it('unions a cloud AABB with its attached leader and text-box anchor', () => {
    const box = markupGeometryBounds({
      type: 'cloud',
      corner1: { x: 0, y: 0 },
      corner2: { x: 20, y: 10 },
      callout: { tip: { x: 20, y: 5 }, anchor: { x: 80, y: 40 } }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(0)
    expect(box!.min.y).toBe(0)
    expect(box!.max.x).toBe(80)
    expect(box!.max.y).toBe(40)
  })

  it('includes both callout leader tip and text-box anchor', () => {
    const box = markupGeometryBounds({
      type: 'callout',
      tip: { x: 0, y: 0 },
      anchor: { x: 100, y: -30 }
    })
    expect(box).toBeDefined()
    expect(box!.min.x).toBe(0)
    expect(box!.min.y).toBe(-30)
    expect(box!.max.x).toBe(100)
    expect(box!.max.y).toBe(0)
  })
})

describe('expandMarkupBoundsByClientRects', () => {
  it('unions overlay client rectangles converted to world space', () => {
    const box = markupGeometryBounds({
      type: 'callout',
      tip: { x: 0, y: 0 },
      anchor: { x: 10, y: 0 }
    })!
    expandMarkupBoundsByClientRects(
      box,
      [{ left: 100, top: 20, right: 180, bottom: 60 }],
      (clientX, clientY) => ({ x: clientX / 10, y: -clientY / 10 })
    )
    expect(box.min.x).toBe(0)
    expect(box.min.y).toBe(-6)
    expect(box.max.x).toBe(18)
    expect(box.max.y).toBe(0)
  })
})
