import { AcUiDialog } from '@mlightcad/cad-simple-viewer'

import { acapPdfT } from '../acapPdfI18n'
import type { AcApPdfImportMode } from '../AcApPdfImportOptions'
import { PDF_PT_TO_MM } from '../pdfVectorImport'

const STYLE_ID = 'ml-pdf-import-dialog-styles'
const MM_PER_INCH = 25.4
/** Largest thumbnail edge in the grid view, CSS px. */
const THUMB_SIZE = 96

/** Page size in PDF points. */
export interface AcUiPdfImportViewport {
  width: number
  height: number
}

/** Running page render; `cancel` stops it early. */
export interface AcUiPdfImportRenderTask {
  promise: Promise<void>
  cancel(): void
}

/** One page of the PDF shown by {@link AcUiPdfImportDialog}. */
export interface AcUiPdfImportPage {
  /** Page size at `scale` (1 = PDF points). */
  getSize(scale: number): AcUiPdfImportViewport
  /** Draws the page into `canvas` at `scale`; the canvas is already sized. */
  render(canvas: HTMLCanvasElement, scale: number): AcUiPdfImportRenderTask
}

/** The PDF shown by {@link AcUiPdfImportDialog}. */
export interface AcUiPdfImportDocument {
  numPages: number
  getPage(pageNumber: number): Promise<AcUiPdfImportPage>
}

/** A picked PDF file, loaded. */
export interface AcUiPdfImportSource {
  document: AcUiPdfImportDocument
  fileName: string
}

/** Values the dialog starts with. */
export interface AcUiPdfImportDialogValues {
  /** 1-based page number. */
  pageNumber: number
  mode: AcApPdfImportMode
  scale: number
  /** Ask for the insertion point in the drawing after OK. */
  specifyOnScreen: boolean
  /** Insertion point used when {@link specifyOnScreen} is off. */
  insertionPoint: { x: number; y: number }
}

/** Options for {@link AcUiPdfImportDialog.open}. */
export interface AcUiPdfImportDialogOptions {
  /** PDF picked before the dialog opens. */
  source: AcUiPdfImportSource
  /**
   * Picks and loads another PDF ("Browse..."). Resolves `undefined` when the
   * user cancels the picker. The caller owns the loaded documents.
   */
  browse?: () => Promise<AcUiPdfImportSource | undefined>
  /** Starting values; omitted fields use the defaults. */
  initial?: Partial<AcUiPdfImportDialogValues>
  /** Element that receives the backdrop. Defaults to `document.body`. */
  host?: HTMLElement
}

/** What {@link AcUiPdfImportDialog.open} resolves with on OK. */
export interface AcUiPdfImportDialogResult extends AcUiPdfImportDialogValues {
  /** The PDF shown when OK was pressed (it changes with "Browse..."). */
  source: AcUiPdfImportSource
}

type PreviewView = 'single' | 'grid'

/**
 * "Import PDF" dialog of the `pdfimport` command, laid out after AutoCAD's
 * IMPORTPDF dialog: file name with Browse, the page to import with a preview
 * or thumbnail grid, the insertion point and scale, and the import mode.
 *
 * The dialog only collects options; the caller imports.
 */
export class AcUiPdfImportDialog extends AcUiDialog {
  private source: AcUiPdfImportSource
  private readonly browse?: AcUiPdfImportDialogOptions['browse']
  private values: AcUiPdfImportDialogValues
  private view: PreviewView = 'single'
  private result?: AcUiPdfImportDialogResult
  /** Bumped on every preview change; stale renders stop drawing. */
  private generation = 0
  private readonly tasks = new Set<AcUiPdfImportRenderTask>()
  private observer?: IntersectionObserver

  private readonly fileInput: HTMLInputElement
  private readonly pageInput: HTMLInputElement
  private readonly totalEl: HTMLSpanElement
  private readonly singleButton: HTMLButtonElement
  private readonly gridButton: HTMLButtonElement
  private readonly previewEl: HTMLDivElement
  private readonly pageSizeEl: HTMLSpanElement
  private readonly onScreenInput: HTMLInputElement
  private readonly xInput: HTMLInputElement
  private readonly yInput: HTMLInputElement
  private readonly scaleInput: HTMLInputElement
  private readonly modeInputs: Record<AcApPdfImportMode, HTMLInputElement>
  private readonly okButton: HTMLButtonElement

