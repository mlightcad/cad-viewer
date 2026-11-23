const showMessage = jest.fn()

jest.mock('../src/editor/command/AcEdCommand', () => {
  class AcEdCommand {
    mode: unknown
    showMessage(...args: unknown[]) {
      showMessage(...args)
    }
  }
  return { AcEdCommand }
})

jest.mock('../src/editor/view/AcEdOpenMode', () => ({
  AcEdOpenMode: {
    Write: 'Write'
  }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

jest.mock('../src/service/AcApEntitySelection', () => ({
  resolveSelectedEntities: jest.fn()
}))

jest.mock('../src/service/AcApEntityService', () => ({
  AcApEntityService: {
    copyDisplayTraits: jest.fn()
  }
}))

jest.mock('../src/util/AcApTextMeasure', () => ({
  acapMeasureTextWidth: jest.fn(() => undefined)
}))

import {
  AcDbBlockTableRecord,
  AcDbLine,
  AcDbMText,
  AcDbText,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApTxt2MtxtCmd } from '../src/command/modify/AcApTxt2MtxtCmd'
import { resolveSelectedEntities } from '../src/service/AcApEntitySelection'
import { AcApEntityService } from '../src/service/AcApEntityService'

function makePair() {
  const a = new AcDbText()
  a.textString = 'A'
  a.position = new AcGePoint3d(0, 0, 0)
  a.height = 1
  a.styleName = 'Standard'
  a.objectId = 'a'
  a.ownerId = 'ms'
  a.layer = 'ANN'

  const b = new AcDbText()
  b.textString = 'B'
  b.position = new AcGePoint3d(1, 0, 0)
  b.height = 1
  b.styleName = 'Standard'
  b.objectId = 'b'
  b.ownerId = 'ms'

  return { a, b }
}

describe('AcApTxt2MtxtCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ignores non-text entities and merges the rest into one mtext', async () => {
    const { a, b } = makePair()
    const line = new AcDbLine()
    line.objectId = 'line'

    const modelSpace = new AcDbBlockTableRecord()
    const appendEntity = jest
      .spyOn(modelSpace, 'appendEntity')
      .mockImplementation(() => undefined as never)
    const eraseEntities = jest.fn().mockReturnValue(2)
    const clear = jest.fn()
    jest.mocked(resolveSelectedEntities).mockResolvedValue({
      entities: [a, line, b],
      ids: ['a', 'line', 'b']
    })

    const cmd = new AcApTxt2MtxtCmd()
    await cmd.execute({
      view: { selectionSet: { clear } },
      doc: {
        database: {
          getObjectById: () => modelSpace,
          tables: {
            blockTable: {
              modelSpace
            }
          }
        },
        entityService: { eraseEntities }
      }
    } as never)

    expect(appendEntity).toHaveBeenCalledTimes(1)
    const merged = appendEntity.mock.calls[0][0] as AcDbMText
    expect(merged).toBeInstanceOf(AcDbMText)
    expect(merged.contents).toBe('AB')
    expect(AcApEntityService.copyDisplayTraits).toHaveBeenCalledWith(a, merged)
    expect(eraseEntities).toHaveBeenCalledWith(['a', 'b'])
    expect(clear).toHaveBeenCalled()
    expect(showMessage).not.toHaveBeenCalled()
  })

  it('warns when fewer than two text entities remain after filtering', async () => {
    const a = new AcDbText()
    a.textString = 'A'
    a.position = new AcGePoint3d(0, 0, 0)
    a.height = 1
    jest.mocked(resolveSelectedEntities).mockResolvedValue({
      entities: [a, new AcDbLine()],
      ids: ['a', 'line']
    })

    const cmd = new AcApTxt2MtxtCmd()
    await cmd.execute({
      view: { selectionSet: { clear: jest.fn() } },
      doc: {
        database: {
          getObjectById: () => undefined,
          tables: {
            blockTable: { modelSpace: new AcDbBlockTableRecord() }
          }
        },
        entityService: { eraseEntities: jest.fn() }
      }
    } as never)

    expect(showMessage).toHaveBeenCalledWith('jig.txt2mtxt.needTwo', 'warning')
  })

  it('warns and aborts when source erase is incomplete', async () => {
    const { a, b } = makePair()
    const modelSpace = new AcDbBlockTableRecord()
    const appendEntity = jest
      .spyOn(modelSpace, 'appendEntity')
      .mockImplementation(() => undefined as never)
    const eraseEntities = jest.fn().mockReturnValue(1)
    const clear = jest.fn()
    jest.mocked(resolveSelectedEntities).mockResolvedValue({
      entities: [a, b],
      ids: ['a', 'b']
    })

    const cmd = new AcApTxt2MtxtCmd()
    await expect(
      cmd.execute({
        view: { selectionSet: { clear } },
        doc: {
          database: {
            getObjectById: () => modelSpace,
            tables: { blockTable: { modelSpace } }
          },
          entityService: { eraseEntities }
        }
      } as never)
    ).rejects.toThrow(/failed to erase/)

    expect(appendEntity).toHaveBeenCalledTimes(1)
    expect(eraseEntities).toHaveBeenCalledWith(['a', 'b'])
    expect(clear).not.toHaveBeenCalled()
    expect(showMessage).toHaveBeenCalledWith(
      'jig.txt2mtxt.eraseFailed',
      'warning'
    )
  })

  it('appends into a paper-space owner resolved via getObjectById', async () => {
    const { a, b } = makePair()
    a.ownerId = 'ps'
    b.ownerId = 'ps'
    const paperSpace = new AcDbBlockTableRecord()
    const modelSpace = new AcDbBlockTableRecord()
    const paperAppend = jest
      .spyOn(paperSpace, 'appendEntity')
      .mockImplementation(() => undefined as never)
    const modelAppend = jest
      .spyOn(modelSpace, 'appendEntity')
      .mockImplementation(() => undefined as never)
    const eraseEntities = jest.fn().mockReturnValue(2)
    jest.mocked(resolveSelectedEntities).mockResolvedValue({
      entities: [a, b],
      ids: ['a', 'b']
    })

    const cmd = new AcApTxt2MtxtCmd()
    await cmd.execute({
      view: { selectionSet: { clear: jest.fn() } },
      doc: {
        database: {
          getObjectById: (id: string) => (id === 'ps' ? paperSpace : undefined),
          tables: { blockTable: { modelSpace } }
        },
        entityService: { eraseEntities }
      }
    } as never)

    expect(paperAppend).toHaveBeenCalledTimes(1)
    expect(modelAppend).not.toHaveBeenCalled()
  })
})
