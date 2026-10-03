import {
  ACAP_GROUPABLE_NOTIFICATION_SOURCES,
  acapGroupNotifications,
  type AcApNotification,
  type AcApNotificationAction,
  type AcApNotificationGroup,
  type AcApNotificationSource,
  AcApNotificationStore} from '@mlightcad/cad-simple-viewer'
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

/** Vue reactivity over the native store's document/runtime ownership rules. */
class NotificationCenter extends AcApNotificationStore {
  private readonly revision = ref(0)

  constructor() {
    super()
    this.observe()
  }

  private observe() {
    this.subscribe(() => {
      this.revision.value++
    })
  }

  readonly allNotifications = computed(() => {
    this.revision.value
    return [...this.notifications]
  })
  readonly unreadCountRef = computed(() => this.allNotifications.value.length)
  readonly hasNotifications = computed(() => this.unreadCountRef.value > 0)

  override dispose() {
    super.dispose()
    this.revision.value++
    // This application service survives viewer unmount/remount.
    this.observe()
  }

  clearAll() {
    this.clear()
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
    unreadCount: notificationCenter.unreadCountRef,
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
