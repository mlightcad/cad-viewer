jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getPoint: jest.fn(),
        getDistance: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
    notify = jest.fn()
  }

  class MockKeywordCollection {
    readonly items: string[] = []
    add(_display: string, global: string) {
      this.items.push(global)
    }
  }

  class AcEdPromptDistanceOptions {
    keywords = new MockKeywordCollection()
    useBasePoint = false
    basePoint: unknown
    useDashedLine = false
    allowZero = true
    allowNegative = true
    useDefaultValue = false
    defaultValue = 0
    jig: unknown
    constructor(readonly message: string) {}
  }

  class AcEdPromptPointOptions {
    allowNone = false
    jig: unknown
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 'Write' },
    AcEdPromptDistanceOptions,
    AcEdPromptPointOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel',
      None: 'None'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

jest.mock('../src/service', () => ({
  resolveSelectedEntities: jest.fn()
}))

jest.mock('../src/command/modify/AcApScalePreviewJig', () => ({
  AcApScalePreviewJig: jest.fn(),
  AcApScaleStaticJig: jest.fn()
}))

import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../src/app'
import { AcApScaleCmd } from '../src/command/modify/AcApScaleCmd'
import { AcEdPromptStatus } from '../src/editor'
import { resolveSelectedEntities } from '../src/service'
import { createScaleMatrix } from '../src/util/AcApGeTransform'

type DistancePrompt = {
  message: string
  useBasePoint: boolean
  defaultValue: number
  allowZero: boolean
  allowNegative: boolean
  keywords: { items: string[] }
}

const editor = AcApDocManager.instance.editor as unknown as {
  getPoint: jest.Mock
  getDistance: jest.Mock
}

function ok(value: unknown) {
  return { status: AcEdPromptStatus.OK, value }
}

function keyword(name: string) {
  return { status: AcEdPromptStatus.Keyword, stringResult: name }
}

function createContext() {
  const entityService = {
    scaleEntities: jest.fn(),
    cloneAndTransform: jest.fn()
  }
  const selectionSet = { clear: jest.fn() }
  const context = {
    view: { selectionSet },
    doc: { entityService }
  } as unknown as AcApContext
  return { context, entityService, selectionSet }
}

const entities = [{ objectId: 'line-1' }]

