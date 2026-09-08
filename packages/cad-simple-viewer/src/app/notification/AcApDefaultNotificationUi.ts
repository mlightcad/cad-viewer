import {
  acedGetUiLayout,
  acedIsHandheldDevice,
  acedSubscribeUiLayout,
  type AcEdUiLayoutKind,
  ML_UI_Z_NOTIFICATION} from '../../editor/global/AcEdUiLayout'
import {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  resolveUiTheme
} from '../../editor/global/AcEdUiTheme'
import { acapI18nTranslate } from '../../util/AcApFormatUnsupportedEntitiesMessage'
import {
  acapGroupNotifications,
  type AcApNotification,
  type AcApNotificationCenter,
  type AcApNotificationGroup,
  type AcApNotificationSource
} from './AcApNotificationTypes'

const STYLE_ID = 'acap-notification-center-style'
const ROOT_CLASS = 'acap-notification-center'

/** Gap between the shortcut toolbar bottom edge and the notification bell. */
const SHORTCUT_CLEARANCE_PX = 8

/**
 * Fallback when the shortcut toolbar is missing / hidden.
 * Matches shortcut default top (12) + typical shell height + gap.
 */
const FALLBACK_TOP_BELOW_SHORTCUT_PX = 12 + 40 + SHORTCUT_CLEARANCE_PX

/**
 * Built-in notification UI for hosts that do not supply their own center.
 *
 * Interaction (aligned with iOS Notification Center ideas, adapted to CAD chrome):
 * - Hidden entirely when there are no notifications (no idle bell clutter).
 * - With messages: show only a badge-bearing bell; the list opens on tap.
 * - Anchored to the **canvas host** (view container), not the browser window.
 * - Desktop (fine pointer): bell at the host's bottom-right; panel pops above it.
 * - Phone / pad / handheld: bell sits **below** the shortcut toolbar (measured
 *   live) so it never covers undo/redo/erase; panel is a top sheet on phone.
 *
 * Theme tokens follow {@link resolveUiTheme} / `--ml-ui-*`.
 */
export class AcApDefaultNotificationUi {
  private readonly _host: HTMLElement
  private readonly _center: AcApNotificationCenter
  private readonly _root: HTMLDivElement
  private readonly _backdrop: HTMLButtonElement
  private readonly _bell: HTMLButtonElement
  private readonly _badge: HTMLSpanElement
  private readonly _panel: HTMLDivElement
  private readonly _list: HTMLDivElement
  private readonly _titleEl: HTMLSpanElement
  private _expandedGroups = new Set<string>()
  private _panelOpen = false
  private _layoutKind: AcEdUiLayoutKind = 'desktop'
  private readonly _unsubs: Array<() => void> = []
  private _shortcutObserver?: ResizeObserver
  private _repositionRaf = 0

  constructor(center: AcApNotificationCenter, host: HTMLElement) {
    this._center = center
    this._host = host
    ensureStyles()

    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }

    this._root = document.createElement('div')
    this._root.className = ROOT_CLASS
    this._root.hidden = true

    this._backdrop = document.createElement('button')
    this._backdrop.type = 'button'
    this._backdrop.className = `${ROOT_CLASS}__backdrop`
    this._backdrop.hidden = true
    this._backdrop.setAttribute('aria-label', 'Close notifications')
    this._backdrop.addEventListener('click', () => this.setPanelOpen(false))

    this._bell = document.createElement('button')
    this._bell.type = 'button'
    this._bell.className = `${ROOT_CLASS}__bell`
    this._bell.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm8-6V11a8 8 0 1 0-16 0v5L2 18v1h20v-1l-2-2Z"/></svg>'
    this._bell.addEventListener('click', e => {
      e.stopPropagation()
      this.setPanelOpen(!this._panelOpen)
    })

    this._badge = document.createElement('span')
    this._badge.className = `${ROOT_CLASS}__badge`
    this._bell.appendChild(this._badge)

