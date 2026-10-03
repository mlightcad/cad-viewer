import {
  type AcApNotification,
  type AcApNotificationCenter,
  type AcApNotificationInput,
  type AcApNotificationSource,
  acapSetNotificationCenter
} from '@mlightcad/cad-simple-viewer'

import { useNotificationCenter } from '../composable/useNotificationCenter'

/**
 * Adapts the Vue {@link useNotificationCenter} singleton to the
 * {@link AcApNotificationCenter} contract used by cad-simple-viewer.
 *
 * Calling {@link registerCadViewerNotificationCenter} replaces the built-in DOM
 * notification UI so font / unsupported-entity alerts appear in the Vue panel.
 *
 * @returns A center adapter that forwards into the Vue notification store.
 */
export function createCadViewerNotificationCenterAdapter(): AcApNotificationCenter {
  const vue = useNotificationCenter()

  return {
    /**
     * Visible runtime and active-document notifications from the Vue store.
     */
    get notifications() {
      return vue.notifications.value
    },
    /**
     * Visible runtime and active-document unread count from the Vue store.
     */
    get unreadCount() {
      return vue.unreadCount.value
    },
    /**
     * @param notification - Entry fields without `id` / `timestamp`.
     * @returns Assigned notification id.
     */
    add(notification: AcApNotificationInput) {
      return vue.add(notification)
    },
    /**
     * @param title - Headline text.
     * @param message - Optional body.
     * @param options - Extra fields merged into the entry.
     * @returns Assigned notification id.
     */
    info(title, message, options) {
      return vue.info(title, message, options)
    },
    /**
     * @param title - Headline text.
     * @param message - Optional body.
     * @param options - Extra fields merged into the entry.
     * @returns Assigned notification id.
     */
    warning(title, message, options) {
      return vue.warning(title, message, options)
    },
    /**
     * @param title - Headline text.
     * @param message - Optional body.
     * @param options - Extra fields merged into the entry.
     * @returns Assigned notification id.
     */
    error(title, message, options) {
      return vue.error(title, message, options)
    },
    /**
     * @param title - Headline text.
     * @param message - Optional body.
     * @param options - Extra fields merged into the entry.
     * @returns Assigned notification id.
     */
    success(title, message, options) {
      return vue.success(title, message, options)
    },
    /**
     * @param id - Notification id to remove.
     */
    remove(id) {
      vue.remove(id)
    },
    /**
     * Dismisses visible runtime and active-document notifications.
     */
    clear() {
      vue.clear()
    },
    /**
     * @param predicate - Return `true` for entries that should be removed.
     */
    removeWhere(predicate) {
      vue.removeWhere(predicate as (n: AcApNotification) => boolean)
    },
    /**
     * @param source - Producer to clear from visible runtime/document entries.
     */
    removeBySource(source: AcApNotificationSource) {
      vue.removeBySource(source)
    },
    /**
     * @param missedFontNames - Fonts that are still unresolved.
     */
    removeResolvedFontMissedNotifications(missedFontNames) {
      vue.removeResolvedFontMissedNotifications(missedFontNames)
    },
    /**
     * @param sessionId - Active document session id, or `null`.
     */
    setActiveSession(sessionId) {
      vue.setActiveSession(sessionId)
    },
    /**
     * @param sessionId - Closed session whose bucket should be dropped.
     */
    clearSession(sessionId) {
      vue.clearSession(sessionId)
    },
    /**
     * Clears every Vue store bucket (viewer unmount / remount safety).
     */
    dispose() {
      vue.dispose()
    }
  }
}

/**
 * Registers the Vue notification center as the active host override.
 */
export function registerCadViewerNotificationCenter() {
  acapSetNotificationCenter(createCadViewerNotificationCenterAdapter())
}

/**
 * Restores the built-in cad-simple-viewer notification center.
 */
export function unregisterCadViewerNotificationCenter() {
  acapSetNotificationCenter(null)
}
