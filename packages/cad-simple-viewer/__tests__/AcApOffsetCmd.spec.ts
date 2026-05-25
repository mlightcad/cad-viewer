jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getDistance: jest.fn(),
        getEntity: jest.fn(),
        getPoint: jest.fn(),
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdPreviewJig<T> {
    constructor(readonly view: unknown) {}
    get entity() {
      return null
    }
    update(_value: T) {}
    render() {}
    end() {}
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptDistanceOptions {
    keywords = new MockKeywordCollection()
    useBasePoint = true

    constructor(readonly message: string) {}
  }

  class AcEdPromptEntityOptions {
    allowNone = false

    constructor(readonly message: string) {}
    addAllowedClass = jest.fn()
    setRejectMessage = jest.fn()
  }

  class AcEdPromptPointOptions {
    distanceInput?: {
      getDistance(point: unknown): number
      resolvePoint(distance: number, referencePoint: unknown): unknown
    }
    jig?: AcEdPreviewJig<unknown>

    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Review: 'Review'
    },
    AcEdPreviewJig,
    AcEdPromptDistanceOptions,
    AcEdPromptEntityOptions,
    AcEdPromptPointOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import {
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  AcDbDatabase,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcApDocManager } from '../src/app'
import { AcApOffsetCmd } from '../src/command/modify/AcApOffsetCmd'
import { AcEdPromptStatus } from '../src/editor'

type OffsetSource =
  | AcDbLine
  | AcDbArc
  | AcDbCircle
  | AcDbEllipse
  | AcDbPolyline
  | AcDbSpline

const createContext = (source: OffsetSource) => {
  const database = new AcDbDatabase()
  const modelSpace = database.tables.blockTable.modelSpace
  modelSpace.appendEntity(source)

  const appended: OffsetSource[] = []
  const appendEntity = jest.spyOn(modelSpace, 'appendEntity')
  appendEntity.mockImplementation(entity => {
    const entities = Array.isArray(entity) ? entity : [entity]
    entities.forEach(item => appended.push(item as OffsetSource))
  })

  const transientAdds: OffsetSource[][] = []
  const transientRemoves: string[] = []
  const context = {
    doc: { database },
    view: {
      addTransientEntity: jest.fn(entity => {
        transientAdds.push(
          (Array.isArray(entity) ? entity : [entity]) as OffsetSource[]
        )
      }),
      removeTransientEntity: jest.fn((objectId: string) => {
        transientRemoves.push(objectId)
      }),
      selectionSet: {
        clear: jest.fn()
      }
    }
  }

  return { appended, context, source, transientAdds, transientRemoves }
}

const runOffset = async (
  source: OffsetSource,
  sidePoint: AcGePoint3d,
  options: {
    distance?: number
    through?: boolean
  } = {}
) => {
  const { appended, context, transientAdds, transientRemoves } =
    createContext(source)
  const editor = AcApDocManager.instance.editor

  jest.mocked(editor.getDistance).mockResolvedValueOnce(
    options.through
      ? {
          status: AcEdPromptStatus.Keyword,
          stringResult: 'Through'
        }
      : {
          status: AcEdPromptStatus.OK,
          value: options.distance ?? 2
        }
  )
  jest
    .mocked(editor.getEntity)
    .mockResolvedValueOnce({
      status: AcEdPromptStatus.OK,
      objectId: source.objectId
    })
    .mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })
  jest.mocked(editor.getPoint).mockImplementationOnce(async prompt => {
    prompt.jig?.update(sidePoint)
    prompt.jig?.render()
    prompt.jig?.end()
    return {
      status: AcEdPromptStatus.OK,
      value: sidePoint
    }
  })

  await new AcApOffsetCmd().execute(context as never)

  return { appended, context, transientAdds, transientRemoves }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AcApOffsetCmd', () => {
  test('offsets a line through AcDbCurve.getOffsetCurves', async () => {
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )

    const { appended, context, transientAdds, transientRemoves } =
      await runOffset(line, new AcGePoint3d(5, 3, 0), { distance: 2 })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbLine)
    const offset = appended[0] as AcDbLine
    expect(offset.startPoint.y).toBeCloseTo(2)
    expect(offset.endPoint.y).toBeCloseTo(2)
    expect(transientAdds).toHaveLength(1)
    expect(transientRemoves).toHaveLength(1)
    expect(context.view.selectionSet.clear).toHaveBeenCalledTimes(1)
  })

  test('offsets a circle', async () => {
    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)

    const { appended } = await runOffset(circle, new AcGePoint3d(10, 0, 0), {
      distance: 2
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbCircle)
    expect((appended[0] as AcDbCircle).radius).toBeCloseTo(7)
  })

  test('offsets an arc', async () => {
    const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 5, 0, Math.PI)

    const { appended } = await runOffset(arc, new AcGePoint3d(10, 0, 0), {
      distance: 2
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbArc)
    expect((appended[0] as AcDbArc).radius).toBeCloseTo(7)
  })

  test('offsets an ellipse and preserves its major axis', async () => {
    const ellipse = new AcDbEllipse(
      new AcGePoint3d(0, 0, 0),
      new AcGeVector3d(0, 0, 1),
      new AcGeVector3d(0, 1, 0),
      10,
      5,
      0,
      Math.PI * 2
    )

    const { appended } = await runOffset(ellipse, new AcGePoint3d(0, 12, 0), {
      distance: 2
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbEllipse)
    const offset = appended[0] as AcDbEllipse
    expect(offset.majorAxisRadius).toBeCloseTo(12)
    expect(offset.minorAxisRadius).toBeCloseTo(7)
    expect(offset.majorAxis.y).toBeCloseTo(1)
  })

  test('offsets an open polyline', async () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0))
    polyline.addVertexAt(1, new AcGePoint2d(10, 0))
    polyline.closed = false

    const { appended } = await runOffset(polyline, new AcGePoint3d(5, 3, 0), {
      distance: 2
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbPolyline)
    const offset = appended[0] as AcDbPolyline
    expect(offset.closed).toBe(false)
    expect(offset.numberOfVertices).toBe(2)
    expect(offset.getPoint2dAt(0).y).toBeCloseTo(2)
    expect(offset.getPoint2dAt(1).y).toBeCloseTo(2)
  })

  test('offsets a closed polyline', async () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0))
    polyline.addVertexAt(1, new AcGePoint2d(10, 0))
    polyline.addVertexAt(2, new AcGePoint2d(10, 10))
    polyline.addVertexAt(3, new AcGePoint2d(0, 10))
    polyline.closed = true

    const { appended } = await runOffset(polyline, new AcGePoint3d(5, 12, 0), {
      distance: 1
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbPolyline)
    const offset = appended[0] as AcDbPolyline
    expect(offset.closed).toBe(true)
    expect(offset.numberOfVertices).toBeGreaterThanOrEqual(4)
  })

  test('offsets through a picked distance', async () => {
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )

    const { appended } = await runOffset(line, new AcGePoint3d(5, 3, 0), {
      through: true
    })

    expect(appended).toHaveLength(1)
    const offset = appended[0] as AcDbLine
    expect(offset.startPoint.y).toBeCloseTo(3)
    expect(offset.endPoint.y).toBeCloseTo(3)
  })

  test('preserves Layer and Erase options', async () => {
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )
    line.layer = 'Source'
    const { appended, context, source } = createContext(line)
    context.doc.database.clayer = 'Current'
    const removeEntity = jest.spyOn(
      context.doc.database.tables.blockTable,
      'removeEntity'
    )
    const editor = AcApDocManager.instance.editor

    jest
      .mocked(editor.getDistance)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Keyword,
        stringResult: 'Layer'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.Keyword,
        stringResult: 'Erase'
      })
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: 2
      })
    jest
      .mocked(editor.getEntity)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        objectId: source.objectId
      })
      .mockResolvedValueOnce({ status: AcEdPromptStatus.Cancel })
    jest.mocked(editor.getPoint).mockResolvedValueOnce({
      status: AcEdPromptStatus.OK,
      value: new AcGePoint3d(5, 3, 0)
    })

    await new AcApOffsetCmd().execute(context as never)

    expect(appended).toHaveLength(1)
    expect(appended[0].layer).toBe('Current')
    expect(removeEntity).toHaveBeenCalledWith([source.objectId])
  })

  test('creates an approximate polyline for spline offset', async () => {
    const spline = new AcDbSpline(
      [
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(4, 5, 0),
        new AcGePoint3d(8, 0, 0),
        new AcGePoint3d(12, 4, 0)
      ],
      'Uniform'
    )

    const { appended } = await runOffset(spline, new AcGePoint3d(4, 7, 0), {
      distance: 0.5
    })

    expect(appended).toHaveLength(1)
    expect(appended[0]).toBeInstanceOf(AcDbPolyline)
    expect((appended[0] as AcDbPolyline).numberOfVertices).toBeGreaterThan(2)
  })
})