    this._panel = document.createElement('div')
    this._panel.className = `${ROOT_CLASS}__panel`
    this._panel.hidden = true
    this._panel.setAttribute('role', 'dialog')
    this._panel.setAttribute('aria-modal', 'true')

    const header = document.createElement('div')
    header.className = `${ROOT_CLASS}__header`
    this._titleEl = document.createElement('span')
    const clearBtn = document.createElement('button')
    clearBtn.type = 'button'
    clearBtn.className = `${ROOT_CLASS}__icon-btn`
    clearBtn.textContent = '×'
    clearBtn.addEventListener('click', () => this._center.clear())
    header.append(this._titleEl, clearBtn)

    this._list = document.createElement('div')
    this._list.className = `${ROOT_CLASS}__list`

    this._panel.append(header, this._list)
    this._root.append(this._backdrop, this._bell, this._panel)
    this._host.appendChild(this._root)

    this.applyTheme()
    this.applyLayout(acedGetUiLayout())
    this.refreshChromeLabels()

    this._unsubs.push(
      this._center.subscribe?.(() => this.render()) ?? (() => undefined)
    )
    this._unsubs.push(acedSubscribeUiTheme(() => this.applyTheme()))
    this._unsubs.push(
      acedSubscribeUiLayout(kind => {
        this.applyLayout(kind)
      })
    )

    this._onDocPointer = (event: Event) => {
      if (!this._panelOpen) return
      const target = event.target as Node | null
      if (!target) return
      if (this._root.contains(target)) return
      this.setPanelOpen(false)
    }
    document.addEventListener('pointerdown', this._onDocPointer, true)

    this._onWindowResize = () => this.scheduleReposition()
    window.addEventListener('resize', this._onWindowResize)

    if (typeof ResizeObserver !== 'undefined') {
      this._shortcutObserver = new ResizeObserver(() =>
        this.scheduleReposition()
      )
      this._shortcutObserver.observe(this._host)
      const shell = findShortcutToolbarShell(this._host)
      if (shell) this._shortcutObserver.observe(shell)
    }

