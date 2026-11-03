import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'

import { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfViewportContent } from '../src/viewport/AcPdfViewportContent'

function strokeRoot(minX: number, minY: number, maxX: number, maxY: number) {
  const entity = new AcPdfEntity()
  entity.addOp({
    kind: 'stroke',
    points: [
      { x: minX, y: minY },
      { x: maxX, y: maxY }
    ],
    style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
  })
  entity.box.min.set(minX, minY)
  entity.box.max.set(maxX, maxY)
  return entity
}

function mockWriter() {
  return {
    beginOcg: jest.fn(),
    endMarked: jest.fn(),
    beginEntity: jest.fn(),
    beginActualText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    clipRect: jest.fn(),
    drawOps: jest.fn()
  }
}

function paperBox(minX: number, minY: number, maxX: number, maxY: number) {
  const box = new AcGeBox2d()
  box.min.set(minX, minY)
  box.max.set(maxX, maxY)
  return box
}

describe('AcPdfViewportContent culling', () => {
  it('skips model roots outside the viewport view', () => {
    const inside = strokeRoot(10, 10, 50, 50)
    const straddling = strokeRoot(190, 190, 400, 400)
    const outside = strokeRoot(1000, 1000, 1010, 1010)
    // Model (0..200) → paper (0..100).
    const modelToPaper = new AcGeMatrix3d().makeScale(0.5, 0.5, 1)
    const content = new AcPdfViewportContent(
      [inside, straddling, outside],
      modelToPaper,
      paperBox(0, 0, 100, 100)
    )
    const insidePaint = jest.spyOn(inside, 'paint')
    const straddlingPaint = jest.spyOn(straddling, 'paint')
    const outsidePaint = jest.spyOn(outside, 'paint')

    content.paint({ writer: mockWriter() as never })

    expect(insidePaint).toHaveBeenCalledTimes(1)
    expect(straddlingPaint).toHaveBeenCalledTimes(1)
    expect(outsidePaint).not.toHaveBeenCalled()
  })

  it('keeps roots without a known box', () => {
    const unknown = new AcPdfEntity()
    unknown.addOp({
      kind: 'stroke',
      points: [
        { x: 5000, y: 5000 },
        { x: 5001, y: 5001 }
      ],
      style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
    })
    const content = new AcPdfViewportContent(
      [unknown],
      new AcGeMatrix3d(),
      paperBox(0, 0, 100, 100)
    )
    const paint = jest.spyOn(unknown, 'paint')
    content.paint({ writer: mockWriter() as never })
    expect(paint).toHaveBeenCalledTimes(1)
  })

  it('culls in the rotated model frame of a twisted viewport', () => {
    // Paper = model rotated 90° CCW: model (x, y) → paper (-y, x).
    const modelToPaper = new AcGeMatrix3d().makeRotationZ(Math.PI / 2)
    const content = new AcPdfViewportContent(
      [strokeRoot(10, -90, 20, -80), strokeRoot(10, 10, 20, 20)],
      modelToPaper,
      // Paper box (0..100, 0..100) shows model x 0..100, y -100..0.
      paperBox(0, 0, 100, 100)
    )
    const [visible, hidden] = (
      content as unknown as { _sharedRoots: AcPdfEntity[] }
    )._sharedRoots
    const visiblePaint = jest.spyOn(visible, 'paint')
    const hiddenPaint = jest.spyOn(hidden, 'paint')

    content.paint({ writer: mockWriter() as never })

    expect(visiblePaint).toHaveBeenCalledTimes(1)
    expect(hiddenPaint).not.toHaveBeenCalled()
  })
})
