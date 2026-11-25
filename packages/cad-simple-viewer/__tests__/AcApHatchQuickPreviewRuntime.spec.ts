/**
 * @jest-environment jsdom
 */
jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getDouble: jest.fn(),
        getEntity: jest.fn(),
        getKeywords: jest.fn(),
        getPoint: jest.fn(),
        getSelection: jest.fn(),
        getString: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
    protected showMessage() {}
  }
  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }
  class AcEdPromptPointOptions {
    allowNone = false
    disableOSnap = false
    disableTracking = false
    keywords = new MockKeywordCollection()
    jig: unknown
    constructor(readonly message: string) {}
  }
  class AcEdPromptDoubleOptions {
    constructor(readonly message: string) {}
  }
  class AcEdPromptEntityOptions {
    constructor(readonly message: string) {}
  }
  class AcEdPromptKeywordOptions {
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }
  class AcEdPromptSelectionOptions {
    constructor(readonly message: string) {}
  }
  class AcEdPromptStringOptions {
    constructor(readonly message: string) {}
  }
  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 'Write' },
    AcEdPromptDoubleOptions,
    AcEdPromptEntityOptions,
    AcEdPromptKeywordOptions,
    AcEdPromptPointOptions,
    AcEdPromptSelectionOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel',
      None: 'None'
    },
    AcEdPromptStringOptions
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: { t: (key: string) => key }
}))

import {
  AcDbCircle,
  AcDbDatabase,
  AcDbHatch,
  AcDbPolyline,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeLoop2d,
  AcGePoint2d,
  HATCH_PATTERN_SOLID,
  acdbHatchBoundaryEdgesFromEntity
} from '@mlightcad/data-model'

import {
  AcApHatchCmd,
  type HatchSettings
} from '../src/command/draw/AcApHatchCmd'
import { AcApHatchQuickPreviewJig } from '../src/command/draw/AcApHatchQuickPreviewJig'

class ProbeHatchCmd extends AcApHatchCmd {
  constructor(private readonly testSettings: HatchSettings) {
    super()
  }

  protected override get settings() {
    return this.testSettings
  }

  collectFromDb(db: AcDbDatabase) {
    const edges = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      edges.push(...acdbHatchBoundaryEdgesFromEntity(entity))
    }
    return (
      this as unknown as {
        buildLoopsFromEdges: (edges: unknown[]) => AcGeLoop2d[]
      }
    ).buildLoopsFromEdges(edges)
  }

  infos(loops: AcGeLoop2d[]) {
    return this.buildLoopInfos(loops)
  }

  resolve(
    point: { x: number; y: number },
    loops: AcGeLoop2d[],
    infos: ReturnType<ProbeHatchCmd['infos']>
  ) {
    return this.resolveLoopsForPickPoint(point, loops, infos)
  }
}

function addRect(
  db: AcDbDatabase,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  const pl = new AcDbPolyline()
  pl.closed = true
  pl.addVertexAt(0, new AcGePoint2d(minX, minY), 0)
  pl.addVertexAt(1, new AcGePoint2d(maxX, minY), 0)
  pl.addVertexAt(2, new AcGePoint2d(maxX, maxY), 0)
  pl.addVertexAt(3, new AcGePoint2d(minX, maxY), 0)
  db.tables.blockTable.modelSpace.appendEntity(pl)
}

function addCircle(db: AcDbDatabase, x: number, y: number, r: number) {
  const c = new AcDbCircle()
  c.center = { x, y, z: 0 }
  c.radius = r
  db.tables.blockTable.modelSpace.appendEntity(c)
}

function loopIndex(
  loops: AcGeLoop2d[],
  resolved: ReadonlyArray<AcGeLoop2d>
) {
  if (!resolved.length) return -1
  return loops.indexOf(resolved[0] as AcGeLoop2d)
}

