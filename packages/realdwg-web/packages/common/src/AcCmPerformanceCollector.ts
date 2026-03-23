/**
 * @fileoverview Performance monitoring and collection system for the AutoCAD Common library.
 *
 * This module provides a singleton-based performance collector that can store,
 * retrieve, and format performance metrics for debugging and optimization purposes.
 *
 * @module AcCmPerformanceCollector
 * @version 1.0.0
 */

/**
 * A performance entry containing a unique name, associated data,
 * and a method to format the data into a human-readable string.
 *
 * @template T - The type of the performance data.
 *
 * @example
 * ```typescript
 * // Create a custom performance entry
 * const loadTimeEntry: AcCmPerformanceEntry<number> = {
 *   name: 'file-load-time',
 *   data: 1250, // milliseconds
 *   format() {
 *     return `File loaded in ${this.data}ms`
 *   }
 * }
 * ```
 */
export interface AcCmPerformanceEntry<T> {
  /** Unique name of this performance entry. */
  name: string

  /** Performance data to be recorded. */
  data: T

  /**
   * Converts the performance data into a formatted string.
   * @returns A string representing the performance data.
   */
  format(): string
}

/**
 * A singleton class for collecting and managing performance data.
 * All entries must have a unique name. Entries are stored in a Map.
 */
export class AcCmPerformanceCollector {
  /** The singleton instance. */
  private static instance: AcCmPerformanceCollector

  /** Map of performance entries keyed by their unique name. */
  private entries: Map<string, AcCmPerformanceEntry<unknown>> = new Map()

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Retrieves the singleton instance of the AcCmPerformanceCollector.
   * @returns The shared AcCmPerformanceCollector instance.
   */
  public static getInstance(): AcCmPerformanceCollector {
    if (!AcCmPerformanceCollector.instance) {
      AcCmPerformanceCollector.instance = new AcCmPerformanceCollector()
    }
    return AcCmPerformanceCollector.instance
  }

  /**
   * Adds or replaces a performance entry by name.
   * @template T The type of the performance data.
   * @param entry A performance entry object with name, data, and format method.
   */
  public collect<T>(entry: AcCmPerformanceEntry<T>): void {
    this.entries.set(entry.name, entry)
  }

  /**
   * Logs all performance entries to the console using their format method.
   */
  public printAll(): void {
    for (const [name, entry] of this.entries) {
      console.log(`${name}:`)
      console.log(entry.format())
    }
  }

  /**
   * Clears all collected performance entries.
   */
  public clear(): void {
    this.entries.clear()
  }

  /**
   * Retrieves all entries as an array.
   * @returns A copy of all performance entries.
   */
  public getAll(): AcCmPerformanceEntry<unknown>[] {
    return Array.from(this.entries.values())
  }

  /**
   * Gets a single entry by name.
   * @param name The unique name of the entry.
   * @returns The matching entry or undefined.
   */
  public getEntry(name: string): AcCmPerformanceEntry<unknown> | undefined {
    return this.entries.get(name)
  }

  /**
   * Removes an entry by name.
   * @param name The name of the entry to remove.
   * @returns True if the entry was removed; false if not found.
   */
  public remove(name: string): boolean {
    return this.entries.delete(name)
  }
}
