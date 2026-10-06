import { AcApDocManager } from '../app/AcApDocManager'
import {
  acapBuildDataSourceMenu,
  type AcApDataSourceMenuItem
} from '../app/dataSource/acapBuildDataSourceMenu'
import type { AcApDataSource } from '../app/dataSource/AcApDataSource'
import type { AcApDataSourceAccountProfile } from '../app/dataSource/AcApDataSource'
import { ACAP_LOCAL_DATA_SOURCE_ID } from '../app/dataSource/AcApLocalDataSource'
import { ACAP_URL_DATA_SOURCE_ID } from '../app/dataSource/AcApUrlDataSource'
import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  type AcEdUiTheme,
  resolveUiTheme} from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n/AcApI18n'

const SUPPORTED_EXTENSIONS = ['.dxf', '.dwg'] as const

const VIEW_LOCAL = 'local'
const VIEW_URL = 'url'

/** Width / height of the {@link AcUiFileOpenPanel} source card. */
export interface AcUiFileOpenPanelCardSize {
  /** Card width. Number values are pixels. Defaults to `100%`. */
  width?: number | string
  /** Card height. Number values are pixels. Defaults to `150`. */
  height?: number | string
}

const DEFAULT_CARD_WIDTH = '100%'
const DEFAULT_CARD_HEIGHT = '150px'

function toCssSize(
  value: number | string | undefined,
  fallback: string
): string {
  if (value == null) return fallback
  return typeof value === 'number' ? `${value}px` : value
}

/** Result kinds emitted by {@link AcUiFileOpenPanel}. */
export type AcUiFileOpenPanelResult =
  | { kind: 'local'; file: File }
  | { kind: 'url'; url: string }
  | { kind: 'data-source'; item: AcApDataSourceMenuItem }
  | { kind: 'new-drawing' }

/**
 * Options for {@link AcUiFileOpenPanel}.
 */
export interface AcUiFileOpenPanelOptions {
  /** Element that receives the panel root. */
  host: HTMLElement
  /** Accepted extensions for the drop zone / file input. */
  accept?: string
  /** Optional title above the actions. */
  title?: string
  /** Optional subtitle under the title. */
  subtitle?: string
  /**
   * Isolated card palette (`light` / `dark`), independent of the host app theme.
   * When omitted, the panel follows {@link resolveUiTheme} from the host / document.
   */
  theme?: AcEdUiTheme
  /**
   * Card box size. Numbers are treated as CSS pixels.
   * Defaults to width `100%` and height `150`.
   */
  cardSize?: AcUiFileOpenPanelCardSize
  /** When true, URL is available in the source menu. Defaults to true. */
  showUrl?: boolean
  /** When true, shows a New Drawing button. Defaults to false. */
  showNewDrawing?: boolean
  /**
   * Extra cloud menu items when a source is not yet registered on a manager.
   * Prefer registering real {@link AcApDataSource} instances and passing
   * {@link getSources} so hosts stay provider-agnostic.
   */
  extraMenuItems?:
    | AcApDataSourceMenuItem[]
    | (() => AcApDataSourceMenuItem[])
  /**
   * Optional account profile override. Prefer {@link AcApDataSource.getAccountProfile}.
   */
  getAccountProfile?: (
    sourceId: string
  ) => AcApDataSourceAccountProfile | undefined
  /**
   * Registered / landing data sources used to build cloud entries.
   * Built-in `local` / `url` are filtered out (handled by the panel UI).
   * Defaults to {@link AcApDocManager.tryGetInstance}`.dataSourceManager.list()`.
   */
  getSources?: () => AcApDataSource[]
  /**
   * Called when the user picks a local file, URL, cloud action, or new drawing.
   */
  onResult?: (result: AcUiFileOpenPanelResult) => void
  onLocalFile?: (file: File) => void
  onUrl?: (url: string) => void
  onDataSourceAction?: (item: AcApDataSourceMenuItem) => void
  onNewDrawing?: () => void
}

type SourceOption = {
  value: string
  label: string
}

/**
 * Framework-free landing panel for opening CAD files.
 *
 * Card body swaps by source; bottom chevron opens a source menu.
 * Pass {@link AcUiFileOpenPanelOptions.theme} for an isolated light/dark
 * palette, and {@link AcUiFileOpenPanelOptions.cardSize} for width/height.
 */
