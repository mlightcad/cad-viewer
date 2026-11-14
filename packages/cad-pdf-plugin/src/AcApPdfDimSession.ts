import {
  readDimStyleFields,
  writeDimStyleFields
} from '@mlightcad/cad-simple-viewer'
import {
  type AcDbDatabase,
  AcDbDimStyleTableRecord
} from '@mlightcad/data-model'

import {
  acapPdfDimStyleMetrics,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  PDF_DIM_STYLE
} from './pdfDimensionConvert'
import {
  type PdfDimensionCandidate,
  suggestPdfDimensionScale
} from './recognition/pdfDimensionPattern'

export { PDF_DIM_STYLE }

/** One recovered dimension under review. */
export interface PdfDimRow<Id> {
  readonly key: number
  candidate: PdfDimensionCandidate<Id>
  /** Editable dimension value / override text. */
  text: string
  /** Whether the dimension is created on Apply. */
  included: boolean
}

/** Why a new dim style name is rejected. */
export type PdfDimStyleNameError = 'empty' | 'invalid' | 'exists'

/** Input of {@link AcApPdfDimSession}. */
export interface AcApPdfDimSessionInput<Id> {
  db: AcDbDatabase
  candidates: PdfDimensionCandidate<Id>[]
  /** Initial style name (existing or {@link PDF_DIM_STYLE}). */
  styleName?: string
}

/**
 * State of a `pdfdim` review: recovered dimensions, editable texts, and the
 * dim style to create them with. UI-free so the panel stays a thin view.
 */
export class AcApPdfDimSession<Id> {
  readonly rows: PdfDimRow<Id>[] = []
  readonly db: AcDbDatabase
  private nextKey = 0
  private _styleName: string
  private _isNewStyle = false
  private readonly _baseStyleName: string

  constructor(options: AcApPdfDimSessionInput<Id>) {
    this.db = options.db
    this._baseStyleName = options.db.dimstyle || 'Standard'
    const preferred = options.styleName ?? PDF_DIM_STYLE
    this._styleName = preferred
    this._isNewStyle = false
    for (const candidate of options.candidates) {
      this.rows.push({
        key: this.nextKey++,
        candidate,
        text: candidate.text.text,
        included: true
      })
    }
  }

  /** Rows created on Apply. */
  get readyRows(): PdfDimRow<Id>[] {
    return this.rows.filter(row => row.included && row.text.trim().length > 0)
  }

  get styleName(): string {
    return this._styleName
  }

  get isNewStyle(): boolean {
    return this._isNewStyle
  }

  /** Drawing scale implied by the included rows' texts. */
  get scale(): number {
    const dims = this.readyRows.map(row => ({
      ...row.candidate,
      text: { ...row.candidate.text, text: row.text }
    }))
    return acapPdfNiceScale(suggestPdfDimensionScale(dims) ?? 1)
  }

  /**
   * Style name written on created dimensions. Picking an existing style only
   * copies its colours / text style onto {@link PDF_DIM}; sizes always come
   * from the recovered geometry.
   */
  get workingStyleName(): string {
    if (this._isNewStyle) {
      return this._styleName.trim() || PDF_DIM_STYLE
    }
    if (this._styleName === PDF_DIM_STYLE || !this._styleName.trim()) {
      return PDF_DIM_STYLE
    }
    // Existing styles are not mutated; geometry uses PDF_DIM with their look.
    return PDF_DIM_STYLE
  }

  /**
   * Style whose appearance should be blended for preview / ensure. Undefined
   * when the working style itself already holds that look (or is being created).
   */
  get appearanceFromStyle(): string | undefined {
    if (this._isNewStyle) return undefined
    const picked = this._styleName.trim()
    if (!picked || picked === this.workingStyleName) return undefined
    return picked
  }

  /** Existing dim style names (skip anonymous `*…` records). */
  styleNames(): string[] {
    const names: string[] = []
    for (const record of this.db.tables.dimStyleTable.newIterator()) {
      if (record.name && !record.name.startsWith('*')) names.push(record.name)
    }
    if (this._styleName && !names.includes(this._styleName)) {
      names.push(this._styleName)
    }
    return names.sort((a, b) => a.localeCompare(b))
  }

  setIncluded(row: PdfDimRow<Id>, included: boolean) {
    row.included = included
  }

  setText(row: PdfDimRow<Id>, text: string) {
    row.text = text
  }

  /** Selects an existing dim style. */
  selectStyle(name: string) {
    this._styleName = name
    this._isNewStyle = false
  }

  /** Starts creating a new style (name empty until {@link commitNewStyleName}). */
  beginNewStyle() {
    this._isNewStyle = true
    this._styleName = ''
  }

  validateNewStyleName(name: string): PdfDimStyleNameError | undefined {
    const trimmed = name.trim()
    if (!trimmed) return 'empty'
    if (/[<>\\/;:"?*|=`]/.test(trimmed) || trimmed.startsWith('*')) {
      return 'invalid'
    }
    if (
      this.styleNames().some(n => n.toLowerCase() === trimmed.toLowerCase())
    ) {
      return 'exists'
    }
    return undefined
  }

  /** Confirms the new style name; returns an error without changing state. */
  commitNewStyleName(name: string): PdfDimStyleNameError | undefined {
    const error = this.validateNewStyleName(name)
    if (error) return error
    this._styleName = name.trim()
    this._isNewStyle = true
    return undefined
  }

  /** Candidates ready to convert, with the edited text applied. */
  candidatesForApply(): PdfDimensionCandidate<Id>[] {
    return this.readyRows.map(row => ({
      ...row.candidate,
      text: { ...row.candidate.text, text: row.text.trim() }
    }))
  }

  /**
   * Style record for the palette SVG: recovered paper sizes plus the selected
   * style's appearance (colours / text style). Switching styles updates the
   * preview even when every table record shares the same DIMTXT/DIMASZ.
   */
  previewStyleRecord(): AcDbDimStyleTableRecord {
    const record = new AcDbDimStyleTableRecord()
    const name = this._styleName.trim() || PDF_DIM_STYLE
    const appearance =
      this.db.tables.dimStyleTable.getAt(name) ??
      this.db.tables.dimStyleTable.getAt(this._baseStyleName) ??
      this.db.tables.dimStyleTable.getAt('Standard')
    if (appearance) writeDimStyleFields(record, readDimStyleFields(appearance))
    const ready = this.candidatesForApply()
    if (ready.length > 0) {
      writeDimStyleFields(record, acapPdfDimStyleMetrics(ready, this.scale))
    }
    record.name = name
    return record
  }

  /**
   * Ensures the working dim style exists with recovered sizes (and the picked
   * style's appearance when an existing style was selected). Returns the style
   * name to assign on new dimensions.
   */
  ensureStyle(): string {
    const candidates = this.candidatesForApply()
    const working = this.workingStyleName
    if (candidates.length === 0) return working
    if (this._isNewStyle && !this.db.tables.dimStyleTable.getAt(working)) {
      this.createStyleFromBase(working)
    }
    acapPdfEnsureDimStyle(
      this.db,
      candidates,
      this.scale,
      working,
      this.appearanceFromStyle
    )
    this._isNewStyle = false
    if (working !== PDF_DIM_STYLE) this._styleName = working
    return working
  }

  private createStyleFromBase(name: string) {
    const table = this.db.tables.dimStyleTable
    const style = new AcDbDimStyleTableRecord()
    style.name = name
    const base =
      table.getAt(this._baseStyleName) ?? table.getAt('Standard') ?? undefined
    if (base) writeDimStyleFields(style, readDimStyleFields(base))
    table.add(style)
  }
}
