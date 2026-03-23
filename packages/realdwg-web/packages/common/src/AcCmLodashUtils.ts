/**
 * @fileoverview Lightweight utility functions inspired by lodash-es.
 *
 * This module provides simplified implementations of commonly used lodash functions
 * to reduce bundle size while maintaining essential functionality for object manipulation,
 * comparison, and validation operations.
 *
 * @module AcCmLodashUtils
 * @version 1.0.0
 */

/**
 * Utility functions extracted from lodash-es to reduce bundle size
 * These are simplified implementations of commonly used lodash functions
 */

/**
 * Creates a shallow clone of an object or array.
 *
 * For primitive values, returns the value as-is. For objects and arrays,
 * creates a new instance with the same properties or elements.
 *
 * @template T - The type of the object to clone.
 * @param {T} obj - The object to clone.
 * @returns {T} A shallow clone of the object.
 *
 * @example
 * ```typescript
 * import { clone } from './AcCmLodashUtils'
 *
 * const original = { a: 1, b: 2 }
 * const cloned = clone(original)
 * cloned.a = 3
 * console.log(original.a) // 1 (unchanged)
 * console.log(cloned.a)   // 3
 *
 * const arr = [1, 2, 3]
 * const clonedArr = clone(arr) // [1, 2, 3]
 * ```
 */
export function clone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return [...obj] as T
  }

  return { ...obj }
}

/**
 * Deeply clones a value (object, array, Date, RegExp, or primitive)
 * @param value The value to deep clone
 * @returns A deep copy of the input value
 */
export function deepClone<T>(value: T): T {
  // Handle primitives (string, number, boolean, null, undefined, symbol, bigint)
  if (value === null || typeof value !== 'object') {
    return value
  }

  // Handle Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  // Handle RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T
  }

  // Handle Array
  if (Array.isArray(value)) {
    return value.map(deepClone) as T
  }

  // Handle plain objects
  const clonedObj = {} as { [K in keyof T]: T[K] }
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clonedObj[key] = deepClone(value[key])
    }
  }
  return clonedObj
}

/**
 * Assigns own enumerable properties of source objects to the destination object
 * for all destination properties that resolve to undefined.
 *
 * This function fills in undefined properties in an object with the first value
 * present in any of the source objects. Source objects are applied from left to right.
 *
 * @param {Record<string, unknown>} obj - The destination object.
 * @param {...Record<string, unknown>[]} sources - The source objects.
 * @returns {Record<string, unknown>} The destination object.
 *
 * @example
 * ```typescript
 * import { defaults } from './AcCmLodashUtils'
 *
 * const object = { a: 1 }
 * const result = defaults(object, { b: 2 }, { a: 3, c: 3 })
 * console.log(result) // { a: 1, b: 2, c: 3 }
 *
 * // undefined properties are filled in
 * const partial = { a: 1, b: undefined }
 * defaults(partial, { b: 2, c: 3 })
 * console.log(partial) // { a: 1, b: 2, c: 3 }
 * ```
 */
export function defaults(
  obj: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  for (const source of sources) {
    if (source) {
      for (const key in source) {
        if (
          Object.prototype.hasOwnProperty.call(source, key) &&
          obj[key] === undefined
        ) {
          obj[key] = source[key]
        }
      }
    }
  }
  return obj
}

/**
 * Checks if path is a direct property of object.
 *
 * This function checks whether the specified property exists directly on the object
 * (not inherited from its prototype chain).
 *
 * @param {Record<string, unknown>} obj - The object to query.
 * @param {string} path - The path to check.
 * @returns {boolean} Returns true if path exists, else false.
 *
 * @example
 * ```typescript
 * import { has } from './AcCmLodashUtils'
 *
 * const object = { a: 1, b: 2 }
 * has(object, 'a')        // true
 * has(object, 'c')        // false
 * has(object, 'toString') // false (inherited property)
 * ```
 */
export function has(obj: Record<string, unknown>, path: string): boolean {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, path)
}

/**
 * Checks if value is an empty object, collection, map, or set.
 *
 * Values are considered empty if they are:
 * - null or undefined
 * - Arrays or strings with length 0
 * - Maps or Sets with size 0
 * - Objects with no enumerable properties
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean} Returns true if value is empty, else false.
 *
 * @example
 * ```typescript
 * import { isEmpty } from './AcCmLodashUtils'
 *
 * isEmpty(null)           // true
 * isEmpty(undefined)      // true
 * isEmpty('')             // true
 * isEmpty([])             // true
 * isEmpty({})             // true
 * isEmpty(new Map())      // true
 * isEmpty(new Set())      // true
 * isEmpty('hello')        // false
 * isEmpty([1, 2, 3])      // false
 * isEmpty({ a: 1 })       // false
 * ```
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true
  }

  if (Array.isArray(value) || typeof value === 'string') {
    return value.length === 0
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0
  }

  return false
}

/**
 * Performs a deep comparison between two values to determine if they are equivalent.
 *
 * This function recursively compares objects and arrays, checking that all nested
 * properties and elements are equal. Handles null/undefined values, primitive types,
 * arrays, and plain objects.
 *
 * @param {unknown} value - The value to compare.
 * @param {unknown} other - The other value to compare.
 * @returns {boolean} Returns true if the values are equivalent, else false.
 *
 * @example
 * ```typescript
 * import { isEqual } from './AcCmLodashUtils'
 *
 * isEqual(1, 1)                    // true
 * isEqual('hello', 'hello')        // true
 * isEqual([1, 2], [1, 2])         // true
 * isEqual({ a: 1 }, { a: 1 })     // true
 * isEqual([1, 2], [2, 1])         // false
 * isEqual({ a: 1 }, { a: 2 })     // false
 *
 * // Deep comparison
 * const obj1 = { a: { b: 1 } }
 * const obj2 = { a: { b: 1 } }
 * isEqual(obj1, obj2)              // true
 * ```
 */
export function isEqual(value: unknown, other: unknown): boolean {
  if (value === other) {
    return true
  }

  if (value == null || other == null) {
    return value === other
  }

  if (typeof value !== typeof other) {
    return false
  }

  if (typeof value !== 'object') {
    return value === other
  }

  if (Array.isArray(value) !== Array.isArray(other)) {
    return false
  }

  if (Array.isArray(value)) {
    if (value.length !== (other as unknown[]).length) {
      return false
    }
    for (let i = 0; i < value.length; i++) {
      if (!isEqual(value[i], (other as unknown[])[i])) {
        return false
      }
    }
    return true
  }

  const valueKeys = Object.keys(value as Record<string, unknown>)
  const otherKeys = Object.keys(other as Record<string, unknown>)

  if (valueKeys.length !== otherKeys.length) {
    return false
  }

  for (const key of valueKeys) {
    if (
      !Object.prototype.hasOwnProperty.call(
        other as Record<string, unknown>,
        key
      ) ||
      !isEqual(
        (value as Record<string, unknown>)[key],
        (other as Record<string, unknown>)[key]
      )
    ) {
      return false
    }
  }

  return true
}
