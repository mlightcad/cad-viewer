import {
  AcApDocManager,
  type AcApMarkupRecord,
  type AcApMarkupStatus,
  type AcApMarkupType,
  getMarkupPresenter,
  getMarkupStore,
  MARKUP_STATUSES,
  runMarkupEdit
} from '@mlightcad/cad-simple-viewer'

import { createIconElement, ICON_DOCK_CLOSE } from '../assets/icons'
import type { AcExI18n } from '../i18n'
import { ensureUiStyles } from './styles'

/** Constructor options for {@link AcExReviewPaletteView}. */
export interface AcExReviewPaletteViewOptions {
  /** Document manager used to resolve the active view for markup actions. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcExI18n
}

/**
 * Design Review markup list and details view for the dock panel.
 *
 * Mirrors cad-viewer's Vue review palette using plain DOM: search, table,
 * status/label/comment editing, zoom-to, delete, and clear-all.
 */
export class AcExReviewPaletteView {
  /** Root element mounted in the dock panel review tab. */
  readonly element: HTMLDivElement
  /** Search box filtering the markup table. */
  private searchInput!: HTMLInputElement
  /** Clears every markup when the store is non-empty. */
  private clearButton!: HTMLButtonElement
  /** Type column header. */
  private typeHeaderEl!: HTMLTableCellElement
  /** Status column header. */
  private statusHeaderEl!: HTMLTableCellElement
  /** Author column header. */
  private authorHeaderEl!: HTMLTableCellElement
  /** Summary column header. */
  private summaryHeaderEl!: HTMLTableCellElement
  /** Markup table body. */
  private tbody!: HTMLTableSectionElement
  /** Details pane shown when a row is selected. */
  private detailEl!: HTMLDivElement
  /** Details pane title. */
  private detailTitleEl!: HTMLDivElement
  /** Closes the details pane without clearing selection. */
  private closeDetailsButton!: HTMLButtonElement
  /** Status field label. */
  private statusFieldLabelEl!: HTMLLabelElement
  /** Status dropdown for the selected markup. */
  private statusSelect!: HTMLSelectElement
  /** Author field label. */
  private authorFieldLabelEl!: HTMLLabelElement
  /** Read-only author field. */
  private authorInput!: HTMLInputElement
  /** Label field caption. */
  private textFieldLabelEl!: HTMLLabelElement
  /** Editable markup label. */
  private textInput!: HTMLInputElement
  /** Comment field caption. */
  private commentFieldLabelEl!: HTMLLabelElement
  /** Editable markup comment. */
  private commentInput!: HTMLTextAreaElement
  /** Zooms the view to the selected markup. */
  private zoomButton!: HTMLButtonElement
  /** Deletes the selected markup. */
  private deleteButton!: HTMLButtonElement
  /** Document manager whose current view receives markup actions. */
  private readonly editor: AcApDocManager
  /** i18n helper for labels. */
  private readonly i18n: AcExI18n
  /** Latest markup records from {@link getMarkupStore}. */
  private markups: AcApMarkupRecord[] = []
  /** Currently selected markup id from the store. */
  private selectedId: string | undefined
  /** Previous selected id used to commit drafts when switching rows. */
  private lastSelectedId: string | undefined
  /** Whether the details pane is visible. */
  private detailsOpen = true
  /** Unsubscribes from markup store changes. */
  private unsubscribeStore?: () => void

  /**
   * @param options - Editor and i18n used to render and mutate markups.
   */
  constructor(options: AcExReviewPaletteViewOptions) {
    this.editor = options.editor
    this.i18n = options.i18n
    ensureUiStyles()

    this.element = document.createElement('div')
    this.element.className = 'ml-ex-ui-review-palette'
    this.buildDom()
    this.refreshLocale()
    this.unsubscribeStore = getMarkupStore().subscribe(() => {
      this.syncFromStore()
    })
    this.syncFromStore()
  }

  /** Updates labels after a locale change. */
  refreshLocale() {
    this.searchInput.placeholder = this.i18n.t(
      'reviewPalette.searchPlaceholder'
    )
    this.clearButton.textContent = this.i18n.t('reviewPalette.clear')
    this.typeHeaderEl.textContent = this.i18n.t('reviewPalette.type')
    this.statusHeaderEl.textContent = this.i18n.t('reviewPalette.status')
    this.authorHeaderEl.textContent = this.i18n.t('reviewPalette.author')
    this.summaryHeaderEl.textContent = this.i18n.t('reviewPalette.summary')
    this.detailTitleEl.textContent = this.i18n.t('reviewPalette.details')
    const closeDetails = this.i18n.t('reviewPalette.closeDetails')
    this.closeDetailsButton.title = closeDetails
    this.closeDetailsButton.setAttribute('aria-label', closeDetails)
    this.statusFieldLabelEl.textContent = this.i18n.t('reviewPalette.status')
    this.authorFieldLabelEl.textContent = this.i18n.t('reviewPalette.author')
    this.textFieldLabelEl.textContent = this.i18n.t('reviewPalette.label')
    this.commentFieldLabelEl.textContent = this.i18n.t('reviewPalette.comment')
    this.zoomButton.textContent = this.i18n.t('reviewPalette.zoomTo')
    this.deleteButton.textContent = this.i18n.t('reviewPalette.delete')
    this.rebuildStatusOptions()
    this.renderTable()
    this.updateDetailFields({ preserveDrafts: true })
  }

