import { AcCmColor, AcCmColorMethod, AcGiLineWeight } from '@mlightcad/data-model'

import {
  createDefaultMarkupColor,
  cssToMarkupColor,
  defaultMarkupStyle,
  MARKUP_LINE_WEIGHT,
  markupCanvasLineWidth,
  markupColorToCss,
  resolveMarkupLineWeight,
  withMarkupStyleWcs
} from '../src/command/markup/AcApMarkupUtil'
import type { AcEdBaseView } from '../src/editor'

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
  it('defaults to hairline and maps it to a 0 canvas width sentinel', () => {
    expect(MARKUP_LINE_WEIGHT).toBe(0)
    expect(defaultMarkupStyle().lineWeight).toBe(0)
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
})

describe('withMarkupStyleWcs text height', () => {
  const view = {
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * 10,
      y: p.y * 10
    })
  } as unknown as AcEdBaseView

  it('keeps custom WCS height without reconverting from fontSize', () => {
    const out = withMarkupStyleWcs(
      {
        color: '#f00',
        lineWeight: 0,
        fontSize: 20,
        textHeightMode: 'custom',
        textHeightWcs: 7.5
      },
      view
    )
    expect(out.textHeightWcs).toBe(7.5)
  })

  it('bakes Fit-to-screen fontSize into WCS at commit', () => {
    const out = withMarkupStyleWcs(
      {
        color: '#f00',
        lineWeight: 0,
        fontSize: 20,
        textHeightMode: 'adaptive'
      },
      view
    )
    expect(out.textHeightWcs).toBe(2)
  })
})
