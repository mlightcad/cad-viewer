jest.mock('../src/app/AcApDocManager', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getPoint: jest.fn(),
        getBox: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor/command/AcEdCommand', () => {
  class AcEdCommand {
    mode: unknown
    showMessage = jest.fn()
  }
  return { AcEdCommand }
})

jest.mock('../src/editor/view/AcEdOpenMode', () => ({
  AcEdOpenMode: { Write: 'Write' }
}))

jest.mock('../src/editor/input/prompt/AcEdPromptPointOptions', () => {
  class MockKeywordCollection {
    readonly items: string[] = []
    add(_display: string, global: string) {
      this.items.push(global)
    }
  }

  class AcEdPromptPointOptions {
    keywords = new MockKeywordCollection()
    allowNone = false
    useBasePoint = false
    useDashedLine = false
    basePoint: unknown
    jig: unknown
    constructor(readonly message: string) {}
  }
  return { AcEdPromptPointOptions }
})

jest.mock('../src/editor/input/prompt/AcEdPromptBoxOptions', () => {
  class AcEdPromptBoxOptions {
    allowNone = false
    constructor(
      readonly firstCornerMessage: string,
      readonly secondCornerMessage: string
    ) {}
  }
  return { AcEdPromptBoxOptions }
})

jest.mock('../src/editor/input/prompt/AcEdPromptStatus', () => ({
  AcEdPromptStatus: {
    OK: 'OK',
    Keyword: 'Keyword',
    Cancel: 'Cancel',
    None: 'None'
  }
}))

