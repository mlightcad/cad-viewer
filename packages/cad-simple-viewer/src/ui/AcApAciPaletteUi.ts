/**
 * Shared ACI color palette DOM builders and styles.
 *
 * @module AcApAciPaletteUi
 * @packageDocumentation
 */

import { AcCmColor } from '@mlightcad/data-model'

import {
  ACI_GRAY_PALETTE_INDICES,
  ACI_LARGE_PALETTE_INDICES,
  ACI_SMALL_PALETTE_INDICES
} from '../util/AcApAciPalette'

/** DOM id of the injected shared ACI palette stylesheet. */
const STYLE_ID = 'ml-aci-palette-styles'

/** Delay before the long-press magnifier appears. */
const LONG_PRESS_MS = 350

/** Pointer movement (px) that cancels a pending long-press before it activates. */
const LONG_PRESS_CANCEL_PX = 10

/** Magnifier size in CSS pixels. */
const LOUPE_SIZE_PX = 56

/** Vertical offset so the loupe sits above the finger / cursor. */
const LOUPE_OFFSET_Y_PX = 72

/**
 * Shared CSS for ACI grids used by toolbars and full index pickers.
 *
 * Do not set `--ml-aci-cell-size` on `.ml-aci-stacks` / `.ml-aci-picker`: hosts
 * (draw-style toolbar, session panel) override it to 11px. Use a 12px fallback
 * where the variable is consumed instead.
 */
const ACI_PALETTE_CSS = `
.ml-aci-picker,
.ml-aci-stacks {
  font-size: 12px;
  font-family: Arial, sans-serif;
  touch-action: manipulation;
}
.ml-aci-picker {
  width: 100%;
  box-sizing: border-box;
}
.ml-aci-palette {
  margin-bottom: 6px;
}
.ml-aci-palette-large {
  display: grid;
  grid-template-columns: repeat(24, var(--ml-aci-cell-size, 12px));
  gap: 1px;
}
.ml-aci-palette-small {
  display: grid;
  grid-template-columns: repeat(9, var(--ml-aci-cell-size, 12px));
  gap: 1px;
}
.ml-aci-palette-gray {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
}
/* Full dialog picker: stretch the large (and small) palettes to the host width. */
.ml-aci-picker .ml-aci-palette-large {
  width: 100%;
  grid-template-columns: repeat(24, minmax(0, 1fr));
}
.ml-aci-picker .ml-aci-palette-large .ml-aci-cell {
  width: auto;
  height: auto;
  aspect-ratio: 1 / 1;
  min-width: 0;
}
.ml-aci-picker .ml-aci-small-row {
  width: 100%;
}
.ml-aci-picker .ml-aci-palette-small {
  flex: 1 1 auto;
  min-width: 0;
  grid-template-columns: repeat(9, minmax(0, 1fr));
}
.ml-aci-picker .ml-aci-palette-small .ml-aci-cell {
  width: auto;
  height: auto;
  aspect-ratio: 1 / 1;
  min-width: 0;
}
.ml-aci-small-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.ml-aci-small-actions {
  display: flex;
  flex-direction: row;
  flex: 0 0 auto;
  gap: 4px;
  margin-left: auto;
}
.ml-aci-small-actions button {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  cursor: pointer;
}
.ml-aci-cell {
  width: var(--ml-aci-cell-size, 12px);
  height: var(--ml-aci-cell-size, 12px);
  padding: 0;
  border: 1px solid #999;
  box-sizing: border-box;
  cursor: pointer;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.ml-aci-cell:hover {
  outline: 1px solid #00a8ff;
}
.ml-aci-cell.is-selected {
  outline: 2px solid var(--ml-ui-accent, #409eff);
  outline-offset: -1px;
}
.ml-aci-cell.is-preview {
  outline: 2px solid #00a8ff;
  outline-offset: -1px;
  z-index: 1;
  position: relative;
}
.ml-aci-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-aci-info-left {
  text-align: left;
}
.ml-aci-info-right {
  text-align: right;
}
.ml-aci-bottom-row {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 4px;
}
.ml-aci-bottom-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ml-aci-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.ml-aci-input-row input {
  flex: 1;
  padding: 2px 6px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  font-size: 12px;
  font-family: Arial, sans-serif;
}
.ml-aci-preview-box {
  width: 32px;
  min-width: 32px;
  margin-left: auto;
  align-self: stretch;
  border: 1px solid #666;
}
.ml-aci-loupe {
  position: fixed;
  z-index: 2147483000;
  display: none;
  flex-direction: column;
  width: ${LOUPE_SIZE_PX}px;
  height: ${LOUPE_SIZE_PX + 18}px;
  pointer-events: none;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.45);
  background: #1a1a1a;
  color: #fff;
  font-family: Arial, sans-serif;
  transform: translate(-50%, -100%);
}
.ml-aci-loupe.is-visible {
  display: flex;
}
.ml-aci-loupe__swatch {
  flex: 1;
  min-height: ${LOUPE_SIZE_PX - 2}px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.ml-aci-loupe__label {
  flex: 0 0 18px;
  line-height: 18px;
  font-size: 11px;
  text-align: center;
  background: rgba(0, 0, 0, 0.85);
}
`

