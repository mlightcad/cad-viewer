/**
 * Identifies the subsystem that produced a notification for grouping / cleanup.
 */
export type AcApNotificationSource = 'font-missed' | 'unsupported-entities'

/**
 * Sources the default / Vue UIs collapse into expandable groups.
 */
export const ACAP_GROUPABLE_NOTIFICATION_SOURCES: readonly AcApNotificationSource[] =
  ['font-missed', 'unsupported-entities'] as const

/**
 * Visual severity category for a notification entry.
 */
export type AcApNotificationType = 'info' | 'warning' | 'error' | 'success'

/**
 * A clickable action rendered on a notification.
 */
export interface AcApNotificationAction {
  /** Button label shown in the UI. */
  label: string
  /** Handler invoked when the action is activated. */
  action: () => void
  /** When `true`, the UI may emphasize this action as the primary choice. */
  primary?: boolean
}

/**
 * One notification entry stored in a session bucket.
 */
export interface AcApNotification {
  /** Stable id assigned by the store (`notification-N`). */
  id: string
  /** Visual severity and icon category. */
  type: AcApNotificationType
  /** Short headline shown in the list / panel. */
  title: string
  /** Optional longer body text. */
  message?: string
  /** Creation time used for ordering and relative timestamps. */
  timestamp: Date
  /** Optional action buttons rendered with the entry. */
  actions?: AcApNotificationAction[]
  /** When `true`, hosts should not auto-dismiss the entry. */
  persistent?: boolean
  /** Optional auto-dismiss delay in milliseconds (host-defined). */
  timeout?: number
  /** Producer used for grouping and selective removal. */
  source?: AcApNotificationSource
  /**
   * Font names associated with a `font-missed` notification, used when pruning
   * resolved missing-font alerts.
   */
  fontNames?: string[]
  /**
   * {@link AcApDocSession.id} of the document this notification belongs to.
   * Assigned by the store when omitted (uses the active session).
   */
  sessionId?: string
}

/**
 * Fields accepted when creating a notification (`id` / `timestamp` assigned by the store).
 */
export type AcApNotificationInput = Omit<AcApNotification, 'id' | 'timestamp'>

/**
 * Host-replaceable notification center API.
 *
 * Notifications are **per document session** (MDI). {@link notifications} and
 * {@link unreadCount} always reflect the active session set via
 * {@link setActiveSession}. Hosts such as `cad-viewer` can call
 * {@link acapSetNotificationCenter} to supply their own UI while reusing the
 * shared event bridge.
 */
export interface AcApNotificationCenter {
  /** Notifications for the active document session only. */
  readonly notifications: readonly AcApNotification[]
  /** Number of notifications in the active session (same as list length). */
  readonly unreadCount: number
  /**
   * Inserts a notification into the resolved session bucket.
   *
   * @param notification - Entry fields without `id` / `timestamp`.
   * @returns The assigned id, or `''` when no session could be resolved.
   */
  add(notification: AcApNotificationInput): string
  /**
   * Adds an `info` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  info(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  /**
   * Adds a `warning` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  warning(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  /**
   * Adds an `error` notification (defaults to `persistent: true`).
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  error(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  /**
   * Adds a `success` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  success(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  /**
   * Removes a notification by id from any session bucket.
   *
   * @param id - Notification id previously returned by {@link add}.
   */
  remove(id: string): void
  /** Clears notifications for the active session. */
  clear(): void
  /**
   * Removes notifications matching a predicate from the active session.
   *
   * @param predicate - Return `true` for entries that should be removed.
   */
  removeWhere(predicate: (notification: AcApNotification) => boolean): void
  /**
   * Removes all active-session notifications with the given {@link source}.
   *
   * @param source - Producer to clear.
   */
  removeBySource(source: AcApNotificationSource): void
  /**
   * Drops `font-missed` entries that no longer apply given the still-missing fonts.
   *
   * @param missedFontNames - Fonts that are still unresolved; entries whose
   *   `fontNames` no longer intersect this set are removed. An empty set removes
   *   every `font-missed` entry in the active session.
   */
  removeResolvedFontMissedNotifications(
    missedFontNames: Iterable<string>
  ): void
  /**
   * Switches which document's list is exposed via {@link notifications}.
   * Called by the event bridge on document activate.
   *
   * @param sessionId - Active {@link AcApDocSession.id}, or `null` when none.
   */
  setActiveSession(sessionId: string | null): void
  /**
   * Drops all notifications for a closed document session.
   *
   * @param sessionId - Session whose bucket should be deleted.
   */
  clearSession(sessionId: string): void
  /**
   * Subscribe to list / active-session changes. Returns an unsubscribe function.
   * Optional for custom centers that do not need observation.
   *
   * @param listener - Callback invoked after any mutating change.
   * @returns Function that removes the listener.
   */
  subscribe?(listener: () => void): () => void
  /** Dispose UI / listeners owned by this center. Optional. */
  dispose?(): void
}

/**
 * One visual group produced by {@link acapGroupNotifications} for panel UIs.
 */
export interface AcApNotificationGroup {
  /** Stable key (`font-missed`, `unsupported-entities`, or `single:<id>`). */
  key: string
  /** Present when the group collapses a groupable {@link AcApNotificationSource}. */
  source?: AcApNotificationSource
  /** Entries in insertion order within the group. */
  items: AcApNotification[]
  /** `true` when the UI should render an expandable header (multiple items). */
  collapsible: boolean
  /** Highest-severity type among {@link items}. */
  type: AcApNotificationType
  /** Newest {@link AcApNotification.timestamp} in the group. */
  latestTimestamp: Date
}

/**
 * Severity rank used when collapsing groupable notifications into one header type.
 */
const TYPE_RANK: Record<AcApNotificationType, number> = {
  error: 3,
  warning: 2,
  info: 1,
  success: 0
}

/**
 * Groups notifications for UI panels (`font-missed` / `unsupported-entities` collapse).
 *
 * @param notifications - Flat list for the active session (newest first).
 * @returns Groups in first-seen order; collapsible only when a groupable source
 *   has more than one item.
 */
export function acapGroupNotifications(
  notifications: readonly AcApNotification[]
): AcApNotificationGroup[] {
  const groups = new Map<string, AcApNotificationGroup>()
  const order: string[] = []

  for (const notification of notifications) {
    const source = notification.source
    const isGroupable =
      source != null &&
      (ACAP_GROUPABLE_NOTIFICATION_SOURCES as readonly string[]).includes(
        source
      )
    const key = isGroupable ? source! : `single:${notification.id}`

    const existing = groups.get(key)
    if (existing) {
      existing.items.push(notification)
      if (TYPE_RANK[notification.type] > TYPE_RANK[existing.type]) {
        existing.type = notification.type
      }
      if (notification.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = notification.timestamp
      }
      continue
    }

    groups.set(key, {
      key,
      source: isGroupable ? source : undefined,
      items: [notification],
      collapsible: false,
      type: notification.type,
      latestTimestamp: notification.timestamp
    })
    order.push(key)
  }

  return order.map(key => {
    const group = groups.get(key)!
    group.collapsible = group.source != null && group.items.length > 1
    return group
  })
}
