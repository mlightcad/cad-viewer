/**
 * Dialog for choosing adaptive (screen px) vs custom WCS text height.
 *
 * Custom mode includes a small calculator that converts a desired on-screen
 * font size at the current zoom into a fixed world-space height.
 *
 * @module AcUiTextHeightDialog
 * @packageDocumentation
 */

import type { AcEdUiTheme } from '../editor/global/AcEdUiTheme'
import { AcUiDialog } from './AcUiDialog'

/** Text height authoring mode. */
export type AcUiTextHeightMode = 'adaptive' | 'custom'

/** Values returned when the user confirms the dialog. */
export interface AcUiTextHeightDialogResult {
  mode: AcUiTextHeightMode
  /**
   * Screen font size in CSS px when {@link mode} is `'adaptive'`.
   * When `'custom'`, this is derived from the WCS height at confirm time by the caller.
   */
  fontSizePx?: number
  /** World-space text height when {@link mode} is `'custom'`. */
  textHeightWcs?: number
}

/** Localized labels for {@link AcUiTextHeightDialog}. */
export interface AcUiTextHeightDialogLabels {
  title: string
  close: string
  ok: string
  cancel: string
  adaptive: string
  custom: string
  /** Placeholder for the primary WCS height field. */
  customPlaceholder: string
  /** Calculator section title. */
  fromScreen: string
  /** Explains that conversion uses the current canvas zoom. */
  fromScreenHint: string
  /** Placeholder for the screen-size input. */
  screenPxPlaceholder: string
  /** Unit suffix next to the screen-size input (e.g. `px`). */
  screenUnit: string
  /** Apply conversion button. */
  convert: string
}

/** Options for {@link AcUiTextHeightDialog.open}. */
export interface AcUiTextHeightDialogOptions {
  labels: AcUiTextHeightDialogLabels
  host?: HTMLElement
  theme?: AcEdUiTheme
  initialMode?: AcUiTextHeightMode
  /** Initial adaptive font size (CSS px); also seeds the calculator. */
  initialFontSizePx?: number
  /** Initial custom WCS height. */
  initialTextHeightWcs?: number
  /**
   * Converts a CSS-pixel size to WCS at the canvas zoom when the dialog opens.
   * Required for the screen-size calculator.
   */
  screenPxToWcs: (px: number) => number
}

const STYLE_ID = 'ml-ui-text-height-dialog-styles'

