import { AcCmEventManager, AcDbOsnapMode } from '@mlightcad/data-model'
import { defaults } from 'lodash-es'

import { acdbOsnapModesToMask } from '../../../../../realdwg-web/packages/data-model/lib'

/**
 * Font mappings for CAD text rendering.
 *
 * Maps original font names to replacement font names when the original
 * font is not available in the system.
 *
 * @example
 * ```typescript
 * const fontMapping: AcApFontMapping = {
 *   'AutoCAD Font': 'Arial',
 *   'SimSun': 'Microsoft YaHei'
 * };
 * ```
 */
export type AcApFontMapping = Record<string, string>

/**
 * Configuration settings for the CAD application.
 *
 * Contains various UI and rendering preferences that can be persisted
 * and modified during runtime.
 */
export interface AcApSettings {
  /** Whether debug mode is enabled for development features */
  isDebug: boolean
  /** Whether the command line interface is visible */
  isShowCommandLine: boolean
  /** Whether coordinate display is visible */
  isShowCoordinate: boolean
  /** Whether entity info card is visible */
  isShowEntityInfo: boolean
  /** Whether language selector is visible */
  isShowLanguageSelector: boolean
  /** Whether main menu is visible */
  isShowMainMenu: boolean
  /** Whether the toolbar is visible */
  isShowToolbar: boolean
  /** Whether performance statistics are displayed */
  isShowStats: boolean
  /** Font mapping configuration for text rendering */
  fontMapping: AcApFontMapping
  /** Object snap modes */
  osnapModes: number
}

/** Default values for all application settings */
const DEFAULT_VALUES: AcApSettings = {
  isDebug: false,
  isShowCommandLine: true,
  isShowCoordinate: true,
  isShowEntityInfo: false,
  isShowLanguageSelector: true,
  isShowMainMenu: true,
  isShowToolbar: true,
  isShowStats: false,
  fontMapping: {},
  osnapModes: acdbOsnapModesToMask([
    AcDbOsnapMode.EndPoint,
    AcDbOsnapMode.MidPoint,
    AcDbOsnapMode.Center
  ])
}

/** Local storage key for persisting settings */
const SETTINGS_LS_KEY = 'settings'

/**
 * Event arguments for settings modification events.
 *
 * @template T - The settings type, defaults to AcApSettings
 */
export interface AcApSettingManagerEventArgs<
  T extends AcApSettings = AcApSettings
> {
  /** The setting key that was modified */
  key: keyof T
  /** The new value of the setting */
  value: unknown
}

/**
 * Singleton settings manager for the CAD application.
 *
 * This class manages application-wide settings with:
 * - Persistent storage using localStorage
 * - Event notification when settings change
 * - Type-safe setting access
 * - Default value fallbacks
 *
 * The settings are automatically saved to localStorage and restored on application start.
 *
 * @template T - The settings interface type, defaults to AcApSettings
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const settings = AcApSettingManager.instance;
 *
 * // Set a setting value
 * settings.set('isShowToolbar', false);
 *
 * // Get a setting value
 * const showToolbar = settings.get('isShowToolbar');
 *
 * // Toggle a boolean setting
 * settings.toggle('isDebug');
 *
 * // Listen for setting changes
 * settings.events.modified.addEventListener(args => {
 *   console.log(`Setting ${args.key} changed to:`, args.value);
 * });
 * ```
 */
export class AcApSettingManager<T extends AcApSettings = AcApSettings> {
  /** Singleton instance */
  private static _instance?: AcApSettingManager

  /** Events fired when settings are modified */
  public readonly events = {
    /** Fired when any setting is modified */
    modified: new AcCmEventManager<AcApSettingManagerEventArgs<T>>()
  }

  /**
   * Gets the singleton instance of the settings manager.
   *
   * Creates a new instance if one doesn't exist yet.
   *
   * @returns The singleton settings manager instance
   */
  static get instance() {
    if (!this._instance) {
      this._instance = new AcApSettingManager()
    }
    return this._instance
  }

