import {
  createIconElement,
  ICON_AUDIO,
  ICON_CLOUD,
  ICON_EXPORT,
  ICON_IMAGE,
  ICON_IMPORT,
  ICON_LINE,
  ICON_PANEL,
  ICON_RECT,
  ICON_SKETCH,
  ICON_TEXT,
  ICON_VIDEO,
  ICON_VIS
} from '../assets/icons'
import type { AcExAnnotationI18n } from '../i18n'
import { ensureAnnotationStyles } from './styles'

export interface ToolbarItem {
  id: string
  command: string
  icon: string
  labelKey: string
}

const TOOL_ITEMS: ToolbarItem[] = [
  { id: 'text', command: 'anntext', icon: ICON_TEXT, labelKey: 'toolbar.text' },
  { id: 'leader', command: 'anleader', icon: ICON_LINE, labelKey: 'toolbar.leader' },
  { id: 'arrow', command: 'anarrow', icon: ICON_LINE, labelKey: 'toolbar.arrow' },
  { id: 'line', command: 'anline', icon: ICON_LINE, labelKey: 'toolbar.line' },
  { id: 'rect', command: 'anrect', icon: ICON_RECT, labelKey: 'toolbar.rect' },
  { id: 'ellipse', command: 'anellipse', icon: ICON_RECT, labelKey: 'toolbar.ellipse' },
  { id: 'cloud', command: 'ancloud', icon: ICON_CLOUD, labelKey: 'toolbar.cloud' },
  { id: 'sketch', command: 'ansketch', icon: ICON_SKETCH, labelKey: 'toolbar.sketch' },
  { id: 'image', command: 'animage', icon: ICON_IMAGE, labelKey: 'toolbar.image' },
  { id: 'video', command: 'anvideo', icon: ICON_VIDEO, labelKey: 'toolbar.video' },
  { id: 'audio', command: 'anaudio', icon: ICON_AUDIO, labelKey: 'toolbar.audio' }
]

export class AcExAnnotationToolbar {
  private root: HTMLDivElement
  private activeTool?: string

  constructor(
    host: HTMLElement,
    private i18n: AcExAnnotationI18n,
    private onCommand: (command: string) => void
  ) {
    ensureAnnotationStyles()
    this.root = document.createElement('div')
    this.root.className = 'ml-ann-toolbar'
    this.root.setAttribute('role', 'toolbar')
    host.appendChild(this.root)
    this.render()
  }

  setActiveTool(toolId?: string) {
    this.activeTool = toolId
    this.render()
  }

  refresh() {
    this.render()
  }

  destroy() {
    this.root.remove()
  }

  private render() {
    this.root.replaceChildren()
    for (const item of TOOL_ITEMS) {
      this.root.appendChild(this.createBtn(item))
    }
    this.root.appendChild(this.sep())
    this.root.appendChild(
      this.createActionBtn('annvis', ICON_VIS, 'toolbar.hide')
    )
    this.root.appendChild(
      this.createActionBtn('annpanel', ICON_PANEL, 'toolbar.panel')
    )
    this.root.appendChild(
      this.createActionBtn('annbookmark', ICON_PANEL, 'toolbar.bookmark')
    )
    this.root.appendChild(
      this.createActionBtn('annexport', ICON_EXPORT, 'toolbar.export')
    )
    this.root.appendChild(
      this.createActionBtn('annimport', ICON_IMPORT, 'toolbar.import')
    )
  }

  private sep() {
    const el = document.createElement('div')
    el.className = 'ml-ann-toolbar-sep'
    return el
  }

  private createBtn(item: ToolbarItem) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-ann-toolbar-btn'
    if (this.activeTool === item.id) btn.classList.add('is-active')
    btn.title = this.i18n.t(item.labelKey)
    btn.appendChild(createIconElement(item.icon))
    btn.onclick = () => {
      this.activeTool = item.id
      this.onCommand(item.command)
      this.render()
    }
    return btn
  }

  private createActionBtn(command: string, icon: string, labelKey: string) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-ann-toolbar-btn'
    btn.title = this.i18n.t(labelKey)
    btn.appendChild(createIconElement(icon))
    btn.onclick = () => this.onCommand(command)
    return btn
  }
}