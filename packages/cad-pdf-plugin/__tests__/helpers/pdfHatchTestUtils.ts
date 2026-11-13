import {
  AcDbDatabase,
  type AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPredefinedAcadIsoPat,
  AcGePoint3d
} from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

export type Point = { x: number; y: number }

const DEG = Math.PI / 180

/** World definition lines of a library pattern at `scale`, angle 0. */
export function patternLines(name: string, scale = 1) {
  const pattern = AcDbPredefinedAcadIsoPat.patterns.find(p => p.name === name)!
  return pattern.lines.map(line => {
    const angle = line.angle * DEG
    const dx = line.deltaX * scale
    const dy = line.deltaY * scale
    return {
      angle,
      base: { x: line.originX * scale, y: line.originY * scale },
      offset: {
        x: Math.cos(angle) * dx - Math.sin(angle) * dy,
        y: Math.sin(angle) * dx + Math.cos(angle) * dy
      },
      dashLengths: line.dashes.map(d => d * scale)
    }
  })
}

export function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ]
}

export function line(a: Point, b: Point): AcDbLine {
  return new AcDbLine(
    new AcGePoint3d(a.x, a.y, 0),
    new AcGePoint3d(b.x, b.y, 0)
  )
}

/**
 * A rectangle drawn as four lines (`<prefix>-wall<i>`) and hatched with
 * loose strokes (`<prefix>-s<i>`).
 *
 * @returns How many strokes were added.
 */
export function hatchedRoom(
  selection: Map<string, AcDbEntity>,
  prefix: string,
  outline: Point[],
  pattern = 'ANSI31',
  scale = 1
): number {
  outline.forEach((p, i) =>
    selection.set(`${prefix}-wall${i}`, line(p, outline[(i + 1) % 4]))
  )
  const strokes = tessellateHatchPattern(
    [outline],
    patternLines(pattern, scale),
    0
  )
  strokes.forEach(([a, b], i) => selection.set(`${prefix}-s${i}`, line(a, b)))
  return strokes.length
}

/** Command context over `selection`, recording appended and erased ids. */
export function createHatchContext(selection: Map<string, AcDbEntity>) {
  const db = new AcDbDatabase()
  db.createDefaultData()
  const appended: AcDbEntity[] = []
  const erased: string[] = []
  const view = {
    selectionSet: { clear: jest.fn(), add: jest.fn() },
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    setEntitySceneVisible: jest.fn(),
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    container: undefined,
    canvas: undefined
  }
  acdbHostApplicationServices().workingDatabase = db
  jest
    .spyOn(db.tables.blockTable.modelSpace, 'appendEntity')
    .mockImplementation(entities => {
      appended.push(...(Array.isArray(entities) ? entities : [entities]))
    })
  const context = {
    selection,
    view,
    doc: {
      database: db,
      entityService: { eraseEntities: (ids: string[]) => erased.push(...ids) }
    }
  }
  return { context, appended, erased, view }
}
