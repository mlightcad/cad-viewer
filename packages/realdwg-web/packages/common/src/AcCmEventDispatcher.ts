/**
 * @fileoverview Event system implementation for the AutoCAD Common library.
 *
 * This module provides a type-safe event dispatcher system that allows objects to
 * emit and listen to events with proper TypeScript typing support.
 *
 * @module AcCmEventDispatcher
 * @version 1.0.0
 */

/**
 * The minimal basic Event that can be dispatched by a {@link AcCmEventDispatcher<>}.
 *
 * @template TEventType - The string literal type of the event.
 */
export interface AcCmBaseEvent<TEventType extends string = string> {
  /** The type identifier for this event. */
  readonly type: TEventType
}

/**
 * The minimal expected contract of a fired Event that was dispatched by a {@link AcCmEventDispatcher<>}.
 *
 * @template TEventType - The string literal type of the event.
 * @template TTarget - The type of the object that dispatched the event.
 */
export interface AcCmEvent<
  TEventType extends string = string,
  TTarget = unknown
> {
  /** The type identifier for this event. */
  readonly type: TEventType
  /** The object that dispatched this event. */
  readonly target: TTarget
}

/**
 * Type definition for event listener functions.
 *
 * @template TEventData - The data payload type for the event.
 * @template TEventType - The string literal type of the event.
 * @template TTarget - The type of the object that dispatched the event.
 */
export type AcCmEventListener<
  TEventData,
  TEventType extends string,
  TTarget
> = (event: TEventData & AcCmEvent<TEventType, TTarget>) => void

/**
 * Type-safe event dispatcher implementation.
 *
 * Provides a robust event system that allows objects to emit and listen to events
 * with full TypeScript type safety. Supports both typed event maps and dynamic events.
 *
 * @template TEventMap - A record type mapping event names to their data payloads.
 *
 * @example
 * ```typescript
 * // Define event types
 * interface MyEvents {
 *   load: { url: string }
 *   error: { message: string }
 * }
 *
 * // Create dispatcher
 * const dispatcher = new AcCmEventDispatcher<MyEvents>()
 *
 * // Add listeners
 * dispatcher.addEventListener('load', (event) => {
 *   console.log(`Loaded: ${event.url}`)
 * })
 *
 * // Dispatch events
 * dispatcher.dispatchEvent({ type: 'load', url: 'test.dwg' })
 * ```
 */
// eslint-disable-next-line
export class AcCmEventDispatcher<TEventMap extends {} = {}> {
  /**
   * Index a record of all callback functions
   * @private
   */
  private _listeners: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any[]
  }

  /**
   * Creates {@link AcCmEventDispatcher} object.
   */
  constructor() {
    this._listeners = {}
  }

  /**
   * Add a listener to an event type.
   * @param type The type of event to listen to.
   * @param listener The function that gets called when the event is fired.
   */
  addEventListener<T extends Extract<keyof TEventMap, string>>(
    type: T,
    listener: AcCmEventListener<TEventMap[T], T, this>
  ): void
  addEventListener<T extends string>(
    type: T,
    listener: AcCmEventListener<object, T, this>
  ): void {
    if (this._listeners === undefined) this._listeners = {}

    const listeners = this._listeners

    if (listeners[type] === undefined) {
      listeners[type] = []
    }

    if (listeners[type].indexOf(listener) === -1) {
      listeners[type].push(listener)
    }
  }

  /**
   * Check if listener is added to an event type.
   * @param type The type of event to listen to.
   * @param listener The function that gets called when the event is fired.
   */
  hasEventListener<T extends Extract<keyof TEventMap, string>>(
    type: T,
    listener: AcCmEventListener<TEventMap[T], T, this>
  ): boolean
  hasEventListener<T extends string>(
    type: T,
    listener: AcCmEventListener<object, T, this>
  ): boolean {
    if (this._listeners === undefined) return false

    const listeners = this._listeners

    return (
      listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1
    )
  }

  /**
   * Remove a listener from an event type.
   * @param type The type of the listener that gets removed.
   * @param listener The listener function that gets removed.
   */
  removeEventListener<T extends Extract<keyof TEventMap, string>>(
    type: T,
    listener: AcCmEventListener<TEventMap[T], T, this>
  ): void
  removeEventListener<T extends string>(
    type: T,
    listener: AcCmEventListener<object, T, this>
  ): void {
    if (this._listeners === undefined) return

    const listeners = this._listeners
    const listenerArray = listeners[type]

    if (listenerArray !== undefined) {
      const index = listenerArray.indexOf(listener)

      if (index !== -1) {
        listenerArray.splice(index, 1)
      }
    }
  }

  /**
   * Fire an event type.
   * @param event The event that gets fired.
   */
  dispatchEvent<T extends Extract<keyof TEventMap, string>>(
    event: AcCmBaseEvent<T> & TEventMap[T]
  ): void {
    if (this._listeners === undefined) return

    const listeners = this._listeners
    const listenerArray = listeners[event.type]

    if (listenerArray !== undefined) {
      // @ts-expect-error add target property
      event.target = this

      // Make a copy, in case listeners are removed while iterating.
      const array = listenerArray.slice(0)

      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event)
      }
    }
  }
}
