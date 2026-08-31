/**
 * Color / font-size controls for the offline HTML session accessory slot.
 *
 * @module AcExSessionDrawStyle
 * @packageDocumentation
 */

import { AcCmColor, AcCmColorUtil } from '@mlightcad/data-model'

import type { AcExSessionAccessory } from './AcExCommandSessionPanel'
import type { AcExHtmlI18n } from './AcExHtmlI18n'

/** Active drawing session that owns the accessory. */
export type AcExDrawStyleKind = 'measure' | 'markup'

/** Style snapshot shown in / written by the accessory. */
export interface AcExDrawStyleValues {
  /** CSS color string. */
  color: string
  /** Badge / text font size in CSS pixels. */
  fontSize: number
}

/** Partial style update from the accessory controls. */
export interface AcExDrawStylePatch {
  color?: string
  fontSize?: number
}

/** Dependencies for {@link setupAcExSessionDrawStyle}. */
export interface AcExSessionDrawStyleContext {
  i18n: AcExHtmlI18n
  /** Current kind, or `undefined` when no draw tool is active. */
  getKind: () => AcExDrawStyleKind | undefined
  /** Style to paint into the controls for the active kind. */
  getStyle: (kind: AcExDrawStyleKind) => AcExDrawStyleValues
  /** Apply a patch to session defaults and any selection for `kind`. */
  applyStyle: (kind: AcExDrawStyleKind, patch: AcExDrawStylePatch) => void
}

/** Font-size choices shown in the dropdown (CSS px). */
const FONT_SIZE_OPTIONS = [10, 12, 13, 14, 16, 18, 20, 24, 28, 32]

const STYLE_ID = 'mlcad-session-style-styles'

const SESSION_STYLE_CSS = `
.mlcad-session-style {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mlcad-session-style__swatch {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}
.mlcad-session-style__swatch-fill {
  display: block;
  width: 14px;
  height: 14px;
  margin: 0 auto;
  border-radius: 50%;
  border: 1px solid #999;
}
.mlcad-session-style__select {
  height: 28px;
  min-width: 92px;
  max-width: 140px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(18, 22, 28, 0.95);
  color: inherit;
  font-size: 12px;
  padding: 0 6px;
}
.mlcad-session-style__color {
  position: relative;
}
.mlcad-session-style__color-panel {
  display: none;
  position: absolute;
  top: auto;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(28, 32, 40, 0.98);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  --mlcad-session-style-aci-cell: 11px;
}
.mlcad-session-style__color-panel.is-open {
  display: block;
}
.mlcad-session-style__aci-large {
  display: grid;
  grid-template-columns: repeat(24, var(--mlcad-session-style-aci-cell));
  gap: 1px;
  margin-bottom: 6px;
}
.mlcad-session-style__aci-small {
  display: grid;
  grid-template-columns: repeat(9, var(--mlcad-session-style-aci-cell));
  gap: 1px;
  margin-bottom: 6px;
}
.mlcad-session-style__aci-gray {
  display: flex;
  gap: 4px;
}
.mlcad-session-style__aci-cell {
  width: var(--mlcad-session-style-aci-cell);
  height: var(--mlcad-session-style-aci-cell);
  padding: 0;
  border: 1px solid #666;
  box-sizing: border-box;
  cursor: pointer;
}
.mlcad-session-style__aci-cell:hover {
  outline: 1px solid #00a8ff;
}
.mlcad-session-style__aci-cell.is-selected {
  outline: 2px solid #08e8de;
  outline-offset: -1px;
}
`

const SMALL_ACI = Array.from({ length: 9 }, (_, i) => i + 1)
const LARGE_ACI = Array.from({ length: 240 }, (_, i) => i + 10)
const GRAY_ACI = Array.from({ length: 6 }, (_, i) => i + 250)

function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

function aciCss(index: number): string {
  return colorFromAci(index).cssColor || '#ffffff'
}

