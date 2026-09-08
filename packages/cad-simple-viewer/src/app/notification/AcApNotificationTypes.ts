/**
 * Identifies the subsystem that produced a notification for grouping / cleanup.
 */
export type AcApNotificationSource = 'font-missed' | 'unsupported-entities'

/** Sources the default / Vue UIs collapse into expandable groups. */
export const ACAP_GROUPABLE_NOTIFICATION_SOURCES: readonly AcApNotificationSource[] =
  ['font-missed', 'unsupported-entities'] as const

export type AcApNotificationType = 'info' | 'warning' | 'error' | 'success'

/**
 * A clickable action rendered on a notification.
 */
export interface AcApNotificationAction {
  label: string
  action: () => void
  primary?: boolean
}

/**
 * One notification entry.
 */
export interface AcApNotification {
  id: string
  type: AcApNotificationType
  title: string
  message?: string
  timestamp: Date
  actions?: AcApNotificationAction[]
  persistent?: boolean
  timeout?: number
  source?: AcApNotificationSource
  fontNames?: string[]
  /**
   * {@link AcApDocSession.id} of the document this notification belongs to.
   * Assigned by the store when omitted (uses the active session).
   */
  sessionId?: string
}

/**
 * Fields accepted when creating a notification (id/timestamp assigned by the store).
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
  readonly unreadCount: number
  add(notification: AcApNotificationInput): string
  info(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  warning(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  error(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  success(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string
  remove(id: string): void
  /** Clears notifications for the active session. */
  clear(): void
  removeWhere(predicate: (notification: AcApNotification) => boolean): void
  removeBySource(source: AcApNotificationSource): void
  removeResolvedFontMissedNotifications(
    missedFontNames: Iterable<string>
  ): void
  /**
   * Switches which document's list is exposed via {@link notifications}.
   * Called by the event bridge on document activate.
   */
  setActiveSession(sessionId: string | null): void
  /** Drops all notifications for a closed document session. */
  clearSession(sessionId: string): void
  /**
   * Subscribe to list / active-session changes. Returns an unsubscribe function.
   * Optional for custom centers that do not need observation.
   */
  subscribe?(listener: () => void): () => void
  /** Dispose UI / listeners owned by this center. Optional. */
  dispose?(): void
}

export interface AcApNotificationGroup {
  key: string
  source?: AcApNotificationSource
  items: AcApNotification[]
  collapsible: boolean
  type: AcApNotificationType
  latestTimestamp: Date
}

const TYPE_RANK: Record<AcApNotificationType, number> = {
  error: 3,
  warning: 2,
  info: 1,
  success: 0
}

/**
 * Groups notifications for UI panels (font-missed / unsupported-entities collapse).
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
