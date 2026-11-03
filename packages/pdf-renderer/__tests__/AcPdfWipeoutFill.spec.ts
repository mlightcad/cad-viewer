import {
  AcDbDatabase,
  AcDbHatch,
  acdbHostApplicationServices,
  AcDbWipeout,
  AcGeArea2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGePolyline2d
} from '@mlightcad/data-model'

import type { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'

/** Dense ANSI38-like pattern: a wipeout must never be tessellated with it. */
const DENSE_LINES = [
  {
    angle: Math.PI * 0.75,
    base: { x: 0, y: 0 },
    offset: { x: -0.4419, y: -0.4419 },
    dashLengths: []
  },
  {
    angle: Math.PI * 1.25,
    base: { x: 0, y: 0 },
    offset: { x: -0.442, y: -1.3258 },
    dashLengths: [1.5625, -0.9375]
  }
]

function rectangleArea(width: number, height: number): AcGeArea2d {
  const area = new AcGeArea2d()
  area.add(
    new AcGePolyline2d(
      [
        new AcGePoint2d(0, 0),
        new AcGePoint2d(width, 0),
        new AcGePoint2d(width, height),
        new AcGePoint2d(0, height)
      ],
      true
    )
  )
  return area
}

function opKinds(renderer: AcPdfRenderer, area: AcGeArea2d) {
  const entity = renderer.area(area)
  const kinds = new Map<string, number>()
  entity.forEachOp(op => kinds.set(op.kind, (kinds.get(op.kind) ?? 0) + 1))
  return kinds
}

describe('PDF wipeout fill', () => {
  it('paints a background fill solid even when traits carry a hatch pattern', () => {
    const renderer = new AcPdfRenderer()
    const traits = renderer.subEntityTraits
    // State a previous hatch leaves behind: AcDbWipeout only sets
    // isBackgroundFill, so fillType is whatever the last hatch drew with.
    traits.fillType = {
      solidFill: false,
      patternAngle: 0,
      definitionLines: DENSE_LINES
    }
    traits.isBackgroundFill = true

    const kinds = opKinds(renderer, rectangleArea(560, 2100))
    expect([...kinds.keys()]).toEqual(['fill'])
    expect(kinds.get('fill')).toBe(1)
  })

  it('still tessellates patterned hatches', () => {
    const renderer = new AcPdfRenderer()
    const traits = renderer.subEntityTraits
    traits.fillType = {
      solidFill: false,
      patternAngle: 0,
      definitionLines: DENSE_LINES
    }
    traits.isBackgroundFill = false

    const kinds = opKinds(renderer, rectangleArea(20, 20))
    expect(kinds.get('stroke') ?? 0).toBeGreaterThan(100)
    expect(kinds.has('fill')).toBe(false)
  })

  it('draws a real AcDbWipeout after an AcDbHatch as a single fill', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const hatch = new AcDbHatch()
    hatch.patternName = 'ANSI38'
    hatch.patternScale = 5
    hatch.add(
      new AcGePolyline2d(
        [
          new AcGePoint2d(0, 0),
          new AcGePoint2d(4, 0),
          new AcGePoint2d(4, 4),
          new AcGePoint2d(0, 4)
        ],
        true
      )
    )
    db.tables.blockTable.modelSpace.appendEntity(hatch)

    const wipeout = new AcDbWipeout()
    wipeout.position = new AcGePoint3d(10, 0, 0)
    wipeout.width = 560
    wipeout.height = 2100
    db.tables.blockTable.modelSpace.appendEntity(wipeout)

    const renderer = new AcPdfRenderer()
    renderer.context.database = db
    hatch.worldDraw(renderer)
    const drawn = wipeout.worldDraw(renderer) as unknown as AcPdfEntity

    const kinds = new Map<string, number>()
    drawn.forEachOp(op => kinds.set(op.kind, (kinds.get(op.kind) ?? 0) + 1))
    expect([...kinds.keys()]).toEqual(['fill'])
    let paper = false
    drawn.forEachOp(op => {
      if (op.kind === 'fill') paper = op.style.paper === true
    })
    expect(paper).toBe(true)
  })
})
