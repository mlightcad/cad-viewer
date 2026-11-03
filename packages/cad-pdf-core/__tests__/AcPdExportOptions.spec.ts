import {
  AcDbDatabase,
  acdbHostApplicationServices
} from '@mlightcad/data-model'
import type { AcPdfGlyphProvider } from '@mlightcad/pdf-renderer'

import {
  acPdBuildRendererOptions,
  acPdResolveExportOptions
} from '../src/index'

const stubGlyphs = {} as AcPdfGlyphProvider
const fontResolver = async () => undefined

function createDb() {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('acPdResolveExportOptions', () => {
  it('fills defaults', () => {
    expect(acPdResolveExportOptions()).toEqual({
      modelSpaceFit: 'extents',
      exportLayouts: true,
      textMode: 'text',
      colorMode: 'color'
    })
  })

  it('keeps valid values and drops unknown ones', () => {
    expect(
      acPdResolveExportOptions({
        modelSpaceFit: 'display',
        exportLayouts: false,
        textMode: 'vector',
        colorMode: 'monochrome'
      })
    ).toEqual({
      modelSpaceFit: 'display',
      exportLayouts: false,
      textMode: 'vector',
      colorMode: 'monochrome'
    })
    expect(
      acPdResolveExportOptions({
        colorMode: 'grey' as never,
        textMode: 'outline' as never
      })
    ).toMatchObject({ colorMode: 'color', textMode: 'text' })
  })
})

describe('acPdBuildRendererOptions', () => {
  const displayBox = { min: { x: 0, y: 0 }, max: { x: 10, y: 5 } }

  it('forwards colour mode and layouts', () => {
    const options = acPdBuildRendererOptions(createDb(), {
      colorMode: 'monochrome',
      exportLayouts: false,
      glyphProvider: stubGlyphs
    })
    expect(options.colorMode).toBe('monochrome')
    expect(options.layouts).toBe('current')
    expect(options.background).toBe('none')
    expect(options.glyphProvider).toBe(stubGlyphs)
  })

  it('only passes the font resolver in text mode', () => {
    const db = createDb()
    expect(
      acPdBuildRendererOptions(db, {
        textMode: 'text',
        textFontResolver: fontResolver,
        glyphProvider: stubGlyphs
      }).textFontResolver
    ).toBe(fontResolver)
    expect(
      acPdBuildRendererOptions(db, {
        textMode: 'vector',
        textFontResolver: fontResolver,
        glyphProvider: stubGlyphs
      }).textFontResolver
    ).toBeUndefined()
  })

  it('uses the display box only for display framing', () => {
    const db = createDb()
    expect(
      acPdBuildRendererOptions(db, {
        modelSpaceFit: 'display',
        displayBox,
        glyphProvider: stubGlyphs
      }).fitBox
    ).toEqual(displayBox)
    expect(
      acPdBuildRendererOptions(db, {
        modelSpaceFit: 'extents',
        displayBox,
        glyphProvider: stubGlyphs
      }).fitBox
    ).toBeUndefined()
    // Headless: display framing without a view box falls back to extents.
    expect(
      acPdBuildRendererOptions(db, {
        modelSpaceFit: 'display',
        glyphProvider: stubGlyphs
      }).fitBox
    ).toBeUndefined()
  })
})