    this.render()
  }

  private _onDocPointer: (event: Event) => void
  private _onWindowResize: () => void

  private applyTheme() {
    acedApplyUiTheme(resolveUiTheme(this._host), this._root)
  }

  private applyLayout(kind: AcEdUiLayoutKind) {
    this._layoutKind = kind
    const topAnchor = shouldAnchorBelowShortcut(kind)
    this._root.classList.toggle(`${ROOT_CLASS}--phone`, kind === 'phone')
    this._root.classList.toggle(`${ROOT_CLASS}--pad`, kind === 'pad')
    this._root.classList.toggle(`${ROOT_CLASS}--desktop`, kind === 'desktop')
    this._root.classList.toggle(`${ROOT_CLASS}--top-anchor`, topAnchor)
    this._root.classList.toggle(`${ROOT_CLASS}--bottom-anchor`, !topAnchor)
    this.syncPanelVisibility()
    this.scheduleReposition()
  }

  /**
   * Places the bell (and non-phone panel) below the live shortcut toolbar on
   * phone/pad/handheld. Desktop uses CSS bottom-right on the full-host root.
   *
   * The root always covers the canvas host (`inset: 0`) so panel `width: 100%`
   * resolves against the drawing area, not the 36px bell box.
   */
  private repositionChrome() {
    // Root always fills the host; never pin the root box to the bell.
    this._root.style.top = ''
    this._root.style.right = ''
    this._root.style.bottom = ''
    this._root.style.left = ''

    if (!shouldAnchorBelowShortcut(this._layoutKind)) {
      this._bell.style.top = ''
      this._bell.style.right = ''
      this._bell.style.bottom = ''
      this._panel.style.top = ''
      this._panel.style.right = ''
      return
    }

    const gap = SHORTCUT_CLEARANCE_PX
    let top = FALLBACK_TOP_BELOW_SHORTCUT_PX
    const shell = findShortcutToolbarShell(this._host)
    if (shell) {
      if (this._shortcutObserver) {
        try {
          this._shortcutObserver.observe(shell)
        } catch {
          // Already observed.
        }
      }
      const hostRect = this._host.getBoundingClientRect()
      const shellRect = shell.getBoundingClientRect()
      top = Math.round(shellRect.bottom - hostRect.top + gap)
    }

    top = Math.max(gap, top)
    this._bell.style.top = `${top}px`
    this._bell.style.right = '12px'
    this._bell.style.bottom = 'auto'

    // Phone uses a full-width top sheet; pad keeps a popover under the bell.
    if (this._layoutKind === 'phone') {
      this._panel.style.top = ''
      this._panel.style.right = ''
    } else {
      this._panel.style.top = `${top + 44}px`
      this._panel.style.right = '12px'
    }
  }

  private scheduleReposition() {
    if (this._repositionRaf) {
      cancelAnimationFrame(this._repositionRaf)
    }
    this._repositionRaf = requestAnimationFrame(() => {
      this._repositionRaf = 0
      this.repositionChrome()
    })
  }

  private refreshChromeLabels() {
    const title = acapI18nTranslate('main.notification.center.title')
    this._bell.title = title
    this._bell.setAttribute('aria-label', title)
    this._titleEl.textContent = title
    this._panel.setAttribute('aria-label', title)
  }

  private setPanelOpen(open: boolean) {
    if (this._center.notifications.length === 0) {
      open = false
    }
    this._panelOpen = open
    this.syncPanelVisibility()
    if (open) this.renderList()
  }

  private syncPanelVisibility() {
    const hasMessages = this._center.notifications.length > 0
    this._root.hidden = !hasMessages
    this._panel.hidden = !hasMessages || !this._panelOpen
    const showBackdrop =
      hasMessages && this._panelOpen && this._layoutKind === 'phone'
    this._backdrop.hidden = !showBackdrop
    this._bell.setAttribute('aria-expanded', String(this._panelOpen))
    if (hasMessages) {
      this.scheduleReposition()
    }
  }

  private render() {
    const count = this._center.notifications.length
    if (count === 0) {
      this._panelOpen = false
      this._expandedGroups.clear()
      this.syncPanelVisibility()
      return
    }

    this._badge.textContent = count > 99 ? '99+' : String(count)
    this.syncPanelVisibility()
    if (this._panelOpen) {
      this.renderList()
    }
  }

  private renderList() {
    this.refreshChromeLabels()
    this._list.replaceChildren()
    const notifications = this._center.notifications
    if (notifications.length === 0) {
      const empty = document.createElement('div')
      empty.className = `${ROOT_CLASS}__empty`
      empty.textContent = acapI18nTranslate(
        'main.notification.center.noNotifications'
      )
      this._list.appendChild(empty)
      return
    }

    for (const group of acapGroupNotifications(notifications)) {
      if (group.collapsible) {
        this._list.appendChild(this.renderGroup(group))
      } else {
        this._list.appendChild(this.renderItem(group.items[0]))
      }
    }
  }

  private renderGroup(group: AcApNotificationGroup): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = `${ROOT_CLASS}__group`

    const header = document.createElement('button')
    header.type = 'button'
    header.className = `${ROOT_CLASS}__group-header`
    const expanded = this._expandedGroups.has(group.key)
    header.innerHTML = `<span class="${ROOT_CLASS}__group-title">${escapeHtml(groupTitle(group))}</span><span class="${ROOT_CLASS}__group-summary">${escapeHtml(groupSummary(group))}</span>`
    header.addEventListener('click', () => {
      if (this._expandedGroups.has(group.key)) {
        this._expandedGroups.delete(group.key)
      } else {
        this._expandedGroups.add(group.key)
      }
      this.renderList()
    })
    wrap.appendChild(header)

    if (expanded) {
      const body = document.createElement('div')
      body.className = `${ROOT_CLASS}__group-body`
      for (const item of group.items) {
        body.appendChild(this.renderItem(item))
      }
      wrap.appendChild(body)
    }
    return wrap
  }

  private renderItem(notification: AcApNotification): HTMLElement {
    const item = document.createElement('div')
    item.className = `${ROOT_CLASS}__item ${ROOT_CLASS}__item--${notification.type}`

    const title = document.createElement('div')
    title.className = `${ROOT_CLASS}__item-title`
    title.textContent = notification.title

    const close = document.createElement('button')
    close.type = 'button'
    close.className = `${ROOT_CLASS}__icon-btn`
    close.textContent = '×'
    close.addEventListener('click', () => this._center.remove(notification.id))

    const head = document.createElement('div')
    head.className = `${ROOT_CLASS}__item-head`
    head.append(title, close)

    item.appendChild(head)
    if (notification.message) {
      const message = document.createElement('div')
      message.className = `${ROOT_CLASS}__item-message`
      message.textContent = notification.message
      item.appendChild(message)
    }
    return item
  }

  dispose() {
    for (const unsub of this._unsubs) unsub()
    this._unsubs.length = 0
    document.removeEventListener('pointerdown', this._onDocPointer, true)
    window.removeEventListener('resize', this._onWindowResize)
    this._shortcutObserver?.disconnect()
    this._shortcutObserver = undefined
    if (this._repositionRaf) {
      cancelAnimationFrame(this._repositionRaf)
      this._repositionRaf = 0
    }
    this._root.remove()
  }
}

