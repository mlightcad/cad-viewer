import {
  AcCmEventManager,
  AcDbOsnapMode,
  acdbOsnapModesToMask
} from '@mlightcad/data-model'

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
  /** Whether the command ribbon is visible */
  isShowRibbon: boolean
  /** Whether the toolbar is visible */
  isShowToolbar: boolean
  /** Whether the floating shortcut toolbar (undo/redo/erase) is visible */
  isShowShortCutToolbar: boolean
  /** Whether performance statistics are displayed */
  isShowStats: boolean
  /** Font mapping configuration for text rendering */
  fontMapping: AcApFontMapping
  /** Object snap modes */
  osnapModes: number
  /** When true, never show the mobile precise point-pick tutorial again. */
  hideTouchPointTutorial: boolean
  /**
   * ISO date (`YYYY-MM-DD`) for which the tutorial is snoozed via
   * "don't remind me today". Cleared automatically when the date passes.
   */
  touchPointTutorialSnoozeDate: string | null
  /**
   * When true (default), touch long-press point picks use a simulated mouse
   * crosshair above the finger so the fingertip does not obscure the sample.
   * When false, the pick sample is the finger contact. In both modes a long
   * press still shows the magnifier loupe around the active sample.
   */
  useSimulatedMouseOnTouch: boolean
}

/**
 * Options for {@link AcApSettingManager.set} and {@link AcApSettingManager.apply}.
 */
export interface AcApSettingWriteOptions {
  /**
   * When `true` (default), the change is stored as a user preference and
   * written to localStorage. When `false`, the change is a session-only
   * override that does not touch localStorage (use for host layout / scene
   * defaults such as hiding the command line on mobile).
   */
  persist?: boolean
}

/**
 * Options for {@link AcApSettingManager.configure}.
 */
export interface AcApSettingManagerConfigureOptions {
  /**
   * localStorage key used for user preferences. Defaults to `'settings'`.
   * Call before the first settings read/write so products on the same origin
   * do not share preferences.
   */
  storageKey?: string
}

/** Default values for all application settings */
const DEFAULT_VALUES: AcApSettings = {
  isDebug: false,
  isShowCommandLine: true,
  isShowCoordinate: true,
  isShowEntityInfo: false,
  isShowLanguageSelector: true,
  isShowRibbon: true,
  isShowToolbar: true,
  isShowShortCutToolbar: true,
  isShowStats: false,
  fontMapping: {},
  osnapModes: acdbOsnapModesToMask([
    AcDbOsnapMode.EndPoint,
    AcDbOsnapMode.MidPoint,
    AcDbOsnapMode.Center,
    AcDbOsnapMode.Quadrant,
    AcDbOsnapMode.Intersection,
    AcDbOsnapMode.Nearest
  ]),
  hideTouchPointTutorial: false,
  touchPointTutorialSnoozeDate: null,
  useSimulatedMouseOnTouch: true
}

/** Default localStorage key for persisting user preferences */
const DEFAULT_SETTINGS_LS_KEY = 'settings'

/**
 * Maps the pre-ribbon `isShowMainMenu` key onto `isShowRibbon`, and drops
 * obsolete keys such as `isShowFileName` (filename is always shown on the
 * ribbon header now).
 *
 * Older builds persisted `isShowMainMenu`. After the main menu was replaced
 * by the command ribbon, that preference should keep hiding (or showing)
 * the ribbon for the same users.
 *
 * @param stored - Parsed localStorage object; not mutated.
 * @returns A copy with `isShowRibbon` filled in and obsolete keys removed.
 */
export function migrateStoredSettings(
  stored: Record<string, unknown>
): { settings: Record<string, unknown>; migrated: boolean } {
  const next = { ...stored }
  let migrated = false
  if (!('isShowRibbon' in next) && typeof next.isShowMainMenu === 'boolean') {
    next.isShowRibbon = next.isShowMainMenu
    migrated = true
  }
  if ('isShowMainMenu' in next) {
    delete next.isShowMainMenu
    migrated = true
  }
  if ('isShowFileName' in next) {
    delete next.isShowFileName
    migrated = true
  }
  return { settings: next, migrated }
}

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
 * Settings resolve in three layers (later wins):
 * 1. Built-in defaults
 * 2. User preferences from localStorage
 * 3. Session overrides (host layout; not persisted)
 *
 * Only the user layer is written to localStorage. Use
 * `{ persist: false }` for scene-specific layout so it does not leak into
 * other products or later visits on the same origin.
 *
 * @template T - The settings interface type, defaults to AcApSettings
 *
 * @example
 * ```typescript
 * // Isolate this product's preferences on a shared origin
 * AcApSettingManager.configure({
 *   storageKey: 'mlightcad.settings.mobile-embed'
 * })
 *
 * // Host layout: hide command line for this session only
 * AcApSettingManager.instance.apply(
 *   { isShowCommandLine: false },
 *   { persist: false }
 * )
 *
 * // User preference: persists across visits
 * AcApSettingManager.instance.set('isShowToolbar', false)
 * ```
 */
export class AcApSettingManager<T extends AcApSettings = AcApSettings> {
  /** Singleton instance */
  private static _instance?: AcApSettingManager

  /** localStorage key for the user preference layer */
  private static _storageKey = DEFAULT_SETTINGS_LS_KEY

  /** Events fired when settings are modified */
  public readonly events = {
    /** Fired when any setting is modified */
    modified: new AcCmEventManager<AcApSettingManagerEventArgs<T>>()
  }

  /** User preferences loaded from / written to localStorage */
  private _user: Partial<T> = {}

