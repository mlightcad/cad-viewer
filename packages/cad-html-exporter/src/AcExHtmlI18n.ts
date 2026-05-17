/** Supported locales in the offline HTML viewer. */
export type AcExHtmlLocale = 'en' | 'zh'

/** All locales accepted by the offline viewer, in display order. */
export const ACEX_HTML_LOCALES: AcExHtmlLocale[] = ['en', 'zh']

/**
 * `localStorage` key used to persist the user's language choice
 * across reloads of exported HTML files.
 */
export const ACEX_HTML_LOCALE_STORAGE_KEY = 'mlcad-html-locale'

/**
 * Dot-separated message keys resolved by {@link AcExHtmlI18n.t}.
 * Must exist in the internal `MESSAGES` tree for each {@link AcExHtmlLocale}.
 */
export type AcExHtmlMessageKey =
  | 'toolbar.viewerTools'
  | 'toolbar.zoomExtents'
  | 'toolbar.measureDistance'
  | 'toolbar.layers'
  | 'toolbar.language'
  | 'toolbar.languageSwitch'
  | 'layers.title'
  | 'layers.close'
  | 'layers.showAll'
  | 'layers.hideAll'
  | 'layers.zoomTo'
  | 'status.ready'
  | 'status.measureHint'
  | 'status.distance'
  | 'status.zoomLayer'
  | 'status.loadFailed'
  | 'status.noLayout'

/** Nested string table used for locale message lookup. */
interface MessageTree {
  [key: string]: string | MessageTree
}

const MESSAGES: Record<AcExHtmlLocale, MessageTree> = {
  en: {
    toolbar: {
      viewerTools: 'Viewer tools',
      zoomExtents: 'Zoom extents',
      measureDistance: 'Measure distance',
      layers: 'Layers',
      language: 'Language',
      languageSwitch: 'Switch to Chinese'
    },
    layers: {
      title: 'Layers',
      close: 'Close layers',
      showAll: 'Show all',
      hideAll: 'Hide all',
      zoomTo: 'Zoom to {name}'
    },
    status: {
      ready: 'Ready',
      measureHint: 'Click two points to measure distance.',
      distance: 'Distance: {value}',
      zoomLayer: 'Zoom: {name}',
      loadFailed: 'Failed to load drawing: {error}',
      noLayout: 'No layout data in snapshot.'
    }
  },
  zh: {
    toolbar: {
      viewerTools: '查看器工具',
      zoomExtents: '范围缩放',
      measureDistance: '测量距离',
      layers: '图层',
      language: '语言',
      languageSwitch: '切换到 English'
    },
    layers: {
      title: '图层',
      close: '关闭图层',
      showAll: '全部显示',
      hideAll: '全部隐藏',
      zoomTo: '缩放到 {name}'
    },
    status: {
      ready: '就绪',
      measureHint: '点击两点以测量距离。',
      distance: '距离：{value}',
      zoomLayer: '缩放：{name}',
      loadFailed: '无法加载图纸：{error}',
      noLayout: '快照中没有布局数据。'
    }
  }
}

/**
 * Type guard for {@link AcExHtmlLocale}.
 *
 * @param value - Arbitrary string to test.
 */
export function isAcExHtmlLocale(value: string): value is AcExHtmlLocale {
  return value === 'en' || value === 'zh'
}

/**
 * Normalizes a BCP 47 or short locale tag to a supported {@link AcExHtmlLocale}.
 *
 * @param value - Locale string from snapshot meta, `<html lang>`, or `navigator.language`.
 * @returns `'en'`, `'zh'`, or `null` when unrecognized.
 */
export function resolveAcExHtmlLocale(
  value?: string | null
): AcExHtmlLocale | null {
  if (value == null || value === '') return null
  const normalized = value.toLowerCase().replace('_', '-')
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  if (normalized === 'zh' || normalized.startsWith('zh')) return 'zh'
  return null
}

/**
 * Chooses the initial locale for the offline viewer using, in order:
 * `localStorage`, snapshot preference, `<html lang>`, and `navigator.language`.
 *
 * @param preferred - Optional locale from {@link AcExSnapshotV1.meta.locale}.
 * @returns Resolved locale, defaulting to `'en'`.
 */
export function detectAcExHtmlLocale(
  preferred?: string | null
): AcExHtmlLocale {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(ACEX_HTML_LOCALE_STORAGE_KEY)
      const fromStorage = resolveAcExHtmlLocale(stored)
      if (fromStorage) return fromStorage
    } catch {
      /* private mode */
    }
  }

  const fromPreferred = resolveAcExHtmlLocale(preferred)
  if (fromPreferred) return fromPreferred

  if (typeof document !== 'undefined') {
    const fromDocument = resolveAcExHtmlLocale(document.documentElement.lang)
    if (fromDocument) return fromDocument
  }

  if (typeof navigator !== 'undefined') {
    const fromNavigator = resolveAcExHtmlLocale(navigator.language)
    if (fromNavigator) return fromNavigator
  }

  return 'en'
}