/**
 * Injects shared ACI palette CSS into `document.head` once.
 */
export function acuiEnsureAciPaletteStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = ACI_PALETTE_CSS
}

/**
 * CSS color string for an ACI index.
 *
 * @param index - AutoCAD Color Index (1–255).
 */
export function acuiAciCssColor(index: number): string {
  const color = new AcCmColor()
  color.colorIndex = index
  return color.cssColor || '#ffffff'
}

/**
 * Parses manual ACI input (index, BYLAYER, BYBLOCK, or a convertible color string).
 *
 * @param value - User input.
 * @returns ACI index in 0–256, or `null` when invalid.
 */
export function acuiParseAciManualInput(value: string): number | null {
  const trimmed = value.trim().toUpperCase()
  if (trimmed === 'BYLAYER') return 256
  if (trimmed === 'BYBLOCK') return 0

  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed)
    if (index >= 0 && index <= 256) return index
    return null
  }

  const color = AcCmColor.fromString(trimmed)
  if (!color) return null
  if (color.isByLayer) return 256
  if (color.isByBlock) return 0
  if (color.isByACI && color.colorIndex != null) return color.colorIndex
  return null
}

function createPaletteStrip(
  indices: readonly number[],
  className: string,
  selectedIndex: number | null | undefined
): HTMLDivElement {
  const palette = document.createElement('div')
  palette.className = `ml-aci-palette ${className}`
  for (const index of indices) {
    const cell = document.createElement('button')
    cell.type = 'button'
    cell.className = 'ml-aci-cell'
    cell.dataset.aci = String(index)
    cell.style.background = acuiAciCssColor(index)
    cell.title = String(index)
    if (selectedIndex === index) cell.classList.add('is-selected')
    palette.appendChild(cell)
  }
  return palette
}

function markSelectedInRoot(
  root: HTMLElement,
  index: number | null | undefined
): void {
  root.querySelectorAll('.ml-aci-cell').forEach(node => {
    const cell = node as HTMLElement
    const aci = Number(cell.dataset.aci)
    cell.classList.toggle(
      'is-selected',
      index != null && Number.isFinite(aci) && aci === index
    )
  })
}

function cellFromPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number
): HTMLElement | null {
  const hit = document.elementFromPoint(clientX, clientY)
  if (!hit) return null
  const cell = hit.closest('.ml-aci-cell') as HTMLElement | null
  if (!cell || !root.contains(cell)) return null
  return cell
}

function parseCellIndex(cell: HTMLElement | null): number | null {
  if (!cell) return null
  const index = Number(cell.dataset.aci)
  return Number.isFinite(index) ? index : null
}

/**
 * Binds long-press magnifier + release-to-select on ACI cells under `root`.
 *
 * @param root - Palette host (`.ml-aci-stacks` or `.ml-aci-picker`).
 * @param onSelect - Called when the user commits a cell (tap or loupe release).
 * @returns Dispose function that removes listeners and the loupe element.
 */