jest.mock('../src/editor/input/AcEdPromptStateMachine', () => {
  class AcEdPromptStateMachine {
    private state: {
      buildPrompt: () => unknown
      handleResult: (result: unknown) => Promise<string>
    } | null = null

    setState(state: {
      buildPrompt: () => unknown
      handleResult: (result: unknown) => Promise<string>
    }) {
      this.state = state
    }

    async run(acquire: (prompt: unknown) => Promise<unknown>): Promise<void> {
      while (this.state) {
        const prompt = this.state.buildPrompt()
        const result = await acquire(prompt)
        const step = await this.state.handleResult(result)
        if (step === 'finish') break
      }
    }
  }
  return { AcEdPromptStateMachine }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

jest.mock('../src/service/AcApLockedLayer.js', () => ({
  isEntityOnLockedLayer: () => false
}))

jest.mock('../src/command/modify/AcApStretchPreviewJig', () => ({
  AcApStretchPreviewJig: jest.fn()
}))

import { AcGeBox2d, AcGePoint3d } from '@mlightcad/data-model'

import type { AcApContext } from '../src/app/AcApContext'
import { AcApDocManager } from '../src/app/AcApDocManager'
import { AcApStretchCmd } from '../src/command/modify/AcApStretchCmd'
import { acapStretchLayoutDeltaToEntitySpace } from '../src/command/modify/acapStretchCoords'
import { AcEdPromptStatus } from '../src/editor/input/prompt/AcEdPromptStatus'
import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

const editor = AcApDocManager.instance.editor as unknown as {
  getPoint: jest.Mock
  getBox: jest.Mock
}

function ok(value: unknown, mode?: 'window' | 'crossing') {
  return { status: AcEdPromptStatus.OK, value, mode }
}

describe('acapStretchLayoutDeltaToEntitySpace', () => {
  it('passes layout delta through when there is no viewport', () => {
    const view = {
      getViewportCoordinateMapper: jest.fn()
    } as unknown as AcEdBaseView

    expect(
      acapStretchLayoutDeltaToEntitySpace(
        view,
        undefined,
        { x: 10, y: 20, z: 0 },
        { x: 3, y: 4, z: 0 }
      )
    ).toEqual({ x: 3, y: 4, z: 0 })
    expect(view.getViewportCoordinateMapper).not.toHaveBeenCalled()
  })

  it('maps paper displacement through a scaled viewport', () => {
    const view = {
      getViewportCoordinateMapper: jest.fn().mockReturnValue({
        paperToModel: (point: { x: number; y: number }) => ({
          x: point.x * 2,
          y: point.y * 2
        }),
        modelToPaper: (point: { x: number; y: number }) => ({
          x: point.x / 2,
          y: point.y / 2
        }),
        containsPaperPoint: () => true
      })
    } as unknown as AcEdBaseView

    expect(
      acapStretchLayoutDeltaToEntitySpace(
        view,
        'vp-1',
        { x: 1, y: 1, z: 0 },
        { x: 2, y: 3, z: 0 }
      )
    ).toEqual({ x: 4, y: 6, z: 0 })
  })
})

describe('AcApStretchCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stretches selected stretch points by the displacement', async () => {
    const stretchEntities = jest.fn().mockReturnValue(1)
    const selectionSet = {
      add: jest.fn(),
      clear: jest.fn()
    }
    const line = {
      objectId: 'line-1',
      geometricExtents: {
        isEmpty: () => false,
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 0, z: 0 }
      },
      subGetStretchPoints: () => [
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      ]
    }
    const box = new AcGeBox2d()
    box.setFromPoints([
      { x: 8, y: -1 },
      { x: 12, y: 1 }
    ])

    const context = {
      view: {
        selectionSet,
        collectSelectionIdsForBox: jest.fn().mockReturnValue(['line-1']),
        findViewportMapperForModelEntity: jest.fn().mockReturnValue(undefined)
      },
      doc: {
        database: {
          tables: {
            blockTable: {
              getEntityById: jest.fn().mockReturnValue(line)
            }
          }
        },
        entityService: { stretchEntities }
      }
    } as unknown as AcApContext

    editor.getBox.mockResolvedValueOnce(ok(box, 'crossing'))
    editor.getPoint
      .mockResolvedValueOnce(ok(new AcGePoint3d(0, 0, 0)))
      .mockResolvedValueOnce(ok(new AcGePoint3d(0, 5, 0)))

    await new AcApStretchCmd().execute(context)

    expect(editor.getBox).toHaveBeenCalledTimes(1)
    expect(context.view.collectSelectionIdsForBox).toHaveBeenCalledWith(
      box,
      'crossing'
    )
    expect(stretchEntities).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: line,
        indices: [1],
        fullyEnclosed: false,
        offset: expect.objectContaining({ x: 0, y: 5, z: 0 })
      })
    ])
    expect(selectionSet.clear).toHaveBeenCalled()
  })

  it('moves fully enclosed entities for window selection', async () => {
    const stretchEntities = jest.fn().mockReturnValue(1)
    const selectionSet = {
      add: jest.fn(),
      clear: jest.fn()
    }
    const line = {
      objectId: 'line-1',
      geometricExtents: {
        isEmpty: () => false,
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 0, z: 0 }
      },
      subGetStretchPoints: () => [
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      ]
    }
    const box = new AcGeBox2d()
    box.setFromPoints([
      { x: -1, y: -1 },
      { x: 11, y: 1 }
    ])

    const context = {
      view: {
        selectionSet,
        collectSelectionIdsForBox: jest.fn().mockReturnValue(['line-1']),
        findViewportMapperForModelEntity: jest.fn().mockReturnValue(undefined)
      },
      doc: {
        database: {
          tables: {
            blockTable: {
              getEntityById: jest.fn().mockReturnValue(line)
            }
          }
        },
        entityService: { stretchEntities }
      }
    } as unknown as AcApContext

    editor.getBox.mockResolvedValueOnce(ok(box, 'window'))
    editor.getPoint
      .mockResolvedValueOnce(ok(new AcGePoint3d(0, 0, 0)))
      .mockResolvedValueOnce(ok(new AcGePoint3d(2, 0, 0)))

    await new AcApStretchCmd().execute(context)

    expect(context.view.collectSelectionIdsForBox).toHaveBeenCalledWith(
      box,
      'window'
    )
    expect(stretchEntities).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: line,
        fullyEnclosed: true,
        offset: expect.objectContaining({ x: 2, y: 0, z: 0 })
      })
    ])
  })

  it('maps stretch points through a paper-space viewport', async () => {
    const stretchEntities = jest.fn().mockReturnValue(1)
    const selectionSet = {
      add: jest.fn(),
      clear: jest.fn()
    }
    const line = {
      objectId: 'line-1',
      geometricExtents: {
        isEmpty: () => false,
        min: { x: 0, y: 0, z: 0 },
        max: { x: 20, y: 0, z: 0 }
      },
      subGetStretchPoints: () => [
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(20, 0, 0)
      ]
    }
    // Paper box covers only the mapped tip at (10, 0).
    const box = new AcGeBox2d()
    box.setFromPoints([
      { x: 8, y: -1 },
      { x: 12, y: 1 }
    ])
    const mapper = {
      modelToPaper: (point: { x: number; y: number }) => ({
        x: point.x / 2,
        y: point.y / 2
      }),
      paperToModel: (point: { x: number; y: number }) => ({
        x: point.x * 2,
        y: point.y * 2
      }),
      containsPaperPoint: () => true
    }

    const context = {
      view: {
        selectionSet,
        collectSelectionIdsForBox: jest.fn().mockReturnValue(['line-1']),
        findViewportMapperForModelEntity: jest.fn().mockReturnValue({
          viewportId: 'vp-1',
          mapper
        }),
        getViewportCoordinateMapper: jest.fn().mockReturnValue(mapper)
      },
      doc: {
        database: {
          tables: {
            blockTable: {
              getEntityById: jest.fn().mockReturnValue(line)
            }
          }
        },
        entityService: { stretchEntities }
      }
    } as unknown as AcApContext

    editor.getBox.mockResolvedValueOnce(ok(box, 'crossing'))
    editor.getPoint
      .mockResolvedValueOnce(ok(new AcGePoint3d(0, 0, 0)))
      .mockResolvedValueOnce(ok(new AcGePoint3d(1, 0, 0)))

    await new AcApStretchCmd().execute(context)

    expect(stretchEntities).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: line,
        indices: [1],
        fullyEnclosed: false,
        // paper delta (1,0) → model delta (2,0) at 2x scale
        offset: expect.objectContaining({ x: 2, y: 0, z: 0 })
      })
    ])
  })
})
