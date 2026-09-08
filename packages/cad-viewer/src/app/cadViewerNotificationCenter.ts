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
 */
export function createCadViewerNotificationCenterAdapter(): AcApNotificationCenter {
  const vue = useNotificationCenter()

  return {
    get notifications() {
      return vue.notifications.value
    },
    get unreadCount() {
      return vue.unreadCount.value
    },
    add(notification: AcApNotificationInput) {
      return vue.add(notification)
    },
    info(title, message, options) {
      return vue.info(title, message, options)
    },
    warning(title, message, options) {
      return vue.warning(title, message, options)
    },
    error(title, message, options) {
      return vue.error(title, message, options)
    },
    success(title, message, options) {
      return vue.success(title, message, options)
    },
    remove(id) {
      vue.remove(id)
    },
    clear() {
      vue.clear()
    },
    removeWhere(predicate) {
      vue.removeWhere(predicate as (n: AcApNotification) => boolean)
    },
    removeBySource(source: AcApNotificationSource) {
      vue.removeBySource(source)
    },
    removeResolvedFontMissedNotifications(missedFontNames) {
      vue.removeResolvedFontMissedNotifications(missedFontNames)
    },
    setActiveSession(sessionId) {
      vue.setActiveSession(sessionId)
    },
    clearSession(sessionId) {
      vue.clearSession(sessionId)
    },
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
