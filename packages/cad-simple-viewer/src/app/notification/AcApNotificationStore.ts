import type {
  AcApNotification,
  AcApNotificationCenter,
  AcApNotificationInput,
  AcApNotificationSource
} from './AcApNotificationTypes'

/**
 * In-memory notification store used by the built-in DOM notification UI and as
 * a reference implementation for custom centers.
 *
 * Notifications are kept in per-session buckets. {@link notifications} /
 * {@link unreadCount} / mutation helpers (except {@link clearSession} and
 * {@link remove} by id) operate on the active session.
 */
export class AcApNotificationStore implements AcApNotificationCenter {
  /** Per-session notification lists keyed by {@link AcApDocSession.id}. */
  private readonly _buckets = new Map<string, AcApNotification[]>()
  /** Session currently exposed via {@link notifications}. */
  private _activeSessionId: string | null = null
  /** Monotonic counter used to allocate notification ids. */
  private _nextId = 1
  /** Observers notified after any mutating change. */
  private readonly _listeners = new Set<() => void>()

  /**
   * Notifications for the active document session only.
   */
  get notifications(): readonly AcApNotification[] {
    return this.activeList()
  }

  /**
   * Number of notifications in the active session.
   */
  get unreadCount(): number {
    return this.activeList().length
  }

  /**
   * Currently active session id, or `null` when none is set.
   */
  get activeSessionId(): string | null {
    return this._activeSessionId
  }

  /**
   * Registers a change listener.
   *
   * @param listener - Callback invoked after list / session mutations.
   * @returns Unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /**
   * Notifies all {@link subscribe} listeners.
   */
  private emitChange() {
    for (const listener of this._listeners) {
      listener()
    }
  }

  /**
   * Returns the mutable list for the active session, or an empty array.
   */
  private activeList(): AcApNotification[] {
    if (this._activeSessionId == null) return []
    return this._buckets.get(this._activeSessionId) ?? []
  }

  /**
   * Replaces the active session's list, deleting the bucket when empty.
   *
   * @param list - Next notification list for the active session.
   */
  private setActiveList(list: AcApNotification[]) {
    if (this._activeSessionId == null) return
    if (list.length === 0) {
      this._buckets.delete(this._activeSessionId)
    } else {
      this._buckets.set(this._activeSessionId, list)
    }
  }

  /**
   * Resolves which session bucket an add should target.
   *
   * @param explicit - Optional `sessionId` from the input payload.
   * @returns Session id, or `null` when neither explicit nor active is set.
   */
  private resolveSessionId(explicit?: string): string | null {
    return explicit ?? this._activeSessionId
  }

  /**
   * Switches which document's list is exposed via {@link notifications}.
   *
   * @param sessionId - Active session id, or `null` when none.
   */
  setActiveSession(sessionId: string | null): void {
    if (this._activeSessionId === sessionId) return
    this._activeSessionId = sessionId
    this.emitChange()
  }

  /**
   * Drops all notifications for a closed document session.
   *
   * @param sessionId - Session whose bucket should be deleted.
   */
  clearSession(sessionId: string): void {
    if (!this._buckets.has(sessionId)) {
      if (this._activeSessionId === sessionId) {
        this.emitChange()
      }
      return
    }
    this._buckets.delete(sessionId)
    this.emitChange()
  }

  /**
   * Inserts a notification into the resolved session bucket (newest first).
   *
   * @param notification - Entry fields without `id` / `timestamp`.
   * @returns The assigned id, or `''` when no session could be resolved.
   */
  add(notification: AcApNotificationInput): string {
    const sessionId = this.resolveSessionId(notification.sessionId)
    if (sessionId == null) {
      // No active document yet — drop rather than creating an orphan bucket.
      return ''
    }

    const entry: AcApNotification = {
      ...notification,
      sessionId,
      id: `notification-${this._nextId++}`,
      timestamp: new Date()
    }
    const list = this._buckets.get(sessionId) ?? []
    this._buckets.set(sessionId, [entry, ...list])
    this.emitChange()
    return entry.id
  }

  /**
   * Adds an `info` notification to the active (or explicit) session.
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
  ): string {
    return this.add({ type: 'info', title, message, ...options })
  }

  /**
   * Adds a `warning` notification to the active (or explicit) session.
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
  ): string {
    return this.add({ type: 'warning', title, message, ...options })
  }

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
  ): string {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  /**
   * Adds a `success` notification to the active (or explicit) session.
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
  ): string {
    return this.add({ type: 'success', title, message, ...options })
  }

  /**
   * Removes a notification by id from any session bucket.
   *
   * @param id - Notification id previously returned by {@link add}.
   */
  remove(id: string): void {
    for (const [sessionId, list] of this._buckets) {
      const next = list.filter(n => n.id !== id)
      if (next.length === list.length) continue
      if (next.length === 0) {
        this._buckets.delete(sessionId)
      } else {
        this._buckets.set(sessionId, next)
      }
      this.emitChange()
      return
    }
  }

  /**
   * Clears notifications for the active session only.
   */
  clear(): void {
    if (this._activeSessionId == null) return
    if (!this._buckets.has(this._activeSessionId)) return
    this._buckets.delete(this._activeSessionId)
    this.emitChange()
  }

  /**
   * Removes notifications matching a predicate from the active session.
   *
   * @param predicate - Return `true` for entries that should be removed.
   */
  removeWhere(predicate: (notification: AcApNotification) => boolean): void {
    const list = this.activeList()
    if (list.length === 0) return
    const next = list.filter(n => !predicate(n))
    if (next.length === list.length) return
    this.setActiveList(next)
    this.emitChange()
  }

  /**
   * Removes all active-session notifications with the given source.
   *
   * @param source - Producer to clear.
   */
  removeBySource(source: AcApNotificationSource): void {
    this.removeWhere(notification => notification.source === source)
  }

  /**
   * Drops `font-missed` entries that no longer apply given the still-missing fonts.
   *
   * @param missedFontNames - Fonts that are still unresolved.
   */
  removeResolvedFontMissedNotifications(
    missedFontNames: Iterable<string>
  ): void {
    const missed = new Set(missedFontNames)
    this.removeWhere(notification => {
      if (notification.source !== 'font-missed') return false
      if (missed.size === 0) return true
      if (!notification.fontNames?.length) return false
      return !notification.fontNames.some(fontName => missed.has(fontName))
    })
  }

  /**
   * Clears listeners, all session buckets, and the active session pointer.
   */
  dispose(): void {
    this._listeners.clear()
    this._buckets.clear()
    this._activeSessionId = null
  }
}
