import mitt, { type Emitter } from 'mitt'

import type { AcApDataSource } from './AcApDataSource'

/** Events emitted by {@link AcApDataSourceManager}. */
export type AcApDataSourceManagerEvents = {
  /** Fired when a source is registered or unregistered. */
  changed: { sources: AcApDataSource[] }
  /** Fired when a source's auth state may have changed. */
  'auth-changed': { sourceId: string; sources: AcApDataSource[] }
}

/**
 * Registry of drawing data sources (local, URL, cloud plugins).
 *
 * Owned by {@link AcApDocManager}. Cloud plugins register themselves in
 * `AcApPlugin.onLoad` and unregister in `onUnload`.
 */
export class AcApDataSourceManager {
  private readonly _sources = new Map<string, AcApDataSource>()
  private readonly _emitter: Emitter<AcApDataSourceManagerEvents> = mitt()

  /**
   * Registers a data source. Replaces any existing source with the same id.
   *
   * @param source - Source to register
   */
  register(source: AcApDataSource): void {
    this._sources.set(source.id, source)
    this.emitChanged()
  }

  /**
   * Removes a data source by id.
   *
   * @param id - Source id previously passed to {@link register}
   */
  unregister(id: string): void {
    if (!this._sources.delete(id)) return
    this.emitChanged()
  }

  /**
   * Returns registered sources in registration order.
   */
  list(): AcApDataSource[] {
    return Array.from(this._sources.values())
  }

  /**
   * Looks up a source by id.
   *
   * @param id - Source id
   */
  get(id: string): AcApDataSource | undefined {
    return this._sources.get(id)
  }

  /**
   * Notifies listeners that a source's auth state changed.
   *
   * Cloud plugins should call this after successful {@link AcApDataSource.signIn}
   * / {@link AcApDataSource.signOut}.
   *
   * @param sourceId - Id of the source whose auth state changed
   */
  notifyAuthChanged(sourceId: string): void {
    this._emitter.emit('auth-changed', {
      sourceId,
      sources: this.list()
    })
  }

  /**
   * Subscribes to registry events.
   *
   * @param type - Event name
   * @param handler - Listener
   */
  on<K extends keyof AcApDataSourceManagerEvents>(
    type: K,
    handler: (event: AcApDataSourceManagerEvents[K]) => void
  ): void {
    this._emitter.on(type, handler)
  }

  /**
   * Unsubscribes from registry events.
   *
   * @param type - Event name
   * @param handler - Listener previously passed to {@link on}
   */
  off<K extends keyof AcApDataSourceManagerEvents>(
    type: K,
    handler: (event: AcApDataSourceManagerEvents[K]) => void
  ): void {
    this._emitter.off(type, handler)
  }

  private emitChanged(): void {
    this._emitter.emit('changed', { sources: this.list() })
  }
}
