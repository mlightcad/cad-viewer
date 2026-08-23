import {
  ACAP_DEFAULT_COMPARE_COLORS,
  type AcApCompareDisplayColors,
  type AcEdUiTheme,
  AcUiDialog
} from '@mlightcad/cad-simple-viewer'

import {
  ACAP_COMPAREHATCH_DEFAULT,
  ACAP_COMPAREPROPS_COLOR,
  ACAP_COMPAREPROPS_DEFAULT,
  ACAP_COMPAREPROPS_LAYER,
  ACAP_COMPAREPROPS_LINETYPE,
  ACAP_COMPAREPROPS_LINETYPESCALE,
  ACAP_COMPAREPROPS_LINEWEIGHT,
  ACAP_COMPAREPROPS_THICKNESS,
  ACAP_COMPAREPROPS_TRANSPARENCY,
  ACAP_COMPARERCMARGIN_DEFAULT,
  ACAP_COMPARERCMARGIN_MAX,
  ACAP_COMPARERCMARGIN_MIN,
  ACAP_COMPARETEXT_DEFAULT,
  ACAP_COMPARETOLERANCE_DEFAULT,
  ACAP_COMPARETOLERANCE_MAX,
  ACAP_COMPARETOLERANCE_MIN,
  acapDefaultCompareSysVars,
  type AcApDiffCompareSysVars
} from './compare'
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

/** COMPAREPROPS bits shown as checkboxes, matching AutoCAD's Settings panel. */
const COMPAREPROPS_ROWS: Array<{
  bit: number
  labelKey: Parameters<typeof acapDiffViewerT>[0]
}> = [
  { bit: ACAP_COMPAREPROPS_COLOR, labelKey: 'settingsPropColor' },
  { bit: ACAP_COMPAREPROPS_LAYER, labelKey: 'settingsPropLayer' },
  { bit: ACAP_COMPAREPROPS_LINETYPE, labelKey: 'settingsPropLinetype' },
  {
    bit: ACAP_COMPAREPROPS_LINETYPESCALE,
    labelKey: 'settingsPropLinetypeScale'
  },
  { bit: ACAP_COMPAREPROPS_LINEWEIGHT, labelKey: 'settingsPropLineweight' },
  { bit: ACAP_COMPAREPROPS_TRANSPARENCY, labelKey: 'settingsPropTransparency' },
  { bit: ACAP_COMPAREPROPS_THICKNESS, labelKey: 'settingsPropThickness' }
]

/** Draft values edited by {@link AcApDiffSettingsDialog}. */
export interface AcApDiffSettingsDraft {
  /** Compare-display role colors. */
  colors: Required<AcApCompareDisplayColors>
  /** AutoCAD COMPARE system variables. */
  sysVars: AcApDiffCompareSysVars
}

/** Options for {@link AcApDiffSettingsDialog.open}. */
export interface AcApDiffSettingsDialogOptions {
  /** Current compare colors copied into the dialog. */
  colors: Required<AcApCompareDisplayColors>
  /** Current COMPARE sysvars copied into the dialog. */
  sysVars: AcApDiffCompareSysVars
  /** UI chrome theme applied to the dialog backdrop. */
  theme?: AcEdUiTheme
  /**
   * Host that receives the backdrop.
   * @defaultValue `document.body`
   */
  host?: HTMLElement
  /** Called as the user edits so the viewer can preview. */
  onChange?: (draft: AcApDiffSettingsDraft) => void
}

/** Result of {@link AcApDiffSettingsDialog.open}. */
export interface AcApDiffSettingsDialogResult {
  /** True when the user confirmed with OK. */
  confirmed: boolean
  /** Colors at close (draft if confirmed, otherwise the values passed in). */
  colors: Required<AcApCompareDisplayColors>
  /** Sysvars at close (draft if confirmed, otherwise the values passed in). */
  sysVars: AcApDiffCompareSysVars
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
 * Settings dialog for compare-display colors and AutoCAD COMPARE sysvars.
 *
 * Settings are grouped into Colors, Objects, and Geometry tabs. Edits
 * preview via {@link AcApDiffSettingsDialogOptions.onChange}; Cancel /
 * Escape / backdrop restore the values that were passed in.
 */
export class AcApDiffSettingsDialog extends AcUiDialog {
  /** ID of settings-specific style element. */
  public static readonly settingsStyleId = 'ml-diff-settings-dialog-styles-v3'

  private static settingsStylesInjected = false
  private static openInstance: AcApDiffSettingsDialog | null = null

