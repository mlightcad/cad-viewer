export type AcEdUiTheme = 'light' | 'dark'

const THEME_TOKENS: Record<AcEdUiTheme, Record<string, string>> = {
  light: {
    '--ml-ui-text': 'var(--el-text-color-primary, #303133)',
    '--ml-ui-text-muted': 'var(--el-text-color-regular, #606266)',
    '--ml-ui-bg': 'var(--el-bg-color-overlay, #ffffff)',
    '--ml-ui-border': 'var(--el-border-color, #dcdfe6)',
    '--ml-ui-shadow': 'var(--el-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.12))',
    '--ml-ui-overlay': 'var(--el-overlay-color-lighter, rgba(0, 0, 0, 0.18))',

    '--ml-ui-accent': 'var(--el-color-primary, #409eff)',
    '--ml-ui-accent-alt': 'var(--el-color-info, #909399)',
    '--ml-ui-danger': 'var(--el-color-danger, #f56c6c)',

    '--ml-ui-canvas-line': 'var(--el-color-primary, #409eff)',
    '--ml-ui-canvas-fill': 'rgba(64, 158, 255, 0.2)',
    '--ml-ui-canvas-fill-mix':
      'color-mix(in srgb, var(--el-color-primary, #409eff) 20%, transparent)'
  },
  dark: {
    '--ml-ui-text': 'var(--el-text-color-primary, #e5eaf3)',
    '--ml-ui-text-muted': 'var(--el-text-color-regular, #cfd3dc)',
    '--ml-ui-bg': 'var(--el-bg-color-overlay, #1d1e1f)',
    '--ml-ui-border': 'var(--el-border-color, #4c4d4f)',
    '--ml-ui-shadow': 'var(--el-box-shadow, 0 6px 18px rgba(0, 0, 0, 0.35))',
    '--ml-ui-overlay': 'var(--el-overlay-color-lighter, rgba(0, 0, 0, 0.5))',

    '--ml-ui-accent': 'var(--el-color-primary, #409eff)',
    '--ml-ui-accent-alt': 'var(--el-color-info, #909399)',
    '--ml-ui-danger': 'var(--el-color-danger, #f56c6c)',

    '--ml-ui-canvas-line': 'var(--el-color-primary, #409eff)',
    '--ml-ui-canvas-fill': 'rgba(64, 158, 255, 0.2)',
    '--ml-ui-canvas-fill-mix':
      'color-mix(in srgb, var(--el-color-primary, #409eff) 20%, transparent)'
  }
}

type AcEdUiThemeListener = (theme: AcEdUiTheme) => void

const themeListeners = new Set<AcEdUiThemeListener>()
let notifyDepth = 0

/**
 * Subscribes to UI theme changes triggered by {@link acedApplyUiTheme}
 * on the document root (or an explicit root target).
 *
 * @param listener - Called with the newly applied theme.
 * @returns Unsubscribe function.
 */
export function acedSubscribeUiTheme(
  listener: AcEdUiThemeListener
): () => void {
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

export function acedApplyUiTheme(
  theme: AcEdUiTheme,
  target: HTMLElement = document.documentElement
) {
  const tokens = THEME_TOKENS[theme]
  Object.keys(tokens).forEach(key => {
    target.style.setProperty(key, tokens[key])
  })
  target.setAttribute('data-ml-ui-theme', theme)

  // Only broadcast when the document (or marked) root theme changes so nested
  // chrome can refresh without re-entrancy from their own apply calls.
  const isRoot =
    target === document.documentElement ||
    target.hasAttribute('data-ml-ui-theme-root')
  if (!isRoot || notifyDepth > 0) return
  notifyDepth++
  try {
    for (const listener of [...themeListeners]) {
      try {
        listener(theme)
      } catch {
        // Theme listeners must not break chrome updates.
      }
    }
  } finally {
    notifyDepth--
  }
}

/**
 * Resolves class-based theme markers used by cad-viewer / Element Plus.
 *
 * @param el - Element to inspect.
 * @returns Theme when a marker is present.
 */
function themeFromClassList(el: HTMLElement): AcEdUiTheme | undefined {
  if (
    el.classList.contains('ml-theme-dark') ||
    el.classList.contains('dark')
  ) {
    return 'dark'
  }
  if (el.classList.contains('ml-theme-light')) {
    return 'light'
  }
  return undefined
}

/**
 * Resolves the active UI theme from a host element or the document.
 *
 * Lookup order:
 * 1. Nearest ancestor with `data-ml-ui-theme`
 * 2. Nearest ancestor with `ml-theme-dark` / `ml-theme-light` (cad-viewer)
 * 3. `document.documentElement` `data-ml-ui-theme`
 * 4. `document.documentElement` `data-mlcad-theme` (offline HTML viewer)
 * 5. `html.dark` / `html.ml-theme-dark` class (Element Plus / cad-viewer)
 * 6. Defaults to `'dark'` (matches cad-viewer default)
 *
 * @param from - Optional element to start ancestor walk from
 */
export function resolveUiTheme(from?: HTMLElement | null): AcEdUiTheme {
  let el: HTMLElement | null | undefined = from
  while (el) {
    const attr = el.getAttribute('data-ml-ui-theme')
    if (attr === 'light' || attr === 'dark') return attr
    const fromClass = themeFromClassList(el)
    if (fromClass) return fromClass
    el = el.parentElement
  }

  const rootAttr = document.documentElement.getAttribute('data-ml-ui-theme')
  if (rootAttr === 'light' || rootAttr === 'dark') return rootAttr

  const htmlTheme = document.documentElement.getAttribute('data-mlcad-theme')
  if (htmlTheme === 'light' || htmlTheme === 'dark') return htmlTheme

  const rootClass = themeFromClassList(document.documentElement)
  if (rootClass) return rootClass

  return 'dark'
}
