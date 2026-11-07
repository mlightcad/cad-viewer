import {
  AcCmColor,
  AcDbMLeaderContentType,
  AcDbMLeaderLineType,
  AcDbMLeaderStyle
} from '@mlightcad/data-model'

import {
  acuiRgbToCss,
  buildMLeaderStylePreview
} from '../src/component/dialog/mleaderStylePreview'

describe('mleaderStylePreview', () => {
  it('converts packed RGB canvas backgrounds to CSS hex', () => {
    expect(acuiRgbToCss(0x000000)).toBe('#000000')
    expect(acuiRgbToCss(0xffffff)).toBe('#ffffff')
    expect(acuiRgbToCss(0x232b33)).toBe('#232b33')
    expect(acuiRgbToCss(undefined)).toMatch(/^#/)
  })

  it('builds a default mtext leader preview scene', () => {
    const scene = buildMLeaderStylePreview()
    expect(scene.lines.length + scene.paths.length).toBeGreaterThan(0)
    expect(scene.texts.some(text => text.text === 'Default Text')).toBe(true)
  })

  it('hides the leader when type is none', () => {
    const style = new AcDbMLeaderStyle()
    style.leaderLineType = AcDbMLeaderLineType.InvisibleLeader
    style.contentType = AcDbMLeaderContentType.MTextContent
    style.defaultMTextContents = 'Note'
    const scene = buildMLeaderStylePreview(style)
    expect(scene.lines).toHaveLength(0)
    expect(scene.paths).toHaveLength(0)
    expect(scene.texts[0]?.text).toBe('Note')
  })

  it('draws a block placeholder for block content', () => {
    const style = new AcDbMLeaderStyle()
    style.contentType = AcDbMLeaderContentType.BlockContent
    const blockColor = new AcCmColor()
    blockColor.colorIndex = 1
    style.blockColor = blockColor
    const scene = buildMLeaderStylePreview(style)
    expect(scene.paths.length).toBeGreaterThan(0)
    expect(scene.texts.some(text => text.text === 'B')).toBe(true)
  })

  it('uses a spline path for spline leaders', () => {
    const style = new AcDbMLeaderStyle()
    style.leaderLineType = AcDbMLeaderLineType.SplineLeader
    const scene = buildMLeaderStylePreview(style)
    expect(scene.paths.some(path => path.d.includes('Q'))).toBe(true)
  })
})
