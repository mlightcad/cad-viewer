import {
  AcCmColor,
  acdbHostApplicationServices,
  AcGiLineWeight
} from '@mlightcad/data-model'

import {
  AcApSettingManager,
  type AcApSettingManagerEventArgs
} from '../app/AcApSettingManager'
import { applyMarkupStyleToSelection } from '../command/markup/AcApMarkupPresenter'
import { getMarkupStore } from '../command/markup/AcApMarkupStore'
import {
  cssToMarkupColor,
  defaultMarkupColor,
  getMarkupFontSize,
  getMarkupLineWeight,
  markupColorToCss,
  setMarkupDrawColor,
  setMarkupDrawFontSize,
  setMarkupDrawLineWeight
} from '../command/markup/AcApMarkupUtil'
import {
  applyMeasurementStyleToSelection,
  getActiveMeasurementStyle,
  getSelectedMeasurementId,
  subscribeMeasurementSelection
} from '../command/measure/AcApMeasurementStore'
import type { AcEdCommandEventArgs } from '../editor'
import { acedApplyUiTheme, resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import {
  acapCssColor,
  acapCssToMeasurementColor,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapGetMeasurementLineWeight,
  acapSetMeasurementDrawColor,
  acapSetMeasurementDrawFontSize,
  acapSetMeasurementDrawLineWeight
} from '../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../view'
import {
  type AcApDrawStyleKind,
  acapDrawStyleKindForCommand,
  acapResolveDrawStyleKind,
  acapSetDrawStyleToolbarVisible,
  acapShouldShowDrawStyleToolbar
} from './AcApDrawStyle'

/** Font-size choices shown in the overlay dropdown, in CSS pixels. */
const FONT_SIZE_OPTIONS = [10, 12, 13, 14, 16, 18, 20, 24, 28, 32]

/** DOM id of the injected stylesheet for the overlay. */
const STYLE_ID = 'ml-draw-style-toolbar-styles'

/** CSS rules for the overlay, color panel, and ACI swatches. */
const TOOLBAR_CSS = `
    .ml-draw-style-toolbar {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      box-sizing: border-box;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      background: var(--ml-ui-bg, rgba(255, 255, 255, 0.96));
      box-shadow: var(--ml-ui-shadow, 0 2px 6px rgba(0, 0, 0, 0.12));
      color: var(--ml-ui-text, #303133);
      pointer-events: auto;
    }
    .ml-draw-style-toolbar.is-visible {
      display: inline-flex;
    }
    .ml-draw-style-toolbar__swatch {
      position: relative;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #fff);
      cursor: pointer;
    }
    .ml-draw-style-toolbar__swatch-fill {
      display: block;
      width: 14px;
      height: 14px;
      margin: 0 auto;
      border-radius: 50%;
      border: 1px solid #666;
    }
    .ml-draw-style-toolbar__select {
      height: 28px;
      min-width: 92px;
      max-width: 140px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #fff);
      color: inherit;
      font-size: 12px;
      padding: 0 6px;
    }
    .ml-draw-style-toolbar__lineweight {
      position: relative;
      width: 120px;
      flex: 0 0 120px;
    }
    .ml-draw-style-toolbar__lineweight-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 28px;
      box-sizing: border-box;
      padding: 0 6px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 4px;
      background: var(--ml-ui-bg, #fff);
      color: inherit;
      font-family: inherit;
      font-size: 12px;
      line-height: 1;
      text-align: left;
      cursor: pointer;
    }
    .ml-draw-style-toolbar__lineweight-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }
    .ml-draw-style-toolbar__lineweight-caret {
      flex: 0 0 auto;
      margin-left: auto;
      width: 0;
      height: 0;
      border-left: 3.5px solid transparent;
      border-right: 3.5px solid transparent;
      border-top: 4px solid currentColor;
      opacity: 0.55;
    }
    .ml-draw-style-toolbar__lineweight-preview {
      position: relative;
      display: inline-flex;
      width: 36px;
      height: 14px;
      flex: 0 0 36px;
    }
    .ml-draw-style-toolbar__lineweight-preview::before {
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
    .ml-draw-style-toolbar__lineweight-menu {
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 2;
      min-width: 148px;
      max-height: 260px;
      overflow-y: auto;
      padding: 4px 0;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      background: var(--ml-ui-bg, rgba(255, 255, 255, 0.98));
      box-shadow: var(--ml-ui-shadow, 0 4px 12px rgba(0, 0, 0, 0.16));
    }
    .ml-draw-style-toolbar__lineweight-menu.is-open {
      display: block;
    }
    .ml-draw-style-toolbar__lineweight-item {
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
    .ml-draw-style-toolbar__lineweight-item:hover,
    .ml-draw-style-toolbar__lineweight-item.is-selected {
      background: var(--ml-ui-hover, rgba(64, 158, 255, 0.12));
    }
    .ml-draw-style-toolbar__lineweight-text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }
    .ml-draw-style-toolbar__color {
      position: relative;
    }
    .ml-draw-style-toolbar__color-panel {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 1;
      padding: 8px;
      border: 1px solid var(--ml-ui-border, #dcdfe6);
      border-radius: 6px;
      background: var(--ml-ui-bg, rgba(255, 255, 255, 0.98));
      box-shadow: var(--ml-ui-shadow, 0 4px 12px rgba(0, 0, 0, 0.16));
      --ml-draw-style-aci-cell: 11px;
    }
    .ml-draw-style-toolbar__color-panel.is-open {
      display: block;
    }
    .ml-draw-style-toolbar__aci-large {
      display: grid;
      grid-template-columns: repeat(24, var(--ml-draw-style-aci-cell));
      gap: 1px;
      margin-bottom: 6px;
    }
    .ml-draw-style-toolbar__aci-small {
      display: grid;
      grid-template-columns: repeat(9, var(--ml-draw-style-aci-cell));
      gap: 1px;
      margin-bottom: 6px;
    }
    .ml-draw-style-toolbar__aci-gray {
      display: flex;
      gap: 4px;
    }
    .ml-draw-style-toolbar__aci-cell {
      width: var(--ml-draw-style-aci-cell);
      height: var(--ml-draw-style-aci-cell);
      padding: 0;
      border: 1px solid #999;
      box-sizing: border-box;
      cursor: pointer;
    }
    .ml-draw-style-toolbar__aci-cell:hover {
      outline: 1px solid #00a8ff;
    }
    .ml-draw-style-toolbar__aci-cell.is-selected {
      outline: 2px solid var(--ml-ui-accent, #409eff);
      outline-offset: -1px;
    }
  `

/**
 * Builds an ACI indexed color.
 *
 * @param index - AutoCAD Color Index (1–255).
 * @returns Color whose `colorIndex` is `index`.
 */
function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

/**
 * CSS hex for an ACI index.
 *
 * @param index - AutoCAD Color Index.
 * @returns CSS color string, falling back to white.
 */
function aciCss(index: number): string {
  return colorFromAci(index).cssColor || '#ffffff'
}

/**
 * ACI index of a color when it is stored as ByACI.
 *
 * @param color - Color to inspect.
 * @returns Index ≥ 1, or `undefined` if the color is not ByACI.
 */
function aciIndexOf(color: AcCmColor): number | undefined {
  if (color.isByACI && color.colorIndex != null && color.colorIndex >= 1) {
    return color.colorIndex
  }
  return undefined
}

/** ACI indices 1–9 (standard small palette). */
const SMALL_ACI = Array.from({ length: 9 }, (_, i) => i + 1)

/** ACI indices 10–249 (large palette). */
const LARGE_ACI = Array.from({ length: 240 }, (_, i) => i + 10)

/** ACI indices 250–255 (gray ramp). */
const GRAY_ACI = Array.from({ length: 6 }, (_, i) => i + 250)

/**
 * Unique numeric line weights from {@link AcGiLineWeight}, sorted ascending.
 *
 * @returns Positive values in hundredths of a millimeter (for example 25 = 0.25 mm).
 */
function numericLineWeights(): AcGiLineWeight[] {
  const weights = Array.from(
    new Set(
      Object.values(AcGiLineWeight).filter(
        (value): value is AcGiLineWeight =>
          typeof value === 'number' && value > 0
      )
    )
  ).sort((a, b) => a - b)
  return [0 as AcGiLineWeight, ...weights]
}

/**
 * Formats a line weight for the dropdown label.
 *
 * @param value - Line weight in hundredths of a millimeter, or `0` for hairline.
 * @returns Label such as `"Hairline"` or `"0.25 mm"`.
 */
function formatLineWeight(value: AcGiLineWeight): string {
  if (!(value > 0)) return AcApI18n.t('main.drawStyle.lineWeightHairline')
  return `${(value / 100).toFixed(2)} mm`
}

/**
 * Converts a numeric line weight into a clamped preview stroke thickness.
 *
 * @param value - Line weight in hundredths of a millimeter.
 * @returns Stroke height in CSS pixels.
 */
function previewLineHeightPx(value: number): number {
  return Math.max(1, Math.min(6, value / 40))
}

/** Custom line-weight dropdown used by {@link AcApDrawStyleToolbar}. */
interface AcApLineWeightPicker {
  /** Root control appended to the overlay. */
  root: HTMLDivElement
  /** Updates the trigger and selected menu item. */
  setValue: (weight: number) => void
  /** Sets the localized tooltip on the trigger. */
  setTitle: (title: string) => void
  /** Relabels menu items after a locale change (hairline label). */
  refreshLabels: () => void
  /** Closes the popover menu. */
  close: () => void
  /** Whether the popover menu is open. */
  isOpen: () => boolean
  /** True when `node` is inside this control. */
  contains: (node: Node | null) => boolean
}

/**
 * Builds a compact line-weight dropdown with a stroke preview in each row.
 *
 * @param onChange - Called when the user picks a weight.
 * @param onOpen - Called just before the menu opens (used to close other popovers).
 * @returns Picker controller.
 */
function createLineWeightPicker(
  onChange: (weight: AcGiLineWeight) => void,
  onOpen: () => void
): AcApLineWeightPicker {
  const prefix = 'ml-draw-style-toolbar'
  const weights = numericLineWeights()
  let open = false
  let currentWeight = weights[0] ?? (0 as AcGiLineWeight)

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
    currentWeight = weight as AcGiLineWeight
    preview.style.setProperty(
      '--ml-lineweight-height',
      `${previewLineHeightPx(weight > 0 ? weight : 1)}px`
    )
    label.textContent = formatLineWeight(weight as AcGiLineWeight)
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
    itemLabel.textContent = formatLineWeight(weight as AcGiLineWeight)

    item.append(itemPreview, itemLabel)
    item.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      paintTrigger(weight)
      markSelected(weight)
      close()
      onChange(weight as AcGiLineWeight)
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
        if (text) text.textContent = formatLineWeight(weight as AcGiLineWeight)
      })
      paintTrigger(currentWeight)
    },
    close,
    isOpen: () => open,
    contains: node => !!node && root.contains(node)
  }
}

