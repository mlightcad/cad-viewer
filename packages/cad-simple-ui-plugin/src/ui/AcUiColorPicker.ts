import {
  type AcUiAciIndexPicker,
  acuiCreateAciIndexPicker
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'

import type { AcUiI18n } from '../i18n'
import { acuiEnsureUiStyles } from './styles'

/**
 * Modal ACI color picker dialog for layer color selection.
 *
 * Presents standard AutoCAD Color Index palettes plus numeric or hex input.
 */
export class AcUiColorPicker {
  /** Full-screen backdrop containing the dialog. */
  private backdrop: HTMLDivElement
  /** Shared ACI index picker mounted in the dialog body. */
  private picker: AcUiAciIndexPicker
  /** Promise resolver set by {@link open}. */
  private resolve?: (color: AcCmColor | null) => void

  /**
   * Builds the dialog DOM and appends it to the theme host.
   *
   * @param i18n - i18n helper for dialog labels.
   * @param themeHost - Viewer host so `--ml-ui-*` CSS variables are inherited.
   * @param initialColor - Optional initial selection.
   */
  constructor(
    private i18n: AcUiI18n,
    themeHost: HTMLElement,
    initialColor?: AcCmColor
  ) {
    acuiEnsureUiStyles()

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

    this.picker = acuiCreateAciIndexPicker({
      labels: {
        index: this.i18n.t('colorPicker.index'),
        rgb: this.i18n.t('colorPicker.rgb'),
        input: this.i18n.t('colorPicker.input'),
        inputPlaceholder: this.i18n.t('colorPicker.inputPlaceholder')
      },
      initialIndex: this.toColorIndex(initialColor)
    })
    dialog.appendChild(this.picker.root)

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
    this.picker.dispose()
    this.backdrop.remove()
    this.resolve?.(color)
    this.resolve = undefined
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
   * Builds the confirmed {@link AcCmColor} from the current selection.
   */
  private toSelectedColor(): AcCmColor | null {
    const selectedIndex = this.picker.getIndex()
    if (selectedIndex == null) return null
    if (selectedIndex === 256) {
      const color = new AcCmColor()
      color.setByLayer()
      return color
    }
    if (selectedIndex === 0) {
      const color = new AcCmColor()
      color.setByBlock()
      return color
    }
    return new AcCmColor(AcCmColorMethod.ByACI, selectedIndex)
  }
}