  /** Session-only overrides (host layout); never written to localStorage */
  private _session: Partial<T> = {}

  /**
   * Configures the settings manager before the first read/write.
   *
   * Prefer calling this at host startup so each product on the same origin
   * can use its own localStorage key. If an instance already exists, user
   * prefs are reloaded from the new key and session overrides are cleared.
   *
   * @param options - Configuration options
   */
  static configure(options: AcApSettingManagerConfigureOptions): void {
    if (options.storageKey != null && options.storageKey !== '') {
      this._storageKey = options.storageKey
    }
    if (this._instance) {
      this._instance.reloadFromStorage()
    }
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
   * Resets singleton state for unit tests.
   *
   * @internal
   */
  static resetInstanceForTesting(): void {
    this._instance = undefined
    this._storageKey = DEFAULT_SETTINGS_LS_KEY
  }

  private constructor() {
    this.reloadFromStorage()
  }

  /**
   * Reloads the user preference layer from localStorage and clears session
   * overrides.
   */
  private reloadFromStorage(): void {
    this._user = this.readUserFromStorage()
    this._session = {}
  }

  /**
   * Reads and migrates user preferences from the configured storage key.
   *
   * @returns Partial user settings (may be empty)
   */
  private readUserFromStorage(): Partial<T> {
    const raw = localStorage.getItem(AcApSettingManager._storageKey)
    if (raw == null) {
      return {}
    }
    let stored: Record<string, unknown>
    try {
      stored = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
    const { settings: migrated, migrated: didMigrate } =
      migrateStoredSettings(stored)
    if (didMigrate) {
      localStorage.setItem(
        AcApSettingManager._storageKey,
        JSON.stringify(migrated)
      )
    }
    return migrated as Partial<T>
  }

  /**
   * Writes only the user preference layer to localStorage.
   */
  private persistUser(): void {
    localStorage.setItem(
      AcApSettingManager._storageKey,
      JSON.stringify(this._user)
    )
  }

  /**
   * Merges defaults, user prefs, and session overrides into effective settings.
   *
   * @returns A new effective settings object
   */
  private computeEffective(): T {
    return {
      ...DEFAULT_VALUES,
      ...this._user,
      ...this._session
    } as T
  }

  /**
   * Sets a setting value.
   *
   * By default the change is persisted as a user preference. Pass
   * `{ persist: false }` for a session-only override that does not touch
   * localStorage.
   *
   * Fires a modified event after the setting is updated.
   *
   * @template K - The setting key type
   * @param key - The setting key to modify
   * @param value - The new value for the setting
   * @param options - Optional write options (`persist` defaults to `true`)
   *
   * @example
   * ```typescript
   * settings.set('isShowToolbar', false);
   * settings.set('isShowCommandLine', false, { persist: false });
   * ```
   */
  set<K extends keyof T>(
    key: K,
    value: T[K],
    options?: AcApSettingWriteOptions
  ) {
    const persist = options?.persist !== false
    this._session[key] = value
    if (persist) {
      this._user[key] = value
      this.persistUser()
    }
    this.events.modified.dispatch({
      key: key,
      value
    })
  }

  /**
   * Applies multiple setting values at once.
   *
   * Each changed key fires a separate `modified` event so existing listeners
   * keep working without a batch API.
   *
   * @param partial - Settings to update
   * @param options - Optional write options (`persist` defaults to `true`)
   *
   * @example
   * ```typescript
   * settings.apply(
   *   { isShowCommandLine: false, isShowCoordinate: false },
   *   { persist: false }
   * )
   * ```
   */
  apply(partial: Partial<T>, options?: AcApSettingWriteOptions) {
    for (const key of Object.keys(partial) as Array<keyof T>) {
      const value = partial[key]
      if (value !== undefined) {
        this.set(key, value as T[keyof T], options)
      }
    }
  }

  /**
   * Removes a session-only override so the effective value falls back to
   * user preferences / defaults.
   *
   * @template K - The setting key type
   * @param key - The setting key whose session override should be cleared
   */
  clearSessionOverride<K extends keyof T>(key: K): void {
    if (!Object.prototype.hasOwnProperty.call(this._session, key)) {
      return
    }
    delete this._session[key]
    this.events.modified.dispatch({
      key,
      value: this.get(key)
    })
  }

  /**
   * Gets a setting value.
   *
   * Returns the effective value (defaults ← user ← session).
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
   * The toggle is persisted as a user preference.
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
   * Gets whether the command ribbon is visible.
   *
   * @returns True if the ribbon should be shown
   */
  get isShowRibbon() {
    return this.get('isShowRibbon')
  }

  /**
   * Sets whether the command ribbon is visible.
   *
   * @param value - True to show the ribbon
   */
  set isShowRibbon(value: boolean) {
    this.set('isShowRibbon', value)
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
   * Gets whether the floating shortcut toolbar is visible.
   *
   * @returns True if the shortcut toolbar should be shown
   */
  get isShowShortCutToolbar() {
    return this.get('isShowShortCutToolbar')
  }

  /**
   * Sets whether the floating shortcut toolbar is visible.
   *
   * @param value - True to show the shortcut toolbar
   */
  set isShowShortCutToolbar(value: boolean) {
    this.set('isShowShortCutToolbar', value)
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
    const mapping = {
      ...(this.get('fontMapping') as AcApFontMapping)
    }
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
   * Gets the current effective settings object.
   *
   * Merges built-in defaults, user preferences, and session overrides.
   *
   * @returns The current settings object
   */
  get settings() {
    return this.computeEffective()
  }
}