const DIALOG_CSS = `
  .ml-ui-text-height-dialog .ml-ui-text-height-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-option {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-radio {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-radio input {
    margin: 0;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-custom-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 24px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-input {
    flex: 1 1 auto;
    min-width: 0;
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 4px;
    background: var(--ml-ui-bg, #fff);
    color: inherit;
    font-size: 13px;
    box-sizing: border-box;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-input:disabled {
    opacity: 0.55;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc {
    margin-left: 24px;
    padding: 10px 12px;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 6px;
    background: var(--ml-ui-bg-muted, rgba(127, 127, 127, 0.08));
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc[data-disabled='true'] {
    opacity: 0.55;
    pointer-events: none;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc-hint {
    font-size: 12px;
    line-height: 1.45;
    opacity: 0.78;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc-row .ml-ui-text-height-input {
    flex: 1 1 auto;
    max-width: 120px;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-calc-unit {
    flex: 0 0 auto;
    font-size: 13px;
    opacity: 0.8;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-convert {
    flex: 0 0 auto;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 4px;
    background: var(--ml-ui-bg, #fff);
    color: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-convert:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = DIALOG_CSS
  document.head.appendChild(style)
}

/** Formats a positive WCS height for the input field. */
function formatWcsHeight(value: number): string {
  if (!(value > 0) || !Number.isFinite(value)) return ''
  const rounded = Number(value.toPrecision(6))
  return String(rounded)
}

/**
 * Modal dialog: adaptive screen font size vs custom WCS text height.
 */
export class AcUiTextHeightDialog extends AcUiDialog {
  private result: AcUiTextHeightDialogResult | null = null
  private readonly adaptiveRadio: HTMLInputElement
  private readonly customRadio: HTMLInputElement
  private readonly customInput: HTMLInputElement
  private readonly screenPxInput: HTMLInputElement
  private readonly convertButton: HTMLButtonElement
  private readonly calcPanel: HTMLDivElement
  private readonly screenPxToWcs: (px: number) => number

  private constructor(options: AcUiTextHeightDialogOptions) {
    super({
      host: options.host,
      title: options.labels.title,
      closeLabel: options.labels.close,
      dialogClassName: 'ml-ui-text-height-dialog',
      theme: options.theme
    })
    ensureStyles()
    this.screenPxToWcs = options.screenPxToWcs

    const groupName = `ml-ui-text-height-${AcUiTextHeightDialog.nextGroupId++}`

    const optionsRoot = document.createElement('div')
    optionsRoot.className = 'ml-ui-text-height-options'

    const adaptiveOption = document.createElement('div')
    adaptiveOption.className = 'ml-ui-text-height-option'
    const adaptiveLabel = document.createElement('label')
    adaptiveLabel.className = 'ml-ui-text-height-radio'
    this.adaptiveRadio = document.createElement('input')
    this.adaptiveRadio.type = 'radio'
    this.adaptiveRadio.name = groupName
    this.adaptiveRadio.value = 'adaptive'
    adaptiveLabel.append(
      this.adaptiveRadio,
      document.createTextNode(options.labels.adaptive)
    )
    adaptiveOption.appendChild(adaptiveLabel)

    const customOption = document.createElement('div')
    customOption.className = 'ml-ui-text-height-option'
    const customLabel = document.createElement('label')
    customLabel.className = 'ml-ui-text-height-radio'
    this.customRadio = document.createElement('input')
    this.customRadio.type = 'radio'
    this.customRadio.name = groupName
    this.customRadio.value = 'custom'
    customLabel.append(
      this.customRadio,
      document.createTextNode(options.labels.custom)
    )

    const customRow = document.createElement('div')
    customRow.className = 'ml-ui-text-height-custom-row'
    this.customInput = document.createElement('input')
    this.customInput.type = 'number'
    this.customInput.min = '0'
    this.customInput.step = 'any'
    this.customInput.className = 'ml-ui-text-height-input'
    this.customInput.placeholder = options.labels.customPlaceholder
    customRow.appendChild(this.customInput)

    this.calcPanel = document.createElement('div')
    this.calcPanel.className = 'ml-ui-text-height-calc'
    const calcTitle = document.createElement('div')
    calcTitle.className = 'ml-ui-text-height-calc-title'
    calcTitle.textContent = options.labels.fromScreen
    const calcHint = document.createElement('div')
    calcHint.className = 'ml-ui-text-height-calc-hint'
    calcHint.textContent = options.labels.fromScreenHint
    const calcRow = document.createElement('div')
    calcRow.className = 'ml-ui-text-height-calc-row'
    this.screenPxInput = document.createElement('input')
    this.screenPxInput.type = 'number'
    this.screenPxInput.min = '1'
    this.screenPxInput.step = '1'
    this.screenPxInput.className = 'ml-ui-text-height-input'
    this.screenPxInput.placeholder = options.labels.screenPxPlaceholder
    const unit = document.createElement('span')
    unit.className = 'ml-ui-text-height-calc-unit'
    unit.textContent = options.labels.screenUnit
    this.convertButton = document.createElement('button')
    this.convertButton.type = 'button'
    this.convertButton.className = 'ml-ui-text-height-convert'
    this.convertButton.textContent = options.labels.convert
    calcRow.append(this.screenPxInput, unit, this.convertButton)
    this.calcPanel.append(calcTitle, calcHint, calcRow)

    customOption.append(customLabel, customRow, this.calcPanel)
    optionsRoot.append(adaptiveOption, customOption)
    this.bodyEl.appendChild(optionsRoot)

    const initialMode = options.initialMode ?? 'adaptive'
    this.adaptiveRadio.checked = initialMode === 'adaptive'
    this.customRadio.checked = initialMode === 'custom'
    if (
      options.initialTextHeightWcs != null &&
      options.initialTextHeightWcs > 0
    ) {
      this.customInput.value = formatWcsHeight(options.initialTextHeightWcs)
    }
    if (options.initialFontSizePx != null && options.initialFontSizePx > 0) {
      this.screenPxInput.value = String(Math.round(options.initialFontSizePx))
    }

    const syncEnabled = () => {
      const custom = this.customRadio.checked
      this.customInput.disabled = !custom
      this.screenPxInput.disabled = !custom
      this.convertButton.disabled = !custom
      this.calcPanel.dataset.disabled = custom ? 'false' : 'true'
    }
    this.adaptiveRadio.addEventListener('change', syncEnabled)
    this.customRadio.addEventListener('change', syncEnabled)
    syncEnabled()

    this.convertButton.addEventListener('click', () => this.applyScreenPx())
    this.screenPxInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.applyScreenPx()
      }
    })

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary'
    cancelBtn.textContent = options.labels.cancel
    cancelBtn.addEventListener('click', () => this.close())

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-dialog-btn ml-ui-dialog-btn-primary'
    okBtn.textContent = options.labels.ok
    okBtn.addEventListener('click', () => this.confirm())

    this.footerEl.append(cancelBtn, okBtn)
  }

  private static nextGroupId = 0

  /**
   * Opens the dialog and resolves with the confirmed values, or `null` if cancelled.
   *
   * @param options - Labels, initial values, and screen↔WCS conversion.
   */
  static open(
    options: AcUiTextHeightDialogOptions
  ): Promise<AcUiTextHeightDialogResult | null> {
    const dialog = new AcUiTextHeightDialog(options)
    return dialog.show().then(() => dialog.result)
  }

  private confirm(): void {
    if (this.adaptiveRadio.checked) {
      this.result = { mode: 'adaptive' }
      this.close()
      return
    }
    const raw = Number(this.customInput.value)
    if (!(raw > 0) || !Number.isFinite(raw)) {
      this.customInput.focus()
      return
    }
    this.result = { mode: 'custom', textHeightWcs: raw }
    this.close()
  }

  private applyScreenPx(): void {
    if (!this.customRadio.checked) return
    const px = Number(this.screenPxInput.value)
    if (!(px > 0) || !Number.isFinite(px)) {
      this.screenPxInput.focus()
      return
    }
    const wcs = this.screenPxToWcs(px)
    if (!(wcs > 0) || !Number.isFinite(wcs)) {
      this.screenPxInput.focus()
      return
    }
    this.customInput.value = formatWcsHeight(wcs)
    this.customInput.focus()
    this.customInput.select()
  }
}
