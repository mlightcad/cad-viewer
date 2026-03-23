/**
 * @fileoverview String manipulation utilities for the AutoCAD Common library.
 *
 * This module provides utility functions for common string operations,
 * including formatting and conversion utilities.
 *
 * @module AcCmStringUtil
 * @version 1.0.0
 */

/**
 * Utility class providing static methods for string operations and formatting.
 *
 * Contains helper functions for data formatting, size conversions, and other
 * string manipulation tasks commonly needed in AutoCAD file processing.
 *
 * @class AcTrStringUtil
 * @version 1.0.0
 */
export class AcTrStringUtil {
  /**
   * Converts a byte count to a human-readable string using appropriate size units.
   *
   * Automatically selects the most appropriate unit (B, KB, MB, GB, TB) based on the size
   * and formats the result with the specified number of decimal places.
   *
   * @param {number} bytes - The number of bytes to format.
   * @param {number} [decimals=2] - Number of decimal places to include in the result.
   * @returns {string} A formatted string with the appropriate unit.
   *
   * @example
   * ```typescript
   * import { AcTrStringUtil } from './AcCmStringUtil'
   *
   * // Format different byte sizes
   * AcTrStringUtil.formatBytes(0)          // "0 B"
   * AcTrStringUtil.formatBytes(1024)       // "1 KB"
   * AcTrStringUtil.formatBytes(1024 * 1024) // "1 MB"
   * AcTrStringUtil.formatBytes(1536, 1)    // "1.5 KB"
   * AcTrStringUtil.formatBytes(2048000, 0) // "2 MB"
   * ```
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const dm = Math.max(0, decimals)
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const value = bytes / Math.pow(k, i)

    return `${parseFloat(value.toFixed(dm))} ${sizes[i]}`
  }
}
