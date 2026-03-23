/**
 * @fileoverview Logging utilities for the AutoCAD Common library.
 *
 * This module provides a centralized logging interface using the loglevel library,
 * with configurable log levels for development and production environments.
 *
 * @module AcCmLogUtil
 * @version 1.0.0
 */

import * as loglevel from 'loglevel'

/**
 * Flag indicating whether debug mode is enabled.
 * When true, sets log level to 'debug'; otherwise sets to 'warn'.
 *
 * @constant {boolean}
 */
export const DEBUG_MODE = true

/**
 * The main logging instance from the loglevel library.
 * Provides standard logging methods: trace, debug, info, warn, error.
 *
 * @constant {loglevel.Logger}
 *
 * @example
 * ```typescript
 * import { log } from './AcCmLogUtil'
 *
 * log.debug('Debug message')
 * log.info('Info message')
 * log.warn('Warning message')
 * log.error('Error message')
 * ```
 */
export const log = loglevel

if (DEBUG_MODE) {
  log.setLevel('debug')
} else {
  log.setLevel('warn')
}

/**
 * Sets the log level for the logging system.
 *
 * Valid log levels are: 'trace', 'debug', 'info', 'warn', 'error', 'silent'.
 * If an invalid level is provided, the level will default to 'error' and an error will be logged.
 *
 * @param {string} level - The log level to set.
 *
 * @example
 * ```typescript
 * import { setLogLevel } from './AcCmLogUtil'
 *
 * // Set to debug level for development
 * setLogLevel('debug')
 *
 * // Set to error level for production
 * setLogLevel('error')
 *
 * // Silent all logging
 * setLogLevel('silent')
 * ```
 */
export const setLogLevel = (level: string) => {
  try {
    log.setLevel(level as loglevel.LogLevelDesc)
  } catch (ex) {
    log.setLevel('error')
    log.error(ex)
  }
}
