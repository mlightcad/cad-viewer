import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

import {
  createDefaultMarkupColor,
  cssToMarkupColor,
  markupColorToCss
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
