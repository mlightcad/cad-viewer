jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      curDocument: null,
      curView: null,
      events: {
        documentActivated: {
          addEventListener: jest.fn()
        }
      }
    }
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: class AcTrView2d {}
}))

import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbMText,
  AcGePoint3d,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

import { AcApDocManager } from '../src/app'
import { AcApBlockPreviewConvertor } from '../src/command/convert/AcApBlockPreviewConvertor'

/**
 * Gallery geometry thumbnails draw through the live view renderer. Without
 * skipMeshGlyphInstancing, TrueType MTEXT inside large blocks (e.g.
 * TITLE-BLOCK) enqueue scene-level InstancedMesh placements that later flush
 * into the drawing when an unrelated block is inserted.
 */
describe('AcApBlockPreviewConvertor mesh-glyph isolation', () => {
  afterEach(() => {
    AcApBlockPreviewConvertor.clearCache()
    jest.restoreAllMocks()
  })

  it('raises skipMeshGlyphInstancing for the whole off-scene draw and restores it', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const btr = new AcDbBlockTableRecord()
    btr.name = 'TITLE-BLOCK'
    db.tables.blockTable.add(btr)

    const mtext = new AcDbMText()
    mtext.contents = 'METALLURGY'
    mtext.location = new AcGePoint3d(0, 0, 0)
    btr.appendEntity(mtext)

    const skipDuringDraw: boolean[] = []
    const context = { skipMeshGlyphInstancing: false }
    const root = {
      userData: {} as { skipMeshGlyphInstancing?: boolean },
      syncDraw: jest.fn(() => {
        skipDuringDraw.push(context.skipMeshGlyphInstancing)
      }),
      dispose: jest.fn()
    }

    const renderer = {
      context,
      renderEntityPreview: jest.fn(() => ({
        canvas: { toDataURL: () => 'data:image/png;base64,preview' }
      }))
    }

    const view = {
      renderer,
      width: 800,
      height: 600,
      isDirty: false
    }

    const docManager = AcApDocManager.instance as unknown as {
      curDocument: { database: AcDbDatabase }
      curView: typeof view
    }
    docManager.curDocument = { database: db }
    docManager.curView = view

    const worldDrawSpy = jest
      .spyOn(AcDbBlockReference.prototype, 'worldDraw')
      .mockImplementation(() => {
        skipDuringDraw.push(context.skipMeshGlyphInstancing)
        return root as never
      })

    const convertor = new AcApBlockPreviewConvertor()
    const url = convertor.capture('TITLE-BLOCK', 64)

    expect(url).toBe('data:image/png;base64,preview')
    expect(worldDrawSpy).toHaveBeenCalled()
    expect(root.syncDraw).toHaveBeenCalled()
    expect(skipDuringDraw.length).toBeGreaterThanOrEqual(2)
    expect(skipDuringDraw.every(Boolean)).toBe(true)
    expect(root.userData.skipMeshGlyphInstancing).toBe(true)
    expect(context.skipMeshGlyphInstancing).toBe(false)
    expect(root.dispose).toHaveBeenCalled()
  })

  it('restores a pre-existing skipMeshGlyphInstancing=true after capture', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const btr = new AcDbBlockTableRecord()
    btr.name = 'STAMP'
    db.tables.blockTable.add(btr)

    const context = { skipMeshGlyphInstancing: true }
    const root = {
      userData: {} as { skipMeshGlyphInstancing?: boolean },
      syncDraw: jest.fn(),
      dispose: jest.fn()
    }

    const renderer = {
      context,
      renderEntityPreview: jest.fn(() => ({
        canvas: { toDataURL: () => 'data:image/png;base64,preview' }
      }))
    }

    const view = {
      renderer,
      width: 800,
      height: 600,
      isDirty: false
    }

    const docManager = AcApDocManager.instance as unknown as {
      curDocument: { database: AcDbDatabase }
      curView: typeof view
    }
    docManager.curDocument = { database: db }
    docManager.curView = view

    jest
      .spyOn(AcDbBlockReference.prototype, 'worldDraw')
      .mockReturnValue(root as never)

    const convertor = new AcApBlockPreviewConvertor()
    expect(convertor.capture('STAMP', 64)).toBe(
      'data:image/png;base64,preview'
    )
    expect(context.skipMeshGlyphInstancing).toBe(true)
  })

  it('restores skipMeshGlyphInstancing when renderEntityPreview throws', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const btr = new AcDbBlockTableRecord()
    btr.name = 'BROKEN'
    db.tables.blockTable.add(btr)

    const context = { skipMeshGlyphInstancing: false }
    const root = {
      userData: {} as { skipMeshGlyphInstancing?: boolean },
      syncDraw: jest.fn(),
      dispose: jest.fn()
    }

    const renderer = {
      context,
      renderEntityPreview: jest.fn(() => {
        throw new Error('preview failed')
      })
    }

    const view = {
      renderer,
      width: 800,
      height: 600,
      isDirty: false
    }

    const docManager = AcApDocManager.instance as unknown as {
      curDocument: { database: AcDbDatabase }
      curView: typeof view
    }
    docManager.curDocument = { database: db }
    docManager.curView = view

    jest
      .spyOn(AcDbBlockReference.prototype, 'worldDraw')
      .mockReturnValue(root as never)

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const convertor = new AcApBlockPreviewConvertor()
    expect(convertor.capture('BROKEN', 64)).toBeUndefined()
    expect(context.skipMeshGlyphInstancing).toBe(false)
    expect(root.dispose).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })
})
