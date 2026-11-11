import {
  type AcDbDatabase,
  AcDbMText,
  AcDbText,
  AcDbTextStyleTableRecord,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acapPdfFitWidthFactor,
  PDF_SHX_BIG_FONT,
  PDF_SHX_FONT,
  PDF_SHX_TEXT_STYLE,
  PDF_TEXT_STYLE_PREFIX
} from './pdfImportEntities'
import type { PdfTextLineCandidate } from './recognition/pdfGlyphClustering'
import type { PdfTextFontKind } from './recognition/pdfTextFontKind'
import {
  arePdfTextLinesAdjacent,
  mergePdfTextLines,
  type PdfTextMergeParagraph
} from './recognition/pdfTextMerge'

/** TrueType face suggested for recovered outline text. */
export const PDF_MESH_FONT = 'simsun'

/** Text style suggested for recovered outline text. */
export const PDF_MESH_TEXT_STYLE = `${PDF_TEXT_STYLE_PREFIX}${PDF_MESH_FONT}`

/** Where the text of a line came from. */
export type PdfTextRowSource = 'dictionary' | 'ocr' | 'typed' | 'unread'

/** One recovered text line under review. */
export interface PdfTextRow<Id> {
  line: PdfTextLineCandidate<Id>
  /** Font engine the line is converted to (detected, user can switch). */
  kind: PdfTextFontKind
  /** Text to create; empty means the line is skipped. */
  text: string
  source: PdfTextRowSource
  /** Whether the line is converted on Apply. */
  included: boolean
  /** Set when the row merges other rows: it becomes one MTEXT. */
  merge?: PdfTextRowMerge<Id>
}

/** How a merged row was built (see {@link AcApPdfTextSession.merge}). */
export interface PdfTextRowMerge<Id> {
  /** The merged rows as they were, restored by a split. */
  parts: PdfTextRow<Id>[]
  /** Text lines of the block, top to bottom. */
  paragraphs: PdfTextMergeParagraph[]
  /** Baseline distance between paragraphs, 0 for one paragraph. */
  lineSpacing: number
  /** Text right after merging, to tell whether the user edited it. */
  text: string
}

/** A line and its confirmed text, to teach the glyph dictionary. */
export interface PdfTextLearnable<Id> {
  line: PdfTextLineCandidate<Id>
  text: string
}

/** Text style settings applied to every line of one font kind. */
export interface PdfTextStyleChoice {
  /** Name of the existing or new text style. */
  styleName: string
  /** Whether the style is created by this run. */
  isNew: boolean
  /** Primary font (SHX file or TrueType face, without extension). */
  font: string
  /** SHX big font, `''` for none. */
  bigFont: string
  /** Multiplier on the measured line height. */
  heightScale: number
  /** Fit the width factor to the original line width. */
  autoWidth: boolean
  /** Width factor used when {@link autoWidth} is off. */
  widthFactor: number
}

/** Why a new text style name is rejected. */
export type PdfTextStyleNameError = 'empty' | 'invalid' | 'exists'

/** Engine a font draws with, `undefined` when unknown. */
export type PdfTextFontKindResolver = (
  font: string
) => PdfTextFontKind | undefined

/**
 * Advance width of `text` drawn with the given fonts at width factor 1, or
 * `undefined` when it cannot be measured.
 */
export type PdfTextMeasurer = (
  text: string,
  font: string,
  height: number,
  bigFont: string
) => number | undefined

/** Input of {@link AcApPdfTextSession}. */
export interface AcApPdfTextSessionInput<Id> {
  db: AcDbDatabase
  rows: PdfTextRow<Id>[]
  /** Engine of a style font (catalog / loaded font lookup). */
  fontKind: PdfTextFontKindResolver
}

const KINDS: readonly PdfTextFontKind[] = ['shx', 'mesh']

/**
 * State of a `pdftext` review: the lines with their text, and one text style
 * choice per font kind. UI-free, so the panel stays a thin view over it.
 *
 * Style choices are written to the database by {@link syncStyles} so the
 * preview draws with them; {@link restoreStyles} undoes that on Cancel.
 */
