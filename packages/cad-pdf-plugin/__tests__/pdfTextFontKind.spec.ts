import { classifyPdfTextLineFont } from '../src/recognition/pdfTextFontKind'

const open = (x: number) => ({
  id: x,
  points: [
    { x, y: 0 },
    { x: x + 0.5, y: 1 }
  ]
})
const closed = (x: number) => ({
  id: x,
  points: [
    { x, y: 0 },
    { x: x + 0.6, y: 0 },
    { x: x + 0.6, y: 1 },
    { x, y: 1 },
    { x, y: 0 }
  ]
})

describe('classifyPdfTextLineFont', () => {
  it('treats open strokes as SHX line text', () => {
    const strokes = [open(0), open(1), closed(2), open(3), open(4)]
    expect(classifyPdfTextLineFont({ strokes, height: 1 })).toBe('shx')
  })

  it('treats closed contours as outline (mesh) text', () => {
    const strokes = [closed(0), closed(1), closed(2), open(3)]
    expect(classifyPdfTextLineFont({ strokes, height: 1 })).toBe('mesh')
  })

  it('accepts a tiny gap between the ends of an outline', () => {
    const almost = closed(0)
    almost.points[almost.points.length - 1] = { x: 0.01, y: 0 }
    expect(classifyPdfTextLineFont({ strokes: [almost], height: 1 })).toBe(
      'mesh'
    )
  })
})
