import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '@mlightcad/cad-simple-viewer'

import {
  type AcApPdfHatchSession,
  PDF_HATCH_CUSTOM_KEY,
  PDF_HATCH_USER_DOUBLE_KEY,
  PDF_HATCH_USER_KEY,
  type PdfHatchPatternKey,
  type PdfHatchRow
} from '../AcApPdfHatchSession'
import { acapPdfT } from '../acapPdfI18n'
import { acapPdfHatchPatternLabel } from '../pdfHatchRecover'

const STYLE_ID = 'ml-pdfhatch-panel-styles'

/** What {@link AcUiPdfHatchPanelOptions.onAddRegion} reports. */
export type AcUiPdfHatchAddResult<Id> =
  | PdfHatchRow<Id>
  | 'cancelled'
  | 'noBoundary'
  | 'noStrokes'

/** Callbacks of {@link AcUiPdfHatchPanel}. */
export interface AcUiPdfHatchPanelOptions<Id> {
  session: AcApPdfHatchSession<Id>
  /** A row's hatch, or which rows are included, changed: redraw the preview. */
  onChange: () => void
  /**
   * A row was selected (or none): highlight its strokes, and frame it in the
   * drawing when `zoom` is set.
   */
  onFocusRow: (row: PdfHatchRow<Id> | undefined, zoom: boolean) => void
  /** Initial state of "Hide original strokes". Default `false`. */
  hideStrokes?: boolean
  /** "Hide original strokes" toggled. */
  onHideStrokes: (hide: boolean) => void
  /** "Add area" pressed: pick a point in the drawing and add its hatch. */
  onAddRegion: () => Promise<AcUiPdfHatchAddResult<Id>>
  /** Apply or Cancel pressed. */
  onClose: (apply: boolean) => void
}

/**
 * `pdfhatch` review panel shown in the palette: the recovered hatches with
 * how well each re-draws its strokes, and for the selected one its pattern,
 * size and angle. All state lives in the {@link AcApPdfHatchSession}; the
 * panel only renders it and reports changes.
 */
export class AcUiPdfHatchPanel<Id> {
  /** Root element to mount in a palette. */
  readonly element: HTMLDivElement
  private readonly options: AcUiPdfHatchPanelOptions<Id>
  private readonly session: AcApPdfHatchSession<Id>
  private readonly listEl: HTMLDivElement
  private readonly editorEl: HTMLDivElement
  private readonly messageEl: HTMLDivElement
  private readonly counterEl: HTMLSpanElement
  private readonly addButton: HTMLButtonElement
  private readonly applyButton: HTMLButtonElement
  private selected?: PdfHatchRow<Id>
  private readonly unsubscribeTheme: () => void

  constructor(options: AcUiPdfHatchPanelOptions<Id>) {
    ensureStyles()
    this.options = options
    this.session = options.session

    this.element = h('div', 'ml-pdfhatch-panel')
    const applyTheme = () =>
      acedApplyUiTheme(resolveUiTheme(this.element.parentElement), this.element)
    applyTheme()
    this.unsubscribeTheme = acedSubscribeUiTheme(applyTheme)

    const toolbar = h('div', 'ml-pdfhatch-toolbar')
    toolbar.append(h('span', 'ml-pdfhatch-section-title', t('hatches')))
    this.addButton = button(t('addArea'), 'secondary', () => {
      void this.addRegion()
    })
    this.addButton.title = t('addAreaTip')
    toolbar.append(this.addButton)
    this.messageEl = h('div', 'ml-pdfhatch-hint')
    this.listEl = h('div', 'ml-pdfhatch-list')
    this.listEl.setAttribute('role', 'list')
    this.editorEl = h('div', 'ml-pdfhatch-editor')

    const footer = h('div', 'ml-pdfhatch-footer')
    const hide = checkbox(t('hideStrokes'), !!options.hideStrokes, checked =>
      this.options.onHideStrokes(checked)
    )
    this.counterEl = h('span', 'ml-pdfhatch-counter')
    const buttons = h('div', 'ml-pdfhatch-buttons')
    const cancel = button(t('cancel'), 'secondary', () =>
      this.options.onClose(false)
    )
    this.applyButton = button(t('apply'), 'primary', () =>
      this.options.onClose(true)
    )
    buttons.append(cancel, this.applyButton)
    footer.append(hide, this.counterEl, buttons)

    this.element.append(
      toolbar,
      this.messageEl,
      this.listEl,
      this.editorEl,
      footer
    )
    this.renderList()
    this.renderEditor()
    this.updateCounter()
  }

