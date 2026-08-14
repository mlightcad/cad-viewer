import { hitTestMarkupGeometry } from '../src/command/markup/AcApMarkupGeometry'
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
