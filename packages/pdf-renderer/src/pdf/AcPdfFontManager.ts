import fontkit from '@pdf-lib/fontkit'
import { inflate } from 'pako'
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef
} from 'pdf-lib'

import type { AcPdfOp } from '../renderer/AcPdfStyle'

export type AcPdfTextFontResolver = (
  fontName: string
) => Promise<Uint8Array | undefined> | Uint8Array | undefined

interface LoadedFont {
  /** Raw font program bytes (kept for pdf-lib embedding at write time). */
  bytes: Uint8Array
  /** Parsed fontkit font used for metrics and glyph encoding. */
  fk: fontkit.Font
}

const WOFF1_SIGNATURE = 0x774f4646 // 'wOFF'

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  )
}

/**
 * Repacks a WOFF1 container into a plain TrueType font program.
 *
 * fontkit re-inflates compressed WOFF tables on every table/glyph access —
 * seconds per text run on CJK faces (a 6MB simsun.woff costs ~2-5s per new
 * string and ~20s per subset encode), which stalls whole exports. Inflating
 * each table once up front turns every later fontkit access into a direct
 * byte slice, matching plain TTF speed.
 *
 * Structure per https://www.w3.org/TR/WOFF/#WOFFHeader: 44-byte header, then
 * 20-byte table directory entries, zlib-compressed table payloads. The TTF
 * table directory must be sorted by tag with 4-byte-aligned table data.
 */
function woff1ToTtf(woff: Uint8Array): Uint8Array {
  const dv = new DataView(woff.buffer, woff.byteOffset, woff.byteLength)
  const numTables = dv.getUint16(12)
  interface Table {
    tag: string
    data: Uint8Array
    checksum: number
  }
  const tables: Table[] = []
  for (let i = 0; i < numTables; i++) {
    const off = 44 + i * 20
    const tag = String.fromCharCode(
      woff[off], woff[off + 1], woff[off + 2], woff[off + 3]
    )
    const offset = dv.getUint32(off + 4)
    const compLength = dv.getUint32(off + 8)
    const origLength = dv.getUint32(off + 12)
    const data =
      compLength < origLength
        ? inflate(woff.subarray(offset, offset + compLength))
        : woff.slice(offset, offset + compLength)
    if (data.length !== origLength) {
      throw new Error(`WOFF table "${tag}" length mismatch`)
    }
    tables.push({ tag, data, checksum: dv.getUint32(off + 16) })
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))

  const entrySelector = Math.floor(Math.log2(numTables))
  const searchRange = 2 ** entrySelector * 16
  const headerLength = 12 + numTables * 16
  let total = headerLength
  for (const table of tables) {
    total += table.data.length + ((4 - (table.data.length % 4)) % 4)
  }
  const out = new Uint8Array(total)
  const header = new DataView(out.buffer)
  header.setUint32(0, 0x00010000)
  header.setUint16(4, numTables)
  header.setUint16(6, searchRange)
  header.setUint16(8, entrySelector)
  header.setUint16(10, numTables * 16 - searchRange)
  let dataOffset = headerLength
  tables.forEach((table, index) => {
    const off = 12 + index * 16
    for (let k = 0; k < 4; k++) {
      out[off + k] = table.tag.charCodeAt(k)
    }
    header.setUint32(off + 4, table.checksum)
    header.setUint32(off + 8, dataOffset)
    header.setUint32(off + 12, table.data.length)
    out.set(table.data, dataOffset)
    dataOffset += table.data.length + ((4 - (table.data.length % 4)) % 4)
  })
  return out
}

/**
 * Normalizes a resolved font program for fast fontkit access. WOFF1 payloads
 * are unpacked once; everything else is passed through (WOFF2 and TrueType
 * collections are left for fontkit/pdf-lib to accept or reject).
 */
function decodeFontProgram(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength >= 44 && readUint32(bytes, 0) === WOFF1_SIGNATURE) {
    return woff1ToTtf(bytes)
  }
  return bytes
}

/**
 * Document-scoped registry for fonts used by `textMode: 'text'` PDF exports.
 *
 * The manager is deliberately split across the two phases of an export:
 *
 * - **Render phase** (no `PDFDocument` exists yet): {@link load} fetches font
 *   bytes through the host resolver, parses them with fontkit and answers the
 *   layout engine's metric questions ({@link widthOfText}, glyph encoding).
 * - **Write phase** ({@link AcPdfDocumentWriter.writePage}): {@link bindDoc}
 *   registers fontkit with the pdf-lib document and {@link embedOp} embeds
 *   each used font (subset preferred, full program as fallback) and fills the
 *   op's `hex` through `PDFFont.encodeText` — required so pdf-lib's subset
 *   embedder sees exactly the glyphs the export paints.
 *
 * SHX fonts have no embeddable font program, so the resolver is expected to
 * return `undefined` for them and the renderer falls back to vector glyphs.
 */
