import {
  acedApplyUiTheme,
  acedRenderDimStylePreview,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '@mlightcad/cad-simple-viewer'

import type {
  AcApPdfDimSession,
  PdfDimRow,
  PdfDimStyleNameError
} from '../AcApPdfDimSession'
import { acapPdfT } from '../acapPdfI18n'

const STYLE_ID = 'ml-pdfdim-panel-styles'
const NEW_STYLE_VALUE = '\u0000new'

/** Callbacks of {@link AcUiPdfDimPanel}. */
export interface AcUiPdfDimPanelOptions<Id> {
  session: AcApPdfDimSession<Id>
  onChange: () => void
  onFocusRow: (row: PdfDimRow<Id> | undefined, zoom: boolean) => void
  onHideStrokes: (hide: boolean) => void
  onClose: (apply: boolean) => void
  /** Initial "hide originals" checkbox. */
  hideStrokes?: boolean
}

/**
 * `pdfdim` review panel: dim style picker (existing or new), editable value
 * texts, include toggles, Apply / Cancel.
 */
export class AcUiPdfDimPanel<Id> {
  readonly element: HTMLDivElement
  private readonly options: AcUiPdfDimPanelOptions<Id>
  private readonly session: AcApPdfDimSession<Id>
  private readonly styleSelect: HTMLSelectElement
  private readonly namingEl: HTMLDivElement
  private readonly nameInput: HTMLInputElement
  private readonly nameError: HTMLDivElement
  private readonly scaleEl: HTMLSpanElement
  private readonly previewHost: HTMLDivElement
  private readonly previewSvg: SVGSVGElement
  private readonly listEl: HTMLDivElement
  private readonly counterEl: HTMLSpanElement
  private readonly applyButton: HTMLButtonElement
  private selected?: PdfDimRow<Id>
  private naming = false
  /** Style section starts collapsed so the dimension list gets the space. */
  private styleCollapsed = true
  private readonly styleSection: HTMLDivElement
  private readonly styleHeader: HTMLButtonElement
  private readonly styleSummary: HTMLSpanElement
  private readonly styleBody: HTMLDivElement
  private readonly styleChevron: HTMLSpanElement
  private readonly unsubscribeTheme: () => void

  constructor(options: AcUiPdfDimPanelOptions<Id>) {
    ensureStyles()
    this.options = options
    this.session = options.session

    this.element = h('div', 'ml-pdfdim-panel')
    const applyTheme = () =>
      acedApplyUiTheme(resolveUiTheme(this.element.parentElement), this.element)
    applyTheme()
    this.unsubscribeTheme = acedSubscribeUiTheme(applyTheme)

    this.styleSection = h('div', 'ml-pdfdim-section')
    this.styleHeader = h('button', 'ml-pdfdim-section-header')
    this.styleHeader.type = 'button'
    this.styleChevron = h('span', 'ml-pdfdim-chevron', '▶')
    this.styleChevron.setAttribute('aria-hidden', 'true')
    this.styleSummary = h('span', 'ml-pdfdim-section-summary')
    this.styleHeader.append(
      this.styleChevron,
      h('span', 'ml-pdfdim-section-title', t('style')),
      this.styleSummary
    )
    this.styleHeader.addEventListener('click', () => {
      this.styleCollapsed = !this.styleCollapsed
      this.syncStyleCollapsed()
    })
    this.styleBody = h('div', 'ml-pdfdim-section-body')
    const styleField = h('div', 'ml-pdfdim-field')
    styleField.append(h('span', 'ml-pdfdim-label', t('dimStyle')))
    this.styleSelect = h('select', 'ml-pdfdim-input')
    this.styleSelect.addEventListener('change', () => this.onStyleChange())
    styleField.append(this.styleSelect)
    this.styleBody.append(styleField)

    this.namingEl = h('div', 'ml-pdfdim-naming')
    this.namingEl.hidden = true
    this.nameInput = h('input', 'ml-pdfdim-input')
    this.nameInput.type = 'text'
    this.nameInput.placeholder = t('newStyleName')
    this.nameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.commitName()
      }
    })
    const nameOk = button(t('createStyle'), 'primary', () => this.commitName())
    this.nameError = h('div', 'ml-pdfdim-warning')
    this.namingEl.append(this.nameInput, nameOk, this.nameError)
    this.styleBody.append(this.namingEl)

    const scaleField = h('div', 'ml-pdfdim-field')
    scaleField.append(h('span', 'ml-pdfdim-label', t('scale')))
    this.scaleEl = h('span', 'ml-pdfdim-scale')
    scaleField.append(this.scaleEl)
    this.styleBody.append(scaleField)

    this.previewHost = h('div', 'ml-pdfdim-preview')
    this.previewHost.title = t('stylePreview')
    this.previewSvg = acedRenderDimStylePreview()
    this.previewSvg.classList.add('ml-pdfdim-preview-svg')
    this.previewHost.append(this.previewSvg)
    this.styleBody.append(this.previewHost)
    this.styleSection.append(this.styleHeader, this.styleBody)
    this.syncStyleCollapsed()

    this.listEl = h('div', 'ml-pdfdim-list')
    this.listEl.setAttribute('role', 'list')

    const footer = h('div', 'ml-pdfdim-footer')
    const hide = checkbox(t('hideStrokes'), !!options.hideStrokes, checked =>
      this.options.onHideStrokes(checked)
    )
    this.counterEl = h('span', 'ml-pdfdim-counter')
    const buttons = h('div', 'ml-pdfdim-buttons')
    const cancel = button(t('cancel'), 'secondary', () =>
      this.options.onClose(false)
    )
    this.applyButton = button(t('apply'), 'primary', () =>
      this.options.onClose(true)
    )
    buttons.append(cancel, this.applyButton)
    footer.append(hide, this.counterEl, buttons)

    this.element.append(
      this.styleSection,
      h('div', 'ml-pdfdim-section-title', t('dimensions')),
      h('div', 'ml-pdfdim-hint', t('selectHint')),
      this.listEl,
      footer
    )
    this.renderStyle()
    this.renderList()
    this.updateCounter()
  }

  private syncStyleCollapsed() {
    this.styleSection.classList.toggle('is-collapsed', this.styleCollapsed)
    this.styleBody.hidden = this.styleCollapsed
    this.styleChevron.textContent = this.styleCollapsed ? '▶' : '▼'
    this.styleHeader.setAttribute(
      'aria-expanded',
      String(!this.styleCollapsed)
    )
  }

  selectFirst() {
    const first = this.session.rows[0]
    if (first) this.select(first, false)
  }

  destroy() {
    this.unsubscribeTheme()
    this.element.remove()
  }

  private select(row: PdfDimRow<Id> | undefined, zoom: boolean) {
    this.selected = row
    this.renderList()
    this.options.onFocusRow(row, zoom)
  }

  private rowChanged() {
    this.renderList()
    this.renderStyle()
    this.updateCounter()
    this.options.onChange()
  }

  private onStyleChange() {
    const value = this.styleSelect.value
    if (value === NEW_STYLE_VALUE) {
      this.naming = true
      this.session.beginNewStyle()
      this.styleCollapsed = false
      this.syncStyleCollapsed()
      this.namingEl.hidden = false
      this.nameInput.value = ''
      this.nameError.textContent = ''
      this.nameInput.focus()
      this.updateStyleSummary()
      this.updateCounter()
      return
    }
    this.naming = false
    this.namingEl.hidden = true
    this.session.selectStyle(value)
    this.rowChanged()
  }

  private commitName() {
    const error = this.session.commitNewStyleName(this.nameInput.value)
    if (error) {
      this.nameError.textContent = nameErrorMessage(error)
      return
    }
    this.naming = false
    this.namingEl.hidden = true
    this.renderStyle()
    this.rowChanged()
  }

  private renderStyle() {
    const names = this.session.styleNames()
    const current = this.session.styleName
    const options: HTMLOptionElement[] = names.map(name => {
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name
      return opt
    })
    const create = document.createElement('option')
    create.value = NEW_STYLE_VALUE
    create.textContent = t('newStyle')
    options.push(create)
    this.styleSelect.replaceChildren(...options)
    if (this.naming) {
      this.styleSelect.value = NEW_STYLE_VALUE
      this.namingEl.hidden = false
    } else if (names.includes(current)) {
      this.styleSelect.value = current
      this.namingEl.hidden = true
    } else if (names.length > 0) {
      // Keep session state; only sync the control when the name is missing
      // from the list (e.g. mid-typing a new style that was cancelled).
      this.styleSelect.value = names[0]
      this.namingEl.hidden = true
    }
    this.scaleEl.textContent = `1:${formatScale(this.session.scale)}`
    this.updateStyleSummary()
    this.renderPreview()
  }

  private updateStyleSummary() {
    const name = this.session.styleName.trim()
    const scale = `1:${formatScale(this.session.scale)}`
    this.styleSummary.textContent = name ? `${name} · ${scale}` : scale
  }

  private renderPreview() {
    acedRenderDimStylePreview(
      this.session.previewStyleRecord(),
      this.previewSvg
    )
  }

  private renderList() {
    const rows = this.session.rows
    if (rows.length === 0) {
      this.listEl.replaceChildren(h('div', 'ml-pdfdim-hint', t('empty')))
      return
    }
    this.listEl.replaceChildren(...rows.map(row => this.renderRow(row)))
  }

  private renderRow(row: PdfDimRow<Id>): HTMLElement {
    const el = h('div', 'ml-pdfdim-row')
    el.setAttribute('role', 'listitem')
    el.classList.toggle('is-selected', row === this.selected)
    el.classList.toggle('is-skipped', !row.included)
    el.addEventListener('click', () => this.select(row, true))

    const include = h('input', 'ml-pdfdim-include')
    include.type = 'checkbox'
    include.checked = row.included
    include.title = t('include')
    include.addEventListener('click', event => event.stopPropagation())
    include.addEventListener('change', () => {
      this.session.setIncluded(row, include.checked)
      el.classList.toggle('is-skipped', !row.included)
      this.scaleEl.textContent = `1:${formatScale(this.session.scale)}`
      this.updateStyleSummary()
      this.renderPreview()
      this.updateCounter()
      this.options.onChange()
    })

    const kind = h('span', 'ml-pdfdim-kind', kindLabel(row.candidate.kind))
    const text = h('input', 'ml-pdfdim-text')
    text.type = 'text'
    text.value = row.text
    text.title = t('textTip')
    text.addEventListener('click', event => event.stopPropagation())
    text.addEventListener('input', () => {
      this.session.setText(row, text.value)
      this.scaleEl.textContent = `1:${formatScale(this.session.scale)}`
      this.updateStyleSummary()
      this.renderPreview()
      this.updateCounter()
      this.options.onChange()
    })
    text.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        text.blur()
      }
    })

    const measured = h(
      'span',
      'ml-pdfdim-measured',
      t('measured', {
        value: formatNumber(row.candidate.measured)
      })
    )
    el.append(include, kind, text, measured)
    return el
  }

  private updateCounter() {
    const ready = this.session.readyRows.length
    const count = this.session.rows.length
    this.counterEl.textContent = t('ready', { ready, count })
    const styleOk =
      !this.session.isNewStyle || this.session.styleName.trim().length > 0
    this.applyButton.disabled = ready === 0 || !styleOk
  }
}

