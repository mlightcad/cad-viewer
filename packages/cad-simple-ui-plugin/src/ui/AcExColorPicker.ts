import {
  AcCmColor,
  AcCmColorMethod
} from '@mlightcad/data-model'

import type { AcExI18n } from '../i18n'
import { ensureUiStyles } from './styles'

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

  /**
   * Builds the dialog DOM and appends it to `document.body`.
   *
   * @param i18n - i18n helper for dialog labels.
   * @param initialColor - Optional initial selection.
   */
  constructor(
    private i18n: AcExI18n,
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

    const title = document.createElement('div')
    title.className = 'ml-ex-ui-color-dialog-title'
    title.textContent = this.i18n.t('colorPicker.title')
    dialog.appendChild(title)

    const largePalette = this.createPalette(
      Array.from({ length: 240 }, (_, i) => i + 10),
      'ml-ex-ui-aci-palette-large'
    )
    dialog.appendChild(largePalette)

    const smallPalette = this.createPalette(
      Array.from({ length: 9 }, (_, i) => i + 1),
      'ml-ex-ui-aci-palette-small'
    )
    dialog.appendChild(smallPalette)

    const grayPalette = this.createPalette(
      Array.from({ length: 6 }, (_, i) => i + 250),
      'ml-ex-ui-aci-palette-gray'
    )
    dialog.appendChild(grayPalette)

    const info = document.createElement('div')
    info.className = 'ml-ex-ui-aci-info'
    const indexLabel = document.createElement('span')
    const rgbLabel = document.createElement('span')
    info.appendChild(indexLabel)
    info.appendChild(rgbLabel)
    dialog.appendChild(info)

    const inputRow = document.createElement('div')
    inputRow.className = 'ml-ex-ui-aci-input-row'
    const inputLabel = document.createElement('span')
    inputLabel.textContent = this.i18n.t('colorPicker.input')
    const input = document.createElement('input')
    input.placeholder = this.i18n.t('colorPicker.inputPlaceholder')
    if (this.selectedIndex != null) {
      input.value = String(this.selectedIndex)
    }
    inputRow.appendChild(inputLabel)
    inputRow.appendChild(input)
    dialog.appendChild(inputRow)

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

    const updateInfo = () => {
      if (this.selectedIndex == null) {
        indexLabel.textContent = this.i18n.t('colorPicker.index')
        rgbLabel.textContent = this.i18n.t('colorPicker.rgb')
        return
      }
      const color = new AcCmColor()
      color.colorIndex = this.selectedIndex
      indexLabel.textContent = `${this.i18n.t('colorPicker.index')}${this.selectedIndex}`
      rgbLabel.textContent = `${this.i18n.t('colorPicker.rgb')}${color.red}, ${color.green}, ${color.blue}`
    }

    const selectIndex = (index: number) => {
      this.selectedIndex = index
      input.value = String(index)
      dialog.querySelectorAll('.ml-ex-ui-aci-cell').forEach(cell => {
        cell.classList.toggle(
          'selected',
          Number((cell as HTMLElement).dataset.index) === index
        )
      })
      updateInfo()
    }

    dialog.querySelectorAll('.ml-ex-ui-aci-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        selectIndex(Number((cell as HTMLElement).dataset.index))
      })
    })

    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return
      const parsed = this.parseInput(input.value)
      if (parsed == null) return
      selectIndex(parsed)
    })

    updateInfo()
    this.backdrop.appendChild(dialog)
    document.body.appendChild(this.backdrop)
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
    if (color.isByACI && color.colorIndex != null) return color.colorIndex
    return null
  }

  /**
   * Parses manual color input as an ACI index or convertible color string.
   *
   * @param value - User input (1–255, or a color string).
   */
  private parseInput(value: string): number | null {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const index = Number(trimmed)
      if (index >= 1 && index <= 255) return index
      return null
    }
    const color = AcCmColor.fromString(trimmed)
    if (!color || color.isByLayer || color.isByBlock) return null
    if (color.isByACI && color.colorIndex != null) return color.colorIndex
    return null
  }

  /**
   * Builds the confirmed {@link AcCmColor} from the current selection.
   */
  private toSelectedColor(): AcCmColor | null {
    if (this.selectedIndex == null) return null
    return new AcCmColor(AcCmColorMethod.ByACI, this.selectedIndex)
  }
}