/**
 * Injects overlay CSS into `document.head` once.
 */
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

/**
 * Compact color / lineweight / font-size overlay shown during measurement
 * and markup drawing commands, and while a measurement or markup overlay
 * is selected, when the host ribbon is hidden.
 */
export class AcApDrawStyleToolbar {
  /** Root toolbar element appended to the view container. */
  private readonly root: HTMLDivElement

  /** Button that opens the ACI color panel. */
  private readonly swatch: HTMLButtonElement

  /** Inner disc that shows the current color. */
  private readonly swatchFill: HTMLSpanElement

  /** Wrapper around the swatch and popover panel. */
  private readonly colorWrap: HTMLDivElement

  /** Popover containing ACI palettes. */
  private readonly colorPanel: HTMLDivElement

  /** Compact line-weight dropdown with stroke previews. */
  private readonly lineWeightPicker: AcApLineWeightPicker

  /** Dropdown of font sizes in CSS pixels. */
  private readonly fontSizeSelect: HTMLSelectElement

  /** Active overlay session, or `undefined` when hidden. */
  private kind: AcApDrawStyleKind | undefined

  /** Kind of the running draw command, if any. */
  private commandKind: AcApDrawStyleKind | undefined

  /** Whether the ACI popover is open. */
  private colorPanelOpen = false