  /** Removes the markup-store subscription. Does not remove DOM. */
  destroy() {
    this.unsubscribeStore?.()
    this.unsubscribeStore = undefined
  }

  /** Builds static toolbar, table, and details DOM. */
  private buildDom() {
    const toolbar = document.createElement('div')
    toolbar.className = 'ml-ex-ui-review-toolbar'

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'search'
    this.searchInput.className = 'ml-ex-ui-review-search'
    this.searchInput.addEventListener('input', () => this.renderTable())
    toolbar.appendChild(this.searchInput)

    this.clearButton = document.createElement('button')
    this.clearButton.type = 'button'
    this.clearButton.className = 'ml-ex-ui-review-btn'
    this.clearButton.addEventListener('click', () => this.clearAll())
    toolbar.appendChild(this.clearButton)
    this.element.appendChild(toolbar)

    const tableWrap = document.createElement('div')
    tableWrap.className = 'ml-ex-ui-review-table-wrap'

    const table = document.createElement('table')
    table.className = 'ml-ex-ui-review-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    this.typeHeaderEl = document.createElement('th')
    this.statusHeaderEl = document.createElement('th')
    this.authorHeaderEl = document.createElement('th')
    this.summaryHeaderEl = document.createElement('th')
    headRow.append(
      this.typeHeaderEl,
      this.statusHeaderEl,
      this.authorHeaderEl,
      this.summaryHeaderEl
    )
    thead.appendChild(headRow)
    table.appendChild(thead)

    this.tbody = document.createElement('tbody')
    table.appendChild(this.tbody)
    tableWrap.appendChild(table)
    this.element.appendChild(tableWrap)

    this.detailEl = document.createElement('div')
    this.detailEl.className = 'ml-ex-ui-review-detail'
    this.detailEl.hidden = true

    const detailHeader = document.createElement('div')
    detailHeader.className = 'ml-ex-ui-review-detail-header'
    this.detailTitleEl = document.createElement('div')
    this.detailTitleEl.className = 'ml-ex-ui-review-detail-title'
    this.closeDetailsButton = document.createElement('button')
    this.closeDetailsButton.type = 'button'
    this.closeDetailsButton.className = 'ml-ex-ui-review-detail-close'
    this.closeDetailsButton.appendChild(createIconElement(ICON_DOCK_CLOSE))
    this.closeDetailsButton.addEventListener('click', () => this.closeDetails())
    detailHeader.append(this.detailTitleEl, this.closeDetailsButton)
    this.detailEl.appendChild(detailHeader)

    const form = document.createElement('div')
    form.className = 'ml-ex-ui-review-detail-form'

    const statusField = this.createField()
    this.statusFieldLabelEl = statusField.label
    this.statusSelect = document.createElement('select')
    this.statusSelect.className = 'ml-ex-ui-review-select'
    this.statusSelect.addEventListener('change', () => {
      const selected = this.selectedMarkup()
      if (!selected) return
      this.updateMeta(selected.id, {
        status: this.statusSelect.value as AcApMarkupStatus
      })
    })
    statusField.body.appendChild(this.statusSelect)
    form.appendChild(statusField.root)

    const authorField = this.createField()
    this.authorFieldLabelEl = authorField.label
    this.authorInput = document.createElement('input')
    this.authorInput.type = 'text'
    this.authorInput.className = 'ml-ex-ui-review-input'
    this.authorInput.disabled = true
    authorField.body.appendChild(this.authorInput)
    form.appendChild(authorField.root)

    const textField = this.createField()
    this.textFieldLabelEl = textField.label
    this.textInput = document.createElement('input')
    this.textInput.type = 'text'
    this.textInput.className = 'ml-ex-ui-review-input'
    this.textInput.addEventListener('blur', () => this.commitText())
    this.textInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) {
        return
      }
      event.preventDefault()
      this.commitText()
      this.textInput.blur()
    })
    textField.body.appendChild(this.textInput)
    form.appendChild(textField.root)

    const commentField = this.createField()
    this.commentFieldLabelEl = commentField.label
    this.commentInput = document.createElement('textarea')
    this.commentInput.className = 'ml-ex-ui-review-textarea'
    this.commentInput.rows = 2
    this.commentInput.addEventListener('blur', () => this.commitComment())
    commentField.body.appendChild(this.commentInput)
    form.appendChild(commentField.root)

    const actions = document.createElement('div')
    actions.className = 'ml-ex-ui-review-detail-actions'
    this.zoomButton = document.createElement('button')
    this.zoomButton.type = 'button'
    this.zoomButton.className = 'ml-ex-ui-review-btn'
    this.zoomButton.addEventListener('click', () => {
      const selected = this.selectedMarkup()
      if (selected) this.focusMarkup(selected)
    })
    this.deleteButton = document.createElement('button')
    this.deleteButton.type = 'button'
    this.deleteButton.className = 'ml-ex-ui-review-btn ml-ex-ui-review-btn-danger'
    this.deleteButton.addEventListener('click', () => {
      const selected = this.selectedMarkup()
      if (selected) this.removeMarkup(selected.id)
    })
    actions.append(this.zoomButton, this.deleteButton)
    form.appendChild(actions)
    this.detailEl.appendChild(form)
    this.element.appendChild(this.detailEl)
  }

  /** Creates a labeled form field wrapper. */
  private createField() {
    const root = document.createElement('div')
    root.className = 'ml-ex-ui-review-field'
    const label = document.createElement('label')
    label.className = 'ml-ex-ui-review-field-label'
    const body = document.createElement('div')
    body.className = 'ml-ex-ui-review-field-body'
    root.append(label, body)
    return { root, label, body }
  }

  /** Rebuilds status `<option>` nodes for the current locale. */
  private rebuildStatusOptions() {
    const current = this.statusSelect.value
    this.statusSelect.replaceChildren()
    for (const status of MARKUP_STATUSES) {
      const option = document.createElement('option')
      option.value = status
      option.textContent = this.statusLabel(status)
      this.statusSelect.appendChild(option)
    }
    if (current) this.statusSelect.value = current
  }

  /** Pulls markup list/selection from the store and refreshes the view. */
  private syncFromStore() {
    const store = getMarkupStore()
    const prevId = this.lastSelectedId
    this.markups = store.list()
    this.selectedId = store.selectedId

    if (prevId && prevId !== this.selectedId) {
      this.commitDraftsFor(prevId)
    }
    if (this.selectedId && this.selectedId !== prevId) {
      this.loadDrafts()
      this.detailsOpen = true
    }
    if (!this.selectedId) {
      this.detailsOpen = false
    }

    this.lastSelectedId = this.selectedId
    this.clearButton.disabled = this.markups.length === 0
    this.renderTable()
    this.updateDetailFields({
      preserveDrafts: this.selectedId === prevId
    })
  }

  /** Rebuilds table rows from the filtered markup list. */
  private renderTable() {
    const rows = this.filteredMarkups()
    this.tbody.replaceChildren()

    if (rows.length === 0) {
      const emptyRow = document.createElement('tr')
      emptyRow.className = 'ml-ex-ui-review-empty-row'
      const cell = document.createElement('td')
      cell.colSpan = 4
      cell.textContent = this.i18n.t('reviewPalette.empty')
      emptyRow.appendChild(cell)
      this.tbody.appendChild(emptyRow)
      return
    }

    for (const record of rows) {
      const tr = document.createElement('tr')
      tr.className = 'ml-ex-ui-review-row'
      tr.dataset.markupId = record.id
      if (record.id === this.selectedId) {
        tr.classList.add('is-selected')
      }
      tr.addEventListener('click', () => this.handleRowClick(record.id))

      const typeCell = document.createElement('td')
      typeCell.textContent = this.typeLabel(record.type)
      const statusCell = document.createElement('td')
      statusCell.textContent = this.statusLabel(record.status)
      const authorCell = document.createElement('td')
      authorCell.textContent = record.author
      authorCell.title = record.author
      const summaryCell = document.createElement('td')
      const summary = record.text || record.comment || '—'
      summaryCell.textContent = summary
      summaryCell.title = summary

      tr.append(typeCell, statusCell, authorCell, summaryCell)
      this.tbody.appendChild(tr)
    }
  }

  /** Shows or refreshes the details pane for the current selection. */
  private updateDetailFields(options: { preserveDrafts: boolean }) {
    const selected = this.selectedMarkup()
    const show = Boolean(selected && this.detailsOpen)
    this.detailEl.hidden = !show
    if (!selected || !show) return

    this.statusSelect.value = selected.status
    this.authorInput.value = selected.author
    if (options.preserveDrafts) {
      const active = document.activeElement
      if (active !== this.textInput) {
        this.textInput.value = selected.text ?? ''
      }
      if (active !== this.commentInput) {
        this.commentInput.value = selected.comment ?? ''
      }
      return
    }
    this.loadDrafts()
  }

  /** Copies the selected record's text/comment into the detail inputs. */
  private loadDrafts() {
    const selected = this.selectedMarkup()
    this.textInput.value = selected?.text ?? ''
    this.commentInput.value = selected?.comment ?? ''
    this.authorInput.value = selected?.author ?? ''
    if (selected) this.statusSelect.value = selected.status
  }

  /** Markups matching the current search query. */
  private filteredMarkups() {
    const query = this.searchInput.value.trim().toLowerCase()
    if (!query) return this.markups
    return this.markups.filter(markup => {
      const hay = `${markup.type} ${markup.status} ${markup.author} ${markup.text ?? ''} ${markup.comment}`
      return hay.toLowerCase().includes(query)
    })
  }

  /** Currently selected markup record, if it still exists. */
  private selectedMarkup() {
    return this.markups.find(markup => markup.id === this.selectedId)
  }

  /** Selects a markup and opens its details pane. */
  private handleRowClick(id: string) {
    this.detailsOpen = true
    const view = this.editor.curView
    if (view) {
      getMarkupPresenter().select(view, id)
    }
    // Re-open details even when the row is already selected: store.select is a
    // no-op for the same id, so syncFromStore will not run.
    this.updateDetailFields({ preserveDrafts: true })
  }

  /** Commits drafts and hides the details pane. */
  private closeDetails() {
    this.commitText()
    this.commitComment()
    this.detailsOpen = false
    this.detailEl.hidden = true
  }

  /** Writes the label draft when it differs from the store. */
  private commitText() {
    const id = this.selectedId
    if (!id) return
    const current = this.markups.find(markup => markup.id === id)
    const next = this.textInput.value
    const prev = current?.text ?? ''
    if (next === prev) return
    this.updateMeta(id, { text: next })
  }

  /** Writes the comment draft when it differs from the store. */
  private commitComment() {
    const id = this.selectedId
    if (!id) return
    const current = this.markups.find(markup => markup.id === id)
    const next = this.commentInput.value
    const prev = current?.comment ?? ''
    if (next === prev) return
    this.updateMeta(id, { comment: next })
  }

  /** Commits in-progress drafts for a row that is no longer selected. */
  private commitDraftsFor(id: string) {
    const current = this.markups.find(markup => markup.id === id)
    if (!current) return
    const nextText = this.textInput.value
    const nextComment = this.commentInput.value
    const patch: Partial<Pick<AcApMarkupRecord, 'comment' | 'text'>> = {}
    if (nextText !== (current.text ?? '')) patch.text = nextText
    if (nextComment !== (current.comment ?? '')) patch.comment = nextComment
    if (Object.keys(patch).length === 0) return
    this.updateMeta(id, patch)
  }

  /** Patches markup metadata through undo-aware edit + presenter republish. */
  private updateMeta(
    id: string,
    patch: Partial<Pick<AcApMarkupRecord, 'comment' | 'status' | 'text'>>
  ) {
    const view = this.editor.curView
    if (!view) return
    runMarkupEdit(view, 'Edit Markup', () => {
      const updated = getMarkupStore().updateMeta(id, patch)
      if (!updated) return
      if (patch.text !== undefined || patch.comment !== undefined) {
        getMarkupPresenter().publish(view, updated)
      }
    })
  }

  /** Zooms the current view to a markup. */
  private focusMarkup(record: AcApMarkupRecord) {
    const view = this.editor.curView
    if (!view) return
    getMarkupPresenter().focus(view, record)
  }

  /** Removes one markup overlay and store record. */
  private removeMarkup(id: string) {
    const view = this.editor.curView
    if (!view) return
    getMarkupPresenter().unpublish(view, id)
  }

  /** Clears all markup visuals and store records. */
  private clearAll() {
    const view = this.editor.curView
    if (!view) return
    getMarkupPresenter().clearVisuals(view, { clearStore: true })
  }

  /** Localized status label. */
  private statusLabel(status: AcApMarkupStatus) {
    return this.i18n.t(`reviewPalette.statusValues.${status}`)
  }

  /** Localized markup type label, falling back to the raw type id. */
  private typeLabel(type: AcApMarkupType) {
    const key = `reviewPalette.typeValues.${type}`
    const label = this.i18n.t(key)
    return label === key ? type : label
  }
}
