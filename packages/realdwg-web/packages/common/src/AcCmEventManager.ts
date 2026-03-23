/**
 * @fileoverview Simple event manager implementation for the AutoCAD Common library.
 *
 * This module provides a lightweight event management system for handling
 * listeners and dispatching events with type-safe payload support.
 *
 * @module AcCmEventManager
 * @version 1.0.0
 */

/**
 * Simple event manager for handling event listeners and dispatching events.
 *
 * Provides a lightweight alternative to the more complex AcCmEventDispatcher
 * for cases where you need basic event handling with type-safe payloads.
 *
 * @template T - The type of the event payload.
 *
 * @example
 * ```typescript
 * // Create an event manager for string payloads
 * const manager = new AcCmEventManager<string>()
 *
 * // Add a listener
 * manager.addEventListener((message) => {
 *   console.log('Received:', message)
 * })
 *
 * // Dispatch an event
 * manager.dispatch('Hello, World!')
 *
 * // For complex payloads
 * interface LoadEvent {
 *   url: string
 *   progress: number
 * }
 *
 * const loadManager = new AcCmEventManager<LoadEvent>()
 * loadManager.addEventListener(({ url, progress }) => {
 *   console.log(`Loading ${url}: ${progress}%`)
 * })
 * ```
 */
export class AcCmEventManager<T = unknown> {
  private listeners: ((payload: T) => void)[] = []

  /**
   * Add the event listener
   * @param listener Input listener to be added
   */
  public addEventListener(listener: (payload: T) => void) {
    this.listeners.push(listener)
  }

  /**
   * Remove the listener
   * @param listener Input listener to be removed
   */
  public removeEventListener(listener: (payload: T) => void) {
    this.listeners = this.listeners.filter(s => s !== listener)
  }

  /**
   * Remove all listeners bound to the target and add one new listener
   * @param listener Input listener to be added
   */
  public replaceEventListener(listener: (payload: T) => void) {
    this.removeEventListener(listener)
    this.addEventListener(listener)
  }

  /**
   * Notify all listeners
   * @param payload Input payload passed to listener
   */
  public dispatch(payload?: T, ...args: unknown[]) {
    for (const item of this.listeners) {
      const listener = item as (...args: unknown[]) => void
      listener.call(null, payload, ...args)
    }
  }
}
