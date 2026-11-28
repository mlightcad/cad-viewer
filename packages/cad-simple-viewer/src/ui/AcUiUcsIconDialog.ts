/**
 * UCS Icon Properties dialog (AutoCAD UCSICON → Properties).
 *
 * Omits UCS Icon Style and Help; exposes size, colors, Apply Single Color,
 * and a live preview.
 *
 * @module AcUiUcsIconDialog
 * @packageDocumentation
 */

import { AcCmColor } from '@mlightcad/data-model'

import { AcApI18n } from '../i18n/index.js'
import {
  type AcApUcsIconAppearance,
  AcApUcsService
} from '../service/AcApUcsService.js'
import { acCmColorToCssHex } from '../util/AcApCssColor.js'
import { AcUiAciColorDialog } from './AcUiAciColorDialog.js'
import { AcUiDialog } from './AcUiDialog.js'
import {
  acuiEnsureFormStyles,
  acuiFormNumber,
  acuiFormRadios,
  acuiFormSection,
  acuiFormStack,
  acuiFormToggle
} from './acuiFormControls.js'

const STYLE_ID = 'ml-ui-ucs-icon-dialog-styles'

const DIALOG_CSS = `
.ml-ui-ucs-icon-dialog .ml-ui-ucs-icon-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 6px;
  background: var(--ml-ui-bg-muted, rgba(127, 127, 127, 0.08));
}
.ml-ui-ucs-icon-dialog .ml-ui-ucs-icon-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ml-ui-ucs-icon-dialog .ml-ui-ucs-icon-color-label {
  font-size: 13px;
  color: var(--ml-ui-text, inherit);
}
.ml-ui-ucs-icon-dialog .ml-ui-ucs-icon-swatch {
  width: 36px;
  height: 24px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}
`

/**
 * Modal dialog for UCS icon size and color settings.
 */
export class AcUiUcsIconDialog extends AcUiDialog {
  private static openInstance: AcUiUcsIconDialog | null = null

  private readonly dialogHost: HTMLElement
  private draft: AcApUcsIconAppearance
  private confirmed = false
  private readonly previewSvg: SVGSVGElement
  private readonly modelSwatch: HTMLButtonElement
  private readonly layoutSwatch: HTMLButtonElement

  private constructor(host: HTMLElement) {
    super({
      host,
      title: AcApI18n.t('main.ucsIconDlg.title'),
      closeLabel: AcApI18n.t('main.ucsIconDlg.close'),
      dialogClassName: 'ml-ui-ucs-icon-dialog',
      layoutWidth: false
    })

    this.dialogHost = host
    AcUiUcsIconDialog.ensureUcsIconDialogStyles()
    acuiEnsureFormStyles()

    this.draft = AcApUcsService.getIconAppearance()

    this.previewSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    )
    this.previewSvg.setAttribute('width', '96')
    this.previewSvg.setAttribute('height', '96')
    this.previewSvg.setAttribute('viewBox', '0 0 96 96')

    const previewBox = document.createElement('div')
    previewBox.className = 'ml-ui-ucs-icon-preview'
    previewBox.appendChild(this.previewSvg)

    const lineWidthSection = acuiFormSection(
      AcApI18n.t('main.ucsIconDlg.lineWidth')
    )
    const lineWidthRadios = acuiFormRadios(
      [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' }
      ],
      String(this.draft.lineWidth),
      value => {
        this.draft.lineWidth = Number(value) as 1 | 2 | 3
        this.refreshPreview()
      }
    )
    lineWidthSection.body.appendChild(lineWidthRadios.root)

    const sizeField = acuiFormNumber({
      label: AcApI18n.t('main.ucsIconDlg.size'),
      hint: AcApI18n.t('main.ucsIconDlg.sizeHint'),
      value: this.draft.sizePercent,
      min: 5,
      max: 95,
      step: 1,
      onChange: value => {
        this.draft.sizePercent = value
        this.refreshPreview()
      }
    })

    this.modelSwatch = this.createSwatch(() => this.pickColor('model'))
    this.layoutSwatch = this.createSwatch(() => this.pickColor('layout'))

    const modelRow = this.createColorRow(
      AcApI18n.t('main.ucsIconDlg.modelColor'),
      this.modelSwatch
    )
    const layoutRow = this.createColorRow(
      AcApI18n.t('main.ucsIconDlg.layoutColor'),
      this.layoutSwatch
    )

    const singleColor = acuiFormToggle({
      label: AcApI18n.t('main.ucsIconDlg.applySingleColor'),
      checked: this.draft.applySingleColor,
      yes: AcApI18n.t('main.ucsIconDlg.on'),
      no: AcApI18n.t('main.ucsIconDlg.off'),
      onChange: checked => {
        this.draft.applySingleColor = checked
        this.refreshPreview()
      }
    })