function kindLabel(kind: string): string {
  if (kind === 'linear') return t('kindLinear')
  if (kind === 'radius') return t('kindRadius')
  if (kind === 'diameter') return t('kindDiameter')
  if (kind === 'angular') return t('kindAngular')
  return kind
}

function nameErrorMessage(error: PdfDimStyleNameError): string {
  if (error === 'empty') return t('nameEmpty')
  if (error === 'invalid') return t('nameInvalid')
  return t('nameExists')
}

function formatScale(scale: number) {
  return Number(scale.toPrecision(6)).toString()
}

function formatNumber(value: number) {
  return Number(value.toPrecision(6)).toString()
}

function t(key: string, vars?: Record<string, string | number>): string {
  return vars
    ? acapPdfT(`jig.pdfdim.panel.${key}`, vars)
    : acapPdfT(`jig.pdfdim.panel.${key}`)
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

function button(
  label: string,
  kind: 'primary' | 'secondary',
  onClick: () => void
) {
  const el = h('button', 'ml-pdfdim-btn')
  if (kind === 'secondary') el.classList.add('is-secondary')
  el.type = 'button'
  el.textContent = label
  el.addEventListener('click', onClick)
  return el
}

function checkbox(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void
) {
  const el = h('label', 'ml-pdfdim-check')
  const input = h('input', '')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  el.append(input, document.createTextNode(label))
  return el
}

function ensureStyles() {
  if (typeof document === 'undefined') return
  const css = `
.ml-pdfdim-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  padding: 8px;
  box-sizing: border-box;
  font: 12px/1.4 var(--ml-ui-font, system-ui, sans-serif);
  color: var(--ml-ui-text, #303133);
}
.ml-pdfdim-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 8px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
  flex-shrink: 0;
}
.ml-pdfdim-section.is-collapsed {
  padding-bottom: 4px;
}
.ml-pdfdim-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 -2px;
  padding: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.ml-pdfdim-section-header:hover {
  background: var(--ml-ui-hover, rgba(144, 147, 153, 0.12));
}
.ml-pdfdim-chevron {
  flex: 0 0 auto;
  width: 1em;
  color: var(--ml-ui-text-muted, #606266);
  font-size: 10px;
  text-align: center;
}
.ml-pdfdim-section-title {
  flex: 0 1 auto;
  font-weight: 600;
  min-width: 0;
}
.ml-pdfdim-section-summary {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ml-ui-text-muted, #606266);
  font-weight: 400;
  text-align: right;
}
.ml-pdfdim-section:not(.is-collapsed) .ml-pdfdim-section-summary {
  display: none;
}
.ml-pdfdim-section-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* Author display:flex would otherwise override the UA [hidden] rule. */
.ml-pdfdim-section-body[hidden] {
  display: none;
}
.ml-pdfdim-field {
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 6px;
}
.ml-pdfdim-label {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfdim-input,
.ml-pdfdim-text {
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.ml-pdfdim-input option {
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
}
.ml-pdfdim-naming {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  align-items: center;
}
.ml-pdfdim-naming .ml-pdfdim-warning {
  grid-column: 1 / -1;
}
.ml-pdfdim-preview {
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-hover, rgba(144, 147, 153, 0.08));
  overflow: hidden;
}
.ml-pdfdim-preview-svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 420 / 250;
}
.ml-pdfdim-list {
  flex: 1;
  min-height: 80px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ml-pdfdim-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.ml-pdfdim-row:hover {
  background: var(--ml-ui-hover, rgba(144, 147, 153, 0.12));
}
.ml-pdfdim-row.is-selected {
  background: var(--ml-ui-canvas-fill, rgba(64, 158, 255, 0.2));
}
.ml-pdfdim-row.is-skipped {
  opacity: 0.55;
}
.ml-pdfdim-kind {
  font-size: 11px;
  color: var(--ml-ui-text-muted, #606266);
  white-space: nowrap;
}
.ml-pdfdim-measured {
  font-size: 11px;
  color: var(--ml-ui-text-muted, #606266);
  white-space: nowrap;
}
.ml-pdfdim-hint {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfdim-warning {
  color: var(--ml-ui-warning, #e6a23c);
}
.ml-pdfdim-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.ml-pdfdim-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-pdfdim-counter {
  flex: 1;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdfdim-buttons {
  display: flex;
  gap: 6px;
}
.ml-pdfdim-btn {
  min-width: 64px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--ml-ui-accent, #409eff);
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  cursor: pointer;
  font: inherit;
}
.ml-pdfdim-btn.is-secondary {
  border-color: var(--ml-ui-border, #dcdfe6);
  background: transparent;
  color: inherit;
}
.ml-pdfdim-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
`.trim()
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}
