/**
 * Canvas-top drawing style overlay (color / line weight / font size).
 * Mirrors `@mlightcad/cad-simple-viewer` {@link AcApDrawStyleToolbar}.
 *
 * @module AcExDrawStyleToolbar
 * @packageDocumentation
 */

import { AcCmColor, AcCmColorUtil, AcGiLineWeight } from '@mlightcad/data-model'

import type { AcExHtmlI18n } from './AcExHtmlI18n'

/** Active tool kind that owns the overlay. */
export type AcExDrawStyleKind = 'measure' | 'markup'

/** Style snapshot shown in / written by the overlay. */
export interface AcExDrawStyleValues {
  /** CSS color string. */
  color: string
  /** CAD line weight in hundredths of a millimeter (e.g. 70 = 0.70 mm). */
  lineWeight: number
  /** Badge / text font size in CSS pixels. */
  fontSize: number
}

/** Partial style update from the overlay controls. */
export interface AcExDrawStylePatch {
  color?: string
  lineWeight?: number
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
.mlcad-draw-style-toolbar__lineweight {
  position: relative;
  width: 120px;
  flex: 0 0 120px;
}
.mlcad-draw-style-toolbar__lineweight-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(18, 22, 28, 0.95);
  color: inherit;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  text-align: left;
  cursor: pointer;
}
.mlcad-draw-style-toolbar__lineweight-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.mlcad-draw-style-toolbar__lineweight-caret {
  flex: 0 0 auto;
  margin-left: auto;
  width: 0;
  height: 0;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 4px solid currentColor;
  opacity: 0.55;
}
.mlcad-draw-style-toolbar__lineweight-preview {
  position: relative;
  display: inline-flex;
  width: 36px;
  height: 14px;
  flex: 0 0 36px;
}
.mlcad-draw-style-toolbar__lineweight-preview::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: var(--ml-lineweight-height, 2px);
  transform: translateY(-50%);
  background-color: currentColor;
  border-radius: 999px;
}
.mlcad-draw-style-toolbar__lineweight-menu {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 2;
  min-width: 148px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(28, 32, 40, 0.98);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
}
.mlcad-draw-style-toolbar__lineweight-menu.is-open {
  display: block;
}
.mlcad-draw-style-toolbar__lineweight-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.mlcad-draw-style-toolbar__lineweight-item:hover,
.mlcad-draw-style-toolbar__lineweight-item.is-selected {
  background: rgba(255, 255, 255, 0.1);
}
.mlcad-draw-style-toolbar__lineweight-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
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
  const isFunctional = /^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)
  if (!isFunctional) {
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

function numericLineWeights(): number[] {
  const weights = Array.from(
    new Set(
      Object.values(AcGiLineWeight).filter(
        (value): value is number => typeof value === 'number' && value > 0
      )
    )
  ).sort((a, b) => a - b)
  return [0, ...weights]
}

function formatLineWeight(value: number, hairlineLabel: string): string {
  if (!(value > 0)) return hairlineLabel
  return `${(value / 100).toFixed(2)} mm`
}

function previewLineHeightPx(value: number): number {
  return Math.max(1, Math.min(6, value / 40))
}

interface AcExLineWeightPicker {
  root: HTMLDivElement
  setValue: (weight: number) => void
  setTitle: (title: string) => void
  refreshLabels: () => void
  close: () => void
  isOpen: () => boolean
  contains: (node: Node | null) => boolean
}

function createLineWeightPicker(
  onChange: (weight: number) => void,
  onOpen: () => void,
  hairlineLabel: () => string
): AcExLineWeightPicker {
  const prefix = 'mlcad-draw-style-toolbar'
  const weights = numericLineWeights()
  let open = false
  let currentWeight = weights[0] ?? 0

  const root = document.createElement('div')
  root.className = `${prefix}__lineweight`

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = `${prefix}__lineweight-trigger`
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')

  const preview = document.createElement('span')
  preview.className = `${prefix}__lineweight-preview`

  const label = document.createElement('span')
  label.className = `${prefix}__lineweight-label`

  const caret = document.createElement('span')
  caret.className = `${prefix}__lineweight-caret`
  caret.setAttribute('aria-hidden', 'true')

  trigger.append(preview, label, caret)

  const menu = document.createElement('div')
  menu.className = `${prefix}__lineweight-menu`
  menu.setAttribute('role', 'listbox')

  const paintTrigger = (weight: number) => {
    currentWeight = weight
    preview.style.setProperty(
      '--ml-lineweight-height',
      `${previewLineHeightPx(weight > 0 ? weight : 1)}px`
    )
    label.textContent = formatLineWeight(weight, hairlineLabel())
  }

  const markSelected = (weight: number) => {
    menu.querySelectorAll(`.${prefix}__lineweight-item`).forEach(node => {
      const item = node as HTMLElement
      item.classList.toggle('is-selected', item.dataset.value === String(weight))
    })
  }

  const close = () => {
    open = false
    menu.classList.remove('is-open')
    trigger.setAttribute('aria-expanded', 'false')
  }

  const openMenu = () => {
    onOpen()
    open = true
    menu.classList.add('is-open')
    trigger.setAttribute('aria-expanded', 'true')
  }

  const addItem = (weight: number) => {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = `${prefix}__lineweight-item`
    item.dataset.value = String(weight)
    item.setAttribute('role', 'option')

    const itemPreview = document.createElement('span')
    itemPreview.className = `${prefix}__lineweight-preview`
    itemPreview.style.setProperty(
      '--ml-lineweight-height',
      `${previewLineHeightPx(weight > 0 ? weight : 1)}px`
    )

    const itemLabel = document.createElement('span')
    itemLabel.className = `${prefix}__lineweight-text`
    itemLabel.textContent = formatLineWeight(weight, hairlineLabel())

    item.append(itemPreview, itemLabel)
    item.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      paintTrigger(weight)
      markSelected(weight)
      close()
      onChange(weight)
    })
    menu.appendChild(item)
  }

  for (const weight of weights) addItem(weight)

  trigger.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    if (open) close()
    else openMenu()
  })

  root.append(trigger, menu)
  paintTrigger(currentWeight)
  markSelected(currentWeight)

  return {
    root,
    setValue: weight => {
      if (!Number.isFinite(weight) || weight < 0) return
      if (!menu.querySelector(`[data-value="${weight}"]`)) addItem(weight)
      paintTrigger(weight)
      markSelected(weight)
    },
    setTitle: title => {
      trigger.title = title
    },
    refreshLabels: () => {
      menu.querySelectorAll(`.${prefix}__lineweight-item`).forEach(node => {
        const item = node as HTMLElement
        const weight = Number(item.dataset.value)
        const text = item.querySelector(`.${prefix}__lineweight-text`)
        if (text) text.textContent = formatLineWeight(weight, hairlineLabel())
      })
      paintTrigger(currentWeight)
    },
    close,
    isOpen: () => open,
    contains: node => !!node && root.contains(node)
  }
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

  const lineWeightUi: { picker: AcExLineWeightPicker | null } = {
    picker: null
  }
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
    lineWeightUi.picker?.close()
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
    lineWeightUi.picker?.setValue(style.lineWeight)

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

  const applyLineWeight = (weight: number) => {
    if (!currentKind || !Number.isFinite(weight) || weight < 0) return
    ctx.applyStyle(currentKind, { lineWeight: weight })
  }

  const applyFontSize = (size: number) => {
    if (!currentKind || !(size > 0)) return
    ctx.applyStyle(currentKind, { fontSize: size })
  }

  const relabel = () => {
    swatch.title = ctx.i18n.t('drawStyle.color')
    lineWeightUi.picker?.setTitle(ctx.i18n.t('drawStyle.lineWeight'))
    lineWeightUi.picker?.refreshLabels()
    fontSizeSelect.title = ctx.i18n.t('drawStyle.fontSize')
  }

  const refresh = () => {
    currentKind = ctx.getKind()
    if (!currentKind) {
      hideColorPanel()
      lineWeightUi.picker?.close()
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
  lineWeightUi.picker = createLineWeightPicker(
    applyLineWeight,
    hideColorPanel,
    () => ctx.i18n.t('drawStyle.lineWeightHairline')
  )
  root.insertBefore(lineWeightUi.picker.root, fontSizeSelect)
  fontSizeSelect.addEventListener('change', () => {
    applyFontSize(Number(fontSizeSelect.value))
  })
  root.addEventListener('pointerdown', event => event.stopPropagation())
  root.addEventListener('mousedown', event => event.stopPropagation())

  const onDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null
    const inColor = !!target && colorWrap.contains(target)
    const inLineWeight = !!lineWeightUi.picker?.contains(target)
    const colorOpen = colorPanelOpen
    const weightOpen = !!lineWeightUi.picker?.isOpen()
    if (!colorOpen && !weightOpen) return
    if (colorOpen && !inColor) hideColorPanel()
    if (weightOpen && !inLineWeight) lineWeightUi.picker?.close()
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
      lineWeightUi.picker?.close()
      root.remove()
    }
  }
}