  private constructor(options: AcUiPdfImportDialogOptions) {
    super({
      host: options.host,
      title: t('title'),
      closeLabel: t('close'),
      dialogClassName: 'ml-pdf-import-dialog',
      closeOnBackdrop: false
    })
    ensureStyles()
    this.source = options.source
    this.browse = options.browse
    const initial = options.initial ?? {}
    this.values = {
      pageNumber: clampPage(initial.pageNumber ?? 1, this.source),
      mode: initial.mode === 'visual' ? 'visual' : 'recover',
      scale:
        initial.scale !== undefined && initial.scale > 0 ? initial.scale : 1,
      specifyOnScreen: initial.specifyOnScreen ?? false,
      insertionPoint: initial.insertionPoint ?? { x: 0, y: 0 }
    }

    // File name + Browse.
    const fileRow = h('div', 'ml-pdf-import-file')
    this.fileInput = h('input', 'ml-pdf-import-input')
    this.fileInput.readOnly = true
    this.fileInput.setAttribute('aria-label', t('fileName'))
    const browseButton = button(t('browse'), 'secondary', () => {
      void this.browseFile()
    })
    browseButton.classList.add('ml-pdf-import-browse')
    browseButton.hidden = !this.browse
    fileRow.append(
      h('span', 'ml-pdf-import-label', t('fileName')),
      this.fileInput,
      browseButton
    )

    // Pages to import.
    const pages = group(t('pagesGroup'), 'ml-pdf-import-pages')
    const pageBar = h('div', 'ml-pdf-import-pagebar')
    this.pageInput = numberField(1)
    this.pageInput.min = '1'
    this.pageInput.classList.add('ml-pdf-import-page')
    this.pageInput.addEventListener('change', () => this.commitPageInput())
    this.totalEl = h('span', 'ml-pdf-import-total')
    this.singleButton = viewButton(t('singleView'), SINGLE_ICON, () =>
      this.setView('single')
    )
    this.gridButton = viewButton(t('gridView'), GRID_ICON, () =>
      this.setView('grid')
    )
    const viewToggle = h('div', 'ml-pdf-import-views')
    viewToggle.append(this.singleButton, this.gridButton)
    pageBar.append(
      labelled(t('page'), this.pageInput),
      this.totalEl,
      viewToggle
    )
    this.previewEl = h('div', 'ml-pdf-import-preview')
    this.pageSizeEl = h('span', 'ml-pdf-import-pagesize')
    pages.append(pageBar, this.previewEl, this.pageSizeEl)

    // Position.
    const position = group(t('positionGroup'))
    this.onScreenInput = h('input')
    this.onScreenInput.type = 'checkbox'
    this.onScreenInput.checked = this.values.specifyOnScreen
    this.onScreenInput.addEventListener('change', () => this.updateState())
    const onScreen = h('label', 'ml-pdf-import-check')
    onScreen.append(this.onScreenInput, h('span', undefined, t('onScreen')))
    this.xInput = numberField(this.values.insertionPoint.x)
    this.yInput = numberField(this.values.insertionPoint.y)
    this.scaleInput = numberField(this.values.scale)
    this.scaleInput.min = '0'
    for (const input of [this.xInput, this.yInput, this.scaleInput]) {
      input.addEventListener('input', () => this.updateState())
    }
    const point = h('div', 'ml-pdf-import-point')
    point.append(labelled(t('x'), this.xInput), labelled(t('y'), this.yInput))
    position.append(onScreen, point, labelled(t('scale'), this.scaleInput))

    // Import mode.
    const mode = group(t('modeGroup'))
    const radioName = `ml-pdf-import-mode-${nextId++}`
    this.modeInputs = {
      recover: radio(radioName, this.values.mode === 'recover'),
      visual: radio(radioName, this.values.mode === 'visual')
    }
    mode.append(
      radioOption(this.modeInputs.recover, t('modeRecover'), t('recoverHint')),
      radioOption(this.modeInputs.visual, t('modeVisual'), t('visualHint'))
    )

    const side = h('div', 'ml-pdf-import-side')
    side.append(position, mode)
    const columns = h('div', 'ml-pdf-import-columns')
    columns.append(pages, side)
    this.bodyEl.append(fileRow, columns)

    // Enter in a field confirms, as in a desktop dialog.
    this.bodyEl.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT') return
      event.preventDefault()
      if (target === this.pageInput) this.commitPageInput()
      this.confirm()
    })

    const cancelButton = button(t('cancel'), 'secondary', () => this.close())
    this.okButton = button(t('ok'), 'primary', () => this.confirm())
    this.footerEl.append(this.okButton, cancelButton)

    this.loadSource()
    this.updateState()
    this.focusAfterOpen(this.okButton)
  }

  /**
   * Shows the dialog.
   *
   * @returns The chosen options, or `undefined` when the user cancels.
   */
  static open(
    options: AcUiPdfImportDialogOptions
  ): Promise<AcUiPdfImportDialogResult | undefined> {
    const dialog = new AcUiPdfImportDialog(options)
    return dialog.show().then(() => dialog.result)
  }

  /** @inheritdoc */
  override close(): void {
    this.stopRendering()
    this.observer?.disconnect()
    super.close()
  }

  /** Shows {@link source}: file name, page count, preview. */
  private loadSource() {
    this.fileInput.value = this.source.fileName
    this.fileInput.title = this.source.fileName
    const count = this.source.document.numPages
    this.pageInput.max = String(count)
    this.pageInput.disabled = count <= 1
    this.totalEl.textContent = t('total', { count })
    this.values.pageNumber = clampPage(this.values.pageNumber, this.source)
    this.pageInput.value = String(this.values.pageNumber)
    this.renderPreview()
  }

  private async browseFile() {
    if (!this.browse) return
    const picked = await this.browse()
    if (!picked) return
    this.source = picked
    this.values.pageNumber = 1
    this.loadSource()
  }

  private commitPageInput() {
    const page = clampPage(Number(this.pageInput.value), this.source)
    this.pageInput.value = String(page)
    this.selectPage(page)
  }

  private selectPage(page: number) {
    if (page === this.values.pageNumber) return
    this.values.pageNumber = page
    this.pageInput.value = String(page)
    if (this.view === 'grid') {
      const thumbs = this.previewEl.querySelectorAll<HTMLElement>(
        '.ml-pdf-import-thumb'
      )
      for (const thumb of Array.from(thumbs)) {
        const selected = Number(thumb.dataset.page) === page
        thumb.classList.toggle('is-selected', selected)
        thumb.setAttribute('aria-selected', String(selected))
      }
      void this.showPageSize()
    } else {
      this.renderPreview()
    }
  }

  private setView(view: PreviewView) {
    if (this.view === view) return
    this.view = view
    this.renderPreview()
  }

  /** Redraws the preview area for the current page / view. */
  private renderPreview() {
    this.stopRendering()
    this.observer?.disconnect()
    this.observer = undefined
    const generation = ++this.generation
    this.singleButton.setAttribute(
      'aria-pressed',
      String(this.view === 'single')
    )
    this.gridButton.setAttribute('aria-pressed', String(this.view === 'grid'))
    this.previewEl.replaceChildren()
    this.previewEl.classList.toggle('is-grid', this.view === 'grid')
    void this.showPageSize()
    if (this.view === 'single') {
      void this.renderSingle(generation)
    } else {
      this.renderGrid(generation)
    }
  }

  private async renderSingle(generation: number) {
    const page = this.values.pageNumber
    const frame = h('div', 'ml-pdf-import-page-frame')
    const canvas = h('canvas', 'ml-pdf-import-canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', t('pageLabel', { page }))
    const caption = h(
      'div',
      'ml-pdf-import-caption',
      `[${page}] ${this.source.fileName}`
    )
    frame.append(canvas)
    this.previewEl.append(frame, caption)
    // Fit inside the preview box, leaving room for the caption.
    const maxWidth = Math.max(80, (this.previewEl.clientWidth || 300) - 24)
    const maxHeight = Math.max(80, (this.previewEl.clientHeight || 260) - 44)
    await this.drawPage(generation, page, canvas, maxWidth, maxHeight)
  }

  private renderGrid(generation: number) {
    const count = this.source.document.numPages
    const pending = new Map<Element, () => void>()
    const thumbs: HTMLElement[] = []
    for (let page = 1; page <= count; page++) {
      const thumb = h('button', 'ml-pdf-import-thumb')
      thumb.type = 'button'
      thumb.dataset.page = String(page)
      const selected = page === this.values.pageNumber
      thumb.classList.toggle('is-selected', selected)
      thumb.setAttribute('aria-selected', String(selected))
      thumb.title = t('pageLabel', { page })
      const canvas = h('canvas', 'ml-pdf-import-canvas')
      thumb.append(canvas, h('span', 'ml-pdf-import-thumb-label', String(page)))
      thumb.addEventListener('click', () => this.selectPage(page))
      thumb.addEventListener('dblclick', () => this.setView('single'))
      this.previewEl.append(thumb)
      thumbs.push(thumb)
      pending.set(thumb, () => {
        void this.drawPage(generation, page, canvas, THUMB_SIZE, THUMB_SIZE)
      })
    }
    if (typeof IntersectionObserver === 'undefined') {
      // No observer (tests, old browsers): draw them one after another.
      void (async () => {
        for (const thumb of thumbs) {
          if (generation !== this.generation) return
          pending.get(thumb)?.()
          await Promise.resolve()
        }
      })()
      return
    }
    // Draw thumbnails only when they scroll into view: large PDFs have
    // hundreds of pages.
    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          pending.get(entry.target)?.()
          pending.delete(entry.target)
          this.observer?.unobserve(entry.target)
        }
      },
      { root: this.previewEl }
    )
    for (const thumb of thumbs) this.observer.observe(thumb)
    thumbs[this.values.pageNumber - 1]?.scrollIntoView?.({ block: 'nearest' })
  }

  /** Draws `page` into `canvas`, fitting `maxWidth` × `maxHeight` CSS px. */
  private async drawPage(
    generation: number,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    maxWidth: number,
    maxHeight: number
  ) {
    try {
      const page = await this.source.document.getPage(pageNumber)
      if (generation !== this.generation) return
      const size = page.getSize(1)
      const fit = Math.min(maxWidth / size.width, maxHeight / size.height)
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1)
      const scaled = page.getSize(fit * ratio)
      canvas.width = Math.max(1, Math.floor(scaled.width))
      canvas.height = Math.max(1, Math.floor(scaled.height))
      canvas.style.width = `${Math.floor(size.width * fit)}px`
      canvas.style.height = `${Math.floor(size.height * fit)}px`
      const task = page.render(canvas, fit * ratio)
      this.tasks.add(task)
      try {
        await task.promise
      } finally {
        this.tasks.delete(task)
      }
    } catch (error) {
      if (generation !== this.generation || isCancelled(error)) return
      canvas.replaceWith(h('div', 'ml-pdf-import-error', t('previewError')))
    }
  }

  private async showPageSize() {
    const generation = this.generation
    const pageNumber = this.values.pageNumber
    try {
      const page = await this.source.document.getPage(pageNumber)
      if (
        generation !== this.generation ||
        pageNumber !== this.values.pageNumber
      ) {
        return
      }
      const size = page.getSize(1)
      const mm = (pt: number) => round(pt * PDF_PT_TO_MM, 1)
      const inch = (pt: number) => round((pt * PDF_PT_TO_MM) / MM_PER_INCH, 2)
      this.pageSizeEl.textContent = t('pageSize', {
        width: mm(size.width),
        height: mm(size.height),
        widthIn: inch(size.width),
        heightIn: inch(size.height)
      })
    } catch {
      this.pageSizeEl.textContent = ''
    }
  }

  private stopRendering() {
    for (const task of this.tasks) task.cancel()
    this.tasks.clear()
  }

  /** Enables X/Y with the on-screen box and OK with valid numbers. */
  private updateState() {
    const onScreen = this.onScreenInput.checked
    this.xInput.disabled = onScreen
    this.yInput.disabled = onScreen
    const scaleValid = parseNumber(this.scaleInput.value, true) !== undefined
    const xValid = onScreen || parseNumber(this.xInput.value) !== undefined
    const yValid = onScreen || parseNumber(this.yInput.value) !== undefined
    this.scaleInput.classList.toggle('is-invalid', !scaleValid)
    this.xInput.classList.toggle('is-invalid', !xValid)
    this.yInput.classList.toggle('is-invalid', !yValid)
    this.scaleInput.setAttribute('aria-invalid', String(!scaleValid))
    this.okButton.disabled = !(scaleValid && xValid && yValid)
  }

  private confirm() {
    this.updateState()
    if (this.okButton.disabled) return
    const onScreen = this.onScreenInput.checked
    this.result = {
      source: this.source,
      pageNumber: this.values.pageNumber,
      mode: this.modeInputs.visual.checked ? 'visual' : 'recover',
      scale: parseNumber(this.scaleInput.value, true) ?? 1,
      specifyOnScreen: onScreen,
      insertionPoint: onScreen
        ? this.values.insertionPoint
        : {
            x: parseNumber(this.xInput.value) ?? 0,
            y: parseNumber(this.yInput.value) ?? 0
          }
    }
    this.close()
  }
}