function cssColor(color: AcCmColor): string {
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

function preferExactAciColor(color: AcCmColor): AcCmColor {
  if (!color.isByColor) return color
  const rgb = color.RGB
  if (rgb == null) return color
  const index = AcCmColorUtil.getIndexByColor(rgb)
  if (index == null) return color
  const aci = new AcCmColor()
  aci.colorIndex = index
  return aci
}

function cssToColor(css: string): AcCmColor {
  const trimmed = css.trim()
  const skipFromString =
    trimmed.startsWith('#') || /^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)
  if (!skipFromString) {
    try {
      const fromString = AcCmColor.fromString(trimmed)
      if (fromString) return preferExactAciColor(fromString)
    } catch {
      // Fall through to setRGBFromCss.
    }
  }
  try {
    return preferExactAciColor(new AcCmColor().setRGBFromCss(trimmed))
  } catch {
    const fallback = new AcCmColor()
    fallback.setRGB(8, 232, 222)
    return fallback
  }
}

function aciIndexOf(color: AcCmColor): number | undefined {
  if (color.isByACI && color.colorIndex != null && color.colorIndex >= 1) {
    return color.colorIndex
  }
  return undefined
}

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = SESSION_STYLE_CSS
}

/** Controller returned by {@link setupAcExSessionDrawStyle}. */
export interface AcExSessionDrawStyleController {
  /** Sync controls from the active tool. */
  refresh: () => void
  /** Reapply i18n titles after locale change. */
  refreshLabels: () => void
  /** Color / font-size widgets for the session panel accessory slot. */
  createSessionAccessory: () => AcExSessionAccessory
  /** Tear down DOM listeners. */
  dispose: () => void
}

/**
 * Builds color / font-size controls that mount into the session accessory.
 */
