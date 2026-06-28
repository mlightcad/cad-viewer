import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import type { AcApAnnotationServices } from '../AcApAnnotationServices'
import { centerOfGeometry } from '../geometry/annotationGeometry'
import type { AcExAnnotationI18n } from '../i18n'
import type { AnnotationType } from '../model/types'
import { asTrView } from '../util/annotationUtil'
import { promptAnnotationText } from '../util/promptText'
import { ensureAnnotationStyles } from './styles'

type PanelTab = 'list' | 'bookmarks'

export class AcExAnnotationPanel {
  private root: HTMLDivElement
  private tab: PanelTab = 'list'
  private filterType = ''
  private filterKeyword = ''
  private filterAuthor = ''
  private filterFrom = ''
  private filterTo = ''

  constructor(
    host: HTMLElement,
    private i18n: AcExAnnotationI18n,
    private services: AcApAnnotationServices
  ) {
    ensureAnnotationStyles()
    this.root = document.createElement('div')
    this.root.className = 'ml-ann-panel'
    this.root.hidden = true
    host.appendChild(this.root)
    this.render()
  }

  setVisible(visible: boolean) {
    this.root.hidden = !visible
  }

  refresh() {
    this.render()
  }

  destroy() {
    this.root.remove()
  }

  private render() {
    this.root.replaceChildren()
    const header = document.createElement('div')
    header.className = 'ml-ann-panel-header'
    header.textContent = this.i18n.t('panel.title')
    const tabs = document.createElement('div')
    tabs.className = 'ml-ann-panel-tabs'
    const listTab = this.tabBtn('list', this.i18n.t('panel.list'))
    const bmTab = this.tabBtn('bookmarks', this.i18n.t('panel.bookmarks'))
    tabs.append(listTab, bmTab)
    const body = document.createElement('div')
    body.className = 'ml-ann-panel-body'
    if (this.tab === 'list') {
      body.appendChild(this.buildFilters())
      body.appendChild(this.buildList())
    } else {
      body.appendChild(this.buildBookmarks())
    }
    this.root.append(header, tabs, body)
  }

  private tabBtn(tab: PanelTab, label: string) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-ann-panel-tab'
    if (this.tab === tab) btn.classList.add('is-active')
    btn.textContent = label
    btn.onclick = () => {
      this.tab = tab
      this.render()
    }
    return btn
  }

  private buildFilters() {
    const wrap = document.createElement('div')
    wrap.className = 'ml-ann-filter-row'
    const type = document.createElement('select')
    type.innerHTML = `<option value="">${this.i18n.t('panel.filterType')}</option>`
    const types: AnnotationType[] = [
      'text',
      'leader',
      'arrow',
      'line',
      'rect',
      'ellipse',
      'cloud',
      'freehand',
      'image',
      'video',
      'audio'
    ]
    for (const t of types) {
      const opt = document.createElement('option')
      opt.value = t
      opt.textContent = t
      type.appendChild(opt)
    }
    type.value = this.filterType
    type.onchange = () => {
      this.filterType = type.value
      this.render()
    }
    const keyword = document.createElement('input')
    keyword.placeholder = this.i18n.t('panel.filterKeyword')
    keyword.value = this.filterKeyword
    keyword.onchange = () => {
      this.filterKeyword = keyword.value
      this.render()
    }
    const author = document.createElement('input')
    author.placeholder = this.i18n.t('panel.filterAuthor')
    author.value = this.filterAuthor
    author.onchange = () => {
      this.filterAuthor = author.value
      this.render()
    }
    const from = document.createElement('input')
    from.type = 'date'
    from.value = this.filterFrom
    from.onchange = () => {
      this.filterFrom = from.value
      this.render()
    }
    const to = document.createElement('input')
    to.type = 'date'
    to.value = this.filterTo
    to.onchange = () => {
      this.filterTo = to.value
      this.render()
    }
    wrap.append(type, keyword, author, from, to)
    return wrap
  }

  private buildList() {
    const doc = AcApDocManager.instance.curDocument
    if (!doc) {
      const empty = document.createElement('div')
      empty.textContent = this.i18n.t('panel.empty')
      return empty
    }
    const store = this.services.getStore(doc.database)
    const items = store.filterAnnotations({
      types: this.filterType ? [this.filterType as AnnotationType] : undefined,
      keyword: this.filterKeyword || undefined,
      createdBy: this.filterAuthor || undefined,
      dateFrom: this.filterFrom ? `${this.filterFrom}T00:00:00.000Z` : undefined,
      dateTo: this.filterTo ? `${this.filterTo}T23:59:59.999Z` : undefined
    })
    const wrap = document.createElement('div')
    if (!items.length) {
      wrap.textContent = this.i18n.t('panel.empty')
      return wrap
    }
    for (const item of items) {
      const row = document.createElement('div')
      row.className = 'ml-ann-list-item'
      if (this.services.selectedId === item.id) row.classList.add('is-selected')
      row.textContent = `${item.type} — ${item.content?.text ?? item.id}`
      row.onclick = () => {
        this.services.selectedId = item.id
        this.services.shell?.refresh()
      }
      const actions = document.createElement('div')
      actions.className = 'ml-ann-list-actions'
      const goto = document.createElement('button')
      goto.textContent = this.i18n.t('panel.goto')
      goto.onclick = e => {
        e.stopPropagation()
        const view = AcApDocManager.instance.curView
        if (!view) return
        const pt = centerOfGeometry(
          item.geometry as Parameters<typeof centerOfGeometry>[0]
        )
        const tr = asTrView(view)
        const camera = tr.internalCamera
        const zoom =
          camera && 'zoom' in camera
            ? (camera as { zoom: number }).zoom
            : 1
        tr.flyTo(pt, zoom)
      }
      const edit = document.createElement('button')
      edit.textContent = this.i18n.t('panel.edit')
      edit.onclick = async e => {
        e.stopPropagation()
        const text = await promptAnnotationText(this.i18n.t('panel.edit'))
        if (!text) return
        this.services.updateActiveRecord(item.id, {
          content: { ...item.content, text }
        })
      }
      const del = document.createElement('button')
      del.textContent = this.i18n.t('panel.delete')
      del.onclick = e => {
        e.stopPropagation()
        this.services.removeActiveRecord(item.id)
      }
      actions.append(goto, edit, del)
      row.appendChild(actions)
      wrap.appendChild(row)
    }
    return wrap
  }

  private buildBookmarks() {
    const doc = AcApDocManager.instance.curDocument
    const wrap = document.createElement('div')
    const add = document.createElement('button')
    add.textContent = this.i18n.t('panel.addBookmark')
    add.onclick = () => {
      if (!doc || !AcApDocManager.instance.curView) return
      this.services.createBookmarkActive(`Bookmark ${Date.now()}`)
      this.render()
    }
    wrap.appendChild(add)
    if (!doc) return wrap
    const store = this.services.getStore(doc.database)
    for (const bm of store.bookmarks) {
      const row = document.createElement('div')
      row.className = 'ml-ann-list-item'
      row.textContent = bm.name
      const actions = document.createElement('div')
      actions.className = 'ml-ann-list-actions'
      const goto = document.createElement('button')
      goto.textContent = this.i18n.t('panel.goto')
      goto.onclick = () => {
        this.services.gotoBookmarkActive(bm.id)
      }
      const del = document.createElement('button')
      del.textContent = this.i18n.t('panel.delete')
      del.onclick = () => {
        store.removeBookmark(bm.id)
        this.render()
      }
      actions.append(goto, del)
      row.appendChild(actions)
      wrap.appendChild(row)
    }
    return wrap
  }
}