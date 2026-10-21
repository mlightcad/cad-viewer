import { AcGeBox2d } from '@mlightcad/data-model'

import {
  acapBoxContains,
  acapFrameBoxToGeBox2d,
  acapResolveLayoutFrameBox,
  acapViewportPaperBox
} from '../src/util/AcApLayoutViewFraming'

describe('acapViewportPaperBox', () => {
  it('builds a paper rectangle from center / width / height', () => {
    expect(
      acapViewportPaperBox({
        centerPoint: { x: 100, y: 200 },
        width: 40,
        height: 20
      })
    ).toEqual({
      min: { x: 80, y: 190 },
      max: { x: 120, y: 210 }
    })
  })

  it('rejects non-positive sizes', () => {
    expect(
      acapViewportPaperBox({
        centerPoint: { x: 0, y: 0 },
        width: 0,
        height: 10
      })
    ).toBeUndefined()
  })
})

describe('acapBoxContains', () => {
  it('requires full containment', () => {
    const outer = { min: { x: 0, y: 0 }, max: { x: 12, y: 9 } }
    const inner = { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } }
    expect(acapBoxContains(outer, inner)).toBe(false)
    expect(
      acapBoxContains(outer, { min: { x: 1, y: 1 }, max: { x: 2, y: 2 } })
    ).toBe(true)
  })
})

describe('acapResolveLayoutFrameBox', () => {
  const templateLimits = { min: { x: 0, y: 0 }, max: { x: 12, y: 9 } }
  const realViewports = {
    min: { x: -522, y: -2680 },
    max: { x: 452, y: 877 }
  }
  const modelEntities = {
    min: { x: 489920, y: 3418677 },
    max: { x: 496000, y: 3424000 }
  }

  it('rejects template limits that do not contain viewports', () => {
    const framed = acapResolveLayoutFrameBox({
      limits: templateLimits,
      viewportsBox: realViewports
    })
    expect(framed?.source).toBe('viewports')
    expect(framed?.box.min.x).toBe(realViewports.min.x)
    expect(framed?.box.max.y).toBe(realViewports.max.y)
  })

  it('keeps limits when they contain viewports', () => {
    const sheet = { min: { x: -600, y: -2800 }, max: { x: 500, y: 1000 } }
    const framed = acapResolveLayoutFrameBox({
      limits: sheet,
      viewportsBox: realViewports
    })
    expect(framed?.source).toBe('limits')
    expect(framed?.box.min.x).toBe(sheet.min.x)
  })

  it('does not trust model template limits when there are no viewports', () => {
    const framed = acapResolveLayoutFrameBox({
      limits: templateLimits,
      entityBox: modelEntities
    })
    expect(framed?.source).toBe('entityBox')
    expect(framed?.box.min.x).toBe(modelEntities.min.x)
  })

  it('falls back to limits only when nothing else is available', () => {
    const framed = acapResolveLayoutFrameBox({
      limits: templateLimits
    })
    expect(framed?.source).toBe('limits')
  })

  it('prefers layout extents over entity box when viewports are absent', () => {
    const extents = { min: { x: 10, y: 20 }, max: { x: 30, y: 40 } }
    const framed = acapResolveLayoutFrameBox({
      layoutExtents: extents,
      entityBox: modelEntities
    })
    expect(framed?.source).toBe('layoutExtents')
  })

  it('ignores empty AcGeBox2d inputs', () => {
    const framed = acapResolveLayoutFrameBox({
      limits: new AcGeBox2d(),
      entityBox: modelEntities
    })
    expect(framed?.source).toBe('entityBox')
  })

  it('round-trips through AcGeBox2d', () => {
    const box = acapFrameBoxToGeBox2d(templateLimits)
    expect(box.min.x).toBe(0)
    expect(box.max.y).toBe(9)
  })
})
