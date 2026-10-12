import {
  type AcApDocManager,
  acapNavigateToFindHit
} from '@mlightcad/cad-simple-viewer'

import {
  acuiFindExcerpt,
  type AcUiFindLayoutHit,
  type AcUiFindScope,
  acuiFindText
} from '../find/findText'
import type { AcUiI18n } from '../i18n'
import { acuiEnsureUiStyles } from './styles'

/** Constructor options for {@link AcUiFindPaletteView}. */
export interface AcUiFindPaletteViewOptions {
  /** Document manager used to resolve the active view and database. */
  editor: AcApDocManager
  /** i18n helper for panel labels. */
  i18n: AcUiI18n
}

/**
 * Text search view for the dock panel (FIND).
 *
 * Searches TEXT, MTEXT and block attribute values of the **whole drawing**
 * (every layout) by default, or only the active layout when "Current layout
 * only" is checked. The search runs when the user submits a query (Enter or the
 * Find button) — never while typing and never in the background. Each result
 * names its layout; clicking a result (or Enter / Shift+Enter in the input to
 * step through them) activates that layout if needed, zooms to the text and
 * selects its entity.
 */
export class AcUiFindPaletteView {
  /** Root element mounted in the dock panel find tab. */
  readonly element: HTMLDivElement
  private inputEl!: HTMLInputElement
  private findButton!: HTMLButtonElement
  private matchCaseEl!: HTMLInputElement
  private matchCaseLabelEl!: HTMLLabelElement
  private layoutOnlyEl!: HTMLInputElement
  private layoutOnlyLabelEl!: HTMLLabelElement
  private statusEl!: HTMLDivElement
  private listEl!: HTMLUListElement
  private readonly editor: AcApDocManager
  private readonly i18n: AcUiI18n
  /** Hits of the last search. */
  private result: { hits: AcUiFindLayoutHit[]; truncated: boolean } = {
    hits: [],
    truncated: false
  }
  /** Query, options and active layout used for the last search. */
  private searched?: {
    query: string
    matchCase: boolean
    scope: AcUiFindScope
    layoutId: string
  }
  /** Index of the hit last navigated to. */
  private activeIndex = -1
  private searchState: 'idle' | 'done' | 'no-document' = 'idle'
  /** Set when the last navigation could not open the hit's layout. */
  private navigationNote = ''

  constructor(options: AcUiFindPaletteViewOptions) {
    this.editor = options.editor
    this.i18n = options.i18n
    acuiEnsureUiStyles()

    this.element = document.createElement('div')
    this.element.className = 'ml-ex-ui-find-palette'
    this.buildDom()
    this.refreshLocale()
  }

  /** Updates labels after a locale change. */
  refreshLocale() {
    this.inputEl.placeholder = this.i18n.t('findPalette.placeholder')
    this.inputEl.setAttribute('aria-label', this.i18n.t('findPalette.input'))
    this.findButton.textContent = this.i18n.t('findPalette.find')
    this.matchCaseLabelEl.lastChild!.textContent = this.i18n.t(
      'findPalette.matchCase'
    )
    this.layoutOnlyLabelEl.lastChild!.textContent = this.i18n.t(
      'findPalette.currentLayoutOnly'
    )
    this.renderResults()
  }

  /** Focuses the query field (called when the tab is opened). */
  focus() {
    this.inputEl.focus()
    this.inputEl.select()
  }

  /**
   * Runs a search programmatically (used by tests and integrations).
   *
   * @param scope - `drawing` (default: all layouts) or `layout` (active layout
   * only); defaults to the state of the "Current layout only" checkbox.
   */
  search(
    query: string,
    matchCase = this.matchCaseEl.checked,
    scope: AcUiFindScope = this.scope
  ) {
    this.inputEl.value = query
    this.matchCaseEl.checked = matchCase
    this.layoutOnlyEl.checked = scope === 'layout'
    this.runSearch()
  }

  /** Hits of the last search. */
  get hits(): readonly AcUiFindLayoutHit[] {
    return this.result.hits
  }

  /** Scope selected in the panel. */
  get scope(): AcUiFindScope {
    return this.layoutOnlyEl.checked ? 'layout' : 'drawing'
  }

