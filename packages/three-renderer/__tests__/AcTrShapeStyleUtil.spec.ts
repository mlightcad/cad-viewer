import {
  AcDbDatabase,
  AcDbTextStyleTableRecord,
  acdbHostApplicationServices,
  AcGiTextStyle
} from '@mlightcad/data-model'
import { FontManager } from '@mlightcad/mtext-renderer'

import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import {
  resolveShapeGlyphKey,
  resolveShapeTextStyle
} from '../src/util/AcTrShapeStyleUtil'

const EMPTY_TEXT_STYLE = {
  name: '',
  standardFlag: 0,
  fixedTextHeight: 0,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 0,
  font: '',
  bigFont: '',
  extendedFont: ''
}

function makeStyle(
  name: string,
  font: string,
  standardFlag = 0
): AcGiTextStyle {
  return {
    name,
    standardFlag,
    fixedTextHeight: 0,
    widthFactor: 1,
    obliqueAngle: 0,
    textGenerationFlag: 0,
    lastHeight: 0,
    font,
    bigFont: '',
    extendedFont: ''
  }
}

describe('resolveShapeTextStyle', () => {
  const fontManager = FontManager.instance

  beforeEach(() => {
    jest.spyOn(fontManager, 'getShapeByName').mockReturnValue(undefined)
    jest.spyOn(fontManager, 'getShapeByCode').mockReturnValue(undefined)
    jest.spyOn(fontManager, 'getFontByName').mockReturnValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns a copy of the provided style when it contains the glyph', () => {
    const style = makeStyle('Standard', 'txt')
    jest
      .mocked(fontManager.getShapeByName)
      .mockImplementation((name, fontName) => {
        if (name === 'ARROW' && fontName === 'txt') {
          return {
            polylines: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ]
            ]
          } as never
        }
        return undefined
      })

    const context = new AcTrRenderContext()
    const resolved = resolveShapeTextStyle(
      { name: 'ARROW', size: 1, position: { x: 0, y: 0, z: 0 } },
      style,
      context
    )

    expect(resolved).toEqual(style)
    expect(resolved).not.toBe(style)
  })

  it('searches shape definition files when the provided style lacks the glyph', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const shapeDef = new AcDbTextStyleTableRecord(
      makeStyle('', 'tecosymbol', 1)
    )
    db.tables.textStyleTable.add(shapeDef)

    jest
      .mocked(fontManager.getShapeByName)
      .mockImplementation((name, fontName) => {
        if (name === '_GV_' && fontName === 'tecosymbol') {
          return {
            polylines: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ]
            ]
          } as never
        }
        return undefined
      })

    const context = new AcTrRenderContext()
    context.database = db

    const resolved = resolveShapeTextStyle(
      {
        name: '_GV_',
        size: 0.01,
        position: { x: 0, y: 0, z: 0 }
      },
      makeStyle('pipe', 'romans'),
      context
    )

    expect(resolved.font).toBe('tecosymbol')
  })

  it('searches shape definition files when style is omitted', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const shapeDef = new AcDbTextStyleTableRecord(makeStyle('', 'ltypeshp', 1))
    db.tables.textStyleTable.add(shapeDef)

    jest
      .mocked(fontManager.getShapeByName)
      .mockImplementation((name, fontName) => {
        if (name === 'ARROW' && fontName === 'ltypeshp') {
          return {
            polylines: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ]
            ]
          } as never
        }
        return undefined
      })

    const context = new AcTrRenderContext()
    context.database = db

    const resolved = resolveShapeTextStyle(
      {
        name: 'ARROW',
        size: 2,
        position: { x: 0, y: 0, z: 0 }
      },
      undefined,
      context
    )

    expect(resolved.font).toBe('ltypeshp')
    expect(fontManager.getShapeByName).toHaveBeenCalledWith(
      'ARROW',
      'ltypeshp',
      2
    )
  })

  it('uses shape number only when shape name is absent', () => {
    const style = makeStyle('Standard', 'ltypeshp')
    jest
      .mocked(fontManager.getShapeByCode)
      .mockImplementation((code, fontName) => {
        if (code === 65 && fontName === 'ltypeshp') {
          return {
            polylines: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ]
            ]
          } as never
        }
        return undefined
      })

    const context = new AcTrRenderContext()
    const resolved = resolveShapeTextStyle(
      {
        shapeNumber: 65,
        size: 1,
        position: { x: 0, y: 0, z: 0 }
      },
      style,
      context
    )

    expect(resolved).toEqual(style)
    expect(fontManager.getShapeByCode).toHaveBeenCalledWith(65, 'ltypeshp', 1)
    expect(fontManager.getShapeByName).not.toHaveBeenCalled()
  })

  it('does not fall back to shape number when shape name is present', () => {
    const style = makeStyle('Standard', 'ltypeshp')
    jest
      .mocked(fontManager.getShapeByCode)
      .mockImplementation((code, fontName) => {
        if (code === 65 && fontName === 'ltypeshp') {
          return {
            polylines: [
              [
                { x: 0, y: 0 },
                { x: 1, y: 0 }
              ]
            ]
          } as never
        }
        return undefined
      })

    const context = new AcTrRenderContext()
    const resolved = resolveShapeTextStyle(
      {
        name: 'MISSING',
        shapeNumber: 65,
        size: 1,
        position: { x: 0, y: 0, z: 0 }
      },
      style,
      context
    )

    expect(resolved).toEqual(EMPTY_TEXT_STYLE)
    expect(fontManager.getShapeByName).toHaveBeenCalledWith(
      'MISSING',
      'ltypeshp',
      1
    )
    expect(fontManager.getShapeByCode).not.toHaveBeenCalled()
  })

  it('returns an empty style when no shape file contains the glyph', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const shapeDef = new AcDbTextStyleTableRecord(makeStyle('', 'ltypeshp', 1))
    db.tables.textStyleTable.add(shapeDef)

    const context = new AcTrRenderContext()
    context.database = db

    const resolved = resolveShapeTextStyle(
      {
        name: 'MISSING',
        size: 1,
        position: { x: 0, y: 0, z: 0 }
      },
      null,
      context
    )

    expect(resolved).toEqual(EMPTY_TEXT_STYLE)
  })
})

describe('resolveShapeGlyphKey', () => {
  it('prefers shape name over shape number', () => {
    expect(
      resolveShapeGlyphKey({
        name: 'ARROW',
        shapeNumber: 65,
        size: 1,
        position: { x: 0, y: 0, z: 0 }
      })
    ).toEqual({ byName: 'ARROW' })
  })

  it('uses shape number when shape name is missing', () => {
    expect(
      resolveShapeGlyphKey({
        shapeNumber: 65,
        size: 1,
        position: { x: 0, y: 0, z: 0 }
      })
    ).toEqual({ byCode: 65 })
  })
})
