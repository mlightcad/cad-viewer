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
  | 'toolbar.measureAngle'
  | 'toolbar.measureArc'
  | 'toolbar.measureArea'
  | 'toolbar.measureCoordinate'
  | 'toolbar.clearMeasurements'
  | 'toolbar.settings'
  | 'toolbar.layers'
  | 'toolbar.language'
  | 'toolbar.languageSwitch'
  | 'toolbar.collapse'
  | 'toolbar.expand'
  | 'settings.toolbar'
  | 'settings.measureColor'
  | 'settings.ortho'
  | 'settings.polar'
  | 'settings.polarAngles'
  | 'layers.title'
  | 'layers.close'
  | 'layers.showAll'
  | 'layers.hideAll'
  | 'layers.zoomTo'
  | 'status.ready'
  | 'status.measureDistanceHint'
  | 'status.measureAngleHint'
  | 'status.measureArcHint'
  | 'status.measureAreaHint'
  | 'status.measureCoordinateHint'
  | 'status.distance'
  | 'status.coordinates'
  | 'status.angle'
  | 'status.arcLength'
  | 'status.area'
  | 'status.lengthTotal'
  | 'status.areaTotal'
  | 'status.zoomLayer'
  | 'status.loadFailed'
  | 'status.noLayout'

/**
 * Nested string table used for locale message lookup.
 * @internal
 */
interface AcExMessageTree {
  [key: string]: string | AcExMessageTree
}

const MESSAGES: Record<AcExHtmlLocale, AcExMessageTree> = {
  en: {
    toolbar: {
      viewerTools: 'Viewer tools',
      zoomExtents: 'Zoom extents',
      measureDistance: 'Measure distance',
      measureAngle: 'Measure angle',
      measureArc: 'Measure arc length',
      measureArea: 'Measure area',
      measureCoordinate: 'Measure coordinates',
      clearMeasurements: 'Clear measurements',
      settings: 'Measure settings',
      layers: 'Layers',
      language: 'Language',
      languageSwitch: 'Switch to Chinese',
      collapse: 'Collapse toolbar',
      expand: 'Expand toolbar'
    },
    settings: {
      toolbar: 'Measure settings',
      measureColor: 'Measure color',
      ortho: 'Toggle orthogonal mode',
      polar: 'Polar tracking angles',
      polarAngles: 'Polar tracking angles'
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
      measureDistanceHint:
        'Click two points to measure distance (object snap enabled).',
      measureAngleHint:
        'Click vertex, then two points on each arm (object snap enabled).',
      measureArcHint:
        'Click arc start, a point on the arc, then arc end (object snap enabled).',
      measureAreaHint:
        'Click polygon vertices; click near the first point or press Enter to finish.',
      measureCoordinateHint:
        'Click a point to read its X/Y coordinates (object snap enabled).',
      distance: 'Distance: {value}',
      coordinates: 'X: {x}  Y: {y}',
      angle: 'Angle: {value}',
      arcLength: 'Arc length: {value}',
      area: 'Area: {value}',
      lengthTotal: 'Length total: {value}',
      areaTotal: 'Area total: {value}',
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
      measureAngle: '测量角度',
      measureArc: '测量弧长',
      measureArea: '测量面积',
      measureCoordinate: '测量坐标',
      clearMeasurements: '清除测量',
      settings: '测量设置',
      layers: '图层',
      language: '语言',
      languageSwitch: '切换到 English',
      collapse: '收起工具栏',
      expand: '展开工具栏'
    },
    settings: {
      toolbar: '测量设置',
      measureColor: '测量颜色',
      ortho: '切换正交模式',
      polar: '极轴追踪角度',
      polarAngles: '极轴追踪角度'
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
      measureDistanceHint: '点击两点以测量距离（已启用对象捕捉）。',
      measureAngleHint: '依次点击顶点与两条边上的点（已启用对象捕捉）。',
      measureArcHint: '依次点击弧起点、弧上一点与弧端点（已启用对象捕捉）。',
      measureAreaHint: '依次点击多边形顶点；靠近首点或按 Enter 完成。',
      measureCoordinateHint: '点击一点以读取其 X/Y 坐标（已启用对象捕捉）。',
      distance: '距离：{value}',
      coordinates: 'X：{x}  Y：{y}',
      angle: '角度：{value}',
      arcLength: '弧长：{value}',
      area: '面积：{value}',
      lengthTotal: '长度合计：{value}',
      areaTotal: '面积合计：{value}',
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
 * @returns `true` when `value` is `'en'` or `'zh'`.
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
 * Detects locale from the browser's language preferences.
 * Chinese (`zh*`) maps to `'zh'`; all other languages default to `'en'`.
 *
 * @returns `'zh'` when a preferred browser language is Chinese, otherwise `'en'`.
 */
export function detectBrowserAcExHtmlLocale(): AcExHtmlLocale {
  if (typeof navigator === 'undefined') return 'en'

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language
  ].filter(Boolean)

  for (const candidate of candidates) {
    const resolved = resolveAcExHtmlLocale(candidate)
    if (resolved === 'zh') return 'zh'
    if (resolved === 'en') return 'en'
  }

  return 'en'
}

/**
 * Chooses the initial locale for the offline viewer using, in order:
 * persisted user choice in `localStorage`, then {@link detectBrowserAcExHtmlLocale}.
 *
 * @returns Resolved locale, defaulting to `'en'`.
 */
export function detectAcExHtmlLocale(): AcExHtmlLocale {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(ACEX_HTML_LOCALE_STORAGE_KEY)
      const fromStorage = resolveAcExHtmlLocale(stored)
      if (fromStorage) return fromStorage
    } catch {
      /* private mode */
    }
  }

  return detectBrowserAcExHtmlLocale()
}

function lookupMessage(tree: AcExMessageTree, key: string): string | undefined {
  const parts = key.split('.')
  let node: string | AcExMessageTree | undefined = tree
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
    document.documentElement.lang = this._locale

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
