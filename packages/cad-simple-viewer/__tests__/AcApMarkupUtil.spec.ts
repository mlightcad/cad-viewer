import { AcCmColor, AcCmColorMethod, AcGiLineWeight } from '@mlightcad/data-model'

import {
  createDefaultMarkupColor,
  cssToMarkupColor,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth,
  markupColorToCss,
  resolveMarkupLineWeight,
  setMarkupDrawLineWeight,
  getMarkupLineWeight
} from '../src/command/markup/AcApMarkupUtil'

describe('cssToMarkupColor', () => {
  it('restores ACI red after a CSS round-trip', () => {
    const css = markupColorToCss(createDefaultMarkupColor())
    const restored = cssToMarkupColor(css)
    expect(restored.isByACI).toBe(true)
    expect(restored.colorIndex).toBe(1)
  })

  it('maps CSS rgb/hex values that match the ACI palette back to ByACI', () => {
    const rgb = cssToMarkupColor('rgb(255,0,0)')
    expect(rgb.isByACI).toBe(true)
    expect(rgb.colorIndex).toBe(1)

    const hex = cssToMarkupColor('#00FF00')
    expect(hex.isByACI).toBe(true)
    expect(hex.colorIndex).toBe(3)
  })

  it('keeps true-color RGB that is not in the ACI palette', () => {
    const custom = cssToMarkupColor('rgb(12,34,56)')
    expect(custom.isByColor).toBe(true)
    expect(custom.red).toBe(12)
    expect(custom.green).toBe(34)
    expect(custom.blue).toBe(56)
  })

  it('preserves an already-ByACI color method', () => {
    const yellow = new AcCmColor(AcCmColorMethod.ByACI, 2)
    const restored = cssToMarkupColor(markupColorToCss(yellow))
    expect(restored.isByACI).toBe(true)
    expect(restored.colorIndex).toBe(2)
  })
})

describe('markup line weight', () => {
  afterEach(() => {
    setMarkupDrawLineWeight(MARKUP_LINE_WEIGHT)
  })

  it('defaults to hairline and maps it to a 0 canvas width sentinel', () => {
    expect(MARKUP_LINE_WEIGHT).toBe(0)
    expect(markupCanvasLineWidth(MARKUP_LINE_WEIGHT)).toBe(0)
    expect(markupCanvasLineWidth(AcGiLineWeight.LineWeight070)).toBeCloseTo(
      2.5
    )
  })

  it('keeps hairline and falls back only for missing or negative values', () => {
    expect(resolveMarkupLineWeight(0)).toBe(0)
    expect(resolveMarkupLineWeight(70)).toBe(70)
    expect(resolveMarkupLineWeight(undefined)).toBe(MARKUP_LINE_WEIGHT)
    expect(resolveMarkupLineWeight(AcGiLineWeight.ByLayer)).toBe(
      MARKUP_LINE_WEIGHT
    )
  })

  it('accepts hairline as a session draw line weight', () => {
    setMarkupDrawLineWeight(AcGiLineWeight.LineWeight013)
    setMarkupDrawLineWeight(0 as AcGiLineWeight)
    expect(getMarkupLineWeight()).toBe(0)
    setMarkupDrawLineWeight(MARKUP_LINE_WEIGHT)
  })
})