export class AcApPdfTextSession<Id> {
  readonly rows: PdfTextRow<Id>[]
  private readonly db: AcDbDatabase
  private readonly fontKind: PdfTextFontKindResolver
  private readonly choices = new Map<PdfTextFontKind, PdfTextStyleChoice>()
  /** Original fonts of existing styles changed by {@link syncStyles}. */
  private readonly snapshots = new Map<
    string,
    { fileName: string; bigFontFileName: string }
  >()
  /** Styles created by {@link syncStyles}. */
  private readonly created = new Set<string>()

  constructor(input: AcApPdfTextSessionInput<Id>) {
    this.db = input.db
    this.rows = input.rows
    this.fontKind = input.fontKind
    for (const kind of KINDS) this.choices.set(kind, this.defaultChoice(kind))
  }

  /** Font kinds used by at least one line. */
  get kinds(): PdfTextFontKind[] {
    return KINDS.filter(kind => this.rows.some(row => row.kind === kind))
  }

  /** Style settings of a font kind. */
  choice(kind: PdfTextFontKind): Readonly<PdfTextStyleChoice> {
    return this.choices.get(kind)!
  }

  /** Names of the text styles in the drawing, sorted. */
  styleNames(): string[] {
    const names: string[] = []
    for (const record of this.db.tables.textStyleTable.newIterator()) {
      if (!this.created.has(record.name)) names.push(record.name)
    }
    return names.sort((a, b) => a.localeCompare(b))
  }

  /** Uses an existing text style (and its fonts) for a font kind. */
  selectStyle(kind: PdfTextFontKind, name: string) {
    const record = this.originalRecord(name)
    if (!record) return
    const choice = this.choices.get(kind)!
    choice.styleName = record.name
    choice.isNew = false
    const original = this.snapshots.get(record.name)
    choice.font = original?.fileName ?? record.fileName
    choice.bigFont = original?.bigFontFileName ?? record.bigFontFileName
  }