export class AcPdfFontManager {
  private readonly _loaded = new Map<string, LoadedFont | null>()
  private readonly _loading = new Map<string, Promise<boolean>>()
  private readonly _embedded = new Map<string, PDFFont>()
  /** Per-font page-resource names (`FT0`, `FT1`, …) assigned at embed time. */
  private readonly _names = new Map<string, string>()
  private _doc: PDFDocument | null = null

  constructor(private readonly _resolver?: AcPdfTextFontResolver) {}

  /**
   * Resolves and parses `fontName`. Resolves `false` when the host has no
   * embeddable program for it (negative results are cached).
   */
  load(fontName: string): Promise<boolean> {
    const cached = this._loaded.get(fontName)
    if (cached !== undefined) {
      return Promise.resolve(cached !== null)
    }
    const inflight = this._loading.get(fontName)
    if (inflight) {
      return inflight
    }
    const pending = Promise.resolve(this._resolver?.(fontName) ?? undefined)
      .then(bytes => {
        if (!bytes || bytes.byteLength === 0) {
          this._loaded.set(fontName, null)
          return false
        }
        try {
          const program = decodeFontProgram(new Uint8Array(bytes))
          const fk = fontkit.create(program)
          this._loaded.set(fontName, { bytes: program, fk })
          return true
        } catch {
          this._loaded.set(fontName, null)
          return false
        }
      })
      .finally(() => {
        this._loading.delete(fontName)
      })
    this._loading.set(fontName, pending)
    return pending
  }

  /** True when {@link load} succeeded for `fontName`. */
  has(fontName: string): boolean {
    return (this._loaded.get(fontName) ?? null) !== null
  }

  /** True when the parsed font covers every code point of `text`. */
  covers(fontName: string, text: string): boolean {
    const font = this._loaded.get(fontName)
    if (!font) {
      return false
    }
    for (const char of text) {
      if (char !== '\n' && char !== '\r' && !font.fk.hasGlyphForCodePoint(char.codePointAt(0) ?? 0)) {
        return false
      }
    }
    return true
  }

  /**
   * Advance width of `text` at `size` in drawing units (kerning included),
   * or `undefined` when the font is not loaded.
   */
  widthOfText(
    fontName: string,
    text: string,
    size: number,
    hScale = 1
  ): number | undefined {
    const font = this._loaded.get(fontName)
    if (!font) {
      return undefined
    }
    let total = 0
    const run = font.fk.layout(text)
    for (const glyph of run.glyphs) {
      total += glyph.advanceWidth
    }
    return (total / font.fk.unitsPerEm) * size * hScale
  }