describe('AcApScaleCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    AcApScaleCmd.resetDefaults()
    ;(resolveSelectedEntities as jest.Mock).mockResolvedValue({ entities })
    editor.getPoint.mockResolvedValue(ok(new AcGePoint3d(1, 2, 0)))
  })

  it('scales the selection about the base point by the typed factor', async () => {
    const { context, entityService, selectionSet } = createContext()
    editor.getDistance.mockResolvedValueOnce(ok(2))

    await new AcApScaleCmd().execute(context)

    const prompt = editor.getDistance.mock.calls[0][0] as DistancePrompt
    expect(prompt.message).toBe('jig.scale.scaleFactorOrOptions')
    expect(prompt.useBasePoint).toBe(true)
    expect(prompt.allowZero).toBe(false)
    expect(prompt.allowNegative).toBe(false)
    expect(prompt.defaultValue).toBe(1)
    expect(prompt.keywords.items).toEqual([
      'jig.scale.keywords.copy.global',
      'jig.scale.keywords.reference.global'
    ])
    expect(entityService.scaleEntities).toHaveBeenCalledWith(
      entities,
      expect.objectContaining({ x: 1, y: 2, z: 0 }),
      2
    )
    expect(entityService.cloneAndTransform).not.toHaveBeenCalled()
    expect(selectionSet.clear).toHaveBeenCalled()
  })

  it('remembers the last scale factor as the next default', async () => {
    editor.getDistance.mockResolvedValueOnce(ok(3))
    await new AcApScaleCmd().execute(createContext().context)

    editor.getDistance.mockResolvedValueOnce(ok(3))
    await new AcApScaleCmd().execute(createContext().context)

    const prompt = editor.getDistance.mock.calls[1][0] as DistancePrompt
    expect(prompt.defaultValue).toBe(3)
  })

  it('keeps the originals and appends scaled copies with Copy', async () => {
    const { context, entityService } = createContext()
    editor.getDistance
      .mockResolvedValueOnce(keyword('Copy'))
      .mockResolvedValueOnce(ok(0.5))

    await new AcApScaleCmd().execute(context)

    expect(entityService.scaleEntities).not.toHaveBeenCalled()
    expect(entityService.cloneAndTransform).toHaveBeenCalledTimes(1)
    const [sources, matrix] = entityService.cloneAndTransform.mock.calls[0]
    expect(sources).toBe(entities)
    const expected = createScaleMatrix(new AcGePoint3d(1, 2, 0), 0.5)
    expect((matrix as AcGeMatrix3d).elements).toEqual(expected.elements)
  })

  it('derives the factor from reference and new lengths', async () => {
    const { context, entityService } = createContext()
    editor.getDistance
      .mockResolvedValueOnce(keyword('Reference'))
      .mockResolvedValueOnce(ok(4))
      .mockResolvedValueOnce(ok(6))

    await new AcApScaleCmd().execute(context)

    const refPrompt = editor.getDistance.mock.calls[1][0] as DistancePrompt
    expect(refPrompt.message).toBe('jig.scale.referenceLength')
    // Two-point / typed reference length: no base point.
    expect(refPrompt.useBasePoint).toBe(false)
    const newPrompt = editor.getDistance.mock.calls[2][0] as DistancePrompt
    expect(newPrompt.message).toBe('jig.scale.newLengthOrPoints')
    expect(newPrompt.useBasePoint).toBe(true)
    expect(newPrompt.keywords.items).toEqual([
      'jig.scale.keywords.points.global'
    ])
    expect(entityService.scaleEntities).toHaveBeenCalledWith(
      entities,
      expect.anything(),
      1.5
    )
  })

  it('supports the Points option for the new length', async () => {
    const { context, entityService } = createContext()
    editor.getDistance
      .mockResolvedValueOnce(keyword('Reference'))
      .mockResolvedValueOnce(ok(2))
      .mockResolvedValueOnce(keyword('Points'))
      .mockResolvedValueOnce(ok(5))

    await new AcApScaleCmd().execute(context)

    const pointsPrompt = editor.getDistance.mock.calls[3][0] as DistancePrompt
    expect(pointsPrompt.useBasePoint).toBe(false)
    expect(entityService.scaleEntities).toHaveBeenCalledWith(
      entities,
      expect.anything(),
      2.5
    )
  })

  it('does nothing when the base point prompt is canceled', async () => {
    const { context, entityService, selectionSet } = createContext()
    editor.getPoint.mockResolvedValueOnce({ status: AcEdPromptStatus.None })

    await new AcApScaleCmd().execute(context)

    expect(editor.getDistance).not.toHaveBeenCalled()
    expect(entityService.scaleEntities).not.toHaveBeenCalled()
    expect(selectionSet.clear).toHaveBeenCalled()
  })

  it('does nothing when the scale factor prompt is canceled', async () => {
    const { context, entityService } = createContext()
    editor.getDistance.mockResolvedValueOnce({
      status: AcEdPromptStatus.Cancel
    })

    await new AcApScaleCmd().execute(context)

    expect(entityService.scaleEntities).not.toHaveBeenCalled()
    expect(entityService.cloneAndTransform).not.toHaveBeenCalled()
  })

  it('skips a no-op transform for factor 1', async () => {
    const { context, entityService } = createContext()
    editor.getDistance.mockResolvedValueOnce(ok(1))

    await new AcApScaleCmd().execute(context)

    expect(entityService.scaleEntities).not.toHaveBeenCalled()
  })
})

describe('createScaleMatrix', () => {
  it('keeps the base point fixed and scales distances from it', () => {
    const base = new AcGePoint3d(10, 20, 0)
    const matrix = createScaleMatrix(base, 3)

    const fixed = new AcGePoint3d(10, 20, 0).applyMatrix4(matrix)
    expect(fixed.x).toBeCloseTo(10)
    expect(fixed.y).toBeCloseTo(20)

    const moved = new AcGePoint3d(12, 21, 0).applyMatrix4(matrix)
    expect(moved.x).toBeCloseTo(16)
    expect(moved.y).toBeCloseTo(23)
  })
})
