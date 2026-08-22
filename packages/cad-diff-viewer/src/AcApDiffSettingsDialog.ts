import {
  ACAP_DEFAULT_COMPARE_COLORS,
  type AcApCompareDisplayColors,
  type AcEdUiTheme,
  AcUiDialog
} from '@mlightcad/cad-simple-viewer'

import { acapDiffViewerT } from './i18n'

/** Compare-color channels editable in the settings dialog. */
type AcApDiffColorRole = keyof Required<AcApCompareDisplayColors>

/** Rows shown in the settings dialog, in display order. */
const COLOR_ROWS: Array<{
  role: AcApDiffColorRole
  labelKey: Parameters<typeof acapDiffViewerT>[0]
}> = [
  { role: 'unchanged', labelKey: 'settingsUnchanged' },
  { role: 'deleted', labelKey: 'settingsDeleted' },
  { role: 'added', labelKey: 'settingsAdded' },
  { role: 'modified', labelKey: 'settingsModified' }
]

/** Options for {@link AcApDiffSettingsDialog.open}. */
export interface AcApDiffSettingsDialogOptions {
  /** Current compare colors copied into the dialog. */
  colors: Required<AcApCompareDisplayColors>
  /** UI chrome theme applied to the dialog backdrop. */
  theme?: AcEdUiTheme
  /**
   * Host that receives the backdrop.
   * @defaultValue `document.body`
   */
  host?: HTMLElement
  /** Called as the user edits colors so the viewer can preview. */
  onChange?: (colors: Required<AcApCompareDisplayColors>) => void
}

/** Result of {@link AcApDiffSettingsDialog.open}. */
export interface AcApDiffSettingsDialogResult {
  /** True when the user confirmed with OK. */
  confirmed: boolean
  /** Colors at close (draft if confirmed, otherwise the values passed in). */
  colors: Required<AcApCompareDisplayColors>
}

/**
 * Converts a 24-bit RGB integer to a CSS `#rrggbb` string.
 *
 * @param color - Packed RGB (`0xrrggbb`).
 */
export function acapDiffColorToCssHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`
}

/**
 * Parses a CSS `#rrggbb` (or `rrggbb`) string into a 24-bit RGB integer.
 *
 * @param hex - Color string from `<input type="color">`.
 */
export function acapDiffCssHexToColor(hex: string): number | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return undefined
  return parseInt(match[1], 16)
}

/**
 * Settings dialog for compare-display colors.
 *
 * Extends {@link AcUiDialog}. Color changes are previewed via {@link
 * AcApDiffSettingsDialogOptions.onChange}; Cancel / Escape / backdrop
 * restore the colors that were passed in.
 */
export class AcApDiffSettingsDialog extends AcUiDialog {
  /** ID of settings-specific style element. */
  public static readonly settingsStyleId = 'ml-diff-settings-dialog-styles'

  private static settingsStylesInjected = false
  private static openInstance: AcApDiffSettingsDialog | null = null

  private readonly initial: Required<AcApCompareDisplayColors>
  private readonly draft: Required<AcApCompareDisplayColors>
  private readonly onChange?: (
    colors: Required<AcApCompareDisplayColors>
  ) => void
  private readonly pickers = new Map<AcApDiffColorRole, HTMLInputElement>()
  private readonly hexLabels = new Map<AcApDiffColorRole, HTMLElement>()
  private _confirmed = false

  private constructor(options: AcApDiffSettingsDialogOptions) {
    super({
      host: options.host ?? document.body,
      title: acapDiffViewerT('settingsTitle'),
      closeLabel: acapDiffViewerT('settingsClose'),
      titleId: 'ml-diff-settings-title',
      dialogClassName: 'ml-diff-settings-dialog',
      theme: options.theme
    })

    this.initial = { ...options.colors }
    this.draft = { ...options.colors }
    this.onChange = options.onChange

    AcApDiffSettingsDialog.ensureSettingsStyles()
    this.buildContent()
  }

  /**
   * Opens the settings dialog (replaces any already-open instance).
   *
   * @param options - Starting colors and optional live-preview callback
   * @returns Promise that resolves when the dialog is closed
   */
  static open(
    options: AcApDiffSettingsDialogOptions
  ): Promise<AcApDiffSettingsDialogResult> {
    AcApDiffSettingsDialog.openInstance?.close()
    const dialog = new AcApDiffSettingsDialog(options)
    AcApDiffSettingsDialog.openInstance = dialog
    return dialog.show().then(() => ({
      confirmed: dialog._confirmed,
      colors: dialog._confirmed ? { ...dialog.draft } : { ...dialog.initial }
    }))
  }

  /** Closes the open instance, if any. Treated as cancel. */
  static dismiss(): void {
    AcApDiffSettingsDialog.openInstance?.close()
  }