  /** Selects the first hatch, if any, without moving the view. */
  selectFirst() {
    const first = this.session.rows[0]
    if (first) this.select(first, false)
  }

  /** Removes listeners. The element is removed by the palette host. */
  destroy() {
    this.unsubscribeTheme()
    this.element.remove()
  }

  private select(row: PdfHatchRow<Id> | undefined, zoom: boolean) {
    this.selected = row
    this.renderList()
    this.renderEditor()
    this.options.onFocusRow(row, zoom)
  }

  /** The selected row's hatch changed. */
  private rowChanged() {
    this.renderList()
    this.renderEditor()
    this.updateCounter()
    this.options.onChange()
  }

  private async addRegion() {
    this.addButton.disabled = true
    this.message(t('picking'))
    try {
      const result = await this.options.onAddRegion()
      if (typeof result === 'object') {
        this.message('')
        this.rowChanged()
        this.select(result, false)
      } else {
        this.message(result === 'cancelled' ? '' : t(result), true)
      }
    } catch {
      // The pick failed; the review goes on.
      this.message('')
    } finally {
      this.addButton.disabled = false
    }
  }

  private message(text: string, warning = false) {
    this.messageEl.textContent = text
    this.messageEl.className = warning
      ? 'ml-pdfhatch-warning'
      : 'ml-pdfhatch-hint'
  }

  // -------------------------------------------------------------------- list

  private renderList() {
    const rows = this.session.rows
    if (rows.length === 0) {
      this.listEl.replaceChildren(h('div', 'ml-pdfhatch-hint', t('empty')))
      return
    }
    this.listEl.replaceChildren(
      ...rows.map((row, index) => this.renderRow(row, index))
    )
  }

  private renderRow(row: PdfHatchRow<Id>, index: number): HTMLElement {
    const el = h('div', 'ml-pdfhatch-row')
    el.setAttribute('role', 'listitem')
    el.dataset.key = String(row.key)
    el.classList.toggle('is-selected', row === this.selected)
    el.classList.toggle('is-poor', !this.session.isGood(row))
    el.classList.toggle('is-skipped', !row.included)

    const include = h('input', 'ml-pdfhatch-include')
    include.type = 'checkbox'
    include.checked = row.included
    include.title = t('include')
    include.addEventListener('click', event => event.stopPropagation())
    include.addEventListener('change', () => {
      this.session.setIncluded(row, include.checked)
      el.classList.toggle('is-skipped', !row.included)
      this.updateCounter()
      this.options.onChange()
    })

    const name = h(
      'span',
      'ml-pdfhatch-name',
      `${index + 1}. ${describe(this.session, row)}`
    )
    const tags = h('span', 'ml-pdfhatch-tags')
    if (row.added) tags.append(h('span', 'ml-pdfhatch-tag', t('addedTag')))
    tags.append(
      h('span', 'ml-pdfhatch-score', percent(matchScore(row))),
      h(
        'span',
        'ml-pdfhatch-badge',
        t('entities', { count: row.consumed.length })
      )
    )
    el.append(include, name, tags)
    el.addEventListener('click', () => this.select(row, true))
    return el
  }

  // ------------------------------------------------------------------ editor