let nextId = 0

const SINGLE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3.5" y="1.5" width="9" height="13" fill="none" stroke="currentColor"/></svg>'
const GRID_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><g fill="none" stroke="currentColor"><rect x="2.5" y="1.5" width="4.5" height="5.5"/><rect x="9" y="1.5" width="4.5" height="5.5"/><rect x="2.5" y="9" width="4.5" height="5.5"/><rect x="9" y="9" width="4.5" height="5.5"/></g></svg>'

/** Dialog string `jig.pdfimport.dialog.<key>`. */
function t(key: string, params?: Record<string, string | number>) {
  return acapPdfT(`jig.pdfimport.dialog.${key}`, params)
}

function clampPage(page: number, source: AcUiPdfImportSource) {
  const count = Math.max(1, source.document.numPages)
  if (!Number.isFinite(page)) return 1
  return Math.min(count, Math.max(1, Math.round(page)))
}

/** Parses a number field; `positive` also rejects zero and negatives. */
function parseNumber(text: string, positive = false): number | undefined {
  if (text.trim() === '') return undefined
  const value = Number(text)
  if (!Number.isFinite(value)) return undefined
  if (positive && value <= 0) return undefined
  return value
}

function round(value: number, digits: number) {
  return String(Number(value.toFixed(digits)))
}

