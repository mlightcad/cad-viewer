import {
  AcCmColor,
  AcCmColorMethod
} from '@mlightcad/data-model'

import type { AcExI18n } from '../i18n'
import { ensureUiStyles } from './styles'

const SMALL_COLORS = Array.from({ length: 9 }, (_, i) => i + 1)
const LARGE_COLORS = Array.from({ length: 240 }, (_, i) => i + 10)
const GRAY_COLORS = Array.from({ length: 6 }, (_, i) => i + 250)

/**
 * Modal ACI color picker dialog for layer color selection.
 *
 * Presents standard AutoCAD Color Index palettes plus numeric or hex input.
 */
export class AcExColorPicker {
  /** Full-screen backdrop containing the dialog. */
  private backdrop: HTMLDivElement
  /** Currently selected ACI index, if any. */
  private selectedIndex: number | null = null
  /** Promise resolver set by {@link open}. */
  private resolve?: (color: AcCmColor | null) => void
  /** Preview swatch element. */
  private previewBox!: HTMLDivElement
  /** Color index label element. */
  private indexLabel!: HTMLSpanElement
  /** RGB label element. */
  private rgbLabel!: HTMLSpanElement
  /** Manual color index input. */
  private input!: HTMLInputElement

  /**
   * Builds the dialog DOM and appends it to the theme host.
   *
   * @param i18n - i18n helper for dialog labels.
   * @param themeHost - Viewer host so `--ml-ui-*` CSS variables are inherited.
   * @param initialColor - Optional initial selection.
   */
  constructor(
    private i18n: AcExI18n,
    themeHost: HTMLElement,
    initialColor?: AcCmColor
  ) {
    ensureUiStyles()
    this.selectedIndex = this.toColorIndex(initialColor)

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'ml-ex-ui-color-dialog-backdrop'
    this.backdrop.addEventListener('mousedown', event => {
      if (event.target === this.backdrop) this.finish(null)
    })

    const dialog = document.createElement('div')
    dialog.className = 'ml-ex-ui-color-dialog'
    dialog.addEventListener('mousedown', event => event.stopPropagation())

    const header = document.createElement('div')
    header.className = 'ml-ex-ui-color-dialog-header'

    const title = document.createElement('div')
    title.className = 'ml-ex-ui-color-dialog-title'
    title.textContent = this.i18n.t('colorPicker.title')

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'ml-ex-ui-color-dialog-close'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => this.finish(null))

    header.appendChild(title)
    header.appendChild(closeBtn)
    dialog.appendChild(header)

    const picker = document.createElement('div')
    picker.className = 'ml-ex-ui-aci-picker'

    picker.appendChild(
      this.createPalette(LARGE_COLORS, 'ml-ex-ui-aci-palette-large')
    )

    const smallRow = document.createElement('div')
    smallRow.className = 'ml-ex-ui-aci-small-row'
    smallRow.appendChild(
      this.createPalette(SMALL_COLORS, 'ml-ex-ui-aci-palette-small')
    )

    const smallActions = document.createElement('div')
    smallActions.className = 'ml-ex-ui-aci-small-actions'
    const byLayerBtn = document.createElement('button')
    byLayerBtn.type = 'button'
    byLayerBtn.textContent = 'ByLayer'
    byLayerBtn.addEventListener('click', () => this.selectIndex(256))
    const byBlockBtn = document.createElement('button')
    byBlockBtn.type = 'button'
    byBlockBtn.textContent = 'ByBlock'
    byBlockBtn.addEventListener('click', () => this.selectIndex(0))
    smallActions.appendChild(byLayerBtn)
    smallActions.appendChild(byBlockBtn)
    smallRow.appendChild(smallActions)
    picker.appendChild(smallRow)

    picker.appendChild(
      this.createPalette(GRAY_COLORS, 'ml-ex-ui-aci-palette-gray')
    )

    const bottomRow = document.createElement('div')
    bottomRow.className = 'ml-ex-ui-aci-bottom-row'

    const bottomLeft = document.createElement('div')
    bottomLeft.className = 'ml-ex-ui-aci-bottom-left'

    const info = document.createElement('div')
    info.className = 'ml-ex-ui-aci-info-row'
    this.indexLabel = document.createElement('span')
    this.indexLabel.className = 'ml-ex-ui-aci-info-left'
    this.rgbLabel = document.createElement('span')
    this.rgbLabel.className = 'ml-ex-ui-aci-info-right'
    info.appendChild(this.indexLabel)
    info.appendChild(this.rgbLabel)
    bottomLeft.appendChild(info)