  override close(): void {
    if (AcApDiffSettingsDialog.openInstance === this) {
      AcApDiffSettingsDialog.openInstance = null
    }
    super.close()
  }

  private buildContent(): void {
    const list = document.createElement('div')
    list.className = 'ml-diff-settings-list'

    for (const row of COLOR_ROWS) {
      list.appendChild(
        this.createColorRow(row.role, acapDiffViewerT(row.labelKey))
      )
    }
    this.bodyEl.appendChild(list)

    const resetBtn = document.createElement('button')
    resetBtn.type = 'button'
    resetBtn.className =
      'ml-ui-dialog-btn ml-diff-settings-btn-secondary ml-diff-settings-reset'
    resetBtn.textContent = acapDiffViewerT('settingsReset')
    resetBtn.addEventListener('click', () => this.resetToDefaults())

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ui-dialog-btn ml-diff-settings-btn-secondary'
    cancelBtn.textContent = acapDiffViewerT('settingsCancel')
    cancelBtn.addEventListener('click', () => this.close())

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-dialog-btn'
    okBtn.textContent = acapDiffViewerT('settingsOk')
    okBtn.addEventListener('click', () => {
      this._confirmed = true
      this.close()
    })

    this.footerEl.classList.add('ml-diff-settings-footer')
    this.footerEl.append(resetBtn, cancelBtn, okBtn)
    this.focusAfterOpen(okBtn)
  }

  private createColorRow(role: AcApDiffColorRole, label: string): HTMLElement {
    const row = document.createElement('label')
    row.className = 'ml-diff-settings-row'

    const text = document.createElement('span')
    text.className = 'ml-diff-settings-label'
    text.textContent = label

    const control = document.createElement('span')
    control.className = 'ml-diff-settings-control'

    const hex = document.createElement('span')
    hex.className = 'ml-diff-settings-hex'
    hex.textContent = acapDiffColorToCssHex(this.draft[role])
    this.hexLabels.set(role, hex)

    const input = document.createElement('input')
    input.type = 'color'
    input.className = 'ml-diff-settings-color'
    input.value = acapDiffColorToCssHex(this.draft[role])
    input.setAttribute('aria-label', label)
    input.addEventListener('input', () => {
      const parsed = acapDiffCssHexToColor(input.value)
      if (parsed == null) return
      this.draft[role] = parsed
      hex.textContent = acapDiffColorToCssHex(parsed)
      this.emitChange()
    })
    this.pickers.set(role, input)

    control.append(hex, input)
    row.append(text, control)
    return row
  }

  private resetToDefaults(): void {
    Object.assign(this.draft, ACAP_DEFAULT_COMPARE_COLORS)
    for (const role of this.pickers.keys()) {
      const hex = acapDiffColorToCssHex(this.draft[role])
      const picker = this.pickers.get(role)
      const label = this.hexLabels.get(role)
      if (picker) picker.value = hex
      if (label) label.textContent = hex
    }
    this.emitChange()
  }

  private emitChange(): void {
    this.onChange?.({ ...this.draft })
  }

  private static ensureSettingsStyles(): void {
    if (AcApDiffSettingsDialog.settingsStylesInjected) return
    if (document.getElementById(AcApDiffSettingsDialog.settingsStyleId)) {
      AcApDiffSettingsDialog.settingsStylesInjected = true
      return
    }

    const style = document.createElement('style')
    style.id = AcApDiffSettingsDialog.settingsStyleId
    style.textContent = `
.ml-ui-dialog.ml-diff-settings-dialog {
  width: min(400px, calc(100vw - 32px));
}

.ml-diff-settings-list {
  display: flex;
  flex-direction: column;
}

.ml-diff-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  cursor: pointer;
}

.ml-diff-settings-row + .ml-diff-settings-row {
  border-top: 1px solid var(--ml-ui-border, #4c4d4f);
}

.ml-diff-settings-label {
  font-size: 13px;
  color: var(--ml-ui-text, #e5eaf3);
}

.ml-diff-settings-control {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.ml-diff-settings-hex {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ml-ui-text-muted, #cfd3dc);
  min-width: 4.6em;
  text-align: right;
}

.ml-diff-settings-color {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ml-ui-border, #4c4d4f);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.ml-diff-settings-color::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.ml-diff-settings-color::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}

.ml-diff-settings-color::-moz-color-swatch {
  border: none;
  border-radius: 3px;
}

.ml-diff-settings-footer {
  align-items: center;
}

.ml-diff-settings-reset {
  margin-right: auto;
}

.ml-ui-dialog-btn.ml-diff-settings-btn-secondary {
  background: transparent;
  color: var(--ml-ui-text, #e5eaf3);
  border-color: var(--ml-ui-border, #4c4d4f);
}
`.trim()
    document.head.appendChild(style)
    AcApDiffSettingsDialog.settingsStylesInjected = true
  }
}
