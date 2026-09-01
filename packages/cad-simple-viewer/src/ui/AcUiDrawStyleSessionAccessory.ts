import {
  AcCmColor,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

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
  getActiveMeasurementStyle
} from '../command/measure/AcApMeasurementStore'
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
  type AcUiDrawStyleKind,
  acuiRegisterDrawStyleSessionHost,
  acuiUnregisterDrawStyleSessionHost
} from './AcUiDrawStyle'
import { AcUiAciColorDialog } from './AcUiAciColorDialog'
import {
  type AcUiAciPaletteStacks,
  acuiCreateAciPaletteStacks,
  acuiEnsureAciPaletteStyles
} from './AcUiAciPaletteUi'

/** Font-size choices shown in the overlay dropdown, in CSS pixels. */
const FONT_SIZE_OPTIONS = [10, 12, 13, 14, 16, 18, 20, 24, 28, 32]

/** DOM id of the injected stylesheet for draw-style controls. */
const STYLE_ID = 'ml-draw-style-session-accessory-styles'

/** CSS rules for draw-style controls and the ACI popover. */
const CONTROLS_CSS = `
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
 * Builds an {@link AcCmColor} from a 1-based ACI index.
 *
 * @param index - AutoCAD Color Index (1–255).
 * @returns Color object with {@link AcCmColor.colorIndex} set.
 */
function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

/**
 * Reads the ACI index from a color when it is stored as ByACI.
 *
 * @param color - Color to inspect.
 * @returns 1-based ACI index, or `undefined` if not ByACI.
 */
function aciIndexOf(color: AcCmColor): number | undefined {
  if (color.isByACI && color.colorIndex != null && color.colorIndex >= 1) {
    return color.colorIndex
  }
  return undefined
}

/**
 * Injects draw-style control styles and shared ACI palette styles into the document head.
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
  style.textContent = CONTROLS_CSS
}

/**
 * Color / font-size session accessory for measurement and markup drawing.
 *
 * Mounted by {@link AcEdSessionAccessoryCoordinator} into the desktop
 * top-center slot or the phone/pad session panel.
 */
export class AcUiDrawStyleSessionAccessory {
  /** Color swatch button that opens the palette or mobile dialog. */
  private readonly swatch: HTMLButtonElement

  /** Circular fill inside the swatch showing the active color. */
  private readonly swatchFill: HTMLSpanElement

  /** Wrapper around swatch and inline ACI palette panel. */
  private readonly colorWrap: HTMLDivElement

  /** Inline ACI palette popover (desktop hover/click). */
  private readonly colorPanel: HTMLDivElement

  /** ACI palette stacks rendered inside {@link colorPanel}. */
  private readonly aciStacks: AcUiAciPaletteStacks

  /** Font-size dropdown for the active session. */
  private readonly fontSizeSelect: HTMLSelectElement

  /** Root row reparented into session accessory hosts. */
  private readonly controlsRow: HTMLDivElement

  /** Active measure/markup session, or `undefined` when inactive. */
  private kind: AcUiDrawStyleKind | undefined

  /** True when mounted in the mobile session panel (drop-up palette). */
  private mobileMounted = false

  /** Whether the inline ACI palette panel is open. */
  private colorPanelOpen = false

  /** True while the full-screen mobile ACI dialog is open. */
  private colorDialogOpen = false

  /** Timer that closes the palette after pointer leave. */
  private colorLeaveTimer: number | undefined

  /** Closes the palette when the user clicks outside the color control. */
  private readonly onDocumentPointerDown: (event: PointerEvent) => void

  /**
   * Creates controls, registers as the view's draw-style session host, and wires events.
   *
   * @param view - 2D view whose container supplies theme and dialog placement.
   */
  constructor(private readonly view: AcTrView2d) {
    ensureStyles()

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
    this.controlsRow.setAttribute('role', 'toolbar')
    acedApplyUiTheme(resolveUiTheme(view.container), this.controlsRow)
    this.controlsRow.append(this.colorWrap, this.fontSizeSelect)

    this.swatch.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      if (this.mobileMounted) {
        void this.openSessionColorDialog()
        return
      }
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

    acuiRegisterDrawStyleSessionHost(view, this)
    this.relabel()
  }

  /**
   * Updates the active session kind before the coordinator mounts this accessory.
   *
   * @param kind - `'measure'`, `'markup'`, or `undefined` when inactive.
   */
  setActiveKind(kind: AcUiDrawStyleKind | undefined): void {
    this.kind = kind
    if (this.controlsRow.isConnected) {
      this.syncFromSession()
    }
  }

  /** Removes listeners, unmounts controls, and unregisters the session host. */
  dispose(): void {
    this.hideColorPanel()
    document.removeEventListener(
      'pointerdown',
      this.onDocumentPointerDown,
      true
    )
    this.unmount()
    acuiUnregisterDrawStyleSessionHost(this.view)
    this.aciStacks.dispose()
  }

  /**
   * Builds the session accessory that reparents draw-style controls into a host slot.
   *
   * @returns Accessory with id `'draw-style'` and mount/unmount delegates.
   */
  createSessionAccessory(): AcEdSessionAccessory {
    return {
      id: 'draw-style',
      mount: host => this.mount(host),
      unmount: () => this.unmount()
    }
  }

  /**
   * Appends controls to a session host and syncs state from the active session.
   *
   * @param host - Desktop top-center slot or mobile session panel accessory element.
   */
  private mount(host: HTMLElement): void {
    this.mobileMounted = host.classList.contains('ml-mobile-cmd-accessory')
    this.hideColorPanel()
    if (this.mobileMounted) {
      this.colorPanel.classList.add('ml-draw-style-toolbar__color-panel--drop-up')
    } else {
      this.colorPanel.classList.remove(
        'ml-draw-style-toolbar__color-panel--drop-up'
      )
    }
    host.appendChild(this.controlsRow)
    this.relabel()
    this.syncFromSession()
  }

  /** Detaches controls from the current host and resets mobile palette layout. */
  private unmount(): void {
    if (!this.controlsRow.isConnected) return
    this.mobileMounted = false
    this.hideColorPanel()
    this.colorPanel.classList.remove(
      'ml-draw-style-toolbar__color-panel--drop-up'
    )
    this.controlsRow.remove()
  }

  /** Refreshes control titles from i18n strings. */
  private relabel(): void {
    this.swatch.title = AcApI18n.t('main.drawStyle.color')
    this.fontSizeSelect.title = AcApI18n.t('main.drawStyle.fontSize')
  }

  /**
   * Reads color and font size from the active measure/markup session or defaults.
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
   * Updates swatch, ACI selection, and font-size dropdown to match session state.
   *
   * @param color - Active draw color.
   * @param fontSize - Active font size in CSS pixels.
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
   * Persists a new draw color for the active session and updates selection overlays.
   *
   * @param color - Color chosen from the palette or dialog.
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

  /** Opens the inline ACI palette popover below the swatch. */
  private showColorPanel(): void {
    this.clearColorLeaveTimer()
    this.colorPanelOpen = true
    this.colorPanel.classList.add('is-open')
  }

  /** Closes the inline ACI palette popover. */
  private hideColorPanel(): void {
    this.clearColorLeaveTimer()
    this.colorPanelOpen = false
    this.colorPanel.classList.remove('is-open')
  }

  /**
   * Opens the full ACI color dialog on mobile where the inline panel is impractical.
   */
  private async openSessionColorDialog(): Promise<void> {
    if (this.colorDialogOpen) return
    this.colorDialogOpen = true
    this.hideColorPanel()
    try {
      const selected = this.aciStacks.root.querySelector(
        '.ml-aci-cell.is-selected'
      ) as HTMLElement | null
      const initial = selected ? Number(selected.dataset.aci) : null
      const index = await AcUiAciColorDialog.open({
        host: this.view.container,
        theme: resolveUiTheme(this.view.container),
        initialIndex:
          initial != null && Number.isFinite(initial) ? initial : null,
        labels: {
          title: AcApI18n.t('main.colorPicker.title'),
          close: AcApI18n.t('main.colorPicker.close'),
          ok: AcApI18n.t('main.colorPicker.ok'),
          cancel: AcApI18n.t('main.colorPicker.cancel'),
          index: AcApI18n.t('main.colorPicker.index'),
          rgb: AcApI18n.t('main.colorPicker.rgb'),
          input: AcApI18n.t('main.colorPicker.input'),
          inputPlaceholder: AcApI18n.t('main.colorPicker.inputPlaceholder')
        }
      })
      if (index != null) this.applyColor(colorFromAci(index))
    } finally {
      this.colorDialogOpen = false
    }
  }

  /** Starts a short delay before closing the palette after pointer leave. */
  private scheduleHideColorPanel(): void {
    this.clearColorLeaveTimer()
    this.colorLeaveTimer = window.setTimeout(() => this.hideColorPanel(), 180)
  }

  /** Cancels a pending palette close timer. */
  private clearColorLeaveTimer(): void {
    if (this.colorLeaveTimer == null) return
    window.clearTimeout(this.colorLeaveTimer)
    this.colorLeaveTimer = undefined
  }

  /**
   * Persists a new font size for the active session and updates selection overlays.
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