    this.bodyEl.appendChild(
      acuiFormStack(
        previewBox,
        lineWidthSection.root,
        sizeField.root,
        modelRow,
        layoutRow,
        singleColor.root
      )
    )

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary'
    cancelBtn.textContent = AcApI18n.t('main.ucsIconDlg.cancel')
    cancelBtn.addEventListener('click', () => this.close())

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-dialog-btn'
    okBtn.textContent = AcApI18n.t('main.ucsIconDlg.ok')
    okBtn.addEventListener('click', () => {
      this.confirmed = true
      this.close()
    })

    this.footerEl.append(cancelBtn, okBtn)
    this.focusAfterOpen(okBtn)
    this.refreshSwatches()
    this.refreshPreview()
  }

  /**
   * Opens the dialog; applies appearance on OK.
   */
  static async open(host: HTMLElement = document.body): Promise<boolean> {
    AcUiUcsIconDialog.openInstance?.close()
    const dialog = new AcUiUcsIconDialog(host)
    AcUiUcsIconDialog.openInstance = dialog
    await dialog.show()
    if (dialog.confirmed) {
      AcApUcsService.setIconAppearance(dialog.draft)
    }
    return dialog.confirmed
  }

  override close(): void {
    if (AcUiUcsIconDialog.openInstance === this) {
      AcUiUcsIconDialog.openInstance = null
    }
    super.close()
  }

  private createSwatch(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ml-ui-ucs-icon-swatch'
    btn.addEventListener('click', onClick)
    return btn
  }

  private createColorRow(
    label: string,
    swatch: HTMLButtonElement
  ): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'ml-ui-ucs-icon-color-row'
    const text = document.createElement('span')
    text.className = 'ml-ui-ucs-icon-color-label'
    text.textContent = label
    row.append(text, swatch)
    return row
  }

  private async pickColor(which: 'model' | 'layout'): Promise<void> {
    const initial =
      which === 'model'
        ? this.draft.modelColorIndex
        : this.draft.layoutColorIndex
    const index = await AcUiAciColorDialog.open({
      host: this.dialogHost,
      initialIndex: initial,
      labels: {
        title: AcApI18n.t('main.ucsIconDlg.colorTitle'),
        close: AcApI18n.t('main.ucsIconDlg.close'),
        ok: AcApI18n.t('main.ucsIconDlg.ok'),
        cancel: AcApI18n.t('main.ucsIconDlg.cancel'),
        index: AcApI18n.t('main.ucsIconDlg.colorIndex'),
        rgb: AcApI18n.t('main.ucsIconDlg.colorRgb'),
        input: AcApI18n.t('main.ucsIconDlg.colorInput'),
        inputPlaceholder: AcApI18n.t('main.ucsIconDlg.colorInputPlaceholder')
      }
    })
    if (index == null) return
    if (which === 'model') this.draft.modelColorIndex = index
    else this.draft.layoutColorIndex = index
    this.refreshSwatches()
    this.refreshPreview()
  }

  private refreshSwatches() {
    this.modelSwatch.style.background = this.aciToCss(this.draft.modelColorIndex)
    this.layoutSwatch.style.background = this.aciToCss(
      this.draft.layoutColorIndex
    )
  }

  private refreshPreview() {
    while (this.previewSvg.firstChild) {
      this.previewSvg.removeChild(this.previewSvg.firstChild)
    }
    const xColor = this.draft.applySingleColor
      ? this.aciToCss(this.draft.modelColorIndex)
      : '#e53935'
    const yColor = this.draft.applySingleColor
      ? this.aciToCss(this.draft.modelColorIndex)
      : '#43a047'
    const ox = 28
    const oy = 68
    const len = 28 + (this.draft.sizePercent / 95) * 16
    const stroke = String(this.draft.lineWidth)
    this.previewSvg.append(
      this.previewLine(ox, oy, ox + len, oy, xColor, stroke),
      this.previewLine(ox, oy, ox, oy - len, yColor, stroke),
      this.previewText('X', ox + len + 8, oy, xColor),
      this.previewText('Y', ox, oy - len - 8, yColor),
      this.previewText('W', ox - 4, oy + 14, '#90caf9')
    )
  }

  private previewLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    strokeWidth: string
  ): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', strokeWidth)
    line.setAttribute('stroke-linecap', 'round')
    return line
  }

  private previewText(
    text: string,
    x: number,
    y: number,
    color: string
  ): SVGTextElement {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    el.textContent = text
    el.setAttribute('x', String(x))
    el.setAttribute('y', String(y))
    el.setAttribute('fill', color)
    el.setAttribute('font-size', '12')
    el.setAttribute('font-family', 'sans-serif')
    el.setAttribute('text-anchor', 'middle')
    el.setAttribute('dominant-baseline', 'middle')
    return el
  }

  private aciToCss(index: number): string {
    const color = new AcCmColor()
    color.colorIndex = index
    return acCmColorToCssHex(color)
  }

  private static ensureUcsIconDialogStyles() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = DIALOG_CSS
    document.head.appendChild(style)
  }
}
