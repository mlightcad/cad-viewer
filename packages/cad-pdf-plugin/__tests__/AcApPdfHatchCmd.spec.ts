const answers: string[] = []
const notify = jest.fn()

jest.mock('@mlightcad/cad-simple-viewer', () => {
  class AcEdCommand {
    mode = 0
    notify = notify
  }
  return {
    AcApI18n: { t: (key: string) => key },
    acapZoomToVisible: jest.fn(),
    AcEdCommand,
    AcEdOpenMode: { Write: 2 },
    resolveSelectedEntities: async (context: {
      selection: Map<string, unknown>
    }) => ({
      ids: [...context.selection.keys()],
      entities: [...context.selection.values()]
    })
  }
})
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, params?: Record<string, unknown>) =>
    `${key} ${JSON.stringify(params ?? {})}`
}))
jest.mock('../src/acapPdfPrompts', () => ({
  acapPdfAskKeyword: async () => answers.shift()
}))

import {
  AcDbDatabase,
  type AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPredefinedAcadIsoPat,
  AcGePoint3d
} from '@mlightcad/data-model'
import { tessellateHatchPattern } from '@mlightcad/pdf-renderer'

import { AcApPdfHatchCmd } from '../src/AcApPdfHatchCmd'

type Point = { x: number; y: number }

const DEG = Math.PI / 180

/** World definition lines of a library pattern at scale 1, angle 0. */
function patternLines(name: string) {
  const pattern = AcDbPredefinedAcadIsoPat.patterns.find(p => p.name === name)!
  return pattern.lines.map(line => {
    const angle = line.angle * DEG
    return {
      angle,
      base: { x: line.originX, y: line.originY },
      offset: {
        x: Math.cos(angle) * line.deltaX - Math.sin(angle) * line.deltaY,
        y: Math.sin(angle) * line.deltaX + Math.cos(angle) * line.deltaY
      },
      dashLengths: [...line.dashes]
    }
  })
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 }
  ]
}

function line(a: Point, b: Point): AcDbLine {
  return new AcDbLine(
    new AcGePoint3d(a.x, a.y, 0),
    new AcGePoint3d(b.x, b.y, 0)
  )
}

/** A rectangle drawn as four lines and hatched with loose ANSI31 strokes. */
function hatchedRoom(
  selection: Map<string, AcDbEntity>,
  prefix: string,
  outline: Point[]
) {
  outline.forEach((p, i) =>
    selection.set(`${prefix}-wall${i}`, line(p, outline[(i + 1) % 4]))
  )
  const strokes = tessellateHatchPattern([outline], patternLines('ANSI31'), 0)
  strokes.forEach(([a, b], i) => selection.set(`${prefix}-s${i}`, line(a, b)))
  return strokes.length
}

function createContext(selection: Map<string, AcDbEntity>) {
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
    unhighlight: jest.fn()
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

async function run(selection: Map<string, AcDbEntity>, replies: string[]) {
  answers.length = 0
  answers.push(...replies)
  notify.mockClear()
  const env = createContext(selection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await new AcApPdfHatchCmd().execute(env.context as any)
  return env
}

describe('AcApPdfHatchCmd', () => {
  beforeAll(() => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
  })

  test('replaces the strokes with an ANSI31 hatch, keeping the walls', async () => {
    const selection = new Map<string, AcDbEntity>()
    const strokes = hatchedRoom(selection, 'a', rect(0, 0, 60, 40))

    const { appended, erased, view } = await run(selection, ['yes'])

    expect(appended).toHaveLength(1)
    const hatch = appended[0] as AcDbHatch
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.patternName).toBe('ANSI31')
    expect(hatch.patternType).toBe(AcDbHatchPatternType.Predefined)
    expect(hatch.patternScale).toBeCloseTo(1, 3)
    expect(erased).toHaveLength(strokes)
    expect(erased.every(id => id.startsWith('a-s'))).toBe(true)
    // The preview is shown and removed, and the strokes are shown again.
    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.setEntitySceneVisible).toHaveBeenLastCalledWith(
      expect.any(String),
      true
    )
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('jig.pdfhatch.summary')
    )
  })

  test('changes nothing when the user declines', async () => {
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))

    const { appended, erased } = await run(selection, ['no'])

    expect(appended).toHaveLength(0)
    expect(erased).toHaveLength(0)
  })

  test('review converts only the accepted hatches', async () => {
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))
    hatchedRoom(selection, 'b', rect(200, 0, 250, 30))

    const { appended, erased } = await run(selection, ['review', 'yes', 'no'])

    expect(appended).toHaveLength(1)
    const prefix = erased[0].slice(0, 2)
    expect(erased.every(id => id.startsWith(prefix))).toBe(true)
  })

  test('warns when the selection holds no hatch', async () => {
    const selection = new Map<string, AcDbEntity>()
    rect(0, 0, 10, 10).forEach((p, i, all) =>
      selection.set(`w${i}`, line(p, all[(i + 1) % 4]))
    )

    const { appended } = await run(selection, [])

    expect(appended).toHaveLength(0)
    expect(notify).toHaveBeenCalledWith('jig.pdfhatch.noHatches', 'warning')
  })
})