function isCancelled(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'RenderingCancelledException'
  )
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

function group(title: string, className?: string) {
  const el = h('fieldset', 'ml-pdf-import-group')
  if (className) el.classList.add(className)
  el.append(h('legend', undefined, title))
  return el
}

function labelled(label: string, control: HTMLElement) {
  const el = h('label', 'ml-pdf-import-field')
  el.append(h('span', 'ml-pdf-import-label', label), control)
  return el
}

function numberField(value: number) {
  const el = h('input', 'ml-pdf-import-input ml-pdf-import-number')
  el.type = 'number'
  el.step = 'any'
  el.value = String(value)
  return el
}

function radio(name: string, checked: boolean) {
  const el = h('input')
  el.type = 'radio'
  el.name = name
  el.checked = checked
  return el
}

function radioOption(input: HTMLInputElement, label: string, hint: string) {
  const el = h('label', 'ml-pdf-import-radio')
  const text = h('span', 'ml-pdf-import-radio-text')
  text.append(
    h('span', undefined, label),
    h('span', 'ml-pdf-import-hint', hint)
  )
  el.append(input, text)
  return el
}

function button(
  label: string,
  kind: 'primary' | 'secondary',
  onClick: () => void
) {
  const el = h(
    'button',
    kind === 'primary'
      ? 'ml-ui-dialog-btn ml-pdf-import-ok'
      : 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary',
    label
  )
  el.type = 'button'
  el.addEventListener('click', onClick)
  return el
}