  /**
   * Sets a setting value and persists it to localStorage.
   *
   * Fires a modified event after the setting is saved.
   *
   * @template K - The setting key type
   * @param key - The setting key to modify
   * @param value - The new value for the setting
   *
   * @example
   * ```typescript
   * settings.set('isShowToolbar', false);
   * settings.set('fontMapping', { 'Arial': 'Helvetica' });
   * ```
   */
  set<K extends keyof T>(key: K, value: T[K]) {
    const toggles = this.settings
    toggles[key] = value
    localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(toggles))
    this.events.modified.dispatch({
      key: key,
      value
    })
  }

  /**
   * Gets a setting value.
   *
   * Returns the stored value or the default value if not set.
   *
   * @template K - The setting key type
   * @param key - The setting key to retrieve
   * @returns The setting value
   *
   * @example
   * ```typescript
   * const isDebug = settings.get('isDebug');
   * const fontMapping = settings.get('fontMapping');
   * ```
   */
  get<K extends keyof T>(key: K) {
    return this.settings[key]
  }

  /**
   * Toggles a boolean setting value.
   *
   * Only works with boolean settings. The caller should ensure the setting is boolean.
   *
   * @template K - The setting key type
   * @param key - The boolean setting key to toggle
   *
   * @example
   * ```typescript
   * settings.toggle('isDebug');        // false -> true
   * settings.toggle('isShowToolbar');  // true -> false
   * ```
   */
  toggle<K extends keyof T>(key: K) {
    const value = this.get(key)
    // @ts-expect-error The caller should guarantee the correct feature name passed to this function
    this.set(key, !value)
  }

  /**
   * Gets whether debug mode is enabled.
   *
   * @returns True if debug mode is enabled
   */
  get isDebug() {
    return this.get('isDebug')
  }

  /**
   * Sets whether debug mode is enabled.
   *
   * @param value - True to enable debug mode
   */
  set isDebug(value: boolean) {
    this.set('isDebug', value)
  }

  /**
   * Gets whether the command line is visible.
   *
   * @returns True if command line should be shown
   */
  get isShowCommandLine() {
    return this.get('isShowCommandLine')
  }

  /**
   * Sets whether the command line is visible.
   *
   * @param value - True to show the command line
   */
  set isShowCommandLine(value: boolean) {
    this.set('isShowCommandLine', value)
  }

  /**
   * Gets whether coordinate display is visible.
   *
   * @returns True if coordinates should be displayed
   */
  get isShowCoordinate() {
    return this.get('isShowCoordinate')
  }

  /**
   * Sets whether coordinate display is visible.
   *
   * @param value - True to show coordinates
   */
  set isShowCoordinate(value: boolean) {
    this.set('isShowCoordinate', value)
  }

  /**
   * Gets whether entity info card is visible.
   *
   * @returns True if entity info card should be displayed
   */
  get isShowEntityInfo() {
    return this.get('isShowEntityInfo')
  }

  /**
   * Sets whether entity info card is visible.
   *
   * @param value - True to show entity info card
   */
  set isShowEntityInfo(value: boolean) {
    this.set('isShowEntityInfo', value)
  }

  /**
   * Gets whether language selector is visible.
   *
   * @returns True if language selector should be displayed
   */
  get isShowLanguageSelector() {
    return this.get('isShowLanguageSelector')
  }

  /**
   * Sets whether language selector is visible.
   *
   * @param value - True to show language selector
   */
  set isShowLanguageSelector(value: boolean) {
    this.set('isShowLanguageSelector', value)
  }

  /**
   * Gets whether the main menu is visible.
   *
   * @returns True if the main menu should be displayed
   */
  get isShowMainMenu() {
    return this.get('isShowMainMenu')
  }

  /**
   * Sets whether the main menu is visible.
   *
   * @param value - True to show the main menu
   */
  set isShowMainMenu(value: boolean) {
    this.set('isShowMainMenu', value)
  }

  /**
   * Gets whether the toolbar is visible.
   *
   * @returns True if toolbar should be shown
   */
  get isShowToolbar() {
    return this.get('isShowToolbar')
  }

  /**
   * Sets whether the toolbar is visible.
   *
   * @param value - True to show the toolbar
   */
  set isShowToolbar(value: boolean) {
    this.set('isShowToolbar', value)
  }

  /**
   * Gets whether performance statistics are displayed.
   *
   * @returns True if stats should be shown
   */
  get isShowStats() {
    return this.get('isShowStats')
  }

  /**
   * Sets whether performance statistics are displayed.
   *
   * @param value - True to show stats
   */
  set isShowStats(value: boolean) {
    this.set('isShowStats', value)
  }

  /**
   * Gets the font mapping configuration.
   *
   * @returns The current font mapping
   */
  get fontMapping() {
    return this.get('fontMapping')
  }

  /**
   * Sets the font mapping configuration.
   *
   * @param value - The new font mapping
   */
  set fontMapping(value: AcApFontMapping) {
    this.set('fontMapping', value)
  }

  /**
   * Sets a single font mapping entry.
   *
   * @param originalFont - The original font name
   * @param mappedFont - The replacement font name
   */
  setFontMapping(originalFont: string, mappedFont: string) {
    const mapping = this.get('fontMapping') as AcApFontMapping
    mapping[originalFont] = mappedFont
    this.set('fontMapping', mapping)
  }

  /**
   * Gets the object snapping configuration.
   *
   * @returns The current object snapping configuration.
   */
  get osnapModes() {
    return this.get('osnapModes')
  }

  /**
   * Sets the object snapping configuration.
   *
   * @param value - The new object snapping configuration.
   */
  set osnapModes(value: number) {
    this.set('osnapModes', value)
  }

  /**
   * Gets the current settings object.
   *
   * This method combines localStorage values with default values.
   *
   * @returns The current settings object
   */
  get settings() {
    const values = localStorage.getItem(SETTINGS_LS_KEY)
    const results = (values == null ? {} : JSON.parse(values)) as T
    return defaults(results, DEFAULT_VALUES)
  }
}
