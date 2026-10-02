import {
  AcGiMTextFlowDirection,
  type AcGiMTextData,
  type AcGiTextStyle
} from '@mlightcad/data-model'

import { AcPdfFontManager } from '../src/pdf/AcPdfFontManager'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'
import type { AcPdfGlyphProvider } from '../src/text/AcPdfGlyphProvider'

const style: AcGiTextStyle = {
  name: 'Standard',
  standardFlag: 0,
  fixedTextHeight: 2.5,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 2.5,
  font: 'arial',
  bigFont: ''
}

function makeMtext(text: string): AcGiMTextData {
  return {
    text,
    height: 2.5,
    width: Infinity,
    widthFactor: 1,
    position: { x: 10, y: 20, z: 0 },
    rotation: 0,
    drawingDirection: AcGiMTextFlowDirection.LEFT_TO_RIGHT,
    attachmentPoint: 1
  }
}

function mockGlyphProvider(): AcPdfGlyphProvider {
  return {
    async renderMText(data) {
      return {
        primitives: {
          triangles: new Float32Array([0, 0, 2, 0, 1, 1]),
          polylines: new Float32Array(0)
        },
        box: { min: { x: 0, y: 0 }, max: { x: 2, y: 1 } },
        actualText: data.text ?? ''
      }
    },
    async renderShape() {
      return {
        primitives: {
          triangles: new Float32Array(0),
          polylines: new Float32Array(0)
        },
        box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
      }
    }
  }
}

describe('textMode font defer while glyph cache is warm', () => {
  it('tracks unsettled font loads as deferred collect work', async () => {
    const glyphProvider = mockGlyphProvider()

    let resolveFont!: (bytes: Uint8Array | undefined) => void
    const fontGate = new Promise<Uint8Array | undefined>(resolve => {
      resolveFont = resolve
    })
    const fonts = new AcPdfFontManager(async () => fontGate)

    const renderer = new AcPdfRenderer()
    // Seed the glyph cache under vector mode so the later textMode call hits
    // a synchronous cache fill (the regression path that used to skip deferral).
    renderer.configureExport({
      glyphProvider,
      textMode: 'vector',
      background: 'none',
      title: 'seed'
    })
    renderer.mtext(makeMtext('Hello'), style)
    await renderer.awaitPending()

    renderer.configureExport({
      glyphProvider,
      textMode: 'text',
      background: 'none',
      title: 'defer-font'
    })
    renderer.textFontManager = fonts

    expect(fonts.isSettled('arial')).toBe(false)
    expect(fonts.has('arial')).toBe(false)

    renderer.beginCollectPass()
    renderer.mtext(makeMtext('Hello'), style)
    const hadDeferred = renderer.endCollectPass()

    // Glyph cache hit paints synchronously; without tracking fonts.load the
    // collect pass would look idle and textMode export would finalize as
    // vector-only while the resolver is still in flight.
    expect(hadDeferred).toBe(true)
    expect(fonts.isSettled('arial')).toBe(false)

    resolveFont(undefined)
    await renderer.awaitPending()
    expect(fonts.isSettled('arial')).toBe(true)
    expect(fonts.has('arial')).toBe(false)
  })
})