function bindAciCellLoupe(
  root: HTMLElement,
  onSelect: (index: number, event: Event) => void
): () => void {
  const loupe = document.createElement('div')
  loupe.className = 'ml-aci-loupe'
  loupe.setAttribute('aria-hidden', 'true')
  const loupeSwatch = document.createElement('div')
  loupeSwatch.className = 'ml-aci-loupe__swatch'
  const loupeLabel = document.createElement('div')
  loupeLabel.className = 'ml-aci-loupe__label'
  loupe.append(loupeSwatch, loupeLabel)
  document.body.appendChild(loupe)

  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let startCell: HTMLElement | null = null
  let previewCell: HTMLElement | null = null
  let longPressTimer: number | undefined
  let loupeActive = false
  let suppressClick = false

  const clearLongPressTimer = () => {
    if (longPressTimer == null) return
    window.clearTimeout(longPressTimer)
    longPressTimer = undefined
  }

  const clearPreviewClass = () => {
    root.querySelectorAll('.ml-aci-cell.is-preview').forEach(node => {
      node.classList.remove('is-preview')
    })
  }

  const hideLoupe = () => {
    loupe.classList.remove('is-visible')
    clearPreviewClass()
    previewCell = null
    loupeActive = false
  }

  const showLoupeFor = (cell: HTMLElement, clientX: number, clientY: number) => {
    const index = parseCellIndex(cell)
    if (index == null) return
    clearPreviewClass()
    cell.classList.add('is-preview')
    previewCell = cell
    loupeSwatch.style.background = acuiAciCssColor(index)
    loupeLabel.textContent = String(index)
    loupe.style.left = `${clientX}px`
    loupe.style.top = `${clientY - LOUPE_OFFSET_Y_PX + LOUPE_SIZE_PX}px`
    loupe.classList.add('is-visible')
    loupeActive = true
  }

  const updateLoupeFromPoint = (clientX: number, clientY: number) => {
    const cell = cellFromPoint(root, clientX, clientY)
    if (cell) {
      showLoupeFor(cell, clientX, clientY)
      return
    }
    if (previewCell) {
      loupe.style.left = `${clientX}px`
      loupe.style.top = `${clientY - LOUPE_OFFSET_Y_PX + LOUPE_SIZE_PX}px`
    }
  }

  const endInteraction = (event: PointerEvent, commit: boolean) => {
    if (pointerId == null || event.pointerId !== pointerId) return
    clearLongPressTimer()
    const wasLoupe = loupeActive
    const cell = wasLoupe
      ? previewCell ?? cellFromPoint(root, event.clientX, event.clientY)
      : startCell
    const index = parseCellIndex(cell)
    hideLoupe()
    try {
      root.releasePointerCapture(event.pointerId)
    } catch {
      // Ignore if capture was already released.
    }
    pointerId = null
    startCell = null

    if (commit && index != null) {
      // Loupe release can still synthesize a `click`; swallow it. Plain taps call
      // `preventDefault` on pointerdown so a compatibility click usually does not fire.
      if (wasLoupe) suppressClick = true
      onSelect(index, event)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const cell = (event.target as Element | null)?.closest?.(
      '.ml-aci-cell'
    ) as HTMLElement | null
    if (!cell || !root.contains(cell)) return

    event.preventDefault()
    event.stopPropagation()
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    startCell = cell
    previewCell = cell
    loupeActive = false
    clearLongPressTimer()

    try {
      root.setPointerCapture(event.pointerId)
    } catch {
      // Some environments may not support capture.
    }

    longPressTimer = window.setTimeout(() => {
      longPressTimer = undefined
      if (pointerId == null || !startCell) return
      showLoupeFor(startCell, startX, startY)
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId == null || event.pointerId !== pointerId) return

    if (!loupeActive && longPressTimer != null) {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (dx * dx + dy * dy > LONG_PRESS_CANCEL_PX * LONG_PRESS_CANCEL_PX) {
        clearLongPressTimer()
      }
      return
    }

    if (!loupeActive) return
    event.preventDefault()
    updateLoupeFromPoint(event.clientX, event.clientY)
  }

  const onPointerUp = (event: PointerEvent) => {
    endInteraction(event, true)
  }

  const onPointerCancel = (event: PointerEvent) => {
    endInteraction(event, false)
  }

  const onClick = (event: MouseEvent) => {
    if (suppressClick) {
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    // Keyboard Space/Enter (and any non-pointer activation) synthesize `click`
    // without going through the pointer loupe path.
    const cell = (event.target as Element | null)?.closest?.(
      '.ml-aci-cell'
    ) as HTMLElement | null
    if (!cell || !root.contains(cell)) return
    const index = parseCellIndex(cell)
    if (index == null) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(index, event)
  }

  const onContextMenu = (event: Event) => {
    if (pointerId != null || loupeActive) {
      event.preventDefault()
    }
  }

  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('pointermove', onPointerMove)
  root.addEventListener('pointerup', onPointerUp)
  root.addEventListener('pointercancel', onPointerCancel)
  root.addEventListener('click', onClick, true)
  root.addEventListener('contextmenu', onContextMenu)

  return () => {
    clearLongPressTimer()
    if (pointerId != null) {
      try {
        root.releasePointerCapture(pointerId)
      } catch {
        // Ignore if capture was already released.
      }
      pointerId = null
    }
    hideLoupe()
    loupe.remove()
    root.removeEventListener('pointerdown', onPointerDown)
    root.removeEventListener('pointermove', onPointerMove)
    root.removeEventListener('pointerup', onPointerUp)
    root.removeEventListener('pointercancel', onPointerCancel)
    root.removeEventListener('click', onClick, true)
    root.removeEventListener('contextmenu', onContextMenu)
  }
}

/** Options for {@link acuiCreateAciPaletteStacks}. */
export interface AcUiAciPaletteStacksOptions {
  /** Called when the user commits an ACI swatch (1–255). */
  onSelect: (index: number, event: Event) => void
  /** Initially selected ACI index, if any. */
  selectedIndex?: number | null
}

/** Controller returned by {@link acuiCreateAciPaletteStacks}. */
export interface AcUiAciPaletteStacks {
  /** Root element containing large / small / gray palettes. */
  root: HTMLDivElement
  /** Highlights the cell for `index`, or clears selection when nullish. */
  setSelected: (index: number | null | undefined) => void
  /** Tears down loupe listeners and DOM. */
  dispose: () => void
}

/**
 * Builds the compact large + small + gray ACI palette stacks (no ByLayer row).
 *
 * @param options - Selection callback and optional initial selection.
 */
export function acuiCreateAciPaletteStacks(
  options: AcUiAciPaletteStacksOptions
): AcUiAciPaletteStacks {
  acuiEnsureAciPaletteStyles()

  const root = document.createElement('div')
  root.className = 'ml-aci-stacks'

  const onSelect = (index: number, event: Event) => {
    markSelectedInRoot(root, index)
    options.onSelect(index, event)
  }

  root.appendChild(
    createPaletteStrip(
      ACI_LARGE_PALETTE_INDICES,
      'ml-aci-palette-large',
      options.selectedIndex
    )
  )
  root.appendChild(
    createPaletteStrip(
      ACI_SMALL_PALETTE_INDICES,
      'ml-aci-palette-small',
      options.selectedIndex
    )
  )
  root.appendChild(
    createPaletteStrip(
      ACI_GRAY_PALETTE_INDICES,
      'ml-aci-palette-gray',
      options.selectedIndex
    )
  )

  const disposeLoupe = bindAciCellLoupe(root, onSelect)

  return {
    root,
    setSelected: index => markSelectedInRoot(root, index),
    dispose: () => disposeLoupe()
  }
}

/** Localized labels for {@link acuiCreateAciIndexPicker}. */
export interface AcUiAciIndexPickerLabels {
  /** Prefix for the index line, e.g. `"Color Index: "`. */
  index: string
  /** Prefix for the RGB line, e.g. `"RGB: "`. */
  rgb: string
  /** Label beside the manual input. */
  input: string
  /** Placeholder for the manual input. */
  inputPlaceholder: string
  /** ByLayer button text. @default `'ByLayer'` */
  byLayer?: string
  /** ByBlock button text. @default `'ByBlock'` */
  byBlock?: string
}

/** Options for {@link acuiCreateAciIndexPicker}. */
export interface AcUiAciIndexPickerOptions {
  labels: AcUiAciIndexPickerLabels
  /** Initial ACI index (0, 1–255, or 256). */
  initialIndex?: number | null
  /** Fired whenever the selection changes. */
  onChange?: (index: number) => void
}

/** Controller returned by {@link acuiCreateAciIndexPicker}. */
export interface AcUiAciIndexPicker {
  /** Root picker element. */
  root: HTMLDivElement
  /** Current ACI index, or `null` when none. */
  getIndex: () => number | null
  /** Programmatically updates the selection and info row. */
  setIndex: (index: number | null) => void
  /** Removes loupe listeners; does not detach `root` from the DOM. */
  dispose: () => void
}

/**
 * Builds a full ACI index picker (palettes, ByLayer/ByBlock, input, preview).
 *
 * @param options - Labels, initial index, and change callback.
 */
export function acuiCreateAciIndexPicker(
  options: AcUiAciIndexPickerOptions
): AcUiAciIndexPicker {
  acuiEnsureAciPaletteStyles()

  let selectedIndex: number | null = options.initialIndex ?? null

  const root = document.createElement('div')
  root.className = 'ml-aci-picker'

  const onSelect = (index: number) => {
    selectedIndex = index
    markSelectedInRoot(root, index)
    input.value = String(index)
    updateInfo()
    options.onChange?.(index)
  }

  root.appendChild(
    createPaletteStrip(
      ACI_LARGE_PALETTE_INDICES,
      'ml-aci-palette-large',
      selectedIndex
    )
  )

  const smallRow = document.createElement('div')
  smallRow.className = 'ml-aci-small-row'
  smallRow.appendChild(
    createPaletteStrip(
      ACI_SMALL_PALETTE_INDICES,
      'ml-aci-palette-small',
      selectedIndex
    )
  )

  const smallActions = document.createElement('div')
  smallActions.className = 'ml-aci-small-actions'
  const byLayerBtn = document.createElement('button')
  byLayerBtn.type = 'button'
  byLayerBtn.textContent = options.labels.byLayer ?? 'ByLayer'
  byLayerBtn.addEventListener('click', () => onSelect(256))
  const byBlockBtn = document.createElement('button')
  byBlockBtn.type = 'button'
  byBlockBtn.textContent = options.labels.byBlock ?? 'ByBlock'
  byBlockBtn.addEventListener('click', () => onSelect(0))
  smallActions.append(byLayerBtn, byBlockBtn)
  smallRow.appendChild(smallActions)
  root.appendChild(smallRow)

  root.appendChild(
    createPaletteStrip(
      ACI_GRAY_PALETTE_INDICES,
      'ml-aci-palette-gray',
      selectedIndex
    )
  )

  const bottomRow = document.createElement('div')
  bottomRow.className = 'ml-aci-bottom-row'
  const bottomLeft = document.createElement('div')
  bottomLeft.className = 'ml-aci-bottom-left'

  const info = document.createElement('div')
  info.className = 'ml-aci-info-row'
  const indexLabel = document.createElement('span')
  indexLabel.className = 'ml-aci-info-left'
  const rgbLabel = document.createElement('span')
  rgbLabel.className = 'ml-aci-info-right'
  info.append(indexLabel, rgbLabel)
  bottomLeft.appendChild(info)

  const inputRow = document.createElement('div')
  inputRow.className = 'ml-aci-input-row'
  const inputLabel = document.createElement('span')
  inputLabel.textContent = options.labels.input
  const input = document.createElement('input')
  input.placeholder = options.labels.inputPlaceholder
  if (selectedIndex != null) input.value = String(selectedIndex)
  const applyInput = () => {
    const parsed = acuiParseAciManualInput(input.value)
    if (parsed == null) {
      input.value = selectedIndex != null ? String(selectedIndex) : ''
      return
    }
    onSelect(parsed)
  }
  input.addEventListener('blur', applyInput)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') applyInput()
  })
  inputRow.append(inputLabel, input)
  bottomLeft.appendChild(inputRow)

  const previewBox = document.createElement('div')
  previewBox.className = 'ml-aci-preview-box'

  bottomRow.append(bottomLeft, previewBox)
  root.appendChild(bottomRow)

  const updateInfo = () => {
    if (selectedIndex == null) {
      indexLabel.textContent = options.labels.index
      rgbLabel.textContent = options.labels.rgb
      previewBox.style.background = '#000'
      return
    }

    indexLabel.textContent = `${options.labels.index}${selectedIndex}`

    if (selectedIndex === 0 || selectedIndex === 256) {
      rgbLabel.textContent = options.labels.rgb
      previewBox.style.background = '#000'
      return
    }

    const color = new AcCmColor()
    color.colorIndex = selectedIndex
    rgbLabel.textContent = `${options.labels.rgb}${color.red}, ${color.green}, ${color.blue}`
    previewBox.style.background = acuiAciCssColor(selectedIndex)
  }

  updateInfo()

  const disposeLoupe = bindAciCellLoupe(root, index => onSelect(index))

  return {
    root,
    getIndex: () => selectedIndex,
    setIndex: index => {
      selectedIndex = index
      markSelectedInRoot(root, index)
      input.value = index != null ? String(index) : ''
      updateInfo()
    },
    dispose: () => disposeLoupe()
  }
}