describe('HPQUICKPREVIEW pick isolation', () => {
  const settings: HatchSettings = {
    patternName: HATCH_PATTERN_SOLID,
    patternScale: 1,
    patternAngleDeg: 0,
    style: 0 as never,
    islandDetectionEnabled: true,
    associative: false
  }

  test('disjoint rect + two circles resolve independently', () => {
    const db = new AcDbDatabase()
    addRect(db, 0, 0, 10, 30)
    addCircle(db, 25, 15, 6)
    addCircle(db, 45, 15, 6)

    const probe = new ProbeHatchCmd(settings)
    const loops = probe.collectFromDb(db)
    const infos = probe.infos(loops)

    const samples: Array<{ x: number; y: number; expect: 'rect' | 'mid' | 'right' | 'none' }> =
      [
        { x: 5, y: 15, expect: 'rect' },
        { x: 25, y: 15, expect: 'mid' },
        { x: 45, y: 15, expect: 'right' },
        { x: -10, y: 15, expect: 'none' },
        { x: 15, y: 15, expect: 'none' },
        { x: 35, y: 15, expect: 'none' },
        { x: 100, y: 100, expect: 'none' },
        { x: 5, y: 40, expect: 'none' },
        { x: 25, y: 30, expect: 'none' }
      ]

    for (const sample of samples) {
      const resolved = probe.resolve(sample, loops, infos)
      if (sample.expect === 'none') {
        expect(resolved.length).toBe(0)
      } else {
        expect(resolved.length).toBeGreaterThan(0)
      }
    }

    expect(loopIndex(loops, probe.resolve({ x: 5, y: 15 }, loops, infos))).toBe(
      0
    )
    expect(
      loopIndex(loops, probe.resolve({ x: 25, y: 15 }, loops, infos))
    ).toBe(1)
    expect(
      loopIndex(loops, probe.resolve({ x: 45, y: 15 }, loops, infos))
    ).toBe(2)
  })

  test('jig clears outside and switches between entities', () => {
    const db = new AcDbDatabase()
    addRect(db, 0, 0, 10, 30)
    addCircle(db, 25, 15, 6)
    addCircle(db, 45, 15, 6)

    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPQUICKPREVIEW,
      1,
      db
    )
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.HPQUICKPREVTIMEOUT,
      2,
      db
    )

    const probe = new ProbeHatchCmd(settings)
    const loops = probe.collectFromDb(db)
    const infos = probe.infos(loops)

    const transient = new Map<string, AcDbHatch>()
    const view = {
      addTransientEntity: jest.fn((entity: AcDbHatch | AcDbHatch[]) => {
        const list = Array.isArray(entity) ? entity : [entity]
        list.forEach(item => transient.set(String(item.objectId), item))
      }),
      removeTransientEntity: jest.fn((id: string) => {
        transient.delete(String(id))
      })
    }

    let previewSeq = 0
    const jig = new AcApHatchQuickPreviewJig(view as never, {
      database: db,
      resolveLoops: point => probe.resolve(point, loops, infos),
      createHatch: resolved => {
        const hatch = new AcDbHatch()
        Object.defineProperty(hatch, 'objectId', {
          value: `P${++previewSeq}`,
          configurable: true
        })
        ;(hatch as unknown as { __loopIndex: number }).__loopIndex = loopIndex(
          loops,
          resolved
        )
        return hatch
      }
    })

    jig.update({ x: 5, y: 15, z: 0 })
    jig.render()
    jig.update({ x: 15, y: 15, z: 0 })
    jig.render()
    expect(transient.size).toBe(0)

    jig.update({ x: 25, y: 15, z: 0 })
    jig.render()
    expect(transient.size).toBe(1)
    expect(
      ( [...transient.values()][0] as AcDbHatch & { __loopIndex: number })
        .__loopIndex
    ).toBe(1)

    jig.update({ x: 45, y: 15, z: 0 })
    jig.render()
    expect(transient.size).toBe(1)
    expect(
      ( [...transient.values()][0] as AcDbHatch & { __loopIndex: number })
        .__loopIndex
    ).toBe(2)

    jig.update({ x: 100, y: 100, z: 0 })
    jig.render()
    expect(transient.size).toBe(0)
  })

  test('grid scan has no false-positive containment outside shapes', () => {
    const db = new AcDbDatabase()
    addRect(db, 0, 0, 10, 30)
    addCircle(db, 25, 15, 6)
    addCircle(db, 45, 15, 6)

    const probe = new ProbeHatchCmd(settings)
    const loops = probe.collectFromDb(db)
    const infos = probe.infos(loops)

    const falsePositives: Array<{ x: number; y: number }> = []
    for (let x = -5; x <= 55; x += 2) {
      for (let y = -5; y <= 40; y += 2) {
        const inRect = x >= 0 && x <= 10 && y >= 0 && y <= 30
        const inMid = (x - 25) ** 2 + (y - 15) ** 2 <= 6 ** 2
        const inRight = (x - 45) ** 2 + (y - 15) ** 2 <= 6 ** 2
        const shouldHit = inRect || inMid || inRight
        const resolved = probe.resolve({ x, y }, loops, infos)
        if (!shouldHit && resolved.length > 0) {
          falsePositives.push({ x, y })
        }
        if (shouldHit && resolved.length === 0) {
          const deepRect = x >= 1 && x <= 9 && y >= 1 && y <= 29
          const deepMid = (x - 25) ** 2 + (y - 15) ** 2 <= 4 ** 2
          const deepRight = (x - 45) ** 2 + (y - 15) ** 2 <= 4 ** 2
          if (deepRect || deepMid || deepRight) {
            falsePositives.push({ x, y })
          }
        }
      }
    }

    expect(falsePositives).toEqual([])
  })
})
