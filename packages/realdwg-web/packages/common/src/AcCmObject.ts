/**
 * @fileoverview Object model implementation for the AutoCAD Common library.
 *
 * This module provides a reactive object model with attribute management,
 * change tracking, and event notification. Inspired by Backbone.js Model
 * but with TypeScript support and reduced dependencies.
 *
 * @module AcCmObject
 * @version 1.0.0
 */

import { AcCmEventManager } from './AcCmEventManager'
import { clone, defaults, has, isEmpty, isEqual } from './AcCmLodashUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AcCmAttributes = Record<string, any>

/**
 * Options to set attributes of one `AcCmObject` instance
 */
export interface AcCmObjectOptions {
  silent?: boolean | undefined
  unset?: boolean | undefined
}

export type AcCmStringKey<T> = keyof T & string

/**
 * Interface to define arguments of changed event of one `AcCmObject` instance
 */
export interface AcCmObjectChangedEventArgs<T extends AcCmAttributes> {
  object: AcCmObject<T>
  options?: AcCmObjectOptions
}

/**
 * Interface to define arguments of attribute changed event of one `AcCmObject` instance
 */
export interface AcCmObjectAttributeChangedEventArgs<T extends AcCmAttributes>
  extends AcCmObjectChangedEventArgs<T> {
  attrName?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrValue?: any
}