  /**
   * Checks a name for a new text style (AutoCAD rules, no duplicate).
   *
   * @returns The reason it is rejected, or `undefined` when it is valid.
   */
  validateNewStyleName(
    name: string,
    kind?: PdfTextFontKind
  ): PdfTextStyleNameError | undefined {
    const trimmed = name.trim()
    if (!trimmed) return 'empty'
    if (/[;=<>`\\/,|*?":]/.test(trimmed)) return 'invalid'
    const lower = trimmed.toLowerCase()
    if (this.styleNames().some(item => item.toLowerCase() === lower)) {
      return 'exists'
    }
    // The other kind cannot create a style with the same name.
    const other = KINDS.find(item => item !== kind)
    const otherChoice = other ? this.choices.get(other) : undefined
    if (
      otherChoice?.isNew &&
      this.kinds.includes(other!) &&
      otherChoice.styleName.toLowerCase() === lower
    ) {
      return 'exists'
    }
    return undefined
  }

  /**
   * Creates a new text style for a font kind, keeping the current fonts.
   *
   * @returns The reason the name is rejected, or `undefined` on success.
   */
  newStyle(
    kind: PdfTextFontKind,
    name: string
  ): PdfTextStyleNameError | undefined {
    const error = this.validateNewStyleName(name, kind)
    if (error) return error
    const choice = this.choices.get(kind)!
    choice.styleName = name.trim()
    choice.isNew = true
    return undefined
  }

  /** Sets the primary font; a TrueType font drops the big font. */
  setFont(kind: PdfTextFontKind, font: string) {
    const choice = this.choices.get(kind)!
    choice.font = font.trim()
    if (this.fontKind(choice.font) === 'mesh') choice.bigFont = ''
  }

  /** Sets the SHX big font (`''` for none). */
  setBigFont(kind: PdfTextFontKind, bigFont: string) {
    this.choices.get(kind)!.bigFont = bigFont.trim()
  }

  /** Sets size options of a font kind. */
  setSize(
    kind: PdfTextFontKind,
    size: Partial<
      Pick<PdfTextStyleChoice, 'heightScale' | 'autoWidth' | 'widthFactor'>
    >
  ) {
    const choice = this.choices.get(kind)!
    if (size.heightScale !== undefined && size.heightScale > 0) {
      choice.heightScale = size.heightScale
    }
    if (size.autoWidth !== undefined) choice.autoWidth = size.autoWidth
    if (size.widthFactor !== undefined && size.widthFactor > 0) {
      choice.widthFactor = size.widthFactor
    }
  }

  /**
   * Whether applying a kind's choice changes the fonts of an existing style,
   * which also changes every text already using it.
   */
  changesExistingStyle(kind: PdfTextFontKind): boolean {
    const choice = this.choices.get(kind)!
    if (choice.isNew) return false
    const record = this.originalRecord(choice.styleName)
    if (!record) return false
    const original = this.snapshots.get(record.name) ?? {
      fileName: record.fileName,
      bigFontFileName: record.bigFontFileName
    }
    return (
      !sameName(original.fileName, choice.font) ||
      !sameName(original.bigFontFileName, choice.bigFont)
    )
  }

  /** Sets the text of a line; text the user changed is marked typed. */
  setText(index: number, text: string) {
    const row = this.rows[index]
    if (!row || row.text === text) return
    row.text = text
    row.source = 'typed'
    if (text.trim()) row.included = true
  }

  /**
   * Fills lines still without text from glyphs learned meanwhile (a typed
   * line teaches the glyphs other lines reuse).
   *
   * @param lookup - Reads a line from known glyphs.
   * @returns Indexes of the lines filled.
   */
  fillUnread(
    lookup: (line: PdfTextLineCandidate<Id>) => string | undefined
  ): number[] {
    const filled: number[] = []
    this.rows.forEach((row, index) => {
      // Unread rows were not typed: partial text (a merge of read and
      // unread characters) is replaced once the whole row can be read.
      if (row.source !== 'unread') return
      const text = lookupRow(row, lookup)
      if (!text) return
      row.text = text
      row.source = 'dictionary'
      row.included = true
      filled.push(index)
    })
    return filled
  }

  /** Includes or skips a line. */
  setIncluded(index: number, included: boolean) {
    const row = this.rows[index]
    if (row) row.included = included
  }

  /** Switches the font kind a line is converted to. */
  setKind(index: number, kind: PdfTextFontKind) {
    const row = this.rows[index]
    if (row) row.kind = kind
  }

  /** Lines converted on Apply: included, with text. */
  get readyRows(): PdfTextRow<Id>[] {
    return this.rows.filter(row => row.included && row.text.trim())
  }

  /** Lines whose text the user typed, to teach the glyph dictionary. */
  get typedRows(): PdfTextRow<Id>[] {
    return this.readyRows.filter(row => row.source === 'typed')
  }

  /** Typed lines as line/text pairs the glyph dictionary can learn. */
  get learnable(): PdfTextLearnable<Id>[] {
    return this.typedRows.flatMap(row => this.learnableOf(row))
  }

  /**
   * Line/text pairs the glyph dictionary can learn from a row. A merged row
   * on one baseline is one line. A merged block of several lines can only
   * be paired with its parts while its text is unchanged.
   */
  learnableOf(row: PdfTextRow<Id>): PdfTextLearnable<Id>[] {
    const text = row.text.trim()
    if (!text) return []
    const merge = row.merge
    if (!merge || merge.paragraphs.length === 1) {
      return [{ line: row.line, text }]
    }
    if (row.text !== merge.text) return []
    return merge.parts.flatMap(part =>
      part.source === 'typed' ? this.learnableOf(part) : []
    )
  }

  /**
   * Merges rows into one row that becomes a single MTEXT: rows on one
   * baseline join into one line, rows on different baselines into separate
   * lines of the block. Already merged rows are merged by their parts.
   *
   * @param indexes - Rows to merge (at least two).
   * @returns Index of the merged row, or `undefined` when nothing merged.
   */
  merge(indexes: number[]): number | undefined {
    const unique = [...new Set(indexes)]
      .filter(index => this.rows[index])
      .sort((a, b) => a - b)
    if (unique.length < 2) return undefined
    const selected = unique.map(index => this.rows[index])
    const parts = selected.flatMap(row => this.partsOf(row))
    const result = mergePdfTextLines(parts)
    const text = result.text
    const anyUnread = parts.some(
      part => part.source === 'unread' && !part.text.trim()
    )
    const merged: PdfTextRow<Id> = {
      line: result.line,
      kind: majorityKind(parts),
      text,
      source:
        anyUnread || !text.trim()
          ? 'unread'
          : parts.some(part => part.source === 'typed')
            ? 'typed'
            : parts.every(part => part.source === 'dictionary')
              ? 'dictionary'
              : 'ocr',
      included: !!text.trim(),
      merge: {
        parts,
        paragraphs: result.paragraphs,
        lineSpacing: result.lineSpacing,
        text
      }
    }
    for (let i = unique.length - 1; i >= 0; i--) this.rows.splice(unique[i], 1)
    this.rows.splice(unique[0], 0, merged)
    return unique[0]
  }

  /**
   * Splits a merged row back into the rows it was made of.
   *
   * @returns Indexes of the restored rows (empty when the row is not merged).
   */
  split(index: number): number[] {
    const row = this.rows[index]
    if (!row?.merge) return []
    const parts = row.merge.parts
    this.rows.splice(index, 1, ...parts)
    return parts.map((_, i) => index + i)
  }

  /**
   * Merges rows that read as one line: on the same baseline, in the same
   * direction and close together (typically characters the clustering left
   * apart). Blocks of several lines are left alone.
   *
   * @returns Number of merged rows created.
   */
  mergeAdjacent(): number {
    const candidates = this.rows.filter(
      row => !row.merge || row.merge.paragraphs.length === 1
    )
    const boxes = candidates.map(row => worldBox(row.line))
    const parent = candidates.map((_, i) => i)
    const find = (i: number): number =>
      parent[i] === i ? i : (parent[i] = find(parent[i]))
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        // Cheap reject before the exact test: boxes too far apart.
        const reach =
          2 * Math.max(candidates[i].line.height, candidates[j].line.height)
        if (
          boxes[i].minX - boxes[j].maxX > reach ||
          boxes[j].minX - boxes[i].maxX > reach ||
          boxes[i].minY - boxes[j].maxY > reach ||
          boxes[j].minY - boxes[i].maxY > reach
        ) {
          continue
        }
        if (arePdfTextLinesAdjacent(candidates[i].line, candidates[j].line)) {
          parent[find(i)] = find(j)
        }
      }
    }
    const groups = new Map<number, PdfTextRow<Id>[]>()
    candidates.forEach((row, i) => {
      const root = find(i)
      groups.set(root, [...(groups.get(root) ?? []), row])
    })
    let count = 0
    for (const group of groups.values()) {
      if (group.length < 2) continue
      this.merge(group.map(row => this.rows.indexOf(row)))
      count++
    }
    return count
  }

  /** The original rows a row stands for (itself unless merged). */
  private partsOf(row: PdfTextRow<Id>): PdfTextRow<Id>[] {
    const merge = row.merge
    if (!merge) return [row]
    // An edited single-line merge keeps its text as one part.
    if (merge.paragraphs.length === 1 && row.text !== merge.text) {
      return [{ ...row, merge: undefined }]
    }
    return merge.parts.flatMap(part => this.partsOf(part))
  }

  /**
   * Writes the style choices of the used font kinds to the database: creates
   * new styles and updates the fonts of existing ones (originals are kept for
   * {@link restoreStyles}). New styles no longer chosen are removed.
   *
   * @returns The fonts the styles use, to be loaded before drawing.
   */
  syncStyles(): string[] {
    const table = this.db.tables.textStyleTable
    const wanted = new Set<string>()
    const fonts = new Set<string>()
    for (const kind of this.kinds) {
      const choice = this.choices.get(kind)!
      if (choice.font) fonts.add(choice.font)
      if (choice.bigFont) fonts.add(choice.bigFont)
      if (choice.isNew) wanted.add(choice.styleName)
    }
    for (const name of [...this.created]) {
      if (!wanted.has(name)) {
        table.remove(name)
        this.created.delete(name)
      }
    }
    // Existing styles whose choice moved elsewhere get their fonts back.
    const edited = new Set(
      this.kinds
        .map(kind => this.choices.get(kind)!)
        .filter(choice => !choice.isNew)
        .map(choice => choice.styleName)
    )
    for (const [name, original] of [...this.snapshots]) {
      if (edited.has(name)) continue
      const record = table.getAt(name)
      if (record) {
        this.setFonts(record, original.fileName, original.bigFontFileName)
      }
      this.snapshots.delete(name)
    }
    for (const kind of this.kinds) {
      const choice = this.choices.get(kind)!
      const record = table.getAt(choice.styleName)
      if (!record) {
        // Fonts are set before the record joins the database, which needs
        // no open-for-write.
        table.add(createStyleRecord(choice.styleName, choice))
        this.created.add(choice.styleName)
        continue
      }
      if (!this.created.has(record.name) && !this.snapshots.has(record.name)) {
        this.snapshots.set(record.name, {
          fileName: record.fileName,
          bigFontFileName: record.bigFontFileName
        })
      }
      this.setFonts(record, choice.font, choice.bigFont)
    }
    return [...fonts]
  }

  /** Undoes {@link syncStyles}: removes new styles, restores fonts. */
  restoreStyles() {
    const table = this.db.tables.textStyleTable
    for (const name of this.created) table.remove(name)
    this.created.clear()
    for (const [name, original] of this.snapshots) {
      const record = table.getAt(name)
      if (record) {
        this.setFonts(record, original.fileName, original.bigFontFileName)
      }
    }
    this.snapshots.clear()
  }

  /**
   * Sets the fonts of a style record when they differ, opening it for write
   * first: inside a command's transaction, database records may only change
   * once opened for write.
   */
  private setFonts(
    record: AcDbTextStyleTableRecord,
    font: string,
    bigFont: string
  ) {
    if (record.fileName === font && record.bigFontFileName === bigFont) return
    const writable =
      this.db.openObjectForWrite<AcDbTextStyleTableRecord>(record.objectId) ??
      record
    writable.fileName = font
    writable.bigFontFileName = bigFont
  }

  /**
   * Builds the text entity of a line with its kind's style choice.
   *
   * @param row - The line.
   * @param measure - Measures natural text width for the width auto-fit.
   */
  createText(row: PdfTextRow<Id>, measure?: PdfTextMeasurer): AcDbText {
    const choice = this.choices.get(row.kind)!
    const height = row.line.height * choice.heightScale
    const text = new AcDbText()
    text.textString = row.text.trim()
    text.styleName = choice.styleName
    text.position = new AcGePoint3d(row.line.position.x, row.line.position.y, 0)
    text.height = height
    text.rotation = row.line.rotation
    text.widthFactor = choice.autoWidth
      ? acapPdfFitWidthFactor(
          1,
          row.line.width,
          measure?.(text.textString, choice.font, height, choice.bigFont)
        )
      : choice.widthFactor
    return text
  }

  /**
   * Builds the entity of a row: an MTEXT for a merged row, a TEXT otherwise.
   *
   * @param row - The row.
   * @param measure - Measures natural text width for the width auto-fit.
   */
  createEntity(
    row: PdfTextRow<Id>,
    measure?: PdfTextMeasurer
  ): AcDbText | AcDbMText {
    return row.merge
      ? this.createMText(row, row.merge, measure)
      : this.createText(row, measure)
  }

  /**
   * Builds the MTEXT of a merged row: top-left attached at the cap height of
   * its first line, one paragraph per line, exact line spacing as measured,
   * no word wrap. With width auto-fit each paragraph gets the `\W` width
   * factor that makes it span its original width.
   */
  createMText(
    row: PdfTextRow<Id>,
    merge: PdfTextRowMerge<Id>,
    measure?: PdfTextMeasurer
  ): AcDbMText {
    const choice = this.choices.get(row.kind)!
    const height = row.line.height * choice.heightScale
    const angle = row.line.rotation
    const first = merge.paragraphs[0]
    const minU = Math.min(...merge.paragraphs.map(item => item.minU))
    const lines = row.text.replace(/\s+$/, '').split('\n')
    // Paragraph widths only match while the lines are the merged ones.
    const widths =
      lines.length === merge.paragraphs.length
        ? merge.paragraphs.map(item => item.maxU - item.minU)
        : lines.map(() => row.line.width)
    const contents = lines.map((line, i) => {
      const text = line.trim()
      const factor = choice.autoWidth
        ? acapPdfFitWidthFactor(
            1,
            widths[i],
            text
              ? measure?.(text, choice.font, height, choice.bigFont)
              : undefined
          )
        : choice.widthFactor
      const escaped = mtextEscape(text)
      return Math.abs(factor - 1) < 0.005 || !escaped
        ? escaped
        : `{\\W${Number(factor.toFixed(3))};${escaped}}`
    })

    const mtext = new AcDbMText()
    mtext.contents = contents.join('\\P')
    mtext.styleName = choice.styleName
    mtext.height = height
    mtext.width = 0
    mtext.rotation = angle
    mtext.location = toWorld(minU, first.baseline + height, angle)
    if (lines.length > 1) {
      // AutoCAD single spacing is 5/3 of the text height; "exactly" keeps
      // the measured spacing regardless of the characters.
      const spacing = merge.lineSpacing || (height * 5) / 3
      mtext.lineSpacingStyle = 2
      mtext.lineSpacingFactor = spacing / ((height * 5) / 3)
    }
    return mtext
  }

  /**
   * Default for a kind: the current style when it already draws with that
   * engine, else the `PDF_SHX` / `PDF_simsun` style (created if missing).
   */
  private defaultChoice(kind: PdfTextFontKind): PdfTextStyleChoice {
    const table = this.db.tables.textStyleTable
    const current = table.resolveAt(this.db.textstyle)
    const name =
      current && this.fontKind(current.fileName) === kind
        ? current.name
        : kind === 'shx'
          ? PDF_SHX_TEXT_STYLE
          : PDF_MESH_TEXT_STYLE
    const record = table.getAt(name)
    return {
      styleName: record?.name ?? name,
      isNew: !record,
      font: record
        ? record.fileName
        : kind === 'shx'
          ? PDF_SHX_FONT
          : PDF_MESH_FONT,
      bigFont: record
        ? record.bigFontFileName
        : kind === 'shx'
          ? PDF_SHX_BIG_FONT
          : '',
      heightScale: 1,
      autoWidth: true,
      widthFactor: 1
    }
  }

  /** An existing style record not created by this session. */
  private originalRecord(name: string) {
    if (this.created.has(name)) return undefined
    return this.db.tables.textStyleTable.getAt(name)
  }
}

/**
 * Reads a row from known glyphs: a merged block line by line, everything
 * else as one line.
 */
function lookupRow<Id>(
  row: PdfTextRow<Id>,
  lookup: (line: PdfTextLineCandidate<Id>) => string | undefined
): string | undefined {
  const merge = row.merge
  if (!merge || merge.paragraphs.length === 1) return lookup(row.line)
  const texts = merge.parts.map(part => lookupRow(part, lookup))
  if (texts.some(text => !text)) return undefined
  return mergePdfTextLines(
    merge.parts.map((part, i) => ({ line: part.line, text: texts[i]! }))
  ).text
}

/** Kind of most glyphs (a single glyph is often misdetected). */
function majorityKind<Id>(rows: PdfTextRow<Id>[]): PdfTextFontKind {
  let shx = 0
  let mesh = 0
  for (const row of rows) {
    const weight = Math.max(1, row.line.glyphs.length)
    if (row.kind === 'shx') shx += weight
    else mesh += weight
  }
  return mesh > shx ? 'mesh' : 'shx'
}

/** Axis-aligned world box of a line's strokes. */
function worldBox(line: PdfTextLineCandidate) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of line.strokes) {
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  return { minX, minY, maxX, maxY }
}

/** MTEXT contents for plain text: escapes backslashes and braces. */
function mtextEscape(text: string) {
  return text.replace(/[\\{}]/g, char => `\\${char}`)
}

function toWorld(u: number, v: number, angle: number) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new AcGePoint3d(u * c - v * s, u * s + v * c, 0)
}

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function createStyleRecord(
  name: string,
  fonts: Pick<PdfTextStyleChoice, 'font' | 'bigFont'>
) {
  return new AcDbTextStyleTableRecord({
    name,
    standardFlag: 0,
    fixedTextHeight: 0,
    widthFactor: 1,
    obliqueAngle: 0,
    textGenerationFlag: 0,
    lastHeight: 2.5,
    font: fonts.font,
    bigFont: fonts.bigFont
  })
}
