/**
 * Dialog for choosing adaptive (screen px) vs custom WCS text height.
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
  customPlaceholder: string
  match: string
  matchPrompt?: string
}

/** Options for {@link AcUiTextHeightDialog.open}. */
export interface AcUiTextHeightDialogOptions {
  labels: AcUiTextHeightDialogLabels
  host?: HTMLElement
  theme?: AcEdUiTheme
  initialMode?: AcUiTextHeightMode
  /** Initial adaptive font size (CSS px). */
  initialFontSizePx?: number
  /** Initial custom WCS height. */
  initialTextHeightWcs?: number
  /**
   * Invoked when the user clicks "match height". Should resolve to a WCS
   * height, or `null` / `undefined` when cancelled.
   */
  onMatchHeight?: () => Promise<number | null | undefined>
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
  .ml-ui-text-height-dialog .ml-ui-text-height-match {
    flex: 0 0 auto;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--ml-ui-border, #dcdfe6);
    border-radius: 4px;
    background: var(--ml-ui-bg, #fff);
    color: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .ml-ui-text-height-dialog .ml-ui-text-height-match:disabled {
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

/**
 * Modal dialog: adaptive screen font size vs custom WCS text height.
 */
export class AcUiTextHeightDialog extends AcUiDialog {
  private result: AcUiTextHeightDialogResult | null = null
  private readonly adaptiveRadio: HTMLInputElement
  private readonly customRadio: HTMLInputElement
  private readonly customInput: HTMLInputElement
  private readonly matchButton: HTMLButtonElement
  private readonly onMatchHeight?: () => Promise<number | null | undefined>
  private matching = false

  private constructor(options: AcUiTextHeightDialogOptions) {
    super({
      host: options.host,
      title: options.labels.title,
      closeLabel: options.labels.close,
      dialogClassName: 'ml-ui-text-height-dialog',
      theme: options.theme
    })
    ensureStyles()
    this.onMatchHeight = options.onMatchHeight

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
    adaptiveLabel.append(this.adaptiveRadio, document.createTextNode(options.labels.adaptive))
    adaptiveOption.appendChild(adaptiveLabel)

    const customOption = document.createElement('div')
    customOption.className = 'ml-ui-text-height-option'
    const customLabel = document.createElement('label')
    customLabel.className = 'ml-ui-text-height-radio'
    this.customRadio = document.createElement('input')
    this.customRadio.type = 'radio'
    this.customRadio.name = groupName
    this.customRadio.value = 'custom'
    customLabel.append(this.customRadio, document.createTextNode(options.labels.custom))

    const customRow = document.createElement('div')
    customRow.className = 'ml-ui-text-height-custom-row'
    this.customInput = document.createElement('input')
    this.customInput.type = 'number'
    this.customInput.min = '0'
    this.customInput.step = 'any'
    this.customInput.className = 'ml-ui-text-height-input'
    this.customInput.placeholder = options.labels.customPlaceholder
    this.matchButton = document.createElement('button')
    this.matchButton.type = 'button'
    this.matchButton.className = 'ml-ui-text-height-match'
    this.matchButton.textContent = options.labels.match
    customRow.append(this.customInput, this.matchButton)
    customOption.append(customLabel, customRow)

    optionsRoot.append(adaptiveOption, customOption)
    this.bodyEl.appendChild(optionsRoot)

    const initialMode = options.initialMode ?? 'adaptive'
    this.adaptiveRadio.checked = initialMode === 'adaptive'
    this.customRadio.checked = initialMode === 'custom'
    if (
      options.initialTextHeightWcs != null &&
      options.initialTextHeightWcs > 0
    ) {
      this.customInput.value = String(options.initialTextHeightWcs)
    } else if (
      options.initialFontSizePx != null &&
      options.initialFontSizePx > 0 &&
      initialMode === 'adaptive'
    ) {
      // Leave custom empty in adaptive mode; caller may still pass a WCS seed.
    }

    const syncEnabled = () => {
      const custom = this.customRadio.checked
      this.customInput.disabled = !custom
      this.matchButton.disabled = !custom || this.matching || !this.onMatchHeight
    }
    this.adaptiveRadio.addEventListener('change', syncEnabled)
    this.customRadio.addEventListener('change', syncEnabled)
    syncEnabled()

    this.matchButton.addEventListener('click', () => {
      void this.runMatchHeight()
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
   * @param options - Labels, initial values, and optional match-height handler.
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

  private async runMatchHeight(): Promise<void> {
    if (!this.onMatchHeight || this.matching) return
    this.matching = true
    this.matchButton.disabled = true
    // Hide dialog while picking so the canvas is free.
    this.backdrop.style.visibility = 'hidden'
    try {
      const height = await this.onMatchHeight()
      if (height != null && height > 0 && Number.isFinite(height)) {
        this.customInput.value = String(height)
        this.customRadio.checked = true
        this.adaptiveRadio.checked = false
      }
    } finally {
      this.backdrop.style.visibility = ''
      this.matching = false
      this.customInput.disabled = !this.customRadio.checked
      this.matchButton.disabled =
        !this.customRadio.checked || !this.onMatchHeight
    }
  }
}