  /** Timer id used to delay-hide the color panel on mouse leave. */
  private colorLeaveTimer: number | undefined

  /** Shows the overlay when a measure or markup command starts. */
  private readonly onCommandWillStart: (args: AcEdCommandEventArgs) => void

  /** Hides the overlay when the current command ends. */
  private readonly onCommandEnded: () => void

  /** Recomputes visibility when ribbon-show settings change. */
  private readonly onSettingsModified: (
    args: AcApSettingManagerEventArgs
  ) => void

  /** Closes the color panel when the pointer is pressed outside it. */
  private readonly onDocumentPointerDown: (event: PointerEvent) => void

  /** Recomputes overlay kind when markup selection / records change. */
  private readonly unsubscribeMarkupStore: () => void

  /** Recomputes overlay kind when measurement selection changes. */
  private readonly unsubscribeMeasurementSelection: () => void

  /**
   * Creates the overlay, injects CSS, and listens for command start/end.
   *
   * @param view - 2D view whose container hosts the toolbar.
   */
  constructor(
    /** 2D view whose container hosts this overlay. */
    private readonly view: AcTrView2d
  ) {
    ensureStyles()

    this.root = document.createElement('div')
    this.root.className = 'ml-draw-style-toolbar'
    this.root.setAttribute('role', 'toolbar')
    acedApplyUiTheme(resolveUiTheme(view.container), this.root)

    this.colorWrap = document.createElement('div')
    this.colorWrap.className = 'ml-draw-style-toolbar__color'
    this.swatch = document.createElement('button')
    this.swatch.type = 'button'
    this.swatch.className = 'ml-draw-style-toolbar__swatch'
    this.swatchFill = document.createElement('span')
    this.swatchFill.className = 'ml-draw-style-toolbar__swatch-fill'
    this.swatch.appendChild(this.swatchFill)
    this.colorPanel = document.createElement('div')
    this.colorPanel.className = 'ml-draw-style-toolbar__color-panel'
    this.colorPanel.appendChild(
      this.createAciPalette(LARGE_ACI, 'ml-draw-style-toolbar__aci-large')
    )
    this.colorPanel.appendChild(
      this.createAciPalette(SMALL_ACI, 'ml-draw-style-toolbar__aci-small')
    )
    this.colorPanel.appendChild(
      this.createAciPalette(GRAY_ACI, 'ml-draw-style-toolbar__aci-gray')
    )
    this.colorWrap.appendChild(this.swatch)
    this.colorWrap.appendChild(this.colorPanel)
    this.root.appendChild(this.colorWrap)

    this.lineWeightPicker = createLineWeightPicker(
      weight => this.applyLineWeight(weight),
      () => this.hideColorPanel()
    )
    this.root.appendChild(this.lineWeightPicker.root)

    this.fontSizeSelect = document.createElement('select')
    this.fontSizeSelect.className = 'ml-draw-style-toolbar__select'
    this.root.appendChild(this.fontSizeSelect)

    this.swatch.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      if (this.colorPanelOpen) this.hideColorPanel()
      else this.showColorPanel()
    })
    this.colorWrap.addEventListener('mouseenter', () =>
      this.clearColorLeaveTimer()
    )
    this.colorWrap.addEventListener('mouseleave', () =>
      this.scheduleHideColorPanel()
    )
    this.fontSizeSelect.addEventListener('change', () => {
      const size = Number(this.fontSizeSelect.value)
      if (size > 0) this.applyFontSize(size)
    })
    this.root.addEventListener('pointerdown', event => event.stopPropagation())
    this.root.addEventListener('mousedown', event => event.stopPropagation())
    this.onDocumentPointerDown = event => {
      const target = event.target as Node | null
      const inColor = !!target && this.colorWrap.contains(target)
      const inLineWeight = this.lineWeightPicker.contains(target)
      const colorOpen = this.colorPanelOpen
      const weightOpen = this.lineWeightPicker.isOpen()
      if (!colorOpen && !weightOpen) return
      if (colorOpen && !inColor) this.hideColorPanel()
      if (weightOpen && !inLineWeight) this.lineWeightPicker.close()
      if (!inColor && !inLineWeight) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true)

    this.onCommandWillStart = (args: AcEdCommandEventArgs) => {
      this.commandKind = acapDrawStyleKindForCommand(args.command.globalName)
      this.refreshKindAndVisibility()
    }
    this.onCommandEnded = () => {
      this.commandKind = undefined
      this.refreshKindAndVisibility()
    }

    const host = view.container
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }
    host.appendChild(this.root)

    view.editor.events.commandWillStart.addEventListener(
      this.onCommandWillStart
    )
    view.editor.events.commandEnded.addEventListener(this.onCommandEnded)
    this.onSettingsModified = (args: AcApSettingManagerEventArgs) => {
      if (args.key === 'isShowRibbon') this.refreshKindAndVisibility()
    }
    AcApSettingManager.instance.events.modified.addEventListener(
      this.onSettingsModified
    )
    this.unsubscribeMarkupStore = getMarkupStore().subscribe(() => {
      this.refreshKindAndVisibility()
    })
    this.unsubscribeMeasurementSelection = subscribeMeasurementSelection(() => {
      this.refreshKindAndVisibility()
    })
    this.relabel()
  }

  /**
   * Detaches DOM, editor, and setting listeners.
   */
  dispose(): void {
    this.hideColorPanel()
    this.lineWeightPicker.close()
    document.removeEventListener(
      'pointerdown',
      this.onDocumentPointerDown,
      true
    )
    this.view.editor.events.commandWillStart.removeEventListener(
      this.onCommandWillStart
    )
    this.view.editor.events.commandEnded.removeEventListener(
      this.onCommandEnded
    )
    AcApSettingManager.instance.events.modified.removeEventListener(
      this.onSettingsModified
    )
    this.unsubscribeMarkupStore()
    this.unsubscribeMeasurementSelection()
    this.root.remove()
    acapSetDrawStyleToolbarVisible(false)
  }

  /**
   * Resolves command vs selection and shows or hides the overlay.
   */
  private refreshKindAndVisibility(): void {
    this.kind = acapResolveDrawStyleKind({
      commandKind: this.commandKind,
      markupSelected: getMarkupStore().selectedId != null,
      measurementSelected: getSelectedMeasurementId() != null
    })
    this.refreshVisibility()
  }

  /**
   * Shows or hides the overlay based on {@link acapShouldShowDrawStyleToolbar}.
   */
  private refreshVisibility(): void {
    const visible = acapShouldShowDrawStyleToolbar(this.kind)
    this.root.classList.toggle('is-visible', visible)
    acapSetDrawStyleToolbarVisible(visible)
    if (visible) {
      this.relabel()
      this.syncFromSession()
    } else {
      this.hideColorPanel()
      this.lineWeightPicker.close()
    }
  }

  /**
   * Applies localized titles to the color, line-weight, and font-size controls.
   */
  private relabel(): void {
    this.swatch.title = AcApI18n.t('main.drawStyle.color')
    this.lineWeightPicker.setTitle(AcApI18n.t('main.drawStyle.lineWeight'))
    this.lineWeightPicker.refreshLabels()
    this.fontSizeSelect.title = AcApI18n.t('main.drawStyle.fontSize')
  }

  /**
   * Reads the current session (or selection) style and paints the controls.
   */
  private syncFromSession(): void {
    if (this.kind === 'measure') {
      const selected = getActiveMeasurementStyle()
      const db = acdbHostApplicationServices().workingDatabase
      const color =
        selected?.color ??
        (db ? acapGetMeasurementColor(db) : acapCssToMeasurementColor('#7b8794'))
      const lineWeight = selected?.lineWeight ?? acapGetMeasurementLineWeight()
      const fontSize = selected?.fontSize ?? acapGetMeasurementFontSize()
      this.paint(color, lineWeight, fontSize)
      return
    }

    const selected = getMarkupStore().selectedId
      ? getMarkupStore().get(getMarkupStore().selectedId!)
      : undefined
    const color = selected
      ? cssToMarkupColor(selected.style.color)
      : defaultMarkupColor()
    const lineWeight =
      (selected?.style.lineWeight as AcGiLineWeight | undefined) ??
      getMarkupLineWeight()
    const fontSize = selected?.style.fontSize ?? getMarkupFontSize()
    this.paint(color, lineWeight, fontSize)
  }

  /**
   * Updates swatch, line-weight, and font-size controls to match a style.
   *
   * @param color - Current draw color.
   * @param lineWeight - Current line weight.
   * @param fontSize - Current font size in CSS pixels.
   */
  private paint(
    color: AcCmColor,
    lineWeight: AcGiLineWeight,
    fontSize: number
  ): void {
    const css = acapCssColor(color)
    this.swatchFill.style.background = css
    this.markSelectedAci(aciIndexOf(color))

    this.lineWeightPicker.setValue(lineWeight)

    const sizes = new Set(FONT_SIZE_OPTIONS)
    if (Number.isFinite(fontSize) && fontSize > 0)
      sizes.add(Math.round(fontSize))
    const sorted = [...sizes].sort((a, b) => a - b)
    this.fontSizeSelect.replaceChildren()
    for (const size of sorted) {
      const option = document.createElement('option')
      option.value = String(size)
      option.textContent = `${size} px`
      this.fontSizeSelect.appendChild(option)
    }
    this.fontSizeSelect.value = String(
      Number.isFinite(fontSize) && fontSize > 0 ? Math.round(fontSize) : 12
    )
  }

  /**
   * Applies a color to the current session and any selected entities.
   *
   * @param color - Color chosen from the ACI panel.
   */
  private applyColor(color: AcCmColor): void {
    this.swatchFill.style.background = acapCssColor(color)
    this.markSelectedAci(aciIndexOf(color))
    if (this.kind === 'measure') {
      acapSetMeasurementDrawColor(color)
      applyMeasurementStyleToSelection(this.view, { color })
      return
    }
    setMarkupDrawColor(color)
    applyMarkupStyleToSelection(this.view, { color: markupColorToCss(color) })
  }

  /**
   * Builds a grid of ACI color cells.
   *
   * @param indices - ACI indices to show.
   * @param className - Layout class (`large`, `small`, or `gray`).
   * @returns Palette container.
   */
  private createAciPalette(
    indices: number[],
    className: string
  ): HTMLDivElement {
    const palette = document.createElement('div')
    palette.className = className
    for (const index of indices) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'ml-draw-style-toolbar__aci-cell'
      cell.dataset.aci = String(index)
      cell.style.background = aciCss(index)
      cell.title = String(index)
      cell.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        this.applyColor(colorFromAci(index))
        this.hideColorPanel()
      })
      palette.appendChild(cell)
    }
    return palette
  }

  /**
   * Highlights the cell matching the current ACI index.
   *
   * @param index - Selected ACI index, or `undefined` to clear.
   */
  private markSelectedAci(index: number | undefined): void {
    this.colorPanel
      .querySelectorAll('.ml-draw-style-toolbar__aci-cell')
      .forEach(node => {
        const cell = node as HTMLElement
        cell.classList.toggle('is-selected', cell.dataset.aci === String(index))
      })
  }

  /**
   * Opens the ACI color popover.
   */
  private showColorPanel(): void {
    this.lineWeightPicker.close()
    this.clearColorLeaveTimer()
    this.colorPanelOpen = true
    this.colorPanel.classList.add('is-open')
  }

  /**
   * Closes the ACI color popover.
   */
  private hideColorPanel(): void {
    this.clearColorLeaveTimer()
    this.colorPanelOpen = false
    this.colorPanel.classList.remove('is-open')
  }

  /**
   * Starts a short delay before closing the popover after mouse leave.
   */
  private scheduleHideColorPanel(): void {
    this.clearColorLeaveTimer()
    this.colorLeaveTimer = window.setTimeout(() => this.hideColorPanel(), 180)
  }

  /**
   * Cancels a pending popover hide timer.
   */
  private clearColorLeaveTimer(): void {
    if (this.colorLeaveTimer == null) return
    window.clearTimeout(this.colorLeaveTimer)
    this.colorLeaveTimer = undefined
  }

  /**
   * Applies a line weight to the current session and any selected entities.
   *
   * @param weight - Line weight in hundredths of a millimeter.
   */
  private applyLineWeight(weight: AcGiLineWeight): void {
    if (this.kind === 'measure') {
      acapSetMeasurementDrawLineWeight(weight)
      applyMeasurementStyleToSelection(this.view, { lineWeight: weight })
      return
    }
    setMarkupDrawLineWeight(weight)
    applyMarkupStyleToSelection(this.view, { lineWeight: weight })
  }

  /**
   * Applies a font size to the current session and any selected entities.
   *
   * @param size - Font size in CSS pixels.
   */
  private applyFontSize(size: number): void {
    if (this.kind === 'measure') {
      acapSetMeasurementDrawFontSize(size)
      applyMeasurementStyleToSelection(this.view, { fontSize: size })
      return
    }
    setMarkupDrawFontSize(size)
    applyMarkupStyleToSelection(this.view, { fontSize: size })
  }
}