    const inputRow = document.createElement('div')
    inputRow.className = 'ml-ex-ui-aci-input-row'
    const inputLabel = document.createElement('span')
    inputLabel.textContent = this.i18n.t('colorPicker.input')
    this.input = document.createElement('input')
    this.input.placeholder = this.i18n.t('colorPicker.inputPlaceholder')
    if (this.selectedIndex != null) {
      this.input.value = String(this.selectedIndex)
    }
    this.input.addEventListener('blur', () => this.applyInput())
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.applyInput()
    })
    inputRow.appendChild(inputLabel)
    inputRow.appendChild(this.input)
    bottomLeft.appendChild(inputRow)

    this.previewBox = document.createElement('div')
    this.previewBox.className = 'ml-ex-ui-aci-preview-box'

    bottomRow.appendChild(bottomLeft)
    bottomRow.appendChild(this.previewBox)
    picker.appendChild(bottomRow)

    dialog.appendChild(picker)

    const actions = document.createElement('div')
    actions.className = 'ml-ex-ui-dialog-actions'
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ex-ui-btn'
    cancelBtn.textContent = this.i18n.t('colorPicker.cancel')
    cancelBtn.addEventListener('click', () => this.finish(null))
    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ex-ui-btn ml-ex-ui-btn-primary'
    okBtn.textContent = this.i18n.t('colorPicker.ok')
    okBtn.addEventListener('click', () => this.finish(this.toSelectedColor()))
    actions.appendChild(cancelBtn)
    actions.appendChild(okBtn)
    dialog.appendChild(actions)

    dialog.querySelectorAll('.ml-ex-ui-aci-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        this.selectIndex(Number((cell as HTMLElement).dataset.index))
      })
    })

    this.updateInfo()
    this.backdrop.appendChild(dialog)
    themeHost.appendChild(this.backdrop)
  }

  /**
   * Returns a promise resolved when the user confirms or cancels the dialog.
   *
   * @returns Selected color, or `null` on cancel or backdrop click.
   */
  open(): Promise<AcCmColor | null> {
    return new Promise(resolve => {
      this.resolve = resolve
    })
  }

  /**
   * Removes the dialog and resolves the {@link open} promise.
   *
   * @param color - Selected color, or `null` when dismissed.
   */
  private finish(color: AcCmColor | null) {
    this.backdrop.remove()
    this.resolve?.(color)
    this.resolve = undefined
  }

  /**
   * Selects an ACI index and refreshes the UI.
   *
   * @param index - ACI color index (0, 1–255, or 256).
   */
  private selectIndex(index: number) {
    this.selectedIndex = index
    this.input.value = String(index)
    this.backdrop.querySelectorAll('.ml-ex-ui-aci-cell').forEach(cell => {
      cell.classList.toggle(
        'selected',
        Number((cell as HTMLElement).dataset.index) === index
      )
    })
    this.updateInfo()
  }

  /**
   * Applies manual color input from the text field.
   */
  private applyInput() {
    const parsed = this.parseInput(this.input.value)
    if (parsed == null) {
      this.input.value =
        this.selectedIndex != null ? String(this.selectedIndex) : ''
      return
    }
    this.selectIndex(parsed)
  }

  /**
   * Updates index, RGB, and preview display for the current selection.
   */
  private updateInfo() {
    if (this.selectedIndex == null) {
      this.indexLabel.textContent = this.i18n.t('colorPicker.index')
      this.rgbLabel.textContent = this.i18n.t('colorPicker.rgb')
      this.previewBox.style.background = '#000'
      return
    }

    this.indexLabel.textContent = `${this.i18n.t('colorPicker.index')}${this.selectedIndex}`

    if (this.selectedIndex === 0 || this.selectedIndex === 256) {
      this.rgbLabel.textContent = this.i18n.t('colorPicker.rgb')
      this.previewBox.style.background = '#000'
      return
    }

    const color = new AcCmColor()
    color.colorIndex = this.selectedIndex
    this.rgbLabel.textContent = `${this.i18n.t('colorPicker.rgb')}${color.red}, ${color.green}, ${color.blue}`
    this.previewBox.style.background = this.rgb(this.selectedIndex)
  }

  /**
   * Builds a grid of clickable ACI swatches.
   *
   * @param indices - ACI color indices to include.
   * @param className - CSS class for the palette container.
   */
  private createPalette(indices: number[], className: string) {
    const palette = document.createElement('div')
    palette.className = className
    indices.forEach(index => {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'ml-ex-ui-aci-cell'
      cell.dataset.index = String(index)
      cell.style.background = this.rgb(index)
      if (this.selectedIndex === index) {
        cell.classList.add('selected')
      }
      palette.appendChild(cell)
    })
    return palette
  }

  /**
   * Returns the CSS color for an ACI index.
   *
   * @param index - ACI color index (1–255).
   */
  private rgb(index: number): string {
    const color = new AcCmColor()
    color.colorIndex = index
    return color.cssColor || '#FFFFFF'
  }

  /**
   * Extracts an ACI index from an initial color, when applicable.
   *
   * @param color - Optional initial color.
   */
  private toColorIndex(color?: AcCmColor): number | null {
    if (!color) return null
    if (color.isByLayer) return 256
    if (color.isByBlock) return 0
    if (color.isByACI && color.colorIndex != null) return color.colorIndex
    return null
  }

  /**
   * Parses manual color input as an ACI index or convertible color string.
   *
   * @param value - User input (0–256, BYLAYER, BYBLOCK, or a color string).
   */
  private parseInput(value: string): number | null {
    const trimmed = value.trim().toUpperCase()
    if (trimmed === 'BYLAYER') return 256
    if (trimmed === 'BYBLOCK') return 0

    if (/^\d+$/.test(trimmed)) {
      const index = Number(trimmed)
      if (index >= 0 && index <= 256) return index
      return null
    }

    const color = AcCmColor.fromString(trimmed)
    if (!color || color.isByLayer) return 256
    if (color.isByBlock) return 0
    if (color.isByACI && color.colorIndex != null) return color.colorIndex
    return null
  }

  /**
   * Builds the confirmed {@link AcCmColor} from the current selection.
   */
  private toSelectedColor(): AcCmColor | null {
    if (this.selectedIndex == null) return null
    if (this.selectedIndex === 256) {
      const color = new AcCmColor()
      color.setByLayer()
      return color
    }
    if (this.selectedIndex === 0) {
      const color = new AcCmColor()
      color.setByBlock()
      return color
    }
    return new AcCmColor(AcCmColorMethod.ByACI, this.selectedIndex)
  }
}
