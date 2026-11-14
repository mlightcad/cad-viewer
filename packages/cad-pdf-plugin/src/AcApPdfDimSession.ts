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
   * Style name written on created dimensions (preview and Apply). Recovered
   * paper sizes are pinned via entity overrides, so picking an existing style
   * does not rewrite that style's table record.
   */
  get workingStyleName(): string {
    return this._styleName.trim() || PDF_DIM_STYLE
  }

  /**
   * Style whose appearance is blended while baking dim blocks when the working
   * style is not in the table yet (a newly named style before Apply). Existing
   * picks use the style itself — no separate blend source.
   */
  get appearanceFromStyle(): string | undefined {
    const working = this.workingStyleName
    if (this.db.tables.dimStyleTable.getAt(working)) return undefined
    return this._baseStyleName
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
   * Style record for the palette SVG: the selected style's full appearance
   * (arrows, colours, text placement) with only recovered paper sizes blended
   * in. Metrics that encode recovered terminators (dimblk, dimtad, …) are not
   * applied here — otherwise every style would look identical in the preview.
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
      const metrics = acapPdfDimStyleMetrics(ready, this.scale)
      writeDimStyleFields(record, {
        dimscale: metrics.dimscale,
        dimtxt: metrics.dimtxt,
        dimasz: metrics.dimasz,
        dimgap: metrics.dimgap,
        dimexo: metrics.dimexo,
        dimexe: metrics.dimexe,
        dimlfac: metrics.dimlfac,
        dimdec: metrics.dimdec
      })
    }
    record.name = name
    return record
  }

  /**
   * Ensures the working dim style exists when it is {@link PDF_DIM_STYLE} or a
   * newly created name (recovered sizes written into that record). An existing
   * style the user picked is left untouched — sizes go on entity overrides.
   * Returns the style name to assign on new dimensions.
   */
  ensureStyle(): string {
    const candidates = this.candidatesForApply()
    const working = this.workingStyleName
    if (candidates.length === 0) return working
    const existing = this.db.tables.dimStyleTable.getAt(working)
    // Existing user styles stay as-is; only PDF_DIM / brand-new get metrics.
    if (existing && !this._isNewStyle && working !== PDF_DIM_STYLE) {
      return working
    }
    if (!existing) this.createStyleFromBase(working)
    acapPdfEnsureDimStyle(
      this.db,
      candidates,
      this.scale,
      working,
      this._baseStyleName
    )
    this._isNewStyle = false
    this._styleName = working
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
