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

export function applyUiTheme(
  theme: AcEdUiTheme,
  target: HTMLElement = document.documentElement
) {
  const tokens = THEME_TOKENS[theme]
  Object.keys(tokens).forEach(key => {
    target.style.setProperty(key, tokens[key])
  })
  target.setAttribute('data-ml-ui-theme', theme)
}

export function applyUiThemeFromBackground(
  backgroundColor: number,
  target: HTMLElement = document.documentElement
) {
  const theme: AcEdUiTheme = backgroundColor === 0xffffff ? 'light' : 'dark'
  applyUiTheme(theme, target)
}