export class AcUiFileOpenPanel {
  public static readonly styleId = 'ml-ui-file-open-panel-styles-v3'

  private readonly options: AcUiFileOpenPanelOptions
  private readonly root: HTMLDivElement
  private readonly card: HTMLDivElement
  private readonly contentEl: HTMLDivElement
  private readonly footerBtn: HTMLButtonElement
  private readonly footerLabel: HTMLSpanElement
  private readonly footerChevron: HTMLSpanElement
  private readonly menuEl: HTMLDivElement
  private readonly urlInput: HTMLInputElement
  private readonly fileInput: HTMLInputElement
  private readonly dropzone: HTMLDivElement
  private readonly urlRow: HTMLDivElement
  private readonly sourceActionsEl: HTMLDivElement
  private activeView: string = VIEW_LOCAL
  private menuOpen = false
  private disposed = false
  private unsubManager: (() => void) | null = null
  private unsubTheme: (() => void) | null = null
  private onDocPointerDown: ((event: PointerEvent) => void) | null = null

  constructor(options: AcUiFileOpenPanelOptions) {
    this.options = {
      ...options,
      cardSize: { ...(options.cardSize ?? {}) }
    }
    AcUiFileOpenPanel.ensureStyles()

    this.root = document.createElement('div')
    this.root.className = 'ml-ui-file-open'
    this.root.setAttribute('data-ml-ui-file-open', '1')
    this.applyTheme()

    if (options.title || options.subtitle) {
      const header = document.createElement('div')
      header.className = 'ml-ui-file-open-header'
      if (options.title) {
        const title = document.createElement('h2')
        title.className = 'ml-ui-file-open-title'
        title.textContent = options.title
        header.appendChild(title)
      }
      if (options.subtitle) {
        const subtitle = document.createElement('p')
        subtitle.className = 'ml-ui-file-open-subtitle'
        subtitle.textContent = options.subtitle
        header.appendChild(subtitle)
      }
      this.root.appendChild(header)
    }

    if (options.showNewDrawing) {
      const newBtn = document.createElement('button')
      newBtn.type = 'button'
      newBtn.className = 'ml-ui-file-open-primary'
      newBtn.textContent = AcApI18n.t('main.dataSource.newDrawing')
      newBtn.addEventListener('click', () => this.emit({ kind: 'new-drawing' }))
      this.root.appendChild(newBtn)
      this.root.appendChild(this.createDivider())
    }

    this.card = document.createElement('div')
    this.card.className = 'ml-ui-file-open-card'
    this.applyCardSize()
    this.root.appendChild(this.card)

    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = options.accept ?? SUPPORTED_EXTENSIONS.join(',')
    this.fileInput.className = 'ml-ui-file-open-input-hidden'
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0]
      this.fileInput.value = ''
      if (file && this.isSupportedFileName(file.name)) {
        this.emitLocal(file)
      }
    })
    this.card.appendChild(this.fileInput)

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'ml-ui-file-open-body'
    this.card.appendChild(this.contentEl)

    this.dropzone = document.createElement('div')
    this.dropzone.className = 'ml-ui-file-open-dropzone'
    this.dropzone.tabIndex = 0
    this.dropzone.setAttribute('role', 'button')
    this.dropzone.setAttribute(
      'aria-label',
      AcApI18n.t('main.dataSource.dropOrBrowse')
    )
    const dropTitle = document.createElement('p')
    dropTitle.className = 'ml-ui-file-open-drop-title'
    dropTitle.append(
      document.createTextNode(`${AcApI18n.t('main.dataSource.dropFile')} `)
    )
    const dropLink = document.createElement('span')
    dropLink.className = 'ml-ui-file-open-drop-link'
    dropLink.textContent = AcApI18n.t('main.dataSource.browse')
    dropTitle.appendChild(dropLink)
    const tags = document.createElement('div')
    tags.className = 'ml-ui-file-open-tags'
    for (const tag of ['DWG', 'DXF']) {
      const span = document.createElement('span')
      span.className = 'ml-ui-file-open-tag'
      span.textContent = tag
      tags.appendChild(span)
    }
    this.dropzone.appendChild(dropTitle)
    this.dropzone.appendChild(tags)
    this.dropzone.addEventListener('click', () => this.fileInput.click())
    this.dropzone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.fileInput.click()
      }
    })
    this.dropzone.addEventListener('dragenter', e => this.onDrag(e, true))
    this.dropzone.addEventListener('dragover', e => this.onDrag(e, true))
    this.dropzone.addEventListener('dragleave', e => this.onDrag(e, false))
    this.dropzone.addEventListener('drop', e => this.onDrop(e))

    this.urlRow = document.createElement('div')
    this.urlRow.className = 'ml-ui-file-open-url-row'
    this.urlInput = document.createElement('input')
    this.urlInput.type = 'url'
    this.urlInput.className = 'ml-ui-file-open-url-input'
    this.urlInput.placeholder = AcApI18n.t('main.dataSource.urlPlaceholder')
    this.urlInput.autocomplete = 'off'
    this.urlInput.spellcheck = false
    this.urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.submitUrl()
      }
    })
    const urlBtn = document.createElement('button')
    urlBtn.type = 'button'
    urlBtn.className = 'ml-ui-file-open-secondary'
    urlBtn.textContent = AcApI18n.t('main.dataSource.open')
    urlBtn.addEventListener('click', () => this.submitUrl())
    this.urlRow.appendChild(this.urlInput)
    this.urlRow.appendChild(urlBtn)

    this.sourceActionsEl = document.createElement('div')
    this.sourceActionsEl.className = 'ml-ui-file-open-sources'

    const footer = document.createElement('div')
    footer.className = 'ml-ui-file-open-footer'
    this.footerBtn = document.createElement('button')
    this.footerBtn.type = 'button'
    this.footerBtn.className = 'ml-ui-file-open-footer-btn'
    this.footerBtn.setAttribute(
      'aria-label',
      AcApI18n.t('main.dataSource.source')
    )
    this.footerBtn.setAttribute('aria-haspopup', 'listbox')
    this.footerBtn.setAttribute('aria-expanded', 'false')
    this.footerLabel = document.createElement('span')
    this.footerLabel.className = 'ml-ui-file-open-footer-label'
    this.footerChevron = document.createElement('span')
    this.footerChevron.className = 'ml-ui-file-open-footer-chevron'
    this.footerChevron.setAttribute('aria-hidden', 'true')
    this.footerChevron.textContent = '▾'
    this.footerBtn.appendChild(this.footerLabel)
    this.footerBtn.appendChild(this.footerChevron)
    this.footerBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.toggleMenu()
    })
    footer.appendChild(this.footerBtn)
    this.card.appendChild(footer)

    this.menuEl = document.createElement('div')
    this.menuEl.className = 'ml-ui-file-open-menu'
    this.menuEl.hidden = true
    this.menuEl.setAttribute('role', 'listbox')
    this.card.appendChild(this.menuEl)

    this.onDocPointerDown = (event: PointerEvent) => {
      if (!this.menuOpen) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (this.card.contains(target)) return
      this.closeMenu()
    }
    document.addEventListener('pointerdown', this.onDocPointerDown)

    this.unsubTheme = acedSubscribeUiTheme(() => {
      if (this.options.theme) return
      this.applyTheme()
    })

    options.host.appendChild(this.root)
    this.bindManagerEvents()
    this.refreshSourceButtons()
  }

  /** Root element of the panel. */
  get element(): HTMLDivElement {
    return this.root
  }

  /** Rebuilds the source menu and active body content. */
  refreshSourceButtons(): void {
    if (this.disposed) return
    this.bindManagerEvents()
    this.applyTheme()
    this.applyCardSize()
    this.syncSourceChrome()
    this.renderActiveView()
  }

  /**
   * Sets an isolated card theme, or `undefined` to follow the host app theme.
   *
   * @param theme - `light`, `dark`, or `undefined` to track {@link resolveUiTheme}
   */
  setTheme(theme: AcEdUiTheme | undefined): void {
    if (this.disposed) return
    this.options.theme = theme
    this.applyTheme()
  }

  /**
   * Updates the source card width and/or height.
   *
   * @param size - Partial size; omitted sides keep their current option value
   */
  setCardSize(size: AcUiFileOpenPanelCardSize): void {
    if (this.disposed) return
    this.options.cardSize = {
      ...this.options.cardSize,
      ...size
    }
    this.applyCardSize()
  }

  /** Removes the panel from the host and unsubscribes. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubManager?.()
    this.unsubManager = null
    this.unsubTheme?.()
    this.unsubTheme = null
    if (this.onDocPointerDown) {
      document.removeEventListener('pointerdown', this.onDocPointerDown)
      this.onDocPointerDown = null
    }
    this.root.remove()
  }

  private applyTheme(): void {
    const isolated = this.options.theme != null
    const theme = this.options.theme ?? resolveUiTheme(this.options.host)
    acedApplyUiTheme(theme, this.root, { isolated })
  }

  private applyCardSize(): void {
    const size = this.options.cardSize
    this.card.style.width = toCssSize(size?.width, DEFAULT_CARD_WIDTH)
    this.card.style.height = toCssSize(size?.height, DEFAULT_CARD_HEIGHT)
  }

  private syncSourceChrome(): void {
    const options = this.resolveSourceOptions()
    const values = new Set(options.map(o => o.value))
    if (!values.has(this.activeView)) {
      this.activeView = VIEW_LOCAL
      this.closeMenu()
    }

    const current =
      options.find(o => o.value === this.activeView) ?? options[0]
    this.footerLabel.textContent = current?.label ?? ''

    const multi = options.length > 1
    this.footerBtn.disabled = !multi
    this.footerBtn.classList.toggle('is-single', !multi)
    this.footerChevron.hidden = !multi
    if (!multi) this.closeMenu()

    this.menuEl.replaceChildren()
    for (const opt of options) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'ml-ui-file-open-menu-item'
      item.setAttribute('role', 'option')
      item.setAttribute(
        'aria-selected',
        opt.value === this.activeView ? 'true' : 'false'
      )
      if (opt.value === this.activeView) {
        item.classList.add('is-active')
      }
      item.textContent = opt.label
      item.addEventListener('click', e => {
        e.stopPropagation()
        this.selectSource(opt.value)
      })
      this.menuEl.appendChild(item)
    }
  }

  private selectSource(value: string): void {
    this.activeView = value
    this.closeMenu()
    this.syncSourceChrome()
    this.renderActiveView()
    this.maybeAutoSignIn(value)
  }

  /**
   * When switching to an auth-required cloud source, start sign-in immediately
   * (separate from pick, so the File Picker popup is not blocked).
   */
  private maybeAutoSignIn(sourceId: string): void {
    if (sourceId === VIEW_LOCAL || sourceId === VIEW_URL) return

    const source = this.resolveSources().find(s => s.id === sourceId)
    if (source) {
      if (source.requiresAuth && source.getAuthState() === 'signed-out') {
        void source
          .signIn()
          .catch(() => undefined)
          .finally(() => this.refreshSourceButtons())
      }
      return
    }

    const signInItem = this.resolveExtraMenuItems().find(
      i => i.sourceId === sourceId && i.action === 'sign-in'
    )
    if (signInItem) {
      this.emit({ kind: 'data-source', item: signInItem })
    }
  }

  private toggleMenu(): void {
    if (this.footerBtn.disabled) return
    if (this.menuOpen) this.closeMenu()
    else this.openMenu()
  }

  private openMenu(): void {
    this.menuOpen = true
    this.menuEl.hidden = false
    this.footerBtn.setAttribute('aria-expanded', 'true')
    this.footerBtn.classList.add('is-open')
    this.footerChevron.textContent = '▴'
  }

  private closeMenu(): void {
    this.menuOpen = false
    this.menuEl.hidden = true
    this.footerBtn.setAttribute('aria-expanded', 'false')
    this.footerBtn.classList.remove('is-open')
    this.footerChevron.textContent = '▾'
  }

  private resolveSourceOptions(): SourceOption[] {
    const options: SourceOption[] = [
      {
        value: VIEW_LOCAL,
        label: AcApI18n.t('main.dataSource.local')
      }
    ]
    if (this.options.showUrl !== false) {
      options.push({
        value: VIEW_URL,
        label: AcApI18n.t('main.dataSource.url')
      })
    }

    const seen = new Set<string>()
    for (const item of this.resolveMenuItems()) {
      if (seen.has(item.sourceId)) continue
      seen.add(item.sourceId)
      options.push({
        value: item.sourceId,
        label: this.resolveSourceLabel(item.sourceId)
      })
    }
    return options
  }

  private resolveSourceLabel(sourceId: string): string {
    const source = this.resolveSources().find(s => s.id === sourceId)
    if (source) {
      return AcApI18n.t(source.labelKey)
    }
    const extra = this.resolveExtraMenuItems().find(
      i => i.sourceId === sourceId
    )
    if (extra?.labelParams?.name) {
      return extra.labelParams.name
    }
    return sourceId
  }

  private renderActiveView(): void {
    this.contentEl.replaceChildren()
    if (this.activeView === VIEW_LOCAL) {
      this.contentEl.appendChild(this.dropzone)
      return
    }
    if (this.activeView === VIEW_URL) {
      this.contentEl.appendChild(this.urlRow)
      requestAnimationFrame(() => this.urlInput.focus())
      return
    }
    this.renderSourceActions(this.activeView)
    this.contentEl.appendChild(this.sourceActionsEl)
  }

  private canPickSource(sourceId: string): boolean {
    const source = this.resolveSources().find(s => s.id === sourceId)
    if (source) {
      if (!source.requiresAuth) return true
      return source.getAuthState() === 'signed-in'
    }
    // Landing page before registration: host exposes a pick item after sign-in.
    return this.resolveExtraMenuItems().some(
      i => i.sourceId === sourceId && i.action === 'pick'
    )
  }

  private buildPickMenuItem(sourceId: string): AcApDataSourceMenuItem {
    const name = this.resolveSourceLabel(sourceId)
    const labelTemplate = AcApI18n.t('main.dataSource.openFrom')
    return {
      id: `${sourceId}:pick`,
      sourceId,
      action: 'pick',
      labelKey: 'main.dataSource.openFrom',
      labelParams: { name },
      label: labelTemplate.includes('{name}')
        ? labelTemplate.split('{name}').join(name)
        : AcApI18n.t('main.dataSource.selectFile')
    }
  }

  private resolveAccountProfile(
    sourceId: string
  ): AcApDataSourceAccountProfile | undefined {
    const fromHost = this.options.getAccountProfile?.(sourceId)
    if (fromHost?.displayName) return fromHost

    const source = this.resolveSources().find(s => s.id === sourceId)
    if (!source || source.getAuthState() !== 'signed-in') return undefined

    const profile = source.getAccountProfile?.()
    if (profile?.displayName) return profile

    const label = source.getAccountLabel?.()
    if (label) return { displayName: label }
    return undefined
  }

  private initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }

  private renderSourceActions(sourceId: string): void {
    this.sourceActionsEl.replaceChildren()

    const profile = this.resolveAccountProfile(sourceId)
    if (profile) {
      const accountRow = document.createElement('div')
      accountRow.className = 'ml-ui-file-open-account'

      const avatar = document.createElement('div')
      avatar.className = 'ml-ui-file-open-avatar'
      if (profile.avatarUrl) {
        const img = document.createElement('img')
        img.className = 'ml-ui-file-open-avatar-img'
        img.src = profile.avatarUrl
        img.alt = ''
        img.referrerPolicy = 'no-referrer'
        avatar.appendChild(img)
      } else {
        const initials = document.createElement('span')
        initials.className = 'ml-ui-file-open-avatar-initials'
        initials.textContent = this.initialsFromName(profile.displayName)
        avatar.appendChild(initials)
      }

      const textCol = document.createElement('div')
      textCol.className = 'ml-ui-file-open-account-text'
      const nameEl = document.createElement('div')
      nameEl.className = 'ml-ui-file-open-account-name'
      nameEl.textContent = profile.displayName
      textCol.appendChild(nameEl)
      if (profile.email && profile.email !== profile.displayName) {
        const emailEl = document.createElement('div')
        emailEl.className = 'ml-ui-file-open-account-email'
        emailEl.textContent = profile.email
        textCol.appendChild(emailEl)
      }

      accountRow.appendChild(avatar)
      accountRow.appendChild(textCol)
      this.sourceActionsEl.appendChild(accountRow)
    }

    const pickBtn = document.createElement('button')
    pickBtn.type = 'button'
    pickBtn.className =
      'ml-ui-file-open-source-btn ml-ui-file-open-source-btn--primary'
    pickBtn.textContent = AcApI18n.t('main.dataSource.selectFile')
    const canPick = this.canPickSource(sourceId)
    pickBtn.disabled = !canPick
    if (!canPick) {
      pickBtn.title = AcApI18n.t('main.dataSource.signInRequired')
    }
    pickBtn.addEventListener('click', () => {
      if (!this.canPickSource(sourceId)) return
      this.emit({
        kind: 'data-source',
        item: this.buildPickMenuItem(sourceId)
      })
    })
    this.sourceActionsEl.appendChild(pickBtn)
  }

  private resolveMenuItems(): AcApDataSourceMenuItem[] {
    const sources = this.resolveSources().filter(
      s =>
        s.id !== ACAP_LOCAL_DATA_SOURCE_ID && s.id !== ACAP_URL_DATA_SOURCE_ID
    )
    const fromManager = acapBuildDataSourceMenu(sources)
    const extra = this.resolveExtraMenuItems()
    const known = new Set(fromManager.map(i => i.sourceId))
    const pending = extra.filter(i => !known.has(i.sourceId))
    return [...fromManager, ...pending]
  }

  private resolveSources(): AcApDataSource[] {
    if (this.options.getSources) {
      return this.options.getSources()
    }
    return AcApDocManager.tryGetInstance()?.dataSourceManager.list() ?? []
  }

  private resolveExtraMenuItems(): AcApDataSourceMenuItem[] {
    const extra = this.options.extraMenuItems
    if (!extra) return []
    return typeof extra === 'function' ? extra() : extra
  }

  private bindManagerEvents(): void {
    if (this.unsubManager) return
    const dsm = AcApDocManager.tryGetInstance()?.dataSourceManager
    if (!dsm) return
    const refresh = () => this.refreshSourceButtons()
    dsm.on('changed', refresh)
    dsm.on('auth-changed', refresh)
    this.unsubManager = () => {
      dsm.off('changed', refresh)
      dsm.off('auth-changed', refresh)
    }
  }

  private submitUrl(): void {
    const url = this.urlInput.value.trim()
    if (!url) {
      this.urlInput.focus()
      return
    }
    this.emit({ kind: 'url', url })
  }

  private onDrag(event: DragEvent, active: boolean): void {
    event.preventDefault()
    event.stopPropagation()
    this.dropzone.classList.toggle('is-dragover', active)
  }

  private onDrop(event: DragEvent): void {
    this.onDrag(event, false)
    const file = event.dataTransfer?.files?.[0]
    if (file && this.isSupportedFileName(file.name)) {
      this.emitLocal(file)
    }
  }

  private isSupportedFileName(name: string): boolean {
    const lower = name.toLowerCase()
    return SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext))
  }

  private emitLocal(file: File): void {
    this.emit({ kind: 'local', file })
  }

  private emit(result: AcUiFileOpenPanelResult): void {
    this.options.onResult?.(result)
    switch (result.kind) {
      case 'local':
        this.options.onLocalFile?.(result.file)
        break
      case 'url':
        this.options.onUrl?.(result.url)
        break
      case 'data-source':
        this.options.onDataSourceAction?.(result.item)
        break
      case 'new-drawing':
        this.options.onNewDrawing?.()
        break
    }
  }

  private createDivider(): HTMLParagraphElement {
    const el = document.createElement('p')
    el.className = 'ml-ui-file-open-divider'
    el.setAttribute('aria-hidden', 'true')
    const span = document.createElement('span')
    span.textContent = AcApI18n.t('main.dataSource.or')
    el.appendChild(span)
    return el
  }

  static ensureStyles(): void {
    if (typeof document === 'undefined') return
    if (document.getElementById(AcUiFileOpenPanel.styleId)) return
    const style = document.createElement('style')
    style.id = AcUiFileOpenPanel.styleId
    style.textContent = `
.ml-ui-file-open {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--ml-ui-text, #303133);
}
.ml-ui-file-open-header { margin-bottom: 12px; }
.ml-ui-file-open-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}
.ml-ui-file-open-subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-file-open-primary {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.ml-ui-file-open-primary:hover { filter: brightness(1.05); }
.ml-ui-file-open-secondary {
  flex: 0 0 auto;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.ml-ui-file-open-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ml-ui-text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ml-ui-file-open-divider::before,
.ml-ui-file-open-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ml-ui-border, #e2e8f0);
}
.ml-ui-file-open-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 150px;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 12px;
  background: var(--ml-ui-bg, #fff);
  box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
  overflow: hidden;
}
.ml-ui-file-open-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ml-ui-file-open-input-hidden { display: none; }
.ml-ui-file-open-dropzone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  box-sizing: border-box;
  border: 1.5px dashed transparent;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ml-ui-file-open-dropzone:hover,
.ml-ui-file-open-dropzone:focus-visible,
.ml-ui-file-open-dropzone.is-dragover {
  border-color: var(--ml-ui-accent, #409eff);
  background: color-mix(in srgb, var(--ml-ui-accent, #409eff) 8%, transparent);
}
.ml-ui-file-open-drop-title {
  margin: 0;
  font-size: 14px;
  text-align: center;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-file-open-drop-link {
  color: var(--ml-ui-accent, #409eff);
  font-weight: 600;
}
.ml-ui-file-open-tags { display: flex; gap: 6px; }
.ml-ui-file-open-tag {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  font-size: 11px;
  font-weight: 600;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-file-open-url-row {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.ml-ui-file-open-url-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--ml-ui-border, #c0c4cc);
  border-radius: 8px;
  background: var(--ml-ui-bg, #fff);
  color: inherit;
  font-size: 13px;
  box-sizing: border-box;
}
.ml-ui-file-open-url-input:focus {
  outline: 2px solid var(--ml-ui-accent, #409eff);
  outline-offset: 1px;
}
.ml-ui-file-open-sources {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}
.ml-ui-file-open-empty {
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-file-open-account {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 0 4px;
  min-width: 0;
}
.ml-ui-file-open-avatar {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ml-ui-accent, #409eff) 22%, transparent);
  border: 1px solid var(--ml-ui-border, #dcdfe6);
}
.ml-ui-file-open-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ml-ui-file-open-avatar-initials {
  font-size: 12px;
  font-weight: 700;
  color: var(--ml-ui-accent, #409eff);
  line-height: 1;
}
.ml-ui-file-open-account-text {
  flex: 1;
  min-width: 0;
}
.ml-ui-file-open-account-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-ui-text, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-ui-file-open-account-email {
  margin-top: 2px;
  font-size: 11px;
  color: var(--ml-ui-text-muted, #606266);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-ui-file-open-source-btn {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--ml-ui-border, #e2e8f0);
  border-radius: 8px;
  background: var(--ml-ui-bg, #fff);
  color: var(--ml-ui-text, #334155);
  font-size: 13px;
  cursor: pointer;
  text-align: center;
}
.ml-ui-file-open-source-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ml-ui-file-open-source-btn--primary {
  border: none;
  background: var(--ml-ui-accent, #409eff);
  color: #fff;
  font-weight: 600;
}
.ml-ui-file-open-source-btn--primary:hover:not(:disabled) { filter: brightness(1.05); }
.ml-ui-file-open-source-btn--muted:hover {
  border-color: var(--ml-ui-accent, #409eff);
  color: var(--ml-ui-accent, #409eff);
}
.ml-ui-file-open-footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--ml-ui-border, #dcdfe6);
  background: color-mix(in srgb, var(--ml-ui-bg, #fff) 92%, var(--ml-ui-text, #303133) 8%);
}
.ml-ui-file-open-footer-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--ml-ui-text, #303133);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}
.ml-ui-file-open-footer-btn:hover:not(:disabled),
.ml-ui-file-open-footer-btn.is-open {
  background: color-mix(in srgb, var(--ml-ui-accent, #409eff) 10%, transparent);
}
.ml-ui-file-open-footer-btn:disabled,
.ml-ui-file-open-footer-btn.is-single {
  cursor: default;
}
.ml-ui-file-open-footer-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-ui-file-open-footer-chevron {
  flex: 0 0 auto;
  color: var(--ml-ui-text-muted, #606266);
  font-size: 12px;
  line-height: 1;
}
.ml-ui-file-open-menu {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 44px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 10px;
  background: var(--ml-ui-bg, #fff);
  box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.18));
  max-height: 148px;
  overflow: auto;
}
.ml-ui-file-open-menu[hidden] { display: none; }
.ml-ui-file-open-menu-item {
  display: block;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ml-ui-text, #303133);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.ml-ui-file-open-menu-item:hover {
  background: color-mix(in srgb, var(--ml-ui-accent, #409eff) 12%, transparent);
}
.ml-ui-file-open-menu-item.is-active {
  color: var(--ml-ui-accent, #409eff);
  font-weight: 600;
}
`
    document.head.appendChild(style)
  }
}