  private renderEditor() {
    const row = this.selected
    if (!row || !this.session.rows.includes(row)) {
      this.editorEl.replaceChildren(
        h('div', 'ml-pdfhatch-hint', t('selectHint'))
      )
      return
    }
    const session = this.session
    const section = h('div', 'ml-pdfhatch-section')

    // Pattern: measured, user-defined, then the library.
    const select = h('select', 'ml-pdfhatch-input ml-pdfhatch-pattern')
    const keys = session.patternKeys(row)
    const own = keys.filter(key => !key.startsWith('predefined:'))
    const library = keys.filter(key => key.startsWith('predefined:'))
    for (const [label, group] of [
      [t('ownGroup'), own],
      [t('libraryGroup'), library]
    ] as const) {
      const optgroup = document.createElement('optgroup')
      optgroup.label = label
      for (const key of group) optgroup.append(option(key, keyLabel(key)))
      select.append(optgroup)
    }
    select.value = session.patternKey(row)
    select.addEventListener('change', () => {
      if (session.setPattern(row, select.value)) this.rowChanged()
    })
    section.append(field(t('pattern'), select))

    // Size and angle (not for a measured pattern).
    const params = session.params(row)
    if (params) {
      const sizeLabel =
        row.hatch.pattern.type === 'userDefined' ? t('spacing') : t('scale')
      const size = numberInput(params.size, 'ml-pdfhatch-size')
      const angle = numberInput(params.angle, 'ml-pdfhatch-angle')
      angle.removeAttribute('min')
      const commit = () => {
        const next = { size: Number(size.value), angle: Number(angle.value) }
        if (session.setParams(row, next)) this.rowChanged()
      }
      size.addEventListener('change', commit)
      angle.addEventListener('change', commit)
      section.append(field(sizeLabel, size), field(t('angle'), angle))
    }
    const autoFit = button(t('autoFit'), 'secondary', () => {
      if (session.autoFit(row)) this.rowChanged()
    })
    autoFit.classList.add('ml-pdfhatch-autofit')
    autoFit.title = t('autoFitTip')
    const actions = h('div', 'ml-pdfhatch-actions')
    actions.append(autoFit)
    section.append(actions)

    // How well it matches, and what that means for the strokes.
    section.append(
      h(
        'div',
        'ml-pdfhatch-hint ml-pdfhatch-match',
        t('match', {
          precision: percent(row.match.precision),
          recall: percent(row.match.recall)
        })
      )
    )
    if (row.consumed.length === 0) {
      section.append(h('div', 'ml-pdfhatch-warning', t('noEntities')))
    } else if (row.guessed) {
      section.append(h('div', 'ml-pdfhatch-warning', t('guessed')))
    } else if (!session.isGood(row)) {
      section.append(h('div', 'ml-pdfhatch-warning', t('poorMatch')))
    }
    this.editorEl.replaceChildren(section)
  }

  private updateCounter() {
    const ready = this.session.readyRows.length
    this.counterEl.textContent = t('ready', {
      ready,
      count: this.session.rows.length
    })
    this.applyButton.disabled = ready === 0
  }
}

/** One number for a row: the harmonic mean of precision and recall. */
function matchScore<Id>(row: PdfHatchRow<Id>): number {
  const { precision, recall } = row.match
  const sum = precision + recall
  return sum > 0 ? (2 * precision * recall) / sum : 0
}

/** `ANSI31 1 / 45°` for the list. */
function describe<Id>(
  session: AcApPdfHatchSession<Id>,
  row: PdfHatchRow<Id>
): string {
  const label = keyLabel(
    session.patternKey(row),
    acapPdfHatchPatternLabel(row.hatch)
  )
  const params = session.params(row)
  if (!params) return label
  return `${label} ${Number(params.size.toPrecision(4))} / ${Number(params.angle.toFixed(2))}°`
}