function lookupMessage(tree: MessageTree, key: string): string | undefined {
  const parts = key.split('.')
  let node: string | MessageTree | undefined = tree
  for (const part of parts) {
    if (node == null || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * Replaces `{name}` placeholders in a message template.
 *
 * @param template - Localized string possibly containing `{param}` tokens.
 * @param params - Values substituted by token name; missing keys are left unchanged.
 * @returns Interpolated user-visible string.
 */
export function formatAcExHtmlMessage(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    return value != null ? String(value) : `{${name}}`
  })
}

/**
 * Lightweight i18n helper for the exported HTML viewer shell.
 * Updates elements marked with `data-i18n-text` / `data-i18n-attr` and persists locale choice.
 */
export class AcExHtmlI18n {
  private _locale: AcExHtmlLocale
  private _onChange: (() => void) | null = null

  /**
   * @param initialLocale - Starting locale; defaults to {@link detectAcExHtmlLocale} when omitted.
   */
  constructor(initialLocale?: AcExHtmlLocale) {
    this._locale = initialLocale ?? detectAcExHtmlLocale()
  }

  /** Active locale used for {@link AcExHtmlI18n.t}. */
  get locale(): AcExHtmlLocale {
    return this._locale
  }

  /** Short badge text shown on the language toolbar button (`EN` or `中`). */
  get localeBadge(): string {
    return this._locale === 'zh' ? '中' : 'EN'
  }

  /**
   * Registers a callback invoked after {@link AcExHtmlI18n.setLocale} or
   * {@link AcExHtmlI18n.toggleLocale} updates the UI.
   *
   * @param handler - Listener, or `null` to clear.
   */
  setOnChange(handler: (() => void) | null): void {
    this._onChange = handler
  }

  /**
   * Resolves and formats a message for the active locale, falling back to English.
   *
   * @param key - Dot-separated message key.
   * @param params - Optional placeholder values for `{name}` tokens.
   */
  t(key: AcExHtmlMessageKey, params?: Record<string, string | number>): string {
    const template =
      lookupMessage(MESSAGES[this._locale], key) ??
      lookupMessage(MESSAGES.en, key) ??
      key
    return formatAcExHtmlMessage(template, params)
  }

  /**
   * Switches between English and Chinese, persists the choice, and refreshes the DOM.
   *
   * @returns The locale after toggling.
   */
  toggleLocale(): AcExHtmlLocale {
    const next: AcExHtmlLocale = this._locale === 'en' ? 'zh' : 'en'
    this.setLocale(next)
    return next
  }

  /**
   * Sets the active locale, updates `<html lang>`, storage, and bound DOM nodes.
   *
   * @param locale - Target locale.
   */
  setLocale(locale: AcExHtmlLocale): void {
    if (this._locale === locale) return
    this._locale = locale
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACEX_HTML_LOCALE_STORAGE_KEY, locale)
      }
    } catch {
      /* private mode */
    }
    this.applyToDocument()
    this._onChange?.()
  }

  /**
   * Applies translated text to elements under `root` (or the full document).
   * Only updates leaf nodes with `data-i18n-text` to avoid clobbering icon markup.
   *
   * @param root - Subtree to scan; defaults to `document` when omitted.
   */
  applyToDocument(root?: ParentNode): void {
    if (typeof document === 'undefined') return
    const scope = root ?? document

    // Only leaf text targets — never set textContent on containers or icon buttons.
    scope.querySelectorAll<HTMLElement>('[data-i18n-text]').forEach(el => {
      const key = el.dataset.i18nKey as AcExHtmlMessageKey | undefined
      if (!key) return
      el.textContent = this.t(key)
    })

    scope.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach(el => {
      const key = el.dataset.i18nKey as AcExHtmlMessageKey | undefined
      const attrs = el.dataset.i18nAttr?.split(/\s+/) ?? []
      if (!key || attrs.length === 0) return
      const text = this.t(key)
      for (const attr of attrs) {
        el.setAttribute(attr, text)
      }
    })

    const badge = document.getElementById('mlcad-lang-badge')
    if (badge) badge.textContent = this.localeBadge

    const langBtn = document.getElementById('mlcad-lang-btn')
    if (langBtn) {
      langBtn.setAttribute('title', this.t('toolbar.languageSwitch'))
      langBtn.setAttribute('aria-label', this.t('toolbar.languageSwitch'))
    }
  }
}