function shouldAnchorBelowShortcut(kind: AcEdUiLayoutKind): boolean {
  return kind === 'phone' || kind === 'pad' || acedIsHandheldDevice()
}

function findShortcutToolbarShell(host: HTMLElement): HTMLElement | null {
  const visible = (el: Element | null): el is HTMLElement =>
    !!el &&
    el instanceof HTMLElement &&
    !el.hasAttribute('hidden') &&
    el.getClientRects().length > 0

  const scoped = host.querySelector('.ml-ui-shortcut-toolbar-shell')
  if (visible(scoped)) return scoped

  const global = document.querySelector('.ml-ui-shortcut-toolbar-shell')
  if (visible(global)) return global

  return null
}

function groupTitle(group: AcApNotificationGroup): string {
  const source = group.source as AcApNotificationSource | undefined
  if (source === 'font-missed') {
    return acapI18nTranslate('main.notification.group.fontMissed')
  }
  if (source === 'unsupported-entities') {
    return acapI18nTranslate('main.notification.group.unsupportedEntities')
  }
  return group.items[0]?.title ?? ''
}

function groupSummary(group: AcApNotificationGroup): string {
  const count = group.items.length
  if (group.source === 'font-missed') {
    return acapI18nTranslate('main.notification.group.fontMissedSummary', {
      count
    })
  }
  if (group.source === 'unsupported-entities') {
    return acapI18nTranslate(
      'main.notification.group.unsupportedEntitiesSummary',
      { count }
    )
  }
  return acapI18nTranslate('main.notification.group.genericSummary', { count })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ensureStyles() {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(STYLE_ID)
  if (existing) existing.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.${ROOT_CLASS} {
  /* Fill the canvas host so panel % widths resolve against the drawing area. */
  position: absolute;
  inset: 0;
  z-index: ${ML_UI_Z_NOTIFICATION};
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  font-size: 13px;
  color: var(--ml-ui-text);
  pointer-events: none;
}
.${ROOT_CLASS}[hidden],
.${ROOT_CLASS}__backdrop[hidden],
.${ROOT_CLASS}__panel[hidden] {
  display: none !important;
}
.${ROOT_CLASS} > * {
  pointer-events: auto;
}
.${ROOT_CLASS}__backdrop {
  /* Cover the canvas host only — not the full browser viewport. */
  position: absolute;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: none;
  cursor: pointer;
  background: var(--ml-ui-overlay);
}
.${ROOT_CLASS}__bell {
  position: absolute;
  z-index: 2;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--ml-ui-border);
  background: var(--ml-ui-bg);
  color: var(--ml-ui-text);
  cursor: pointer;
  box-shadow: var(--ml-ui-shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.${ROOT_CLASS}--bottom-anchor .${ROOT_CLASS}__bell {
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom, 0px));
}
.${ROOT_CLASS}--top-anchor .${ROOT_CLASS}__bell {
  /* top/right applied inline from shortcut-toolbar measurement */
  right: 12px;
}
.${ROOT_CLASS}__bell:hover {
  color: var(--ml-ui-accent);
}
.${ROOT_CLASS}__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--ml-ui-danger);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}
.${ROOT_CLASS}__panel {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  background: var(--ml-ui-bg);
  border: 1px solid var(--ml-ui-border);
  box-shadow: var(--ml-ui-shadow);
  overflow: hidden;
}
.${ROOT_CLASS}--bottom-anchor .${ROOT_CLASS}__panel {
  right: 12px;
  bottom: calc(max(12px, env(safe-area-inset-bottom, 0px)) + 44px);
  width: min(360px, calc(100% - 24px));
  max-height: min(420px, 60%);
  border-radius: 8px;
}
.${ROOT_CLASS}--top-anchor .${ROOT_CLASS}__panel {
  /* top/right set inline under the bell on pad; phone overrides below */
  width: min(360px, calc(100% - 24px));
  max-height: min(420px, 55%);
  border-radius: 8px;
}
.${ROOT_CLASS}--phone.${ROOT_CLASS}--top-anchor .${ROOT_CLASS}__panel {
  /* Sheet spans the canvas host, not the browser viewport. */
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-height: min(55%, 420px);
  border-radius: 0 0 12px 12px;
  border-left: none;
  border-right: none;
  border-top: none;
  padding-top: env(safe-area-inset-top, 0px);
}
.${ROOT_CLASS}__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ml-ui-border);
  font-weight: 600;
  color: var(--ml-ui-text);
}
.${ROOT_CLASS}__list {
  overflow: auto;
  max-height: inherit;
  flex: 1;
}
.${ROOT_CLASS}__empty {
  padding: 28px 16px;
  text-align: center;
  color: var(--ml-ui-text-muted);
}
.${ROOT_CLASS}__item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--ml-ui-border);
}
.${ROOT_CLASS}__item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.${ROOT_CLASS}__item-title {
  font-weight: 600;
  line-height: 1.35;
  color: var(--ml-ui-text);
}
.${ROOT_CLASS}__item-message {
  margin-top: 4px;
  color: var(--ml-ui-text-muted);
  line-height: 1.4;
  word-break: break-word;
}
.${ROOT_CLASS}__item--warning .${ROOT_CLASS}__item-title {
  color: var(--el-color-warning, #e6a23c);
}
.${ROOT_CLASS}__item--error .${ROOT_CLASS}__item-title {
  color: var(--ml-ui-danger);
}
.${ROOT_CLASS}__item--success .${ROOT_CLASS}__item-title {
  color: var(--el-color-success, #67c23a);
}
.${ROOT_CLASS}__item--info .${ROOT_CLASS}__item-title {
  color: var(--ml-ui-accent);
}
.${ROOT_CLASS}__icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--ml-ui-text-muted);
  padding: 0 2px;
}
.${ROOT_CLASS}__group-header {
  width: 100%;
  text-align: left;
  border: none;
  background: color-mix(in srgb, var(--ml-ui-text) 4%, var(--ml-ui-bg));
  cursor: pointer;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ml-ui-border);
  color: var(--ml-ui-text);
}
.${ROOT_CLASS}__group-title {
  display: block;
  font-weight: 600;
}
.${ROOT_CLASS}__group-summary {
  display: block;
  margin-top: 2px;
  color: var(--ml-ui-text-muted);
  font-size: 12px;
}
.${ROOT_CLASS}__group-body .${ROOT_CLASS}__item {
  padding-left: 20px;
}
`
  document.head.appendChild(style)
}