  /**
   * Rotates `dx, dy` by `angleDeg` — helper so layout stays matrix-free.
   */
  static rotate(dx: number, dy: number, angleDeg: number): {
    x: number
    y: number
  } {
    if (angleDeg === 0) {
      return { x: dx, y: dy }
    }
    const rad = (angleDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
  }

  /**
   * Binds the pdf-lib document (idempotent — called once per export by the
   * document writer).
   */
  bindDoc(doc: PDFDocument): void {
    if (this._doc !== doc) {
      this._doc = doc
      doc.registerFontkit(fontkit)
    }
  }

  /**
   * Embeds `op.font` into the bound document (if needed) and fills the op's
   * glyph encoding via `PDFFont.encodeText`, registering the glyphs with the
   * subset embedder. Safe to call repeatedly; ops shared across pages encode
   * once.
   *
   * Tracking runs (`op.tracking !== 1`) encode per glyph instead: `glyphHex`
   * carries each subset glyph id and `charAdjust` the TJ displacement after
   * each glyph that widens the advance by `advance × (k−1)` — a TJ number
   * moves the pen by `−(t/1000)` text-space units, so
   * `t = −1000 · advance_em · (k−1)`.
   */
  async embedOp(doc: PDFDocument, op: Extract<AcPdfOp, { kind: 'text' }>): Promise<void> {
    this.bindDoc(doc)
    const pdfFont = this._embedded.get(op.font) ?? (await this.embedProgram(op.font))
    if (!pdfFont) {
      // Font loaded by the renderer but not embeddable by pdf-lib: the text
      // op is skipped at paint time (hex stays empty).
      console.warn(`[pdf-renderer] Font "${op.font}" could not be embedded; text skipped`)
      return
    }
    const tracking = op.tracking ?? 1
    if (op.glyphHex && op.glyphHex.length > 0) {
      return
    }
    if (tracking === 1) {
      if (op.hex === '') {
        // `PDFFont.encodeText` registers the painted glyphs with the subset
        // embedder and returns the hex of the SUBSET glyph ids — the numbering
        // the embedded font program actually uses. Raw font glyph ids would
        // paint the wrong glyphs. The string form is `<hex>`.
        op.hex = pdfFont.encodeText(op.text).toString().slice(1, -1)
      }
      return
    }
    const font = this._loaded.get(op.font)
    if (!font) {
      return
    }
    const glyphHex: string[] = []
    const charAdjust: number[] = []
    const scale = 1000 / font.fk.unitsPerEm
    const glyphs = font.fk.layout(op.text).glyphs
    glyphs.forEach((glyph, index) => {
      // Encoding each glyph's own code points registers exactly the painted
      // glyphs with the subset embedder (ligatures encode as one glyph).
      const text = String.fromCodePoint(...glyph.codePoints)
      glyphHex.push(pdfFont.encodeText(text).toString().slice(1, -1))
      if (index < glyphs.length - 1) {
        charAdjust.push(-scale * glyph.advanceWidth * (tracking - 1))
      }
    })
    op.glyphHex = glyphHex
    op.charAdjust = charAdjust
  }

  private async embedProgram(fontName: string): Promise<PDFFont | null> {
    const doc = this._doc
    const font = this._loaded.get(fontName)
    if (!doc || !font) {
      return null
    }
    const cached = this._embedded.get(fontName)
    if (cached) {
      return cached
    }
    try {
      const pdfFont = await doc.embedFont(font.bytes, { subset: true })
      return this.trackEmbedded(fontName, pdfFont)
    } catch {
      try {
        const pdfFont = await doc.embedFont(font.bytes, { subset: false })
        return this.trackEmbedded(fontName, pdfFont)
      } catch {
        return null
      }
    }
  }

  private trackEmbedded(fontName: string, pdfFont: PDFFont): PDFFont {
    this._embedded.set(fontName, pdfFont)
    this._names.set(fontName, `FT${this._names.size}`)
    return pdfFont
  }

  /**
   * pdf-lib defers `embedFont`'s object creation to save time: the call only
   * reserves a reference, so the font dictionaries do not exist yet. This
   * must be awaited before the document is serialized (see the two `doc.save`
   * call sites) — it flushes pdf-lib's pending embeds and then repairs the
   * font programs it materialized.
   *
   * The repair: pdf-lib writes FontFile2 streams without the mandatory
   * `/Length1` entry (the uncompressed TrueType program byte length, PDF
   * 32000 Table 126). Acrobat refuses to load such font programs and reports
   * "An error exists on this page" for every page that paints with the font,
   * so set it explicitly from the normalized font bytes we handed to
   * `embedFont`.
   */
  async finalize(): Promise<void> {
    const doc = this._doc
    if (!doc || this._embedded.size === 0) {
      return
    }
    await doc.flush()
    for (const [fontName, pdfFont] of this._embedded) {
      this.patchFontFileLength1(fontName, pdfFont)
    }
  }

  private patchFontFileLength1(fontName: string, pdfFont: PDFFont): void {
    const doc = this._doc
    const font = this._loaded.get(fontName)
    if (!doc || !font?.bytes?.byteLength) {
      return
    }
    const context = doc.context
    const type0 = context.lookup(pdfFont.ref)
    if (!(type0 instanceof PDFDict)) {
      return
    }
    const descendants = type0.lookup(PDFName.of('DescendantFonts'), PDFArray)
    const cidFont = descendants?.lookup(0)
    if (!(cidFont instanceof PDFDict)) {
      return
    }
    const descriptor = cidFont.lookup(PDFName.of('FontDescriptor'), PDFDict)
    if (!descriptor) {
      return
    }
    const file = context.lookup(descriptor.get(PDFName.of('FontFile2')))
    if (!(file instanceof PDFRawStream)) {
      return
    }
    // The embedded program is the SUBSET pdf-lib generated, so its
    // uncompressed length differs from the source font bytes — derive
    // /Length1 from the stream's own decoded payload.
    const decoded = decodePDFRawStream(file).decode()
    file.dict.set(PDFName.of('Length1'), PDFNumber.of(decoded.length))
  }

  /** Page-resource entry for `fontName`, or `undefined` before embedding. */
  resourceFor(fontName: string): { name: string; ref: PDFRef } | undefined {
    const pdfFont = this._embedded.get(fontName)
    const name = this._names.get(fontName)
    if (!pdfFont || !name) {
      return undefined
    }
    return { name, ref: pdfFont.ref }
  }
}
