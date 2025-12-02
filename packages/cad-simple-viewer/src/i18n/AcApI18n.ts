import { AcCmEventManager } from '@mlightcad/data-model'

import { AcEdCommandStack } from '../editor'

/**
 * Language/locale id used in the application.
 * Matches the naming style used by vue-i18n ("Locale").
 */
export type AcApLocale = 'en' | 'zh'

/**
 * A single locale message tree.
 * Leaf values are strings, inner nodes are nested objects of the same shape.
 * This mirrors vue-i18n's LocaleMessage structure.
 */
export interface AcApLocaleMessage {
  [key: string]: string | AcApLocaleMessage
}

/**
 * The whole messages map: locale -> locale message tree.
 * This mirrors vue-i18n's "LocaleMessages".
 */
export type AcApLocaleMessages = Record<AcApLocale, AcApLocaleMessage>

/**
 * Options for translation lookup.
 */
export interface AcApTranslateOptions {
  fallback?: string
}

/**
 * Event arguments for locale changed events.
 */
export interface AcApLocaleChangedEventArgs {
  /** The old locale value */
  old: AcApLocale
  /** The new locale value */
  new: AcApLocale
}

/**
 * A framework-agnostic i18n registry with vue-i18n-like API names.
 *
 * Key methods:
 * - getLocaleMessages(): returns all messages (for vue-i18n { messages })
 * - getLocaleMessage(locale): returns single locale messages
 * - setLocaleMessage(locale, messages): replace locale messages
 * - mergeLocaleMessage(locale, messages): deep-merge into existing locale (fixed)
 * - t(locale, key, options): translation helper for core code (no Vue required)
 */
export class AcApI18n {
  private static _messages: AcApLocaleMessages = {
    en: {},
    zh: {}
  }

  /**
   * @private
   *
   * Stores the currently active locale used by the translation
   * system. Defaults to `"en"`.
   *
   * This value is used by `t(key, options)` when no locale
   * parameter is provided.
   */
  private static _currentLocale: AcApLocale = 'en'

  /**
   * Return the whole messages map (for vue-i18n initialisation).
   */
  public static get messages(): Readonly<AcApLocaleMessages> {
    return this._messages
  }

  /** Supported events */
  public static readonly events = {
    /** Fired when locale changed */
    localeChanged: new AcCmEventManager<AcApLocaleChangedEventArgs>()
  }

  /**
   * Return the messages object for a single locale.
   */
  public static getLocaleMessage(
    locale: AcApLocale
  ): Readonly<AcApLocaleMessage> {
    return this._messages[locale]
  }

  /**
   * Deep-merge a message dictionary into an existing locale.
   */
  public static mergeLocaleMessage<L extends AcApLocale>(
    locale: L,
    messages: AcApLocaleMessage
  ): void {
    deepMerge(this._messages[locale], messages)
  }

  /**
   * Register a plugin's messages.
   * Alias for mergeLocaleMessage for consistency with vue-i18n.
   */
  public static registerMessage<L extends AcApLocale>(
    locale: L,
    messages: AcApLocaleMessage
  ): void {
    this.mergeLocaleMessage(locale, messages)
  }

  /**
   * Set the current active locale for translation.
   *
   * @param locale - Locale to activate (`"en"` or `"zh"`)
   *
   * @remarks
   * This method updates the internal locale state used by all
   * future calls to `t(key, options)`. After calling this method,
   * the entire application will use the new locale automatically.
   *
   * @example
   * ```ts
   * AcApI18n.setCurrentLocale('zh')
   * console.log(AcApI18n.t('core.start'))   // uses Chinese messages
   * ```
   */
  public static setCurrentLocale(locale: AcApLocale): void {
    const old = this._currentLocale
    this._currentLocale = locale
    this.events.localeChanged.dispatch({ old, new: this._currentLocale })
  }

  /**
   * Get the currently active locale.
   *
   * @returns The locale currently used for translation.
   *
   * @example
   * ```ts
   * console.log(AcApI18n.currentLocale)  // "en" or "zh"
   * ```
   */
  public static get currentLocale(): AcApLocale {
    return this._currentLocale
  }

  /**
   * Translate a dotted key path using the registry (no Vue required).
   *
   * @param key - dotted path, e.g. "core.start" or "pluginX.button.ok"
   * @param options - optional fallback
   * @returns translated string or fallback/key if not found
   */
  public static t(key: string, options?: AcApTranslateOptions): string {
    const locale = this._currentLocale
    const root = this._messages[locale]
    const parts = key.split('.')
    let cur = root

    for (const part of parts) {
      if (!cur || typeof cur !== 'object') {
        return options?.fallback ?? key
      }
      cur = cur[part] as AcApLocaleMessage
    }

    return typeof cur === 'string' ? cur : (options?.fallback ?? key)
  }

  /**
   * Get localized command description
   * @param groupName - Command group name
   * @param cmdName - Global command name
   * @returns - The localized command description.
   */
  public static cmdDescription(groupName: string, cmdName: string) {
    const key = `command.${groupName}.${cmdName.toLowerCase()}`
    return this.t(key)
  }

  /**
   * Tries to find command in system group and gets its localized command description
   * @param cmdName - Global command name
   * @returns - The localized command description
   */
  public static sysCmdDescription(name: string) {
    return this.cmdDescription(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      name
    )
  }

  /**
   * Tries to find command in user group and gets its localized command description
   * @param cmdName - Global command name
   * @returns - The localized command description
   */
  public static userCmdDescription = (name: string) => {
    return this.cmdDescription(AcEdCommandStack.DEFAUT_COMMAND_GROUP_NAME, name)
  }
}

/**
 * Utility: deep merge two LocaleMessage objects.
 * - Returns a new object (immutability-friendly).
 * - If both values are plain objects, merge recursively.
 * - Otherwise prefer `source`'s value.
 */
function deepMerge(target: AcApLocaleMessage, source: AcApLocaleMessage) {
  for (const key of Object.keys(source)) {
    const src = source[key]
    const tgt = target[key]

    if (isObject(tgt) && isObject(src)) {
      deepMerge(tgt, src)
    } else {
      target[key] = src
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
