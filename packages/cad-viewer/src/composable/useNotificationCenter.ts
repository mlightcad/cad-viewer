import { computed, ref } from 'vue'

/**
 * Identifies the subsystem or feature that produced a notification.
 *
 * Used to group related notifications and remove them selectively (for example,
 * when the underlying issue is resolved) without clearing unrelated entries.
 *
 * @remarks
 * Currently only `font-missed` is defined. Additional sources may be added as
 * new notification producers are integrated.
 */
export type NotificationSource = 'font-missed'

/**
 * A single notification entry displayed in the notification center panel.
 *
 * Notifications are ordered by insertion time (newest first) and may include
 * optional action buttons and auto-dismiss behavior.
 */
export interface Notification {
  /** Unique identifier assigned automatically when the notification is created. */
  id: string
  /** Visual severity and icon category (`info`, `warning`, `error`, or `success`). */
  type: 'info' | 'warning' | 'error' | 'success'
  /** Short headline shown in the notification header. */
  title: string
  /** Optional longer description body; omitted for title-only toasts. */
  message?: string
  /** Time the notification was created. */
  timestamp: Date
  /** Optional buttons that invoke callbacks when clicked. */
  actions?: NotificationAction[]
  /**
   * When `true`, the notification is not auto-dismissed and must be closed
   * manually or via {@link NotificationCenter.remove}.
   */
  persistent?: boolean
  /**
   * Auto-dismiss delay in milliseconds.
   * Ignored when {@link Notification.persistent | persistent} is `true`.
   */
  timeout?: number
  /**
   * Groups related notifications for selective removal
   * (e.g. resolved missed-font alerts).
   */
  source?: NotificationSource
  /**
   * Font names referenced by this notification; used by
   * {@link NotificationCenter.removeResolvedFontMissedNotifications} to clear
   * entries when those fonts are no longer missing.
   */
  fontNames?: string[]
}

/**
 * A clickable action rendered as a button on a notification.
 */
export interface NotificationAction {
  /** Button label text displayed to the user. */
  label: string
  /** Callback invoked when the user clicks the button. */
  action: () => void
  /** When `true`, renders the button with primary (emphasized) styling. */
  primary?: boolean
}

/**
 * Singleton service that stores and manages the global notification list.
 *
 * All state is held in Vue refs so consumers bound through
 * {@link useNotificationCenter} receive reactive updates when notifications
 * are added or removed.
 */
class NotificationCenter {
  /** Reactive backing store for all active notifications (newest first). */
  private notifications = ref<Notification[]>([])
  /** Monotonic counter used to generate unique notification IDs. */
  private nextId = 1

  /**
   * Reactive computed list of all notifications, ordered newest first.
   *
   * @returns A Vue computed ref whose value is the current notification array.
   */
  get allNotifications() {
    return computed(() => this.notifications.value)
  }

  /**
   * Reactive count of active notifications.
   *
   * @returns A Vue computed ref whose value equals the number of notifications.
   */
  get unreadCount() {
    return computed(() => this.notifications.value.length)
  }

  /**
   * Reactive flag indicating whether any notifications are present.
   *
   * @returns A Vue computed ref that is `true` when at least one notification exists.
   */
  get hasNotifications() {
    return computed(() => this.notifications.value.length > 0)
  }

