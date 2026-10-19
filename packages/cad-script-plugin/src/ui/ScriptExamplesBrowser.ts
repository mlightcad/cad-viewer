import {
  filterScriptExamples,
  SCRIPT_EXAMPLES,
  type ScriptExample,
  type ScriptExampleCopyTable,
  type ScriptExampleId
} from '../examples/scriptExamples'
import type { ScriptLabels } from '../i18n'
import { scriptExampleText } from '../i18n'

/**
 * Searchable catalog of built-in scripts.
 *
 * Choosing "use" copies that script into the editor.
 */
export class ScriptExamplesBrowser {
  /** Root element that fills the panel while examples are open. */
  readonly element: HTMLDivElement

  private readonly searchInput: HTMLInputElement
  private readonly closeButton: HTMLButtonElement
  private readonly listEl: HTMLDivElement
  private readonly emptyEl: HTMLParagraphElement
  private readonly titleEl: HTMLHeadingElement
  private readonly descriptionEl: HTMLParagraphElement
  private readonly codeEl: HTMLPreElement
  private readonly useButton: HTMLButtonElement

  private query = ''
  private selectedId: ScriptExampleId = SCRIPT_EXAMPLES[0].id
  private visible: ScriptExample[] = [...SCRIPT_EXAMPLES]

  /**
   * @param onUse - Called with the selected script source.
   * @param onClose - Called when the user dismisses the catalog.
   */
  constructor(
    private readonly onUse: (code: string) => void,
    private readonly onClose: () => void
  ) {
    this.element = document.createElement('div')
    this.element.className = 'cad-script-examples'
    this.element.hidden = true
    this.element.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (this.query.trim()) {
        this.query = ''
        this.searchInput.value = ''
        this.render()
        return
      }
      this.onClose()
    })

    const header = document.createElement('div')
    header.className = 'cad-script-examples-header'

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'search'
    this.searchInput.className = 'cad-script-examples-search'
    this.searchInput.autocomplete = 'off'
    this.searchInput.spellcheck = false
    this.searchInput.addEventListener('input', () => {
      this.query = this.searchInput.value
      this.render()
    })

    this.closeButton = document.createElement('button')
    this.closeButton.type = 'button'
    this.closeButton.className = 'cad-script-btn'
    this.closeButton.addEventListener('click', () => {
      this.onClose()
    })

    header.append(this.searchInput, this.closeButton)

    const body = document.createElement('div')
    body.className = 'cad-script-examples-body'

    this.listEl = document.createElement('div')
    this.listEl.className = 'cad-script-examples-list'
    this.listEl.role = 'listbox'

    this.emptyEl = document.createElement('p')
    this.emptyEl.className = 'cad-script-examples-empty'

    const detail = document.createElement('div')
    detail.className = 'cad-script-examples-detail'

    const detailBody = document.createElement('div')
    detailBody.className = 'cad-script-examples-detail-body'

    this.titleEl = document.createElement('h2')
    this.descriptionEl = document.createElement('p')
    this.codeEl = document.createElement('pre')
    detailBody.append(this.titleEl, this.descriptionEl, this.codeEl)

    this.useButton = document.createElement('button')
    this.useButton.type = 'button'
    this.useButton.className = 'cad-script-btn cad-script-btn--primary'
    this.useButton.addEventListener('click', () => {
      this.useSelected()
    })

    detail.append(detailBody, this.useButton)
    body.append(this.listEl, this.emptyEl, detail)
    this.element.append(header, body)
  }

  /**
   * Applies the current locale and rebuilds the list.
   *
   * @param labels - Panel chrome strings.
   */
  setLabels(labels: ScriptLabels): void {
    this.searchInput.placeholder = labels.scriptExamplesSearch
    this.searchInput.setAttribute('aria-label', labels.scriptExamplesSearch)
    this.closeButton.textContent = labels.scriptExamplesClose
    this.useButton.textContent = labels.scriptExamplesUse
    this.emptyEl.textContent = labels.scriptExamplesEmpty
    this.render()
  }

  /**
   * Moves focus to the search box.
   */
  focusSearch(): void {
    this.searchInput.focus()
    this.searchInput.select()
  }

  private useSelected() {
    const example = this.visible.find(item => item.id === this.selectedId)
    if (!example) return
    this.onUse(example.code)
  }

  private render() {
    const copy = copyTable()
    this.visible = filterScriptExamples(SCRIPT_EXAMPLES, copy, this.query)
    if (!this.visible.some(item => item.id === this.selectedId)) {
      this.selectedId = this.visible[0]?.id ?? this.selectedId
    }

    this.listEl.replaceChildren()
    for (const example of this.visible) {
      const text = copy[example.id]
      const option = document.createElement('button')
      option.type = 'button'
      option.className = 'cad-script-examples-item'
      option.role = 'option'
      option.setAttribute(
        'aria-selected',
        example.id === this.selectedId ? 'true' : 'false'
      )
      if (example.id === this.selectedId) {
        option.classList.add('is-active')
      }

      const title = document.createElement('span')
      title.className = 'cad-script-examples-item-title'
      title.textContent = text.title

      const description = document.createElement('span')
      description.className = 'cad-script-examples-item-desc'
      description.textContent = text.description

      option.append(title, description)
      option.addEventListener('click', () => {
        if (this.selectedId === example.id) return
        this.selectedId = example.id
        this.paintSelection(copy)
      })
      option.addEventListener('dblclick', () => {
        this.selectedId = example.id
        this.useSelected()
      })
      this.listEl.append(option)
    }

    this.paintSelection(copy)
  }

  /**
   * Updates the active row and the detail pane without rebuilding the list.
   *
   * @param copy - Localized titles and descriptions.
   */
  private paintSelection(copy: ScriptExampleCopyTable) {
    const buttons = this.listEl.querySelectorAll<HTMLButtonElement>(
      '.cad-script-examples-item'
    )
    buttons.forEach((option, index) => {
      const active = this.visible[index]?.id === this.selectedId
      option.classList.toggle('is-active', active)
      option.setAttribute('aria-selected', active ? 'true' : 'false')
    })

    const selected = this.visible.find(item => item.id === this.selectedId)
    const hasMatch = selected != null
    this.emptyEl.hidden = hasMatch
    this.titleEl.hidden = !hasMatch
    this.descriptionEl.hidden = !hasMatch
    this.codeEl.hidden = !hasMatch
    this.useButton.disabled = !hasMatch
    if (!selected) {
      this.titleEl.textContent = ''
      this.descriptionEl.textContent = ''
      this.codeEl.textContent = ''
      return
    }
    const text = copy[selected.id]
    this.titleEl.textContent = text.title
    this.descriptionEl.textContent = text.description
    this.codeEl.textContent = selected.code
  }
}

/**
 * Builds the copy table for the active locale.
 *
 * @returns Title and description for every example id.
 */
function copyTable(): ScriptExampleCopyTable {
  const copy = {} as ScriptExampleCopyTable
  for (const example of SCRIPT_EXAMPLES) {
    copy[example.id] = scriptExampleText(example.id)
  }
  return copy
}
