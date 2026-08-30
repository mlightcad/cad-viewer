/**
 * Canvas-top drawing style overlay (color / font size).
 * Mirrors `@mlightcad/cad-simple-viewer` {@link AcApDrawStyleToolbar}.
 *
 * @module AcExDrawStyleToolbar
 * @packageDocumentation
 */

import { AcCmColor, AcCmColorUtil } from '@mlightcad/data-model'

import type { AcExHtmlI18n } from './AcExHtmlI18n'

/** Active tool kind that owns the overlay. */
export type AcExDrawStyleKind = 'measure' | 'markup'

/** Style snapshot shown in / written by the overlay. */
export interface AcExDrawStyleValues {
  /** CSS color string. */
  color: string
  /** Badge / text font size in CSS pixels. */
  fontSize: number
}

/** Partial style update from the overlay controls. */
export interface AcExDrawStylePatch {
  color?: string
  fontSize?: number
}

/** Dependencies for {@link setupAcExDrawStyleToolbar}. */
export interface AcExDrawStyleToolbarContext {
  /** Host element (`#mlcad-root`); must be positioned. */
  root: HTMLElement
  i18n: AcExHtmlI18n
  /** Current kind, or `undefined` when no draw tool is active. */
  getKind: () => AcExDrawStyleKind | undefined
  /** Style to paint into the controls for the active kind. */
  getStyle: (kind: AcExDrawStyleKind) => AcExDrawStyleValues
  /** Apply a patch to session defaults and any selection for `kind`. */
  applyStyle: (kind: AcExDrawStyleKind, patch: AcExDrawStylePatch) => void
}

/** Font-size choices shown in the overlay dropdown (CSS px). */
const FONT_SIZE_OPTIONS = [10, 12, 13, 14, 16, 18, 20, 24, 28, 32]

const STYLE_ID = 'mlcad-draw-style-toolbar-styles'

const TOOLBAR_CSS = `
.mlcad-draw-style-toolbar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(28, 32, 40, 0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  color: #e8eaed;
  pointer-events: auto;
}
.mlcad-draw-style-toolbar.is-visible {
  display: inline-flex;
}
.mlcad-draw-style-toolbar__swatch {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}
.mlcad-draw-style-toolbar__swatch-fill {
  display: block;
  width: 14px;
  height: 14px;
  margin: 0 auto;
  border-radius: 50%;
  border: 1px solid #999;
}
.mlcad-draw-style-toolbar__select {
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
.mlcad-draw-style-toolbar__color {
  position: relative;
}
.mlcad-draw-style-toolbar__color-panel {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(28, 32, 40, 0.98);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  --mlcad-draw-style-aci-cell: 11px;
}
.mlcad-draw-style-toolbar__color-panel.is-open {
  display: block;
}
.mlcad-draw-style-toolbar__aci-large {
  display: grid;
  grid-template-columns: repeat(24, var(--mlcad-draw-style-aci-cell));
  gap: 1px;
  margin-bottom: 6px;
}
.mlcad-draw-style-toolbar__aci-small {
  display: grid;
  grid-template-columns: repeat(9, var(--mlcad-draw-style-aci-cell));
  gap: 1px;
  margin-bottom: 6px;
}
.mlcad-draw-style-toolbar__aci-gray {
  display: flex;
  gap: 4px;
}
.mlcad-draw-style-toolbar__aci-cell {
  width: var(--mlcad-draw-style-aci-cell);
  height: var(--mlcad-draw-style-aci-cell);
  padding: 0;
  border: 1px solid #666;
  box-sizing: border-box;
  cursor: pointer;
}
.mlcad-draw-style-toolbar__aci-cell:hover {
  outline: 1px solid #00a8ff;
}
.mlcad-draw-style-toolbar__aci-cell.is-selected {
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
  // fromString does not accept CSS hex (`#rrggbb`) or rgb()/hsl(); those
  // log "Unknown color name" (e.g. `#d51572`) if passed as named colors.
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
  style.textContent = TOOLBAR_CSS
}

/** Controller returned by {@link setupAcExDrawStyleToolbar}. */
export interface AcExDrawStyleToolbarController {
  /** Show/hide and sync controls from the active tool. */
  refresh: () => void
  /** Reapply i18n titles after locale change. */
  refreshLabels: () => void
  /** Tear down DOM listeners. */
  dispose: () => void
}

/**
 * Creates the drawing-style overlay on the canvas host.
 */
export function setupAcExDrawStyleToolbar(
  ctx: AcExDrawStyleToolbarContext
): AcExDrawStyleToolbarController {
  ensureStyles()

  const root = document.createElement('div')
  root.className = 'mlcad-draw-style-toolbar'
  root.setAttribute('role', 'toolbar')

  const colorWrap = document.createElement('div')
  colorWrap.className = 'mlcad-draw-style-toolbar__color'

  const swatch = document.createElement('button')
  swatch.type = 'button'
  swatch.className = 'mlcad-draw-style-toolbar__swatch'
  const swatchFill = document.createElement('span')
  swatchFill.className = 'mlcad-draw-style-toolbar__swatch-fill'
  swatch.appendChild(swatchFill)

  const colorPanel = document.createElement('div')
  colorPanel.className = 'mlcad-draw-style-toolbar__color-panel'

  const createAciPalette = (indices: number[], className: string) => {
    const palette = document.createElement('div')
    palette.className = className
    for (const index of indices) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'mlcad-draw-style-toolbar__aci-cell'
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
    createAciPalette(LARGE_ACI, 'mlcad-draw-style-toolbar__aci-large')
  )
  colorPanel.appendChild(
    createAciPalette(SMALL_ACI, 'mlcad-draw-style-toolbar__aci-small')
  )
  colorPanel.appendChild(
    createAciPalette(GRAY_ACI, 'mlcad-draw-style-toolbar__aci-gray')
  )

  colorWrap.appendChild(swatch)
  colorWrap.appendChild(colorPanel)
  root.appendChild(colorWrap)

  const fontSizeSelect = document.createElement('select')
  fontSizeSelect.className = 'mlcad-draw-style-toolbar__select'
  root.appendChild(fontSizeSelect)

  let colorPanelOpen = false
  let colorLeaveTimer: number | undefined
  let currentKind: AcExDrawStyleKind | undefined

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
    colorPanel
      .querySelectorAll('.mlcad-draw-style-toolbar__aci-cell')
      .forEach(el => {
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
      root.classList.remove('is-visible')
      return
    }
    root.classList.add('is-visible')
    paint(ctx.getStyle(currentKind))
    relabel()
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
  root.addEventListener('pointerdown', event => event.stopPropagation())
  root.addEventListener('mousedown', event => event.stopPropagation())

  const onDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null
    const inColor = !!target && colorWrap.contains(target)
    if (!colorPanelOpen) return
    if (!inColor) hideColorPanel()
  }
  document.addEventListener('pointerdown', onDocumentPointerDown, true)

  ctx.root.appendChild(root)
  relabel()

  return {
    refresh,
    refreshLabels: () => {
      relabel()
    },
    dispose: () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown, true)
      clearColorLeaveTimer()
      root.remove()
    }
  }
}