  /**
   * Creates and prepends a new notification to the list.
   *
   * @param notification - Notification fields excluding auto-assigned `id` and `timestamp`.
   * @returns The generated notification ID, usable with {@link NotificationCenter.remove}.
   */
  add(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${this.nextId++}`,
      timestamp: new Date()
    }

    this.notifications.value.unshift(newNotification)

    return newNotification.id
  }

  /**
   * Removes a single notification by its ID.
   *
   * No-op if no notification with the given ID exists.
   *
   * @param id - The notification ID returned by {@link NotificationCenter.add}.
   */
  remove(id: string) {
    const index = this.notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      this.notifications.value.splice(index, 1)
    }
  }

  /**
   * Removes all notifications from the center.
   */
  clear() {
    this.notifications.value = []
  }

  /**
   * Alias for {@link NotificationCenter.clear}.
   * Provided for API symmetry with other "clear all" patterns in the viewer.
   */
  clearAll() {
    this.clear()
  }

  /**
   * Removes every notification for which the predicate returns `true`.
   *
   * @param predicate - Called for each notification; return `true` to remove it.
   */
  removeWhere(predicate: (notification: Notification) => boolean) {
    this.notifications.value = this.notifications.value.filter(
      notification => !predicate(notification)
    )
  }

  /**
   * Removes all notifications tagged with the given {@link NotificationSource}.
   *
   * @param source - The source tag to match (e.g. `'font-missed'`).
   */
  removeBySource(source: NotificationSource) {
    this.removeWhere(notification => notification.source === source)
  }

  /**
   * Drops `font-missed` notifications whose fonts are no longer reported as missing.
   *
   * When the missed-font set is empty, removes all `font-missed` notifications.
   * Otherwise, removes only entries whose {@link Notification.fontNames} no longer
   * intersect the current missed set.
   *
   * @param missedFontNames - Iterable of font names still reported as missing.
   */
  removeResolvedFontMissedNotifications(missedFontNames: Iterable<string>) {
    const missed = new Set(missedFontNames)
    this.removeWhere(notification => {
      if (notification.source !== 'font-missed') return false
      if (missed.size === 0) return true
      if (!notification.fontNames?.length) return false
      return !notification.fontNames.some(fontName => missed.has(fontName))
    })
  }

  /**
   * Adds an informational notification.
   *
   * @param title - Notification headline.
   * @param message - Optional body text.
   * @param options - Additional fields (actions, timeout, source, etc.).
   * @returns The generated notification ID.
   */
  info(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  /**
   * Adds a warning notification.
   *
   * @param title - Notification headline.
   * @param message - Optional body text.
   * @param options - Additional fields (actions, timeout, source, etc.).
   * @returns The generated notification ID.
   */
  warning(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  /**
   * Adds an error notification.
   *
   * Errors are {@link Notification.persistent | persistent} by default so they
   * remain visible until the user dismisses them or takes an action.
   *
   * @param title - Notification headline.
   * @param message - Optional body text.
   * @param options - Additional fields; `persistent: false` overrides the default.
   * @returns The generated notification ID.
   */
  error(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true, // Errors are persistent by default
      ...options
    })
  }

  /**
   * Adds a success notification.
   *
   * @param title - Notification headline.
   * @param message - Optional body text.
   * @param options - Additional fields (actions, timeout, source, etc.).
   * @returns The generated notification ID.
   */
  success(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'success',
      title,
      message,
      ...options
    })
  }
}

/** Shared global {@link NotificationCenter} instance used by {@link useNotificationCenter}. */
const notificationCenter = new NotificationCenter()

/**
 * Composable that exposes the global notification center.
 *
 * Provides a centralized notification system similar to Visual Studio Code.
 * All returned state is reactive; multiple callers share the same underlying list.
 *
 * @returns Notification management functions and reactive state.
 *
 * @example
 * ```typescript
 * import { useNotificationCenter } from '@mlightcad/cad-viewer'
 *
 * const { info, warning, error, success, notifications, unreadCount } = useNotificationCenter()
 *
 * // Add different types of notifications
 * info('Information', 'This is an info message')
 * warning('Warning', 'This is a warning message')
 * error('Error', 'This is an error message')
 * success('Success', 'This is a success message')
 *
 * // Add notification with actions
 * error('File Error', 'Failed to load file', {
 *   actions: [
 *     { label: 'Retry', action: () => retryLoad(), primary: true },
 *     { label: 'Cancel', action: () => cancel() }
 *   ],
 *   persistent: true
 * })
 *
 * // Check notification count
 * console.log(`You have ${unreadCount.value} notifications`)
 * ```
 */
export function useNotificationCenter() {
  return {
    /** Reactive list of all notifications, ordered newest first. */
    notifications: notificationCenter.allNotifications,
    /** Reactive count of active notifications. */
    unreadCount: notificationCenter.unreadCount,
    /** Reactive boolean; `true` when at least one notification exists. */
    hasNotifications: notificationCenter.hasNotifications,
    /** Creates and prepends a custom notification. Returns the new notification ID. */
    add: notificationCenter.add.bind(notificationCenter),
    /** Removes a notification by ID. No-op if the ID is not found. */
    remove: notificationCenter.remove.bind(notificationCenter),
    /** Removes all notifications from the center. */
    clear: notificationCenter.clear.bind(notificationCenter),
    /** Alias for {@link NotificationCenter.clear}. */
    clearAll: notificationCenter.clearAll.bind(notificationCenter),
    /** Removes notifications for which the predicate returns `true`. */
    removeWhere: notificationCenter.removeWhere.bind(notificationCenter),
    /** Removes all notifications tagged with the given {@link NotificationSource}. */
    removeBySource: notificationCenter.removeBySource.bind(notificationCenter),
    /** Removes resolved `font-missed` notifications based on the current missed-font set. */
    removeResolvedFontMissedNotifications:
      notificationCenter.removeResolvedFontMissedNotifications.bind(
        notificationCenter
      ),
    /** Adds an informational notification. Returns the new notification ID. */
    info: notificationCenter.info.bind(notificationCenter),
    /** Adds a warning notification. Returns the new notification ID. */
    warning: notificationCenter.warning.bind(notificationCenter),
    /** Adds an error notification (persistent by default). Returns the new notification ID. */
    error: notificationCenter.error.bind(notificationCenter),
    /** Adds a success notification. Returns the new notification ID. */
    success: notificationCenter.success.bind(notificationCenter)
  }
}
