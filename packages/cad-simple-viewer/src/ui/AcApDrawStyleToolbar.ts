import {
  AcCmColor,
  acdbHostApplicationServices
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
  markupColorToCss,
  setMarkupDrawColor,
  setMarkupDrawFontSize
} from '../command/markup/AcApMarkupUtil'
import {
  applyMeasurementStyleToSelection,
  getActiveMeasurementStyle,
  getSelectedMeasurementId,
  subscribeMeasurementSelection
} from '../command/measure/AcApMeasurementStore'
import type { AcEdCommandEventArgs } from '../editor'
import type { AcEdSessionAccessory } from '../editor/command/AcEdSessionAccessory'
import { acedApplyUiTheme, resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import {
  acapCssColor,
  acapCssToMeasurementColor,
  acapGetMeasurementColor,
  acapGetMeasurementFontSize,
  acapSetMeasurementDrawColor,
  acapSetMeasurementDrawFontSize
} from '../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../view'
import {
  type AcUiAciPaletteStacks,
  acuiCreateAciPaletteStacks,
  acuiEnsureAciPaletteStyles
} from './AcApAciPaletteUi'
import {
  type AcApDrawStyleKind,
  acapDrawStyleKindForCommand,
  acapRegisterDrawStyleSessionHost,
  acapResolveDrawStyleKind,
  acapSetDrawStyleToolbarVisible,
  acapShouldShowDrawStyleToolbar,
  acapUnregisterDrawStyleSessionHost
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
    .ml-draw-style-toolbar__controls {
      display: flex;
      align-items: center;
      gap: 8px;
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
      --ml-aci-cell-size: 11px;
    }
    .ml-draw-style-toolbar__color-panel.is-open {
      display: block;
    }
    .ml-draw-style-toolbar__color-panel--drop-up {
      top: auto;
      bottom: calc(100% + 6px);
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

/**
 * Injects overlay CSS into `document.head` once.
 */
function ensureStyles(): void {
  acuiEnsureAciPaletteStyles()
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
 * Compact color / font-size overlay shown during measurement and markup
 * drawing commands, and while a measurement or markup overlay is selected,
 * when the host ribbon is hidden.
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

  /** Shared ACI palette stacks mounted in {@link colorPanel}. */
  private readonly aciStacks: AcUiAciPaletteStacks

  /** Dropdown of font sizes in CSS pixels. */
  private readonly fontSizeSelect: HTMLSelectElement

  /** Color swatch + font-size row; reparented into the session panel. */
  private readonly controlsRow: HTMLDivElement

  /** True while controls live in the phone/pad session accessory slot. */
  private sessionMounted = false

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
    this.aciStacks = acuiCreateAciPaletteStacks({
      onSelect: index => {
        this.applyColor(colorFromAci(index))
        this.hideColorPanel()
      }
    })
    this.colorPanel.appendChild(this.aciStacks.root)
    this.colorWrap.appendChild(this.swatch)
    this.colorWrap.appendChild(this.colorPanel)

    this.fontSizeSelect = document.createElement('select')
    this.fontSizeSelect.className = 'ml-draw-style-toolbar__select'

    this.controlsRow = document.createElement('div')
    this.controlsRow.className = 'ml-draw-style-toolbar__controls'
    this.controlsRow.append(this.colorWrap, this.fontSizeSelect)
    this.root.appendChild(this.controlsRow)

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
    this.controlsRow.addEventListener('pointerdown', event =>
      event.stopPropagation()
    )
    this.controlsRow.addEventListener('mousedown', event =>
      event.stopPropagation()
    )
    this.onDocumentPointerDown = event => {
      const target = event.target as Node | null
      const inColor = !!target && this.colorWrap.contains(target)
      if (!this.colorPanelOpen) return
      if (!inColor) {
        this.hideColorPanel()
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
    acapRegisterDrawStyleSessionHost(view, this)

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
    this.unmountSession()
    acapUnregisterDrawStyleSessionHost(this.view)
    this.aciStacks.dispose()
    this.root.remove()
    acapSetDrawStyleToolbarVisible(false)
  }

  /**
   * Color / font-size controls for the phone/pad session panel.
   *
   * @returns Accessory that reparents {@link controlsRow} into the slot.
   */
  createSessionAccessory(): AcEdSessionAccessory {
    return {
      id: 'draw-style',
      mount: host => this.mountSession(host),
      unmount: () => this.unmountSession()
    }
  }

  /**
   * Moves the controls into the session panel and hides the canvas overlay.
   *
   * @param host - Accessory row in the bottom session panel.
   */
  private mountSession(host: HTMLElement): void {
    this.sessionMounted = true
    this.colorPanel.classList.add('ml-draw-style-toolbar__color-panel--drop-up')
    host.appendChild(this.controlsRow)
    this.refreshVisibility()
    this.syncFromSession()
  }

  /**
   * Restores the controls to the canvas overlay.
   */
  private unmountSession(): void {
    if (!this.sessionMounted) return
    this.sessionMounted = false
    this.hideColorPanel()
    this.colorPanel.classList.remove(
      'ml-draw-style-toolbar__color-panel--drop-up'
    )
    this.root.appendChild(this.controlsRow)
    this.refreshVisibility()
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
   * Hidden while the same controls are mounted in the session panel.
   */
  private refreshVisibility(): void {
    const visible =
      acapShouldShowDrawStyleToolbar(this.kind) && !this.sessionMounted
    this.root.classList.toggle('is-visible', visible)
    acapSetDrawStyleToolbarVisible(
      visible || (this.sessionMounted && this.kind != null)
    )
    if (visible || this.sessionMounted) {
      this.relabel()
      this.syncFromSession()
    } else {
      this.hideColorPanel()
    }
  }

  /**
   * Applies localized titles to the color and font-size controls.
   */
  private relabel(): void {
    this.swatch.title = AcApI18n.t('main.drawStyle.color')
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
      const fontSize = selected?.fontSize ?? acapGetMeasurementFontSize()
      this.paint(color, fontSize)
      return
    }

    const selected = getMarkupStore().selectedId
      ? getMarkupStore().get(getMarkupStore().selectedId!)
      : undefined
    const color = selected
      ? cssToMarkupColor(selected.style.color)
      : defaultMarkupColor()
    const fontSize = selected?.style.fontSize ?? getMarkupFontSize()
    this.paint(color, fontSize)
  }

  /**
   * Updates swatch and font-size controls to match a style.
   *
   * @param color - Current draw color.
   * @param fontSize - Current font size in CSS pixels.
   */
  private paint(color: AcCmColor, fontSize: number): void {
    const css = acapCssColor(color)
    this.swatchFill.style.background = css
    this.aciStacks.setSelected(aciIndexOf(color))

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
    this.aciStacks.setSelected(aciIndexOf(color))
    if (this.kind === 'measure') {
      acapSetMeasurementDrawColor(color)
      applyMeasurementStyleToSelection(this.view, { color })
      return
    }
    setMarkupDrawColor(color)
    applyMarkupStyleToSelection(this.view, { color: markupColorToCss(color) })
  }

  /**
   * Opens the ACI color popover.
   */
  private showColorPanel(): void {
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