/**
 * This class is used to store attributes of one data model. It has the following benifits.
 * - Get notification when value of one attributes is changed
 * - Have one `changed` property to store all of changed values
 * - Store all of states of one model in one key/value object and make it is easy to serialize/deserialize model and model changes
 *
 * Actually implementation of this class is based on class Model in Backbone.js. However, Model class in Backbone
 * is too heavy. So we implement it again based on source code of class Model in Backbone.js. Morever, we want to
 * keep our library with less external dependencies and don't want to introduce depenedency on Backbone.js.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AcCmObject<T extends AcCmAttributes = any> {
  attributes: Partial<T>
  changed: Partial<T>

  public readonly events = {
    attrChanged: new AcCmEventManager<AcCmObjectAttributeChangedEventArgs<T>>(),
    modelChanged: new AcCmEventManager<AcCmObjectChangedEventArgs<T>>()
  }

  private _changing: boolean = false
  private _previousAttributes: Partial<T> = {}
  private _pending: boolean = false

  /**
   * Create one object to store attributes. For performance reason, values of attributes passed to constructor
   * will not be cloned to `attributes` property. So it means that value of `attributes` property in this object
   * is just a reference to arguments `attributes` passed to constructor.
   * @param attributes Input attributes to store in this object
   */
  constructor(attributes?: Partial<T>, defaultAttrs?: Partial<T>) {
    const attrs = attributes || {}
    if (defaultAttrs) {
      defaults(attrs, defaultAttrs)
    }
    this.attributes = attrs
    this.changed = {}
  }

  /**
   * Gets the value of an attribute.
   *
   * For strongly-typed access to attributes, use the `get` method privately in public getter properties.
   *
   * @template A - The key type extending string keys of T.
   * @param {A} key - The attribute key to retrieve.
   * @returns {T[A] | undefined} The attribute value or undefined if not set.
   *
   * @example
   * ```typescript
   * // Get a single attribute value
   * const name = obj.get('name')
   * const visible = obj.get('visible')
   *
   * // Check if attribute exists
   * if (obj.get('name') !== undefined) {
   *   console.log('Name is set')
   * }
   *
   * // For strongly-typed subclasses
   * get name(): string {
   *   return super.get("name")
   * }
   * ```
   */
  get<A extends AcCmStringKey<T>>(key: A): T[A] | undefined {
    return this.attributes[key]
  }

  /**
   * Sets one or more attributes on the object.
   *
   * For strongly-typed assignment of attributes, use the `set` method privately in public setter properties.
   * Triggers change events unless the `silent` option is specified.
   *
   * @template A - The key type extending string keys of T.
   * @param {A | Partial<T>} key - The attribute key or an object of key-value pairs.
   * @param {T[A] | AcCmObjectOptions} [val] - The value to set or options when key is an object.
   * @param {AcCmObjectOptions} [options] - Options for the set operation.
   * @returns {this} The current instance for method chaining.
   *
   * @example
   * ```typescript
   * // Set a single attribute
   * obj.set('name', 'MyEntity')
   *
   * // Set multiple attributes
   * obj.set({ name: 'MyEntity', visible: true })
   *
   * // Set with options
   * obj.set('name', 'MyEntity', { silent: true })
   *
   * // Unset an attribute
   * obj.set('name', undefined, { unset: true })
   *
   * // For strongly-typed subclasses
   * set name(value: string) {
   *   super.set("name", value)
   * }
   * ```
   */
  set<A extends AcCmStringKey<T>>(
    key: A,
    val?: T[A],
    options?: AcCmObjectOptions
  ): this
  set(key: Partial<T>, options?: AcCmObjectOptions): this
  set<A extends AcCmStringKey<T>>(
    key: A | Partial<T>,
    val?: T[A] | AcCmObjectOptions,
    options?: AcCmObjectOptions
  ): this {
    if (key == null) return this

    // Handle both `"key", value` and `{key: value}` -style arguments.
    let attrs: Partial<T>
    if (typeof key === 'object') {
      attrs = key as Partial<T>
      options = val as AcCmObjectOptions
    } else {
      attrs = {} as Partial<T>
      attrs[key] = val as T[A]
    }

    options || (options = {} as AcCmObjectOptions)

    // Extract attributes and options.
    const unset = options.unset
    const silent = options.silent
    const changes = []
    const changing = this._changing
    this._changing = true

    if (!changing) {
      this._previousAttributes = clone(this.attributes)
      this.changed = {}
    }

    const current = this.attributes
    const changed = this.changed
    const prev = this._previousAttributes

    // For each `set` attribute, update or delete the current value.
    for (const attr in attrs) {
      val = attrs[attr]
      if (!isEqual(current[attr], val)) changes.push(attr)
      if (!isEqual(prev[attr], val)) {
        changed[attr] = val
      } else {
        delete changed[attr]
      }
      unset ? delete current[attr] : (current[attr] = val)
    }

    // Trigger all relevant attribute changes.
    if (!silent) {
      // @ts-expect-error just keep backbone implementation as is
      if (changes.length) this._pending = options
      for (let i = 0; i < changes.length; i++) {
        this.events.attrChanged.dispatch({
          object: this,
          attrName: changes[i],
          attrValue: current[changes[i]],
          options: options
        })
      }
    }

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"change"` events.
    if (changing) return this
    if (!silent) {
      while (this._pending) {
        // @ts-expect-error just keep backbone implementation as is
        options = this._pending
        this._pending = false
        this.events.modelChanged.dispatch({
          object: this,
          options: options
        })
      }
    }
    this._pending = false
    this._changing = false
    return this
  }

  has(key: AcCmStringKey<T>): boolean {
    return this.get(key) != null
  }

  /**
   * Determine if the model has changed since the last `"change"` event.
   * If you specify an attribute name, determine if that attribute has changed.
   */
  hasChanged(key?: AcCmStringKey<T>) {
    if (key == null) return !isEmpty(this.changed)
    return has(this.changed, key)
  }

  /**
   * Return an object containing all the attributes that have changed. Useful for determining what parts
   * of a view need to be updated and/or what attributes need to be persisted to the server.
   *
   * Unset attributes will be set to undefined. You can also pass an attributes object to diff against
   * the model, determining if there *would be* a change.
   */
  changedAttributes(diff?: Partial<T>): Partial<T> {
    if (!diff) return this.hasChanged() ? clone(this.changed) : {}
    const old = this._changing ? this._previousAttributes : this.attributes
    const changed: Partial<T> = {}
    for (const attr in diff) {
      const val = diff[attr]
      if (isEqual(old[attr], val)) continue
      changed[attr] = val
    }
    return changed
  }

  /**
   * Get the previous value of an attribute, recorded at the time the last `"change"` event was fired.
   */
  previous<A extends AcCmStringKey<T>>(key: A): T[A] | null | undefined {
    if (key == null || !this._previousAttributes) return null
    return this._previousAttributes[key]
  }

  /**
   * Get all of the attributes of the model at the time of the previous `"change"` event.
   */
  previousAttributes(): Partial<T> {
    return clone(this._previousAttributes)
  }

  /**
   * Create a new model with identical attributes to this one.
   */
  clone() {
    const attrs = clone(this.attributes)
    return new AcCmObject(attrs)
  }
}