  /** Nothing to unsubscribe; kept for symmetry with the other palettes. */
  destroy() {
    this.result = { hits: [], truncated: false }
  }

  private buildDom() {
    const form = document.createElement('div')
    form.className = 'ml-ex-ui-find-form'

    this.inputEl = document.createElement('input')
    this.inputEl.type = 'search'
    this.inputEl.className = 'ml-ex-ui-find-input'
    this.inputEl.autocomplete = 'off'
    this.inputEl.spellcheck = false
    this.inputEl.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      this.handleEnter(event.shiftKey)
    })
    // Keep typing from reaching canvas/viewer keyboard shortcuts.
    this.inputEl.addEventListener('keyup', event => event.stopPropagation())

    this.findButton = document.createElement('button')
    this.findButton.type = 'button'
    this.findButton.className = 'ml-ex-ui-measure-btn ml-ex-ui-find-btn'
    this.findButton.addEventListener('click', () => this.runSearch())

    form.append(this.inputEl, this.findButton)

    this.matchCaseLabelEl = document.createElement('label')
    this.matchCaseLabelEl.className = 'ml-ex-ui-find-option'
    this.matchCaseEl = document.createElement('input')
    this.matchCaseEl.type = 'checkbox'
    this.matchCaseEl.addEventListener('change', () => {
      if (this.searched) this.runSearch()
    })
    this.matchCaseLabelEl.append(this.matchCaseEl, document.createTextNode(''))

    this.layoutOnlyLabelEl = document.createElement('label')
    this.layoutOnlyLabelEl.className = 'ml-ex-ui-find-option'
    this.layoutOnlyEl = document.createElement('input')
    this.layoutOnlyEl.type = 'checkbox'
    this.layoutOnlyEl.dataset.findScope = 'layout'
    this.layoutOnlyEl.addEventListener('change', () => {
      if (this.searched) this.runSearch()
      else this.renderResults()
    })
    this.layoutOnlyLabelEl.append(
      this.layoutOnlyEl,
      document.createTextNode('')
    )

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'ml-ex-ui-find-status'
    this.statusEl.setAttribute('role', 'status')
    this.statusEl.setAttribute('aria-live', 'polite')

    this.listEl = document.createElement('ul')
    this.listEl.className = 'ml-ex-ui-find-list'
    this.listEl.addEventListener('click', event => {
      const target = event.target
      if (!(target instanceof Element)) return
      const row = target.closest('li[data-find-index]')
      if (!(row instanceof HTMLElement) || !this.listEl.contains(row)) return
      this.navigateTo(Number(row.dataset.findIndex))
    })

    this.element.append(
      form,
      this.matchCaseLabelEl,
      this.layoutOnlyLabelEl,
      this.statusEl,
      this.listEl
    )
  }

  private handleEnter(backwards: boolean) {
    const query = this.inputEl.value
    const same =
      this.searched &&
      this.searched.query === query &&
      this.searched.matchCase === this.matchCaseEl.checked &&
      this.searched.scope === this.scope
    if (!same || this.result.hits.length === 0) {
      this.runSearch()
      if (this.result.hits.length > 0) this.navigateTo(0)
      return
    }
    const count = this.result.hits.length
    const next =
      this.activeIndex < 0
        ? 0
        : (this.activeIndex + (backwards ? count - 1 : 1)) % count
    this.navigateTo(next)
  }

  /** Searches the whole drawing, or the active layout only (scope option). */
  private runSearch() {
    const view = this.editor.curView
    const db = this.editor.curDocument?.database
    const query = this.inputEl.value
    this.activeIndex = -1
    this.navigationNote = ''
    if (!view || !db || !query.trim()) {
      this.result = { hits: [], truncated: false }
      this.searched = undefined
      this.searchState = view && db ? 'idle' : 'no-document'
      this.renderResults()
      return
    }
    const layoutId = view.activeLayoutBtrId
    const matchCase = this.matchCaseEl.checked
    const scope = this.scope
    this.result = acuiFindText(db, query, {
      matchCase,
      scope,
      currentLayoutId: layoutId
    })
    this.searched = { query, matchCase, scope, layoutId }
    this.searchState = 'done'
    this.renderResults()
  }

  private renderResults() {
    this.listEl.replaceChildren()
    const hits = this.result.hits
    if (this.searchState === 'no-document') {
      this.statusEl.textContent = this.i18n.t('findPalette.noDocument')
      return
    }
    if (this.searchState === 'idle') {
      this.statusEl.textContent = this.i18n.t(
        this.scope === 'layout' ? 'findPalette.hintLayout' : 'findPalette.hint'
      )
      return
    }
    if (hits.length === 0) {
      this.statusEl.textContent = this.i18n.t('findPalette.noResults')
      return
    }
    const layoutCount = new Set(hits.map(hit => hit.layoutId)).size
    const key = this.result.truncated
      ? 'findPalette.countTruncated'
      : layoutCount > 1
        ? 'findPalette.countLayouts'
        : 'findPalette.count'
    this.statusEl.textContent =
      this.i18n.t(key, {
        count: String(hits.length),
        layouts: String(layoutCount)
      }) + (this.navigationNote ? ` — ${this.navigationNote}` : '')

    const query = this.searched?.query ?? ''
    const matchCase = this.searched?.matchCase ?? false
    hits.forEach((hit, index) => {
      const li = document.createElement('li')
      li.className = 'ml-ex-ui-find-row'
      li.dataset.findIndex = String(index)
      li.tabIndex = 0
      li.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          this.navigateTo(index)
        }
      })
      if (index === this.activeIndex) li.classList.add('is-selected')

      const layout = document.createElement('div')
      layout.className = 'ml-ex-ui-find-layout'
      layout.dataset.layoutId = hit.layoutId
      layout.textContent = hit.layoutName
      layout.title = hit.layoutName

      const text = document.createElement('div')
      text.className = 'ml-ex-ui-find-text'
      text.textContent = acuiFindExcerpt(hit.text, query, matchCase)
      text.title = hit.text

      const meta = document.createElement('div')
      meta.className = 'ml-ex-ui-find-meta'
      meta.textContent = this.describeHit(hit)

      li.append(layout, text, meta)
      this.listEl.appendChild(li)
    })
  }

  /** `Type · layer · (x, y)` label for a hit. */
  private describeHit(hit: AcUiFindLayoutHit): string {
    let kind = this.i18n.t(`findPalette.kind.${hit.kind}`)
    if (hit.kind === 'attribute') {
      const owner = [hit.blockName, hit.tag].filter(Boolean).join(' / ')
      if (owner) kind = `${kind} ${owner}`
    }
    const at = `(${round(hit.position.x)}, ${round(hit.position.y)})`
    return `${kind} · ${hit.layer} · ${at}`
  }

  /**
   * Activates the hit's layout when needed, zooms to the hit and selects its
   * entity (see {@link acapNavigateToFindHit}).
   */
  private navigateTo(index: number) {
    const view = this.editor.curView
    const db = this.editor.curDocument?.database
    const hit = this.result.hits[index]
    if (!view || !db || !hit || !this.searched) return

    // Current-layout scope only: the layout changed since the search, so the
    // results no longer apply. (Drawing-wide results stay valid.)
    if (
      this.searched.scope === 'layout' &&
      view.activeLayoutBtrId !== this.searched.layoutId
    ) {
      this.runSearch()
      return
    }

    this.activeIndex = index
    this.navigationNote = ''
    this.listEl
      .querySelectorAll<HTMLElement>('li[data-find-index]')
      .forEach(row => {
        const active = Number(row.dataset.findIndex) === index
        row.classList.toggle('is-selected', active)
        if (active) row.scrollIntoView?.({ block: 'nearest' })
      })

    void acapNavigateToFindHit(this.editor, hit).then(outcome => {
      if (
        outcome !== 'layout-missing' &&
        outcome !== 'layout-switch-failed' &&
        outcome !== 'layout-mismatch'
      ) {
        return
      }
      this.navigationNote = this.i18n.t('findPalette.layoutUnavailable', {
        layout: hit.layoutName
      })
      this.renderResults()
    })
  }
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100)
}
