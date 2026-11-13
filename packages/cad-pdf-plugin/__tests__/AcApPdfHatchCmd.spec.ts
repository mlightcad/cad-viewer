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

import {
  AcDbDatabase,
  type AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { AcApPdfHatchCmd } from '../src/AcApPdfHatchCmd'
import {
  createHatchContext,
  hatchedRoom,
  line,
  rect
} from './helpers/pdfHatchTestUtils'

async function run(selection: Map<string, AcDbEntity>) {
  notify.mockClear()
  const env = createHatchContext(selection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await new AcApPdfHatchCmd().execute(env.context as any)
  return env
}

// Without a DOM there is no review panel: every hatch found is converted.
describe('AcApPdfHatchCmd without a DOM', () => {
  beforeAll(() => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
  })

  test('replaces the strokes with an ANSI31 hatch, keeping the walls', async () => {
    const selection = new Map<string, AcDbEntity>()
    const strokes = hatchedRoom(selection, 'a', rect(0, 0, 60, 40))

    const { appended, erased, view } = await run(selection)

    expect(appended).toHaveLength(1)
    const hatch = appended[0] as AcDbHatch
    expect(hatch).toBeInstanceOf(AcDbHatch)
    expect(hatch.patternName).toBe('ANSI31')
    expect(hatch.patternType).toBe(AcDbHatchPatternType.Predefined)
    expect(hatch.patternScale).toBeCloseTo(1, 3)
    expect(erased).toHaveLength(strokes)
    expect(erased.every(id => id.startsWith('a-s'))).toBe(true)
    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('jig.pdfhatch.summary')
    )
  })

  test('converts every hatch found', async () => {
    const selection = new Map<string, AcDbEntity>()
    hatchedRoom(selection, 'a', rect(0, 0, 60, 40))
    hatchedRoom(selection, 'b', rect(200, 0, 250, 30))

    const { appended, erased } = await run(selection)

    expect(appended).toHaveLength(2)
    expect(erased.some(id => id.startsWith('a-s'))).toBe(true)
    expect(erased.some(id => id.startsWith('b-s'))).toBe(true)
  })

  test('warns when the selection holds no hatch', async () => {
    const selection = new Map<string, AcDbEntity>()
    rect(0, 0, 10, 10).forEach((p, i, all) =>
      selection.set(`w${i}`, line(p, all[(i + 1) % 4]))
    )

    const { appended } = await run(selection)

    expect(appended).toHaveLength(0)
    expect(notify).toHaveBeenCalledWith('jig.pdfhatch.noHatches', 'warning')
  })
})
