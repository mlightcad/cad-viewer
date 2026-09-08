import {
  ACAP_GROUPABLE_NOTIFICATION_SOURCES,
  acapGroupNotifications,
  type AcApNotification,
  type AcApNotificationAction,
  type AcApNotificationGroup,
  type AcApNotificationSource
} from '@mlightcad/cad-simple-viewer'
import { computed, ref } from 'vue'

/**
 * @deprecated Prefer {@link AcApNotificationSource} from cad-simple-viewer.
 */
export type NotificationSource = AcApNotificationSource

/** @deprecated Prefer {@link ACAP_GROUPABLE_NOTIFICATION_SOURCES}. */
export const GROUPABLE_NOTIFICATION_SOURCES =
  ACAP_GROUPABLE_NOTIFICATION_SOURCES

/**
 * Vue notification entry. Structurally compatible with {@link AcApNotification}.
 */
export type Notification = AcApNotification

export type NotificationGroup = AcApNotificationGroup

export type NotificationAction = AcApNotificationAction

/**
 * Groups notifications for the Vue notification center panel.
 */
export function groupNotifications(
  notifications: Notification[]
): NotificationGroup[] {
  return acapGroupNotifications(notifications)
}

/**
 * Singleton service that stores notifications **per document session** (MDI).
 *
 * {@link useNotificationCenter} exposes only the active session's list as Vue
 * refs so the panel and status-bar badge update when switching documents.
 */
class NotificationCenter {
  private buckets = ref<Record<string, Notification[]>>({})
  private activeSessionId = ref<string | null>(null)
  private nextId = 1

  private listFor(sessionId: string | null): Notification[] {
    if (sessionId == null) return []
    return this.buckets.value[sessionId] ?? []
  }

  private setList(sessionId: string, list: Notification[]) {
    const next = { ...this.buckets.value }
    if (list.length === 0) {
      delete next[sessionId]
    } else {
      next[sessionId] = list
    }
    this.buckets.value = next
  }

  get allNotifications() {
    return computed(() => this.listFor(this.activeSessionId.value))
  }

  get unreadCount() {
    return computed(() => this.listFor(this.activeSessionId.value).length)
  }

  get hasNotifications() {
    return computed(() => this.listFor(this.activeSessionId.value).length > 0)
  }

  setActiveSession(sessionId: string | null) {
    this.activeSessionId.value = sessionId
  }

  clearSession(sessionId: string) {
    if (!(sessionId in this.buckets.value)) return
    const next = { ...this.buckets.value }
    delete next[sessionId]
    this.buckets.value = next
  }

  /**
   * Clears every session bucket. Used when the viewer unmounts so a remount
   * with reused session ids (e.g. `doc-1`) does not show stale alerts.
   */
  dispose() {
    this.buckets.value = {}
    this.activeSessionId.value = null
    this.nextId = 1
  }

  add(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const sessionId = notification.sessionId ?? this.activeSessionId.value
    if (sessionId == null) {
      return ''
    }

    const newNotification: Notification = {
      ...notification,
      sessionId,
      id: `notification-${this.nextId++}`,
      timestamp: new Date()
    }

    this.setList(sessionId, [newNotification, ...this.listFor(sessionId)])
    return newNotification.id
  }

  remove(id: string) {
    for (const sessionId of Object.keys(this.buckets.value)) {
      const list = this.buckets.value[sessionId]
      const index = list.findIndex(n => n.id === id)
      if (index < 0) continue
      const next = list.slice()
      next.splice(index, 1)
      this.setList(sessionId, next)
      return
    }
  }

  clear() {
    const sessionId = this.activeSessionId.value
    if (sessionId == null) return
    this.clearSession(sessionId)
  }

  clearAll() {
    this.clear()
  }

  removeWhere(predicate: (notification: Notification) => boolean) {
    const sessionId = this.activeSessionId.value
    if (sessionId == null) return
    const list = this.listFor(sessionId)
    const next = list.filter(notification => !predicate(notification))
    if (next.length === list.length) return
    this.setList(sessionId, next)
  }

  removeBySource(source: NotificationSource) {
    this.removeWhere(notification => notification.source === source)
  }

  removeResolvedFontMissedNotifications(missedFontNames: Iterable<string>) {
    const missed = new Set(missedFontNames)
    this.removeWhere(notification => {
      if (notification.source !== 'font-missed') return false
      if (missed.size === 0) return true
      if (!notification.fontNames?.length) return false
      return !notification.fontNames.some(fontName => missed.has(fontName))
    })
  }

  info(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  warning(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  error(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  success(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'success',
      title,
      message,
      ...options
    })
  }
}

const notificationCenter = new NotificationCenter()

/**
 * Composable that exposes the Vue notification center used by cad-viewer UI.
 *
 * Registered as the host override via {@link registerCadViewerNotificationCenter}
 * so the shared cad-simple-viewer event bridge writes into this store.
 */
export function useNotificationCenter() {
  return {
    notifications: notificationCenter.allNotifications,
    unreadCount: notificationCenter.unreadCount,
    hasNotifications: notificationCenter.hasNotifications,
    setActiveSession:
      notificationCenter.setActiveSession.bind(notificationCenter),
    clearSession: notificationCenter.clearSession.bind(notificationCenter),
    dispose: notificationCenter.dispose.bind(notificationCenter),
    add: notificationCenter.add.bind(notificationCenter),
    remove: notificationCenter.remove.bind(notificationCenter),
    clear: notificationCenter.clear.bind(notificationCenter),
    clearAll: notificationCenter.clearAll.bind(notificationCenter),
    removeWhere: notificationCenter.removeWhere.bind(notificationCenter),
    removeBySource: notificationCenter.removeBySource.bind(notificationCenter),
    removeResolvedFontMissedNotifications:
      notificationCenter.removeResolvedFontMissedNotifications.bind(
        notificationCenter
      ),
    info: notificationCenter.info.bind(notificationCenter),
    warning: notificationCenter.warning.bind(notificationCenter),
    error: notificationCenter.error.bind(notificationCenter),
    success: notificationCenter.success.bind(notificationCenter)
  }
}