function viewButton(label: string, icon: string, onClick: () => void) {
  const el = h('button', 'ml-pdf-import-view')
  el.type = 'button'
  el.title = label
  el.setAttribute('aria-label', label)
  el.innerHTML = icon
  el.addEventListener('click', onClick)
  return el
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.ml-ui-dialog.ml-pdf-import-dialog {
  width: 720px;
  max-width: calc(100% - 24px);
  font-size: 12px;
}
.ml-pdf-import-dialog .ml-pdf-import-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.ml-pdf-import-dialog .ml-pdf-import-file .ml-pdf-import-input {
  flex: 1;
  min-width: 0;
}
.ml-pdf-import-dialog .ml-pdf-import-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 10px;
}
.ml-pdf-import-dialog .ml-pdf-import-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.ml-pdf-import-dialog .ml-pdf-import-group {
  margin: 0;
  padding: 8px 10px 10px;
  min-width: 0;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ml-pdf-import-dialog .ml-pdf-import-group > legend {
  padding: 0 4px;
  font-weight: 600;
}
.ml-pdf-import-dialog .ml-pdf-import-pagebar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ml-pdf-import-dialog .ml-pdf-import-views {
  margin-left: auto;
  display: flex;
}
.ml-pdf-import-dialog .ml-pdf-import-view {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  background: var(--ml-ui-bg, #fff);
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
}
.ml-pdf-import-dialog .ml-pdf-import-view + .ml-pdf-import-view {
  border-left: none;
}
.ml-pdf-import-dialog .ml-pdf-import-view[aria-pressed='true'] {
  color: var(--ml-ui-accent, #0b84ff);
  background: color-mix(in srgb, var(--ml-ui-accent, #0b84ff) 14%, transparent);
}
.ml-pdf-import-dialog .ml-pdf-import-preview {
  height: 260px;
  box-sizing: border-box;
  padding: 10px;
  background: #808080;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
}
.ml-pdf-import-dialog .ml-pdf-import-preview.is-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${THUMB_SIZE + 12}px, 1fr));
  align-content: start;
  justify-items: center;
  overflow-y: auto;
}
.ml-pdf-import-dialog .ml-pdf-import-page-frame {
  display: flex;
  min-height: 0;
}
.ml-pdf-import-dialog .ml-pdf-import-canvas {
  display: block;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.ml-pdf-import-dialog .ml-pdf-import-caption {
  max-width: 100%;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-pdf-import-dialog .ml-pdf-import-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.ml-pdf-import-dialog .ml-pdf-import-thumb .ml-pdf-import-canvas {
  min-width: 40px;
  min-height: 40px;
}
.ml-pdf-import-dialog .ml-pdf-import-thumb.is-selected {
  border-color: var(--ml-ui-accent, #0b84ff);
}
.ml-pdf-import-dialog .ml-pdf-import-error {
  color: #fff;
  padding: 12px;
  text-align: center;
}
.ml-pdf-import-dialog .ml-pdf-import-pagesize {
  color: var(--ml-ui-text-muted, #606266);
}
.ml-pdf-import-dialog .ml-pdf-import-field {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-pdf-import-dialog .ml-pdf-import-label {
  white-space: nowrap;
}
.ml-pdf-import-dialog .ml-pdf-import-input {
  box-sizing: border-box;
  height: 24px;
  padding: 2px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 3px;
  background: var(--ml-ui-bg, #fff);
  color: var(--ml-ui-text, #303133);
  font: inherit;
}
.ml-pdf-import-dialog .ml-pdf-import-input:disabled {
  opacity: 0.55;
}
.ml-pdf-import-dialog .ml-pdf-import-input.is-invalid {
  border-color: var(--ml-ui-danger, #f56c6c);
}
.ml-pdf-import-dialog .ml-pdf-import-number {
  width: 90px;
}
.ml-pdf-import-dialog .ml-pdf-import-page {
  width: 64px;
}
.ml-pdf-import-dialog .ml-pdf-import-point {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding-left: 20px;
}
.ml-pdf-import-dialog .ml-pdf-import-check,
.ml-pdf-import-dialog .ml-pdf-import-radio {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
}
.ml-pdf-import-dialog .ml-pdf-import-check input,
.ml-pdf-import-dialog .ml-pdf-import-radio input {
  margin: 1px 0 0;
}
.ml-pdf-import-dialog .ml-pdf-import-radio-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ml-pdf-import-dialog .ml-pdf-import-hint {
  color: var(--ml-ui-text-muted, #606266);
  font-size: 11px;
}
.ml-pdf-import-dialog .ml-ui-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: none;
}
@media (max-width: 640px) {
  .ml-pdf-import-dialog .ml-pdf-import-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .ml-pdf-import-dialog .ml-pdf-import-preview {
    height: 200px;
  }
}
`.trim()
  document.head.appendChild(style)
}