function keyLabel(key: PdfHatchPatternKey, fallback?: string): string {
  if (key === PDF_HATCH_USER_KEY) return t('userSingle')
  if (key === PDF_HATCH_USER_DOUBLE_KEY) return t('userDouble')
  if (key === PDF_HATCH_CUSTOM_KEY) return t('measured')
  return key.startsWith('predefined:')
    ? key.slice('predefined:'.length)
    : (fallback ?? key)
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** Panel string `jig.pdfhatch.panel.<key>`. */
function t(key: string, params?: Record<string, string | number>) {
  return acapPdfT(`jig.pdfhatch.panel.${key}`, params)
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (className) el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

function option(value: string, label: string) {
  const el = document.createElement('option')
  el.value = value
  el.textContent = label
  return el
}

function field(label: string, control: HTMLElement) {
  const el = h('label', 'ml-pdfhatch-field')
  el.append(h('span', 'ml-pdfhatch-label', label), control)
  return el
}

function button(
  label: string,
  kind: 'primary' | 'secondary',
  onClick: () => void
) {
  const el = h(
    'button',
    kind === 'primary' ? 'ml-pdfhatch-btn' : 'ml-pdfhatch-btn is-secondary',
    label
  )
  el.type = 'button'
  el.addEventListener('click', onClick)
  return el
}

function checkbox(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void
) {
  const el = h('label', 'ml-pdfhatch-check')
  const input = h('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  el.append(input, h('span', undefined, label))
  return el
}

/** A number field committed on Enter or blur (refitting is not instant). */
function numberInput(value: number, className: string) {
  const el = h('input', `ml-pdfhatch-input ml-pdfhatch-number ${className}`)
  el.type = 'number'
  el.min = '0'
  el.step = 'any'
  el.value = String(Number(value.toPrecision(6)))
  return el
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.ml-pdfhatch-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  box-sizing: border-box;
  color: var(--ml-ui-text, #303133);
  font-size: 12px;
}
.ml-pdfhatch-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-pdfhatch-section-title {
  flex: 1;
  font-weight: 600;
}
.ml-pdfhatch-list {
  flex: 1;
  min-height: 80px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ml-pdfhatch-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  border-left: 3px solid transparent;
  cursor: pointer;
}
.ml-pdfhatch-row:hover {
  background: var(--ml-ui-hover, rgba(144, 147, 153, 0.12));
}
.ml-pdfhatch-row.is-selected {
  background: var(--ml-ui-canvas-fill, rgba(64, 158, 255, 0.2));
}
.ml-pdfhatch-row.is-poor {
  border-left-color: var(--ml-ui-warning, #e6a23c);
}
.ml-pdfhatch-row.is-skipped .ml-pdfhatch-name {
  opacity: 0.55;
}
.ml-pdfhatch-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-pdfhatch-tags {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ml-pdfhatch-tag {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  background: var(--ml-ui-accent, #409eff);
  white-space: nowrap;
}
.ml-pdfhatch-score {
  font-variant-numeric: tabular-nums;
}
.ml-pdfhatch-row.is-poor .ml-pdfhatch-score {
  color: var(--ml-ui-warning, #e6a23c);
}
.ml-pdfhatch-badge {
  color: var(--ml-ui-text-muted, #606266);
  font-size: 11px;
  white-space: nowrap;
}
.ml-pdfhatch-editor {
  flex-shrink: 0;
}
.ml-pdfhatch-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
}
.ml-pdfhatch-field {
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 6px;
}
.ml-pdfhatch-label {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfhatch-input {
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.ml-pdfhatch-input option,
.ml-pdfhatch-input optgroup {
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
}
.ml-pdfhatch-input:focus {
  outline: none;
  border-color: var(--ml-ui-accent, #409eff);
}
.ml-pdfhatch-number {
  width: 96px;
}
.ml-pdfhatch-actions {
  display: flex;
  justify-content: flex-end;
}
.ml-pdfhatch-hint {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfhatch-warning {
  color: var(--ml-ui-warning, #e6a23c);
}
.ml-pdfhatch-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.ml-pdfhatch-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-pdfhatch-counter {
  flex: 1;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfhatch-buttons {
  display: flex;
  gap: 6px;
}
.ml-pdfhatch-btn {
  min-width: 64px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--ml-ui-accent, #409eff);
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  cursor: pointer;
  font: inherit;
}
.ml-pdfhatch-btn.is-secondary {
  border-color: var(--ml-ui-border, #dcdfe6);
  background: transparent;
  color: inherit;
}
.ml-pdfhatch-toolbar .ml-pdfhatch-btn {
  min-width: 0;
  padding: 2px 8px;
}
.ml-pdfhatch-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
`.trim()
  document.head.appendChild(style)
}