  private readonly initial: AcApDiffSettingsDraft
  private readonly draft: AcApDiffSettingsDraft
  private readonly onChange?: (draft: AcApDiffSettingsDraft) => void
  private readonly pickers = new Map<AcApDiffColorRole, HTMLInputElement>()
  private readonly hexLabels = new Map<AcApDiffColorRole, HTMLElement>()
  private readonly propChecks = new Map<number, HTMLInputElement>()
  private hatchCheck?: HTMLInputElement
  private textCheck?: HTMLInputElement
  private marginInput?: HTMLInputElement
  private marginValue?: HTMLElement
  private toleranceInput?: HTMLInputElement
  private toleranceValue?: HTMLElement
  private readonly tabButtons: HTMLButtonElement[] = []
  private readonly tabPanels: HTMLElement[] = []
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

    this.initial = {
      colors: { ...options.colors },
      sysVars: { ...options.sysVars }
    }
    this.draft = {
      colors: { ...options.colors },
      sysVars: { ...options.sysVars }
    }
    this.onChange = options.onChange

    AcApDiffSettingsDialog.ensureSettingsStyles()
    this.buildContent()
  }

  /**
   * Opens the settings dialog (replaces any already-open instance).
   *
   * @param options - Starting colors/sysvars and optional live-preview callback
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
      colors: dialog._confirmed
        ? { ...dialog.draft.colors }
        : { ...dialog.initial.colors },
      sysVars: dialog._confirmed
        ? { ...dialog.draft.sysVars }
        : { ...dialog.initial.sysVars }
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
    const tabs: Array<{
      id: string
      label: string
      panel: HTMLElement
    }> = [
      {
        id: 'colors',
        label: acapDiffViewerT('settingsTabColors'),
        panel: this.buildColorsPanel()
      },
      {
        id: 'objects',
        label: acapDiffViewerT('settingsTabObjects'),
        panel: this.buildObjectsPanel()
      },
      {
        id: 'geometry',
        label: acapDiffViewerT('settingsTabGeometry'),
        panel: this.buildGeometryPanel()
      }
    ]

    const tablist = document.createElement('div')
    tablist.className = 'ml-diff-settings-tabs'
    tablist.setAttribute('role', 'tablist')
    tablist.setAttribute('aria-label', acapDiffViewerT('settingsTitle'))

    const panels = document.createElement('div')
    panels.className = 'ml-diff-settings-panels'

    tabs.forEach((tab, index) => {
      const tabId = `ml-diff-settings-tab-${tab.id}`
      const panelId = `ml-diff-settings-panel-${tab.id}`
      const button = document.createElement('button')
      button.type = 'button'
      button.id = tabId
      button.className = 'ml-diff-settings-tab'
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', panelId)
      button.textContent = tab.label
      button.addEventListener('click', () => this.selectTab(index))
      button.addEventListener('keydown', event =>
        this.onTabKeyDown(event, index)
      )
      this.tabButtons.push(button)
      tablist.appendChild(button)

      tab.panel.id = panelId
      tab.panel.classList.add('ml-diff-settings-panel')
      tab.panel.setAttribute('role', 'tabpanel')
      tab.panel.setAttribute('aria-labelledby', tabId)
      this.tabPanels.push(tab.panel)
      panels.appendChild(tab.panel)
    })

    this.bodyEl.append(tablist, panels)
    this.selectTab(0)

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

  private buildColorsPanel(): HTMLElement {
    const list = document.createElement('div')
    list.className = 'ml-diff-settings-list'
    for (const row of COLOR_ROWS) {
      list.appendChild(
        this.createColorRow(row.role, acapDiffViewerT(row.labelKey))
      )
    }
    return list
  }

  private buildObjectsPanel(): HTMLElement {
    const root = document.createElement('div')
    const objects = document.createElement('div')
    objects.className = 'ml-diff-settings-check-grid'
    this.hatchCheck = this.createCheckRow(
      objects,
      acapDiffViewerT('settingsIncludeHatch'),
      this.draft.sysVars.comparehatch !== 0,
      checked => {
        this.draft.sysVars.comparehatch = checked ? 1 : 0
        this.emitChange()
      }
    )
    this.textCheck = this.createCheckRow(
      objects,
      acapDiffViewerT('settingsIncludeText'),
      this.draft.sysVars.comparetext !== 0,
      checked => {
        this.draft.sysVars.comparetext = checked ? 1 : 0
        this.emitChange()
      }
    )
    const props = document.createElement('div')
    const hint = document.createElement('p')
    hint.className = 'ml-diff-settings-hint'
    hint.textContent = acapDiffViewerT('settingsPropsHint')
    const propGrid = document.createElement('div')
    propGrid.className = 'ml-diff-settings-check-grid'
    for (const row of COMPAREPROPS_ROWS) {
      const check = this.createCheckRow(
        propGrid,
        acapDiffViewerT(row.labelKey),
        (this.draft.sysVars.compareprops & row.bit) !== 0,
        checked => {
          if (checked) this.draft.sysVars.compareprops |= row.bit
          else this.draft.sysVars.compareprops &= ~row.bit
          this.emitChange()
        }
      )
      this.propChecks.set(row.bit, check)
    }
    props.append(hint, propGrid)
    root.append(
      objects,
      this.createSection(acapDiffViewerT('settingsSectionProps'), () => props)
    )
    return root
  }

  private buildGeometryPanel(): HTMLElement {
    const root = document.createElement('div')
    const tolerance = this.createSliderRow(
      acapDiffViewerT('settingsTolerance'),
      this.draft.sysVars.comparetolerance,
      ACAP_COMPARETOLERANCE_MIN,
      ACAP_COMPARETOLERANCE_MAX,
      value => {
        this.draft.sysVars.comparetolerance = value
        this.emitChange()
      }
    )
    this.toleranceInput = tolerance.input
    this.toleranceValue = tolerance.valueEl
    const margin = this.createSliderRow(
      acapDiffViewerT('settingsRcMargin'),
      this.draft.sysVars.comparercmargin,
      ACAP_COMPARERCMARGIN_MIN,
      ACAP_COMPARERCMARGIN_MAX,
      value => {
        this.draft.sysVars.comparercmargin = value
        this.emitChange()
      }
    )
    this.marginInput = margin.input
    this.marginValue = margin.valueEl
    const toleranceBody = document.createElement('div')
    toleranceBody.appendChild(tolerance.row)
    const marginBody = document.createElement('div')
    marginBody.appendChild(margin.row)
    root.append(
      this.createSection(
        acapDiffViewerT('settingsSectionTolerance'),
        () => toleranceBody
      ),
      this.createSection(
        acapDiffViewerT('settingsSectionClouds'),
        () => marginBody
      )
    )
    return root
  }

  private selectTab(index: number): void {
    this.tabButtons.forEach((button, i) => {
      const selected = i === index
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-selected', selected ? 'true' : 'false')
      button.tabIndex = selected ? 0 : -1
      const panel = this.tabPanels[i]
      if (panel) panel.hidden = !selected
    })
  }

  private onTabKeyDown(event: KeyboardEvent, index: number): void {
    const last = this.tabButtons.length - 1
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = index === last ? 0 : index + 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = index === 0 ? last : index - 1
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = last
    } else {
      return
    }
    event.preventDefault()
    this.selectTab(next)
    this.tabButtons[next]?.focus()
  }

  private createSection(
    title: string,
    buildBody: () => HTMLElement
  ): HTMLElement {
    const section = document.createElement('section')
    section.className = 'ml-diff-settings-section'
    const heading = document.createElement('h3')
    heading.className = 'ml-diff-settings-heading'
    heading.textContent = title
    section.append(heading, buildBody())
    return section
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
    hex.textContent = acapDiffColorToCssHex(this.draft.colors[role])
    this.hexLabels.set(role, hex)

    const input = document.createElement('input')
    input.type = 'color'
    input.className = 'ml-diff-settings-color'
    input.value = acapDiffColorToCssHex(this.draft.colors[role])
    input.setAttribute('aria-label', label)
    input.addEventListener('input', () => {
      const parsed = acapDiffCssHexToColor(input.value)
      if (parsed == null) return
      this.draft.colors[role] = parsed
      hex.textContent = acapDiffColorToCssHex(parsed)
      this.emitChange()
    })
    this.pickers.set(role, input)

    control.append(hex, input)
    row.append(text, control)
    return row
  }

  private createCheckRow(
    parent: HTMLElement,
    label: string,
    checked: boolean,
    onToggle: (checked: boolean) => void
  ): HTMLInputElement {
    const row = document.createElement('label')
    row.className = 'ml-diff-settings-check-item'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'ml-diff-settings-check'
    input.checked = checked
    input.addEventListener('change', () => onToggle(input.checked))
    const text = document.createElement('span')
    text.className = 'ml-diff-settings-label'
    text.textContent = label
    row.append(input, text)
    parent.appendChild(row)
    return input
  }

  private createSliderRow(
    label: string,
    value: number,
    min: number,
    max: number,
    onInput: (value: number) => void
  ): {
    row: HTMLElement
    input: HTMLInputElement
    valueEl: HTMLElement
  } {
    const row = document.createElement('label')
    row.className = 'ml-diff-settings-slider-row'
    const head = document.createElement('span')
    head.className = 'ml-diff-settings-slider-head'
    const text = document.createElement('span')
    text.className = 'ml-diff-settings-label'
    text.textContent = label
    const valueEl = document.createElement('span')
    valueEl.className = 'ml-diff-settings-slider-value'
    valueEl.textContent = String(value)
    head.append(text, valueEl)
    const input = document.createElement('input')
    input.type = 'range'
    input.className = 'ml-diff-settings-slider'
    input.min = String(min)
    input.max = String(max)
    input.step = '1'
    input.value = String(value)
    input.setAttribute('aria-label', label)
    input.addEventListener('input', () => {
      const next = Number(input.value)
      valueEl.textContent = String(next)
      onInput(next)
    })
    row.append(head, input)
    return { row, input, valueEl }
  }

  private resetToDefaults(): void {
    Object.assign(this.draft.colors, ACAP_DEFAULT_COMPARE_COLORS)
    const defaults = acapDefaultCompareSysVars()
    this.draft.sysVars.compareprops =
      defaults.compareprops ?? ACAP_COMPAREPROPS_DEFAULT
    this.draft.sysVars.comparehatch =
      defaults.comparehatch ?? ACAP_COMPAREHATCH_DEFAULT
    this.draft.sysVars.comparercmargin =
      defaults.comparercmargin ?? ACAP_COMPARERCMARGIN_DEFAULT
    this.draft.sysVars.comparetext =
      defaults.comparetext ?? ACAP_COMPARETEXT_DEFAULT
    this.draft.sysVars.comparetolerance =
      defaults.comparetolerance ?? ACAP_COMPARETOLERANCE_DEFAULT

    for (const role of this.pickers.keys()) {
      const hex = acapDiffColorToCssHex(this.draft.colors[role])
      const picker = this.pickers.get(role)
      const label = this.hexLabels.get(role)
      if (picker) picker.value = hex
      if (label) label.textContent = hex
    }
    if (this.hatchCheck) {
      this.hatchCheck.checked = this.draft.sysVars.comparehatch !== 0
    }
    if (this.textCheck) {
      this.textCheck.checked = this.draft.sysVars.comparetext !== 0
    }
    for (const [bit, check] of this.propChecks) {
      check.checked = (this.draft.sysVars.compareprops & bit) !== 0
    }
    if (this.marginInput && this.marginValue) {
      this.marginInput.value = String(this.draft.sysVars.comparercmargin)
      this.marginValue.textContent = String(this.draft.sysVars.comparercmargin)
    }
    if (this.toleranceInput && this.toleranceValue) {
      this.toleranceInput.value = String(this.draft.sysVars.comparetolerance)
      this.toleranceValue.textContent = String(
        this.draft.sysVars.comparetolerance
      )
    }
    this.emitChange()
  }

  private emitChange(): void {
    this.onChange?.({
      colors: { ...this.draft.colors },
      sysVars: { ...this.draft.sysVars }
    })
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
  width: min(460px, calc(100vw - 32px));
  max-height: min(560px, calc(100vh - 32px));
}

.ml-ui-dialog.ml-diff-settings-dialog .ml-ui-dialog-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: min(400px, calc(100vh - 180px));
  padding-top: 0;
}

.ml-diff-settings-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 2px;
  margin: 0 -4px 8px;
  border-bottom: 1px solid var(--ml-ui-border, #4c4d4f);
}

.ml-diff-settings-tab {
  flex: 1 1 0;
  padding: 8px 6px 7px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--ml-ui-text-muted, #cfd3dc);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.ml-diff-settings-tab.is-active {
  color: var(--ml-ui-text, #e5eaf3);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--ml-ui-accent, #409eff);
}

.ml-diff-settings-panels {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.ml-diff-settings-panel[hidden] {
  display: none;
}

.ml-diff-settings-section + .ml-diff-settings-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--ml-ui-border, #4c4d4f);
}

.ml-diff-settings-list + .ml-diff-settings-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--ml-ui-border, #4c4d4f);
}

.ml-diff-settings-heading {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ml-ui-text-muted, #cfd3dc);
}

.ml-diff-settings-hint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ml-ui-text-muted, #cfd3dc);
}

.ml-diff-settings-list {
  display: flex;
  flex-direction: column;
}

.ml-diff-settings-check-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 2px;
}

.ml-diff-settings-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 0;
  cursor: pointer;
}

.ml-diff-settings-check-item .ml-diff-settings-label {
  line-height: 1.3;
}

.ml-diff-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
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

.ml-diff-settings-check {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  accent-color: var(--ml-ui-accent, #409eff);
  cursor: pointer;
}

.ml-diff-settings-slider-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 8px;
}

.ml-diff-settings-slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ml-diff-settings-slider-value {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ml-ui-text-muted, #cfd3dc);
}

.ml-diff-settings-slider {
  width: 100%;
  accent-color: var(--ml-ui-accent, #409eff);
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
