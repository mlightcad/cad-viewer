import {
  type AcApFontInfo,
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '@mlightcad/cad-simple-viewer'

import { acapPdfT } from '../acapPdfI18n'
import type {
  AcApPdfTextSession,
  PdfTextRow,
  PdfTextStyleNameError
} from '../AcApPdfTextSession'
import type { PdfTextFontKind } from '../recognition/pdfTextFontKind'

const STYLE_ID = 'ml-pdftext-panel-styles'
const NEW_STYLE_VALUE = '\u0000new'

/** Callbacks of {@link AcUiPdfTextPanel}. */
export interface AcUiPdfTextPanelOptions<Id> {
  session: AcApPdfTextSession<Id>
  /** Font catalog (`AcApDocManager.instance.avaiableFonts`). */
  fonts: readonly AcApFontInfo[]
  /** Font drawn instead of a font missing from the catalog. */
  replacementFont: (font: string) => string | undefined
  /** Session state changed: refresh the preview. */
  onChange: () => void
  /**
   * Rows got focus or were selected: highlight their strokes, and frame
   * them in the drawing when `zoom` is set.
   */
  onFocusRows: (rows: PdfTextRow<Id>[], zoom: boolean) => void
  /**
   * The user finished typing a line (Enter or leaving the field). Returns the
   * indexes of other lines whose text changed as a result, to redraw them.
   */
  onCommitRow: (index: number) => number[]
  /** "Hide original strokes" toggled. */
  onHideStrokes: (hide: boolean) => void
  /** Apply or Cancel pressed. */
  onClose: (apply: boolean) => void
}

interface FontOption {
  value: string
  label: string
  type: 'shx' | 'mesh'
}

/**
 * `pdftext` review panel shown in the palette: one text style section per
 * font kind (style, font, big font, height scale, width factor) and the list
 * of recovered lines with editable text. All state lives in the
 * {@link AcApPdfTextSession}; the panel only renders it and reports changes.
 */
export class AcUiPdfTextPanel<Id> {
  /** Root element to mount in a palette. */
  readonly element: HTMLDivElement
  private readonly options: AcUiPdfTextPanelOptions<Id>
  private readonly session: AcApPdfTextSession<Id>
  private readonly fontOptions: FontOption[]
  private readonly settingsEl: HTMLDivElement
  private readonly listEl: HTMLDivElement
  private readonly counterEl: HTMLSpanElement
  private readonly applyButton: HTMLButtonElement
  private readonly rowEls: HTMLDivElement[] = []
  /** Rows selected for merging (Ctrl/Shift+click). */
  private selected = new Set<PdfTextRow<Id>>()
  /** Last clicked row, start of a Shift+click range. */
  private anchor?: PdfTextRow<Id>
  private readonly mergeButton: HTMLButtonElement
  private readonly splitButton: HTMLButtonElement
  private readonly mergeInfo: HTMLSpanElement
  /** Kind whose "new style" name field is open. */
  private naming?: { kind: PdfTextFontKind; error?: PdfTextStyleNameError }
  private readonly unsubscribeTheme: () => void

  constructor(options: AcUiPdfTextPanelOptions<Id>) {
    ensureStyles()
    this.options = options
    this.session = options.session
    this.fontOptions = buildFontOptions(options.fonts)

    this.element = h('div', 'ml-pdftext-panel')
    const applyTheme = () =>
      acedApplyUiTheme(resolveUiTheme(this.element.parentElement), this.element)
    applyTheme()
    this.unsubscribeTheme = acedSubscribeUiTheme(applyTheme)

    this.settingsEl = h('div', 'ml-pdftext-settings')
    const linesTitle = h('div', 'ml-pdftext-section-title', t('lines'))
    const toolbar = h('div', 'ml-pdftext-toolbar')
    this.mergeButton = button(t('merge'), 'secondary', () =>
      this.mergeSelected()
    )
    this.mergeButton.title = t('mergeTip')
    this.splitButton = button(t('split'), 'secondary', () =>
      this.splitSelected()
    )
    this.splitButton.title = t('splitTip')
    const adjacent = button(t('mergeAdjacent'), 'secondary', () =>
      this.mergeAdjacent()
    )
    adjacent.title = t('mergeAdjacentTip')
    this.mergeInfo = h('span', 'ml-pdftext-hint')
    toolbar.append(this.mergeButton, this.splitButton, adjacent, this.mergeInfo)
    const selectHint = h('div', 'ml-pdftext-hint', t('selectHint'))
    this.listEl = h('div', 'ml-pdftext-lines')
    this.listEl.setAttribute('role', 'list')

    const footer = h('div', 'ml-pdftext-footer')
    const hide = checkbox(t('hideStrokes'), false, checked =>
      this.options.onHideStrokes(checked)
    )
    this.counterEl = h('span', 'ml-pdftext-counter')
    const buttons = h('div', 'ml-pdftext-buttons')
    const cancel = button(t('cancel'), 'secondary', () =>
      this.options.onClose(false)
    )
    this.applyButton = button(t('apply'), 'primary', () =>
      this.options.onClose(true)
    )
    buttons.append(cancel, this.applyButton)
    footer.append(hide, this.counterEl, buttons)

    this.element.append(
      this.settingsEl,
      linesTitle,
      toolbar,
      selectHint,
      this.listEl,
      footer
    )
    this.renderSettings()
    this.renderRows()
    this.updateCounter()
  }

  /** Focuses the first line that still needs text, if any. */
  focusFirstUnread() {
    const index = this.session.rows.findIndex(row => row.source === 'unread')
    this.focusRow(index >= 0 ? index : 0)
  }

  /** Redraws a line row from the session (e.g. text filled from glyphs). */
  refreshRow(index: number) {
    const el = this.rowEls[index]
    if (!el) return
    const row = this.session.rows[index]
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      '.ml-pdftext-text'
    )
    if (input && input.value !== row.text) input.value = row.text
    const include = el.querySelector<HTMLInputElement>('.ml-pdftext-include')
    if (include) include.checked = row.included
    this.fillRow(el, row)
  }

  /** Removes listeners. The element is removed by the palette host. */
  destroy() {
    this.unsubscribeTheme()
    this.element.remove()
  }

  private changed(settings = false) {
    if (settings) this.renderSettings()
    this.updateCounter()
    this.options.onChange()
  }

  // ---------------------------------------------------------------- settings

  private renderSettings() {
    this.settingsEl.replaceChildren(
      ...this.session.kinds.map(kind => this.renderKind(kind))
    )
  }

  private renderKind(kind: PdfTextFontKind): HTMLElement {
    const session = this.session
    const choice = session.choice(kind)
    const section = h('div', 'ml-pdftext-section')
    section.append(
      h(
        'div',
        'ml-pdftext-section-title',
        t(kind === 'shx' ? 'shxGroup' : 'meshGroup')
      )
    )

    // Text style: existing styles, the pending new one, "New text style…".
    const styleSelect = h('select', 'ml-pdftext-input')
    const names = session.styleNames()
    if (choice.isNew) {
      styleSelect.append(
        option(choice.styleName, `${choice.styleName} (${t('newTag')})`)
      )
    }
    for (const name of names) styleSelect.append(option(name, name))
    styleSelect.append(option(NEW_STYLE_VALUE, t('newStyle')))
    styleSelect.value = choice.styleName
    styleSelect.addEventListener('change', () => {
      if (styleSelect.value === NEW_STYLE_VALUE) {
        this.naming = { kind }
        this.renderSettings()
        this.settingsEl
          .querySelector<HTMLInputElement>('.ml-pdftext-new-name')
          ?.focus()
        return
      }
      session.selectStyle(kind, styleSelect.value)
      this.naming = undefined
      this.changed(true)
    })
    section.append(field(t('style'), styleSelect))

    if (this.naming?.kind === kind) section.append(this.renderNaming(kind))

    // Font and big font.
    const fontSelect = h('select', 'ml-pdftext-input')
    const known = this.fontOptions.some(item =>
      sameName(item.value, choice.font)
    )
    if (!known && choice.font) {
      fontSelect.append(option(choice.font, choice.font))
    }
    for (const [type, label] of [
      ['shx', t('shxFonts')],
      ['mesh', t('ttfFonts')]
    ] as const) {
      const items = this.fontOptions.filter(item => item.type === type)
      if (items.length === 0) continue
      const group = document.createElement('optgroup')
      group.label = label
      for (const item of items) group.append(option(item.value, item.label))
      fontSelect.append(group)
    }
    fontSelect.value = matchValue(fontSelect, choice.font)
    fontSelect.addEventListener('change', () => {
      session.setFont(kind, fontSelect.value)
      this.changed(true)
    })
    section.append(field(t('font'), fontSelect))

    const fontType = this.fontType(choice.font)
    const bigSelect = h('select', 'ml-pdftext-input')
    bigSelect.append(option('', t('noBigFont')))
    if (
      choice.bigFont &&
      !this.fontOptions.some(item => sameName(item.value, choice.bigFont))
    ) {
      bigSelect.append(option(choice.bigFont, choice.bigFont))
    }
    for (const item of this.fontOptions) {
      if (item.type === 'shx') bigSelect.append(option(item.value, item.label))
    }
    bigSelect.value = matchValue(bigSelect, choice.bigFont)
    bigSelect.disabled = fontType === 'mesh'
    bigSelect.addEventListener('change', () => {
      session.setBigFont(kind, bigSelect.value)
      this.changed(true)
    })
    section.append(field(t('bigFont'), bigSelect))

    // Which fonts will draw the text, and warnings.
    const fonts = [choice.font, choice.bigFont].filter(Boolean).join(' + ')
    section.append(h('div', 'ml-pdftext-hint', t('fontsUsed', { fonts })))
    for (const font of [choice.font, choice.bigFont]) {
      if (!font || this.fontType(font)) continue
      const fallback = this.options.replacementFont(font)
      section.append(
        h(
          'div',
          'ml-pdftext-warning',
          t('fontMissing', { font, fallback: fallback || '-' })
        )
      )
    }
    if (fontType && fontType !== kind) {
      section.append(
        h(
          'div',
          'ml-pdftext-warning',
          t(kind === 'shx' ? 'fontNotShx' : 'fontNotTtf')
        )
      )
    }
    if (session.changesExistingStyle(kind)) {
      section.append(
        h(
          'div',
          'ml-pdftext-warning',
          t('styleChanges', { style: choice.styleName })
        )
      )
    }

    // Size.
    const sizeRow = h('div', 'ml-pdftext-size')
    const height = numberInput(choice.heightScale, 0.01, value => {
      session.setSize(kind, { heightScale: value })
      this.changed()
    })
    sizeRow.append(field(t('heightScale'), height))
    const width = numberInput(choice.widthFactor, 0.01, value => {
      session.setSize(kind, { widthFactor: value })
      this.changed()
    })
    width.disabled = choice.autoWidth
    const auto = checkbox(t('autoWidth'), choice.autoWidth, checked => {
      session.setSize(kind, { autoWidth: checked })
      this.changed(true)
    })
    const widthField = field(t('widthFactor'), width)
    widthField.append(auto)
    sizeRow.append(widthField)
    section.append(sizeRow)
    return section
  }

  private renderNaming(kind: PdfTextFontKind): HTMLElement {
    const wrap = h('div', 'ml-pdftext-naming')
    const input = h('input', 'ml-pdftext-input ml-pdftext-new-name')
    input.type = 'text'
    input.placeholder = t('newStyleName')
    const create = () => {
      const error = this.session.newStyle(kind, input.value)
      if (error) {
        this.naming = { kind, error }
        const message = wrap.querySelector('.ml-pdftext-warning')
        if (message) message.textContent = t(`nameError.${error}`)
        else
          wrap.append(h('div', 'ml-pdftext-warning', t(`nameError.${error}`)))
        return
      }
      this.naming = undefined
      this.changed(true)
    }
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        create()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        this.naming = undefined
        this.renderSettings()
      }
    })
    const row = h('div', 'ml-pdftext-naming-row')
    row.append(
      input,
      button(t('create'), 'primary', create),
      button(t('cancel'), 'secondary', () => {
        this.naming = undefined
        this.renderSettings()
      })
    )
    wrap.append(row)
    if (this.naming?.error) {
      wrap.append(
        h('div', 'ml-pdftext-warning', t(`nameError.${this.naming.error}`))
      )
    }
    return wrap
  }

  private fontType(font: string): 'shx' | 'mesh' | undefined {
    return this.fontOptions.find(item => sameName(item.value, font))?.type
  }

  // ------------------------------------------------------------------- lines

  /** Rebuilds the list (after a merge or split the rows change). */
  private renderRows() {
    this.rowEls.length = 0
    this.listEl.replaceChildren()
    const order = this.session.rows
      .map((row, index) => ({ row, index }))
      // Lines nothing could read come first: they need the user.
      .sort(
        (a, b) =>
          Number(b.row.source === 'unread') - Number(a.row.source === 'unread')
      )
    for (const { index } of order) {
      const el = this.renderRow(index)
      this.rowEls[index] = el
      this.listEl.append(el)
    }
    // Rows that no longer exist cannot stay selected.
    for (const row of [...this.selected]) {
      if (!this.session.rows.includes(row)) this.selected.delete(row)
    }
    this.updateSelection()
  }

  private renderRow(index: number): HTMLDivElement {
    const row = this.session.rows[index]
    const el = h('div', 'ml-pdftext-row')
    el.setAttribute('role', 'listitem')
    el.dataset.index = String(index)
    // Ctrl/Shift+click selects rows (to merge them) instead of editing.
    el.addEventListener('mousedown', event => {
      if (!(event.ctrlKey || event.metaKey || event.shiftKey)) return
      const target = event.target as HTMLElement
      if (target.closest('.ml-pdftext-include, .ml-pdftext-kind')) return
      event.preventDefault()
      this.selectRow(
        this.session.rows[index],
        event.shiftKey ? 'range' : 'toggle'
      )
    })

    const include = h('input', 'ml-pdftext-include')
    include.type = 'checkbox'
    include.title = t('include')
    include.checked = row.included
    include.addEventListener('change', () => {
      this.session.setIncluded(index, include.checked)
      this.updateRow(index)
      this.changed()
    })

    // A block of several lines is edited in a text area, one line per row.
    const paragraphs = row.merge?.paragraphs.length ?? 1
    const multiline = paragraphs > 1 || row.text.includes('\n')
    const input = multiline
      ? h('textarea', 'ml-pdftext-input ml-pdftext-text')
      : h('input', 'ml-pdftext-input ml-pdftext-text')
    if (input instanceof HTMLInputElement) input.type = 'text'
    else input.rows = Math.max(2, row.text.split('\n').length)
    input.value = row.text
    input.placeholder = t('textPlaceholder')
    input.addEventListener('focus', () => {
      if (!this.selected.has(this.session.rows[index])) {
        this.selectRow(this.session.rows[index], 'single')
      }
      this.options.onFocusRows([...this.selected], true)
    })
    let edited = false
    const commit = () => {
      if (!edited) return
      edited = false
      const changed = this.options.onCommitRow(index)
      if (changed.length === 0) return
      changed.forEach(other => this.refreshRow(other))
      this.changed()
    }
    input.addEventListener('input', () => {
      edited = true
      this.session.setText(index, input.value)
      include.checked = this.session.rows[index].included
      this.updateRow(index)
      this.changed()
    })
    input.addEventListener('blur', commit)
    input.addEventListener('keydown', event => {
      const key = (event as KeyboardEvent).key
      // In a text area Enter starts a new line; Ctrl+Enter moves on.
      if (key !== 'Enter') return
      if (multiline && !(event as KeyboardEvent).ctrlKey) return
      event.preventDefault()
      commit()
      this.focusNext(index)
    })

    const tags = h('span', 'ml-pdftext-tags')
    const badge = h('span', 'ml-pdftext-badge')
    tags.append(badge)
    if (row.merge) tags.append(h('span', 'ml-pdftext-mtext', t('mtextTag')))
    const kind = h('button', 'ml-pdftext-kind')
    kind.type = 'button'
    kind.title = t('switchKind')
    kind.addEventListener('click', () => {
      const current = this.session.rows[index].kind
      this.session.setKind(index, current === 'shx' ? 'mesh' : 'shx')
      this.updateRow(index)
      this.changed(true)
    })

    el.append(include, input, tags, kind)
    this.fillRow(el, row)
    return el
  }

  private updateRow(index: number) {
    const el = this.rowEls[index]
    if (el) this.fillRow(el, this.session.rows[index])
  }

  private fillRow(el: HTMLDivElement, row: PdfTextRow<Id>) {
    el.dataset.source = row.source
    el.classList.toggle('is-skipped', !row.included || !row.text.trim())
    const badge = el.querySelector('.ml-pdftext-badge')
    if (badge) badge.textContent = t(`source.${row.source}`)
    const kind = el.querySelector('.ml-pdftext-kind')
    if (kind) kind.textContent = t(`kind.${row.kind}`)
  }

  private focusRow(index: number) {
    this.rowEls[index]?.querySelector<HTMLElement>('.ml-pdftext-text')?.focus()
  }

  /** Enter: next unread line, else the next line in the list. */
  private focusNext(index: number) {
    const els = Array.from(this.listEl.children) as HTMLElement[]
    const position = els.findIndex(el => el.dataset.index === String(index))
    const after = [...els.slice(position + 1), ...els.slice(0, position)]
    const target =
      after.find(el => el.dataset.source === 'unread') ?? after[0] ?? undefined
    if (target) this.focusRow(Number(target.dataset.index))
  }

  // --------------------------------------------------------------- selection

  /**
   * Changes the selected rows: `single` selects only `row`, `toggle` adds or
   * removes it (Ctrl+click), `range` selects from the last clicked row to
   * `row` in list order (Shift+click).
   */
  private selectRow(row: PdfTextRow<Id>, mode: 'single' | 'toggle' | 'range') {
    if (
      mode === 'range' &&
      this.anchor &&
      this.session.rows.includes(this.anchor)
    ) {
      const order = (Array.from(this.listEl.children) as HTMLElement[]).map(
        el => this.session.rows[Number(el.dataset.index)]
      )
      const a = order.indexOf(this.anchor)
      const b = order.indexOf(row)
      this.selected.clear()
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        this.selected.add(order[i])
      }
    } else if (mode === 'toggle') {
      if (this.selected.has(row)) this.selected.delete(row)
      else this.selected.add(row)
      this.anchor = row
    } else {
      this.selected.clear()
      this.selected.add(row)
      this.anchor = row
    }
    this.updateSelection()
    if (mode !== 'single') this.options.onFocusRows([...this.selected], false)
  }

  private updateSelection() {
    this.rowEls.forEach((el, i) =>
      el?.classList.toggle(
        'is-selected',
        this.selected.has(this.session.rows[i])
      )
    )
    const rows = [...this.selected]
    this.mergeButton.disabled = rows.length < 2
    this.splitButton.disabled = !rows.some(row => row.merge)
  }

  /** Merges the selected rows into one MTEXT row. */
  private mergeSelected() {
    const indexes = [...this.selected].map(row =>
      this.session.rows.indexOf(row)
    )
    const merged = this.session.merge(indexes)
    if (merged === undefined) return
    this.selected.clear()
    this.selected.add(this.session.rows[merged])
    this.anchor = this.session.rows[merged]
    this.afterRowsChanged(merged)
  }

  /** Splits the selected merged rows back into their rows. */
  private splitSelected() {
    const restored: PdfTextRow<Id>[] = []
    for (const row of [...this.selected]) {
      const indexes = this.session.split(this.session.rows.indexOf(row))
      restored.push(...indexes.map(i => this.session.rows[i]))
    }
    if (restored.length === 0) return
    this.selected = new Set(restored)
    this.anchor = restored[0]
    this.afterRowsChanged(this.session.rows.indexOf(restored[0]))
  }

  /** Merges all rows that read as one line. */
  private mergeAdjacent() {
    const count = this.session.mergeAdjacent()
    this.mergeInfo.textContent = t('mergedCount', { count })
    if (count === 0) return
    this.selected.clear()
    this.afterRowsChanged()
  }

  private afterRowsChanged(focus?: number) {
    this.renderRows()
    this.changed(true)
    if (focus !== undefined) {
      this.options.onFocusRows([...this.selected], true)
      this.rowEls[focus]?.scrollIntoView({ block: 'nearest' })
    }
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

/** Panel string `jig.pdftext.panel.<key>`. */
function t(key: string, params?: Record<string, string | number>) {
  return acapPdfT(`jig.pdftext.panel.${key}`, params)
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
  const el = h('label', 'ml-pdftext-field')
  el.append(h('span', 'ml-pdftext-label', label), control)
  return el
}

function button(
  label: string,
  kind: 'primary' | 'secondary',
  onClick: () => void
) {
  const el = h(
    'button',
    kind === 'primary' ? 'ml-pdftext-btn' : 'ml-pdftext-btn is-secondary',
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
  const el = h('label', 'ml-pdftext-check')
  const input = h('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  el.append(input, h('span', undefined, label))
  return el
}

function numberInput(
  value: number,
  step: number,
  onChange: (value: number) => void
) {
  const el = h('input', 'ml-pdftext-input ml-pdftext-number')
  el.type = 'number'
  el.min = String(step)
  el.step = String(step)
  el.value = String(Number(value.toFixed(3)))
  el.addEventListener('input', () => {
    const next = Number(el.value)
    if (Number.isFinite(next) && next > 0) onChange(next)
  })
  return el
}

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** The option value matching `name` case-insensitively, else `name`. */
function matchValue(select: HTMLSelectElement, name: string) {
  const match = Array.from(select.options).find(item =>
    sameName(item.value, name)
  )
  return match ? match.value : name
}

/** Catalog fonts by first alias, labelled by file name (like the STYLE dialog). */
function buildFontOptions(fonts: readonly AcApFontInfo[]): FontOption[] {
  const options: FontOption[] = []
  const seen = new Set<string>()
  for (const info of fonts) {
    const primary = info.name.find(name => name.trim())?.trim()
    if (!primary) continue
    const key = primary.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      value: primary,
      label: info.file || primary,
      type: info.type
    })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.ml-pdftext-panel {
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
.ml-pdftext-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  max-height: 55%;
  flex-shrink: 0;
}
.ml-pdftext-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
}
.ml-pdftext-section-title {
  font-weight: 600;
  margin-bottom: 2px;
}
.ml-pdftext-field {
  display: grid;
  grid-template-columns: 92px 1fr;
  align-items: center;
  gap: 6px;
}
.ml-pdftext-label {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdftext-input {
  min-width: 0;
  box-sizing: border-box;
  padding: 3px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
}
.ml-pdftext-input option,
.ml-pdftext-input optgroup {
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
}
.ml-pdftext-input:focus {
  outline: none;
  border-color: var(--ml-ui-accent, #409eff);
}
.ml-pdftext-number {
  width: 72px;
}
.ml-pdftext-size {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ml-pdftext-size .ml-pdftext-field {
  grid-template-columns: 92px auto 1fr;
}
.ml-pdftext-hint {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdftext-warning {
  color: var(--ml-ui-danger, #f56c6c);
}
.ml-pdftext-naming {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ml-pdftext-naming-row {
  display: flex;
  gap: 4px;
}
.ml-pdftext-naming-row .ml-pdftext-input {
  flex: 1;
}
.ml-pdftext-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.ml-pdftext-lines {
  flex: 1;
  min-height: 80px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ml-pdftext-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.ml-pdftext-toolbar .ml-pdftext-btn {
  min-width: 0;
  padding: 2px 8px;
}
.ml-pdftext-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 4px;
  border-left: 3px solid transparent;
}
.ml-pdftext-row.is-selected {
  background: var(--ml-ui-canvas-fill, rgba(64, 158, 255, 0.2));
}
textarea.ml-pdftext-text {
  resize: vertical;
  min-height: 2.6em;
}
.ml-pdftext-tags {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.ml-pdftext-mtext {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  background: var(--ml-ui-accent, #409eff);
  white-space: nowrap;
}
.ml-pdftext-row[data-source='unread'] {
  border-left-color: var(--ml-ui-danger, #f56c6c);
}
.ml-pdftext-row.is-skipped .ml-pdftext-text {
  opacity: 0.55;
}
.ml-pdftext-badge {
  color: var(--ml-ui-text-muted, #606266);
  font-size: 11px;
  white-space: nowrap;
}
.ml-pdftext-kind {
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 11px;
  padding: 1px 5px;
  cursor: pointer;
  white-space: nowrap;
}
.ml-pdftext-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-pdftext-counter {
  flex: 1;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdftext-buttons {
  display: flex;
  gap: 6px;
}
.ml-pdftext-btn {
  min-width: 64px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--ml-ui-accent, #409eff);
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  cursor: pointer;
  font: inherit;
}
.ml-pdftext-btn.is-secondary {
  border-color: var(--ml-ui-border, #dcdfe6);
  background: transparent;
  color: inherit;
}
.ml-pdftext-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
`.trim()
  document.head.appendChild(style)
}