export function setupAcExSessionDrawStyle(
  ctx: AcExSessionDrawStyleContext
): AcExSessionDrawStyleController {
  ensureStyles()

  const controlsRow = document.createElement('div')
  controlsRow.className = 'mlcad-session-style'
  controlsRow.setAttribute('role', 'toolbar')

  const colorWrap = document.createElement('div')
  colorWrap.className = 'mlcad-session-style__color'

  const swatch = document.createElement('button')
  swatch.type = 'button'
  swatch.className = 'mlcad-session-style__swatch'
  const swatchFill = document.createElement('span')
  swatchFill.className = 'mlcad-session-style__swatch-fill'
  swatch.appendChild(swatchFill)

  const colorPanel = document.createElement('div')
  colorPanel.className = 'mlcad-session-style__color-panel'

  const createAciPalette = (indices: number[], className: string) => {
    const palette = document.createElement('div')
    palette.className = className
    for (const index of indices) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'mlcad-session-style__aci-cell'
      cell.dataset.aci = String(index)
      cell.style.background = aciCss(index)
      cell.title = String(index)
      cell.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        applyColor(cssColor(colorFromAci(index)))
        hideColorPanel()
      })
      palette.appendChild(cell)
    }
    return palette
  }

  colorPanel.appendChild(
    createAciPalette(LARGE_ACI, 'mlcad-session-style__aci-large')
  )
  colorPanel.appendChild(
    createAciPalette(SMALL_ACI, 'mlcad-session-style__aci-small')
  )
  colorPanel.appendChild(
    createAciPalette(GRAY_ACI, 'mlcad-session-style__aci-gray')
  )

  colorWrap.appendChild(swatch)
  colorWrap.appendChild(colorPanel)

  const fontSizeSelect = document.createElement('select')
  fontSizeSelect.className = 'mlcad-session-style__select'
  controlsRow.append(colorWrap, fontSizeSelect)

  let colorPanelOpen = false
  let colorLeaveTimer: number | undefined
  let currentKind: AcExDrawStyleKind | undefined
  let sessionMounted = false

  const clearColorLeaveTimer = () => {
    if (colorLeaveTimer == null) return
    window.clearTimeout(colorLeaveTimer)
    colorLeaveTimer = undefined
  }

  const hideColorPanel = () => {
    clearColorLeaveTimer()
    colorPanelOpen = false
    colorPanel.classList.remove('is-open')
  }

  const showColorPanel = () => {
    clearColorLeaveTimer()
    colorPanelOpen = true
    colorPanel.classList.add('is-open')
  }

  const scheduleHideColorPanel = () => {
    clearColorLeaveTimer()
    colorLeaveTimer = window.setTimeout(() => hideColorPanel(), 220)
  }

  const markSelectedAci = (index: number | undefined) => {
    colorPanel.querySelectorAll('.mlcad-session-style__aci-cell').forEach(el => {
      const aci = Number((el as HTMLElement).dataset.aci)
      el.classList.toggle('is-selected', index != null && aci === index)
    })
  }

  const paint = (style: AcExDrawStyleValues) => {
    const color = cssToColor(style.color)
    swatchFill.style.background = cssColor(color)
    markSelectedAci(aciIndexOf(color))

    const sizes = new Set(FONT_SIZE_OPTIONS)
    if (Number.isFinite(style.fontSize) && style.fontSize > 0) {
      sizes.add(Math.round(style.fontSize))
    }
    const sorted = [...sizes].sort((a, b) => a - b)
    fontSizeSelect.replaceChildren()
    for (const size of sorted) {
      const option = document.createElement('option')
      option.value = String(size)
      option.textContent = `${size} px`
      fontSizeSelect.appendChild(option)
    }
    fontSizeSelect.value = String(
      Number.isFinite(style.fontSize) && style.fontSize > 0
        ? Math.round(style.fontSize)
        : 12
    )
  }

  const applyColor = (css: string) => {
    if (!currentKind) return
    swatchFill.style.background = css
    markSelectedAci(aciIndexOf(cssToColor(css)))
    ctx.applyStyle(currentKind, { color: css })
  }

  const applyFontSize = (size: number) => {
    if (!currentKind || !(size > 0)) return
    ctx.applyStyle(currentKind, { fontSize: size })
  }

  const relabel = () => {
    swatch.title = ctx.i18n.t('drawStyle.color')
    fontSizeSelect.title = ctx.i18n.t('drawStyle.fontSize')
  }

  const refresh = () => {
    currentKind = ctx.getKind()
    if (!currentKind) {
      hideColorPanel()
      return
    }
    paint(ctx.getStyle(currentKind))
    relabel()
  }

  const mountSession = (host: HTMLElement) => {
    sessionMounted = true
    host.appendChild(controlsRow)
    refresh()
  }

  const unmountSession = () => {
    if (!sessionMounted) return
    sessionMounted = false
    hideColorPanel()
    controlsRow.remove()
  }

  swatch.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    if (colorPanelOpen) hideColorPanel()
    else showColorPanel()
  })
  colorWrap.addEventListener('mouseenter', () => clearColorLeaveTimer())
  colorWrap.addEventListener('mouseleave', () => scheduleHideColorPanel())
  fontSizeSelect.addEventListener('change', () => {
    applyFontSize(Number(fontSizeSelect.value))
  })
  controlsRow.addEventListener('pointerdown', event => event.stopPropagation())
  controlsRow.addEventListener('mousedown', event => event.stopPropagation())

  const onDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null
    const inColor = !!target && colorWrap.contains(target)
    if (!colorPanelOpen) return
    if (!inColor) hideColorPanel()
  }
  document.addEventListener('pointerdown', onDocumentPointerDown, true)

  relabel()

  return {
    refresh,
    refreshLabels: () => {
      relabel()
    },
    createSessionAccessory: () => ({
      id: 'draw-style',
      mount: mountSession,
      unmount: unmountSession
    }),
    dispose: () => {
      unmountSession()
      document.removeEventListener('pointerdown', onDocumentPointerDown, true)
      clearColorLeaveTimer()
    }
  }
}
