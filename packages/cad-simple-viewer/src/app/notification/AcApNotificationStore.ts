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
 * Notifications have document buckets and a shared-runtime bucket (`null`).
 * List/dismiss operations include the runtime and active document. Closing a
 * document removes only its own bucket.
 */
export class AcApNotificationStore implements AcApNotificationCenter {
  /** Document buckets keyed by session id; `null` owns runtime notifications. */
  private readonly _buckets = new Map<string | null, AcApNotification[]>()
  /** Session currently exposed via {@link notifications}. */
  private _activeSessionId: string | null = null
  /** Monotonic counter used to allocate notification ids. */
  private _nextId = 1
  /** Observers notified after any mutating change. */
  private readonly _listeners = new Set<() => void>()

  /**
   * Notifications for the runtime and active document session.
   */
  get notifications(): readonly AcApNotification[] {
    return this.visibleList()
  }

  /**
   * Number of visible runtime and document notifications.
   */
  get unreadCount(): number {
    return this.visibleList().length
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
   * Returns visible runtime and document entries, newest first.
   */
  private visibleList(): AcApNotification[] {
    const runtime = this._buckets.get(null) ?? []
    const document =
      this._activeSessionId == null
        ? []
        : (this._buckets.get(this._activeSessionId) ?? [])
    return [...runtime, ...document].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }

  /**
   * Replaces visible buckets without touching parked documents.
   *
   * @param list - Next visible notification list.
   */
  private setVisibleList(list: AcApNotification[]) {
    const keys =
      this._activeSessionId == null ? [null] : [null, this._activeSessionId]
    for (const key of keys) {
      const entries = list.filter(entry => entry.sessionId === key)
      if (entries.length) this._buckets.set(key, entries)
      else this._buckets.delete(key)
    }
  }

  /**
   * Resolves which session bucket an add should target.
   *
   * @param explicit - Optional `sessionId` from the input payload.
   * @returns Document id, `null` for runtime, or undefined when no document is active.
   */
  private resolveSessionId(
    explicit?: string | null
  ): string | null | undefined {
    return explicit === null
      ? null
      : (explicit ?? this._activeSessionId ?? undefined)
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
    if (sessionId === undefined) {
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
   * Dismisses all visible notifications. Parked document buckets are preserved.
   */
  clear(): void {
    if (!this.visibleList().length) return
    this.setVisibleList([])
    this.emitChange()
  }

  /**
   * Removes visible notifications matching a predicate.
   *
   * @param predicate - Return `true` for entries that should be removed.
   */
  removeWhere(predicate: (notification: AcApNotification) => boolean): void {
    const list = this.visibleList()
    if (list.length === 0) return
    const next = list.filter(n => !predicate(n))
    if (next.length === list.length) return
    this.setVisibleList(next)
    this.emitChange()
  }

  /**
   * Removes visible notifications with the given source.
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
