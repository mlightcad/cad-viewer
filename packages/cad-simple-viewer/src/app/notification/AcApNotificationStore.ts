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
  private readonly _buckets = new Map<string, AcApNotification[]>()
  private _activeSessionId: string | null = null
  private _nextId = 1
  private readonly _listeners = new Set<() => void>()

  get notifications(): readonly AcApNotification[] {
    return this.activeList()
  }

  get unreadCount(): number {
    return this.activeList().length
  }

  get activeSessionId(): string | null {
    return this._activeSessionId
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  private emitChange() {
    for (const listener of this._listeners) {
      listener()
    }
  }

  private activeList(): AcApNotification[] {
    if (this._activeSessionId == null) return []
    return this._buckets.get(this._activeSessionId) ?? []
  }

  private setActiveList(list: AcApNotification[]) {
    if (this._activeSessionId == null) return
    if (list.length === 0) {
      this._buckets.delete(this._activeSessionId)
    } else {
      this._buckets.set(this._activeSessionId, list)
    }
  }

  private resolveSessionId(explicit?: string): string | null {
    return explicit ?? this._activeSessionId
  }

  setActiveSession(sessionId: string | null): void {
    if (this._activeSessionId === sessionId) return
    this._activeSessionId = sessionId
    this.emitChange()
  }

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

  info(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string {
    return this.add({ type: 'info', title, message, ...options })
  }

  warning(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string {
    return this.add({ type: 'warning', title, message, ...options })
  }

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

  success(
    title: string,
    message?: string,
    options?: Partial<AcApNotification>
  ): string {
    return this.add({ type: 'success', title, message, ...options })
  }

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

  clear(): void {
    if (this._activeSessionId == null) return
    if (!this._buckets.has(this._activeSessionId)) return
    this._buckets.delete(this._activeSessionId)
    this.emitChange()
  }

  removeWhere(predicate: (notification: AcApNotification) => boolean): void {
    const list = this.activeList()
    if (list.length === 0) return
    const next = list.filter(n => !predicate(n))
    if (next.length === list.length) return
    this.setActiveList(next)
    this.emitChange()
  }

  removeBySource(source: AcApNotificationSource): void {
    this.removeWhere(notification => notification.source === source)
  }

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

  dispose(): void {
    this._listeners.clear()
    this._buckets.clear()
    this._activeSessionId = null
  }
}
