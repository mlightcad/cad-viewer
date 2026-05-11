import { CircleClose } from '@element-plus/icons-vue'
import type { AcEdCommandEventArgs } from '@mlightcad/cad-simple-viewer'
import { AcApDocManager, AcEdMTextEditor } from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import type {
  RibbonGalleryCategoryModel,
  RibbonItemModel,
  RibbonTabModel
} from '@mlightcad/ribbon'
import {
  type Component,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  shallowRef
} from 'vue'

import { useRibbonContextualTab } from '../../composable'
import MlRibbonMTextHeightSelect from './MlRibbonMTextHeightSelect.vue'
import MlRibbonPropertyColorDropdown from './MlRibbonPropertyColorDropdown.vue'

const MTEXT_CONTEXTUAL_TAB_ID = 'mtext-editor-context'
const MTEXT_COMMAND_GLOBAL_NAMES = ['MTEXT', 'mtext'] as const
const MTEXT_ITEM_PREFIX = 'mtext-'

function isMTextCommandGlobalName(globalName: string | undefined) {
  return (
    globalName != null &&
    MTEXT_COMMAND_GLOBAL_NAMES.some(name => name === globalName)
  )
}

/**
 * Minimal translation callback used while constructing ribbon model labels.
 *
 * @param key Locale message key.
 * @returns Localized string for the active locale.
 */
type Translate = (key: string) => string

/**
 * Supported character baseline modes surfaced by the MText contextual ribbon.
 */
type MTextRibbonScript = 'normal' | 'superscript' | 'subscript'

/**
 * Editor events that require the ribbon to refresh its displayed MText format.
 */
type MTextEditorEvent = 'change' | 'selectionChange' | 'cursorMove' | 'close'

/**
 * Listener notified when the active MText input box refreshes its current
 * character format.
 */
type MTextFormatChangeListener = () => void

/**
 * Listener called by the MText editor bridge when the active inline editor
 * changes.
 *
 * @param inputBox Newly active editor-like input box, or `null` when editing ends.
 */
type ActiveInputBoxChangeListener = (inputBox: unknown | null) => void

/**
 * Ribbon-friendly snapshot of the current MText character format.
 *
 * The real editor can expose richer formatting internals. This shape keeps only
 * the properties needed by the contextual ribbon controls and normalizes color
 * into either an ACI value or an RGB integer.
 */
interface MTextRibbonFormat {
  /** Font family applied at the current cursor position or selected range. */
  fontFamily: string
  /** Text height in drawing units. */
  fontSize: number
  /** Whether bold formatting is active. */
  bold: boolean
  /** Whether italic formatting is active. */
  italic: boolean
  /** Whether underline formatting is active. */
  underline: boolean
  /** Whether overline formatting is active. */
  overline: boolean
  /** Current baseline script mode for the cursor or selected text. */
  script: MTextRibbonScript
  /** Whether strike-through formatting is active. */
  strike: boolean
  /**
   * AutoCAD Color Index value for the current text color.
   *
   * `256` means ByLayer, `0` means ByBlock, and `null` means the ribbon should
   * use the `rgb` value when present.
   */
  aci: number | null
  /** Packed RGB color value when the format uses a true color override. */
  rgb: number | null
}

/**
 * Narrow editor adapter used by the contextual ribbon.
 *
 * `AcEdMTextEditor` is consumed through this structural interface so the ribbon
 * can call optional editing capabilities when the active input box supports
 * them, while remaining tolerant of older editor implementations.
 */
interface MTextRibbonEditor {
  /**
   * Applies a partial character format to the active cursor position or
   * selection.
   */
  setCurrentFormat: (format: Partial<MTextRibbonFormat>) => void
  /** Reads the current character format from the editor. */
  getCurrentFormat: () => MTextRibbonFormat
  /** Inserts raw MText content at the current cursor position. */
  insertText: (text: string) => void
  /** Commits or closes the active MText editor. */
  closeEditor: () => void
  /** Returns keyboard focus to the inline editor after ribbon interaction. */
  focusEditor?: () => void
  /** Returns whether the current selection is a non-script stacked fraction. */
  isStackSelectionActive?: () => boolean
  /** Returns the editor's default text style information when available. */
  getDefaultTextStyle?: () => {
    /** Default font family from the active text style. */
    font?: string
    /** Fixed text height from the active text style. */
    fixedTextHeight?: number
    /** Last used text height from the active text style. */
    lastHeight?: number
  }
  /** Subscribes to editor events that may change the ribbon state. */
  on?: (event: MTextEditorEvent, handler: () => void) => void
  /** Unsubscribes a previously registered editor event handler. */
  off?: (event: string, handler: () => void) => void
  /** Subscribes to format refreshes mirrored from the active input box. */
  addCurrentFormatChangeListener?: (
    listener: MTextFormatChangeListener
  ) => void
  /** Removes a previously registered format refresh listener. */
  removeCurrentFormatChangeListener?: (
    listener: MTextFormatChangeListener
  ) => void
  /** Toggles stacked-fraction formatting for the current selection. */
  toggleStackSelection?: () => void
  /**
   * Toggles superscript or subscript formatting for the current selection.
   *
   * @returns `true` when the editor handled the toggle itself.
   */
  toggleScriptSelection?: (
    script: Exclude<MTextRibbonScript, 'normal'>
  ) => boolean
  /** Toggles letter case for the current selection. */
  toggleCase?: () => void
  /** Updates the MText attachment point, such as `TL`, `MC`, or `BR`. */
  setAttachmentPoint?: (attachmentPoint: string) => void
  /** Updates paragraph alignment for the active paragraph or selection. */
  setParagraphAlignment?: (alignment: string) => void
  /** Applies a paragraph line spacing factor such as `1.5` or `2`. */
  setLineSpacingFactor?: (factor: number) => void
  /** Clears an explicit paragraph line spacing override. */
  clearLineSpacing?: () => void
}

/**
 * Static bridge exposed by the MText editor module.
 *
 * The bridge lets Vue ribbon code discover and observe the imperative inline
 * editor without importing a concrete editor instance type.
 */
interface MTextEditorBridge {
  /** Returns the currently active MText input box, if one is open. */
  getActiveInputBox?: () => MTextRibbonEditor | null
  /** Registers a listener for active input box changes. */
  addActiveInputBoxChangeListener?: (
    listener: ActiveInputBoxChangeListener
  ) => void
  /** Removes a previously registered active input box listener. */
  removeActiveInputBoxChangeListener?: (
    listener: ActiveInputBoxChangeListener
  ) => void
}

/**
 * Options required to coordinate the MText contextual ribbon with the shared
 * ribbon tab state.
 */
interface UseMTextContextualRibbonOptions {
  /** Currently active ribbon tab id shared by the main ribbon shell. */
  activeTabId: Ref<string>
}

const DEFAULT_MTEXT_FORMAT: MTextRibbonFormat = {
  fontFamily: 'Arial',
  fontSize: 1,
  bold: false,
  italic: false,
  underline: false,
  overline: false,
  script: 'normal',
  strike: false,
  aci: null,
  rgb: null
}

/**
 * Compares two ribbon format snapshots using the same field-by-field contract
 * as the MTEXT input box toolbar.
 */
function sameMTextRibbonFormat(
  a: MTextRibbonFormat,
  b: MTextRibbonFormat
) {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.overline === b.overline &&
    a.script === b.script &&
    a.strike === b.strike &&
    a.aci === b.aci &&
    a.rgb === b.rgb
  )
}

const toolbarIcons = {
  bold: '<svg viewBox="0 0 24 24"><path d="M7.8 19c-.3 0-.5 0-.6-.2l-.2-.5V5.7c0-.2 0-.4.2-.5l.6-.2h5c1.5 0 2.7.3 3.5 1 .7.6 1.1 1.4 1.1 2.5a3 3 0 0 1-.6 1.9c-.4.6-1 1-1.6 1.2.4.1.9.3 1.3.6s.8.7 1 1.2c.4.4.5 1 .5 1.6 0 1.3-.4 2.3-1.3 3-.8.7-2.1 1-3.8 1H7.8Zm5-8.3c.6 0 1.2-.1 1.6-.5.4-.3.6-.7.6-1.3 0-1.1-.8-1.7-2.3-1.7H9.3v3.5h3.4Zm.5 6c.7 0 1.3-.1 1.7-.4.4-.4.6-.9.6-1.5s-.2-1-.7-1.4c-.4-.3-1-.4-2-.4H9.4v3.8h4Z" fill-rule="evenodd"></path></svg>',
  italic:
    '<svg viewBox="0 0 24 24"><path d="m16.7 4.7-.1.9h-.3c-.6 0-1 0-1.4.3-.3.3-.4.6-.5 1.1l-2.1 9.8v.6c0 .5.4.8 1.4.8h.2l-.2.8H8l.2-.8h.2c1.1 0 1.8-.5 2-1.5l2-9.8.1-.5c0-.6-.4-.8-1.4-.8h-.3l.2-.9h5.8Z" fill-rule="evenodd"></path></svg>',
  underline:
    '<svg viewBox="0 0 24 24"><path d="M16 5c.6 0 1 .4 1 1v5.5a4 4 0 0 1-.4 1.8l-1 1.4a5.3 5.3 0 0 1-5.5 1 5 5 0 0 1-1.6-1c-.5-.4-.8-.9-1.1-1.4a4 4 0 0 1-.4-1.8V6c0-.6.4-1 1-1s1 .4 1 1v5.5c0 .3 0 .6.2 1l.6.7a3.3 3.3 0 0 0 2.2.8 3.4 3.4 0 0 0 2.2-.8c.3-.2.4-.5.6-.8l.2-.9V6c0-.6.4-1 1-1ZM8 17h8c.6 0 1 .4 1 1s-.4 1-1 1H8a1 1 0 0 1 0-2Z" fill-rule="evenodd"></path></svg>',
  overline:
    '<svg viewBox="0 0 24 24"><path d="M5 4h14v1.5H5V4zm7 3.5c3.04 0 5.5 2.46 5.5 5.5v4.5h-2.25v-4.5c0-1.79-1.46-3.25-3.25-3.25S8.75 11.21 8.75 13v4.5H6.5V13c0-3.04 2.46-5.5 5.5-5.5z"></path></svg>',
  strike:
    '<svg viewBox="0 0 24 24"><g fill-rule="evenodd"><path d="M15.6 8.5c-.5-.7-1-1.1-1.3-1.3-.6-.4-1.3-.6-2-.6-2.7 0-2.8 1.7-2.8 2.1 0 1.6 1.8 2 3.2 2.3 4.4.9 4.6 2.8 4.6 3.9 0 1.4-.7 4.1-5 4.1A6.2 6.2 0 0 1 7 16.4l1.5-1.1c.4.6 1.6 2 3.7 2 1.6 0 2.5-.4 3-1.2.4-.8.3-2-.8-2.6-.7-.4-1.6-.7-2.9-1-1-.2-3.9-.8-3.9-3.6C7.6 6 10.3 5 12.4 5c2.9 0 4.2 1.6 4.7 2.4l-1.5 1.1Z"></path><path d="M5 11h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" fill-rule="nonzero"></path></g></svg>',
  superscript:
    '<svg viewBox="0 0 24 24"><path d="M15 9.4 10.4 14l4.6 4.6-1.4 1.4L9 15.4 4.4 20 3 18.6 7.6 14 3 9.4 4.4 8 9 12.6 13.6 8 15 9.4Zm5.9 1.6h-5v-1l1-.8 1.7-1.6c.3-.5.5-.9.5-1.3 0-.3 0-.5-.2-.7-.2-.2-.5-.3-.9-.3l-.8.2-.7.4-.4-1.2c.2-.2.5-.4 1-.5.3-.2.8-.2 1.2-.2.8 0 1.4.2 1.8.6.4.4.6 1 .6 1.6 0 .5-.2 1-.5 1.5l-1.3 1.4-.6.5h2.6V11Z" fill-rule="nonzero"></path></svg>',
  subscript:
    '<svg viewBox="0 0 24 24"><path d="m10.4 10 4.6 4.6-1.4 1.4L9 11.4 4.4 16 3 14.6 7.6 10 3 5.4 4.4 4 9 8.6 13.6 4 15 5.4 10.4 10ZM21 19h-5v-1l1-.8 1.7-1.6c.3-.4.5-.8.5-1.2 0-.3 0-.6-.2-.7-.2-.2-.5-.3-.9-.3a2 2 0 0 0-.8.2l-.7.3-.4-1.1 1-.6 1.2-.2c.8 0 1.4.3 1.8.7.4.4.6.9.6 1.5s-.2 1.1-.5 1.6a8 8 0 0 1-1.3 1.3l-.6.6h2.6V19Z" fill-rule="nonzero"></path></svg>',
  stack:
    '<svg viewBox="0 0 24 24"><path d="M12.4 5.4c.4 0 .8.1 1.2.4.4.2.7.6.9 1 .2.4.3.9.3 1.5s-.1 1.1-.3 1.6c-.2.4-.5.8-.9 1-.4.2-.8.3-1.2.3-.4 0-.7-.1-1-.3-.3-.2-.6-.4-.8-.8l-.1 1h-.8V3h.9v3.4c.2-.3.5-.6.8-.7.3-.2.6-.3 1-.3Zm-.1 5c.5 0 .8-.2 1.1-.5.3-.4.4-.9.4-1.6 0-.6-.1-1.1-.4-1.5-.3-.3-.6-.5-1.1-.5s-.8.2-1.2.5c-.3.3-.5.8-.5 1.5 0 .5.1.9.2 1.2.2.3.4.5.7.7.2.1.5.2.8.2Z"></path><path d="M12.1 15c.6 0 1.1.1 1.5.5.4.4.6.9.6 1.6v3.5h-.8l-.1-.7c-.2.3-.4.5-.7.6-.3.2-.6.2-.9.2-.4 0-.7-.1-1-.2-.3-.1-.5-.3-.7-.6-.2-.2-.2-.5-.2-.9 0-.5.2-1 .6-1.3.4-.3 1-.5 1.7-.5.4 0 .8.1 1.2.2v-.1c0-.5-.1-.9-.3-1.1-.2-.3-.5-.4-.9-.4-.3 0-.6.1-.8.2-.2.1-.4.3-.5.6l-.7-.4c.2-.4.4-.7.8-.9.4-.2.8-.3 1.2-.3Zm1.2 3.2c-.4-.1-.8-.2-1.2-.2s-.8.1-1 .3c-.3.1-.4.4-.4.7 0 .3.1.5.3.7.2.1.5.2.8.2.4 0 .8-.1 1.1-.4.2-.2.4-.6.4-1v-.3Z"></path><rect x="6" y="12.7" width="12" height=".8"></rect></svg>',
  case: '<svg viewBox="0 0 24 24"><path d="M4 18h2.1l1-2.8h4.2l1 2.8h2.2L10.5 6H8L4 18Zm3.8-4.6 1.4-4.1 1.4 4.1H7.8Zm8 4.6h1.8v-1.5c.5 1.1 1.4 1.7 2.6 1.7 1.7 0 2.8-1.1 2.8-2.7 0-1.7-1.2-2.6-3.2-2.6h-2v-.3c0-1 .6-1.5 1.6-1.5.8 0 1.4.3 1.8 1l1.4-.9c-.6-1.1-1.7-1.7-3.2-1.7-2.1 0-3.4 1.2-3.4 3.1V18Zm3.9-1.4c-1.1 0-1.8-.5-1.8-1.2 0-.7.6-1.1 1.8-1.1h1.5v.5c0 1.1-.6 1.8-1.5 1.8Z"></path></svg>',
  align:
    '<svg viewBox="0 0 24 24"><path d="M4 4h16v2H4V4Zm0 4h12v2H4V8Zm0 4h16v2H4v-2Zm0 4h12v2H4v-2Zm0 4h16v2H4v-2Z"></path></svg>',
  bullets:
    '<svg viewBox="0 0 24 24"><path d="M6 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm16-1H9v2h13V6ZM6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm16-1H9v2h13v-2ZM6 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm16-1H9v2h13v-2Z"></path></svg>',
  lineSpacing:
    '<svg viewBox="0 0 24 24"><path d="M8 5h13v2H8V5Zm0 6h13v2H8v-2Zm0 6h13v2H8v-2ZM3 5l2-2 2 2H5.8v14H7l-2 2-2-2h1.2V5H3Z"></path></svg>',
  symbol:
    '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 2.1-.9 4-2.3 5.3l-1.4-1.4A5 5 0 1 0 7 9c0 1.9 1 3.5 2.5 4.4V11h2v7h-2v-2.4A7 7 0 0 1 12 2Zm5 15h2v5h-2v-5Zm-4-2h2v7h-2v-7Z"></path></svg>',
  paragraphDefault:
    '<svg viewBox="0 0 24 24"><path d="M5 5h14v2H5V5Zm0 4h10v2H5V9Zm0 4h14v2H5v-2Zm0 4h10v2H5v-2Z"></path></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm0 4h11v2H4V9Zm0 4h16v2H4v-2Zm0 4h11v2H4v-2Z"></path></svg>',
  center:
    '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm3 4h10v2H7V9Zm-3 4h16v2H4v-2Zm3 4h10v2H7v-2Z"></path></svg>',
  right:
    '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm5 4h11v2H9V9Zm-5 4h16v2H4v-2Zm5 4h11v2H9v-2Z"></path></svg>',
  justify:
    '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm0 4h16v2H4V9Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z"></path></svg>',
  distributed:
    '<svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm0 4h16v2H4V9Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Zm-2-1 2 2-2 2v-4Zm20 0v4l-2-2 2-2Z"></path></svg>'
} as const

/**
 * Wraps a raw SVG string in a Vue component suitable for ribbon item icons.
 *
 * The SVG is normalized to inherit the current text color and to size itself as
 * `1em`, which lets the shared ribbon CSS control icon sizing consistently.
 *
 * @param svg Raw SVG markup for an MText ribbon icon.
 * @returns Vue component rendering the normalized icon.
 */
function svgIcon(svg: string): Component {
  const normalized = svg.replace(
    '<svg ',
    '<svg width="1em" height="1em" fill="currentColor" aria-hidden="true" '
  )
  return defineComponent({
    name: 'MTextRibbonSvgIcon',
    setup() {
      return () =>
        h('span', {
          style:
            'display:inline-flex;width:1em;height:1em;align-items:center;justify-content:center',
          innerHTML: normalized
        })
    }
  })
}

const icons = Object.fromEntries(
  Object.entries(toolbarIcons).map(([key, svg]) => [key, svgIcon(svg)])
) as Record<keyof typeof toolbarIcons, Component>

/**
 * Converts unknown numeric input into a finite number.
 *
 * @param value Raw value from a text style record or ribbon item id.
 * @returns Parsed finite number, or `undefined` for invalid input.
 */
function normalizeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Trims, filters, and de-duplicates string values while preserving first-seen
 * order.
 *
 * @param values Candidate strings collected from editor state, styles, and fonts.
 * @returns Unique non-empty strings in display order.
 */
function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const unique: string[] = []
  values.forEach(raw => {
    const value = raw.trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    unique.push(value)
  })
  return unique
}

/**
 * Returns the current drawing database from the document manager.
 *
 * @returns Active CAD database, or `undefined` when no document is open.
 */
function getCurrentDatabase() {
  return AcApDocManager.instance?.curDocument?.database
}

/**
 * Converts the ribbon format color fields into an `AcCmColor` instance.
 *
 * ACI values are preferred when present because they preserve ByLayer, ByBlock,
 * and indexed color semantics. RGB is used only when no ACI value is stored.
 *
 * @param format Current ribbon character format snapshot.
 * @returns CAD color model equivalent to the format color fields.
 */
function toAcCmColorFromFormat(format: MTextRibbonFormat) {
  const color = new AcCmColor()
  if (format.aci === 256) {
    color.setByLayer()
    return color
  }
  if (format.aci === 0) {
    color.setByBlock()
    return color
  }
  if (format.aci != null) {
    color.colorIndex = format.aci
    return color
  }
  if (format.rgb != null) {
    color.setRGBValue(format.rgb)
    return color
  }
  color.setByLayer()
  return color
}

/**
 * Resolves the color swatch displayed in the MText ribbon color control.
 *
 * ByLayer colors are rendered using the active layer's color when possible;
 * ByBlock and missing colors fall back to stable neutral swatches.
 *
 * @param color Color currently applied to the MText format.
 * @returns CSS color string used by the ribbon dropdown display.
 */
function resolveColorDisplay(color: AcCmColor | undefined) {
  if (!color) return '#7b8794'
  if (color.isByLayer) {
    const db = getCurrentDatabase()
    const layerName = db?.clayer
    return layerName
      ? db?.tables.layerTable.getAt(layerName)?.color.cssColor || '#7b8794'
      : '#7b8794'
  }
  if (color.isByBlock) return '#a0a8b8'
  return color.cssColor || '#7b8794'
}

/**
 * Converts a CAD color selected in the ribbon into editor format fields.
 *
 * @param color Color chosen by the user.
 * @returns Partial format containing either `aci` or `rgb` color data.
 */
function toFormatColor(color: AcCmColor) {
  if (color.isByLayer) return { aci: 256, rgb: null }
  if (color.isByBlock) return { aci: 0, rgb: null }
  if (color.isByACI && typeof color.colorIndex === 'number') {
    return { aci: color.colorIndex, rgb: null }
  }
  return { aci: null, rgb: color.RGB ?? null }
}

/**
 * Reads the MText editor static bridge through the ribbon-facing adapter type.
 *
 * @returns Editor bridge used to discover and observe the active input box.
 */
function getMTextEditorBridge(): MTextEditorBridge {
  return AcEdMTextEditor as unknown as MTextEditorBridge
}

/**
 * Collects text style table records from the active drawing.
 *
 * @returns Text style records in database iteration order, or an empty array.
 */
function getTextStyleRecords() {
  const db = getCurrentDatabase()
  if (!db) return []
  return Array.from(db.tables.textStyleTable.newIterator())
}

/**
 * Builds the text style gallery categories for the MText contextual ribbon.
 *
 * Each text style item carries a preview label and a font-family style so the
 * gallery can display the style using its configured font where possible.
 *
 * @param title Display title for the gallery category.
 * @returns Ribbon gallery categories representing drawing text styles.
 */
function buildTextStyleGalleryCategories(
  title: string
): RibbonGalleryCategoryModel[] {
  const records = getTextStyleRecords()
  return [
    {
      id: 'mtext-text-styles',
      title,
      items: records.map(record => {
        const name = record.name || record.textStyle.name
        const font = record.textStyle.font || name
        return {
          id: `mtext-style:${name}`,
          label: name,
          preview: name,
          componentProps: {
            style: {
              fontFamily: font
            }
          }
        }
      })
    }
  ]
}

/**
 * Creates the contextual ribbon controller for inline MTEXT editing.
 *
 * The controller observes the active MText input box, mirrors its current
 * character/paragraph state into ribbon controls, translates ribbon item ids
 * back into editor operations, and builds the contextual tab model used by the
 * ribbon renderer.
 *
 * @param options Shared ribbon tab state.
 * @returns Handlers and state consumed by the ribbon command host.
 */
export function useMTextContextualRibbon({
  activeTabId
}: UseMTextContextualRibbonOptions) {
  const {
    isVisible,
    isCommandActive,
    hideContextTab,
    showContextTab,
    handleCommandWillStart,
    isContextCommand
  } = useRibbonContextualTab({
    activeTabId,
    tabId: MTEXT_CONTEXTUAL_TAB_ID,
    commandGlobalNames: MTEXT_COMMAND_GLOBAL_NAMES
  })
  const currentFormat = ref<MTextRibbonFormat>({ ...DEFAULT_MTEXT_FORMAT })
  const currentColor = shallowRef<AcCmColor>(
    toAcCmColorFromFormat(currentFormat.value)
  )
  const currentColorDisplay = ref(resolveColorDisplay(currentColor.value))
  const stackActive = ref(false)
  const activeEditor = ref<MTextRibbonEditor | null>(null)

  let observedEditor: MTextRibbonEditor | null = null

  /**
   * Resolves the active MText editor from the bridge with a local ref fallback.
   *
   * @returns Active editor adapter, or `null` when no inline editor is open.
   */
  const getActiveEditor = () => {
    const bridge = getMTextEditorBridge()
    return bridge.getActiveInputBox
      ? bridge.getActiveInputBox()
      : activeEditor.value
  }

  /**
   * Shows the contextual tab while MTEXT is running or an inline editor exists.
   */
  const refreshContextTabVisibility = () => {
    if (isCommandActive.value || activeEditor.value) {
      showContextTab()
      return
    }
    hideContextTab()
  }

  /**
   * Synchronizes the ribbon color refs from a character format snapshot.
   *
   * @param format Current editor format used as the color source.
   */
  const syncColorStateFromFormat = (format: MTextRibbonFormat) => {
    const color = toAcCmColorFromFormat(format)
    const displayColor = resolveColorDisplay(color)
    if (currentColor.value?.toString() !== color.toString()) {
      currentColor.value = color
    }
    if (currentColorDisplay.value !== displayColor) {
      currentColorDisplay.value = displayColor
    }
  }

  /**
   * Pulls the latest format from the active editor into reactive ribbon state.
   *
   * When editing has ended, the ribbon resets to defaults and lets the
   * contextual tab visibility logic hide the tab if no MTEXT command is active.
   */
  const syncFormatFromEditor = () => {
    const editor = getActiveEditor()
    if (!editor) {
      activeEditor.value = null
      if (!sameMTextRibbonFormat(currentFormat.value, DEFAULT_MTEXT_FORMAT)) {
        currentFormat.value = { ...DEFAULT_MTEXT_FORMAT }
      }
      stackActive.value = false
      syncColorStateFromFormat(currentFormat.value)
      refreshContextTabVisibility()
      return
    }

    activeEditor.value = editor
    const nextFormat = {
      ...DEFAULT_MTEXT_FORMAT,
      ...editor.getCurrentFormat()
    }
    if (!sameMTextRibbonFormat(currentFormat.value, nextFormat)) {
      currentFormat.value = nextFormat
    }
    const nextStackActive = editor.isStackSelectionActive?.() ?? false
    if (stackActive.value !== nextStackActive) {
      stackActive.value = nextStackActive
    }
    syncColorStateFromFormat(currentFormat.value)
    refreshContextTabVisibility()
  }

  /**
   * Rebinds format synchronization listeners when the active editor changes.
   *
   * @param editor Editor adapter to observe, or `null` to remove listeners.
   */
  const bindEditorEvents = (editor: MTextRibbonEditor | null) => {
    if (observedEditor === editor) return
    if (observedEditor?.off) {
      observedEditor.off('change', syncFormatFromEditor)
      observedEditor.off('selectionChange', syncFormatFromEditor)
      observedEditor.off('cursorMove', syncFormatFromEditor)
      observedEditor.off('close', syncFormatFromEditor)
    }
    observedEditor?.removeCurrentFormatChangeListener?.(syncFormatFromEditor)
    observedEditor = editor
    if (observedEditor?.on) {
      observedEditor.on('change', syncFormatFromEditor)
      observedEditor.on('selectionChange', syncFormatFromEditor)
      observedEditor.on('cursorMove', syncFormatFromEditor)
      observedEditor.on('close', syncFormatFromEditor)
    }
    observedEditor?.addCurrentFormatChangeListener?.(syncFormatFromEditor)
    syncFormatFromEditor()
  }

  /**
   * Responds to active input box changes reported by the editor bridge.
   *
   * @param inputBox Editor-like object from the bridge, or `null` on close.
   */
  const handleActiveInputBoxChanged: ActiveInputBoxChangeListener =
    inputBox => {
      bindEditorEvents(inputBox as MTextRibbonEditor | null)
    }

  /**
   * Handles CAD command completion events for the MTEXT contextual tab.
   *
   * @param args Command event payload raised by the CAD command manager.
   */
  const handleCommandEnded = (args: AcEdCommandEventArgs) => {
    if (!isContextCommand(args)) return
    isCommandActive.value = false
    refreshContextTabVisibility()
  }

  onMounted(() => {
    const bridge = getMTextEditorBridge()
    bridge.addActiveInputBoxChangeListener?.(handleActiveInputBoxChanged)
    bindEditorEvents(bridge.getActiveInputBox?.() ?? null)
  })

  onUnmounted(() => {
    const bridge = getMTextEditorBridge()
    bridge.removeActiveInputBoxChangeListener?.(handleActiveInputBoxChanged)
    bindEditorEvents(null)
  })

  /**
   * Applies a partial character format to the active MText editor.
   *
   * @param format Format fields that should change on the current selection.
   */
  const applyCurrentFormat = (format: Partial<MTextRibbonFormat>) => {
    const editor = getActiveEditor()
    if (!editor) return
    editor.setCurrentFormat(format)
    editor.focusEditor?.()
    syncFormatFromEditor()
  }

  /**
   * Handles boolean character format toggles from ribbon toggle buttons.
   *
   * @param field Character format field controlled by the clicked toggle.
   * @param value Whether the formatting option should be enabled.
   */
  const handleFormatToggle = (
    field: 'bold' | 'italic' | 'underline' | 'overline' | 'strike',
    value: boolean
  ) => {
    applyCurrentFormat({ [field]: value })
  }

  /**
   * Handles superscript and subscript toggle buttons.
   *
   * If the user turns the currently active script option off, the editor returns
   * to normal baseline text. Otherwise the editor-specific selection toggle is
   * preferred so selected text can be transformed in place.
   *
   * @param script Script mode selected by the ribbon item.
   * @param active Whether the toggle is being switched on.
   */
  const handleScriptToggle = (
    script: Exclude<MTextRibbonScript, 'normal'>,
    active: boolean
  ) => {
    const editor = getActiveEditor()
    if (!editor) return
    editor.focusEditor?.()
    const handled = editor.toggleScriptSelection?.(script)
    if (!handled) {
      editor.setCurrentFormat({ script: active ? script : 'normal' })
    }
    editor.focusEditor?.()
    syncFormatFromEditor()
  }

  /**
   * Toggles stacked-fraction formatting for the current editor selection.
   */
  const handleStack = () => {
    const editor = getActiveEditor()
    editor?.focusEditor?.()
    editor?.toggleStackSelection?.()
    editor?.focusEditor?.()
    syncFormatFromEditor()
  }

  /**
   * Applies a color chosen from the shared ribbon color dropdown.
   *
   * @param color CAD color selected by the user.
   */
  const handleMTextColorChange = (color?: AcCmColor) => {
    if (!color) return
    applyCurrentFormat(toFormatColor(color))
  }

  /**
   * Applies a text height chosen from the MText height control.
   *
   * @param value Text height in drawing units.
   */
  const handleFontHeightChange = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return
    applyCurrentFormat({ fontSize: value })
  }

  /**
   * Applies a drawing text style to the active editor and database default.
   *
   * The style's configured font and usable height are mirrored into the current
   * character format so the active editor immediately reflects the gallery
   * selection.
   *
   * @param styleName Name of the text style selected in the gallery.
   */
  const applyTextStyle = (styleName: string) => {
    const db = getCurrentDatabase()
    if (!db || !styleName) return
    const record = db.tables.textStyleTable.getAt(styleName)
    if (!record) return
    db.textstyle = styleName
    const textStyle = record.textStyle
    const nextFormat: Partial<MTextRibbonFormat> = {}
    if (textStyle.font) nextFormat.fontFamily = textStyle.font
    const height =
      normalizeNumber(textStyle.fixedTextHeight) ??
      normalizeNumber(textStyle.lastHeight)
    if (height != null && height > 0) nextFormat.fontSize = height
    applyCurrentFormat(nextFormat)
  }

  /**
   * Builds the font dropdown options for the current editor context.
   *
   * @returns Unique font family names from current format, text styles,
   * available system fonts, and the default fallback.
   */
  const getFontOptions = () => {
    const availableFonts = AcApDocManager.instance?.avaiableFonts ?? []
    const fontNames = availableFonts.flatMap(fontInfo => fontInfo.name)
    const styleFonts = getTextStyleRecords().map(
      record => record.textStyle.font
    )
    return uniqueStrings([
      currentFormat.value.fontFamily,
      ...styleFonts,
      ...fontNames,
      DEFAULT_MTEXT_FORMAT.fontFamily
    ])
  }

  /**
   * Builds the text height options for the MText height picker.
   *
   * @returns Unique positive heights from the current format, text styles, and
   * common drafting defaults.
   */
  const getHeightOptions = () => {
    const styleHeights = getTextStyleRecords()
      .flatMap(record => [
        record.textStyle.fixedTextHeight,
        record.textStyle.lastHeight
      ])
      .map(normalizeNumber)
      .filter((value): value is number => value != null && value > 0)
    return Array.from(
      new Set([
        currentFormat.value.fontSize,
        ...styleHeights,
        1,
        2.5,
        3.5,
        5,
        7,
        10,
        12,
        24
      ])
    )
  }

  /**
   * Inserts raw MText content at the active editor cursor.
   *
   * @param text MText control code or literal text to insert.
   */
  const insertText = (text: string) => {
    const editor = getActiveEditor()
    if (!editor) return
    editor.insertText(text)
    editor.focusEditor?.()
    syncFormatFromEditor()
  }

  /**
   * Applies paragraph alignment through the active editor.
   *
   * @param alignment Alignment id emitted by the ribbon button group.
   */
  const handleParagraphAlignment = (alignment: string) => {
    const editor = getActiveEditor()
    editor?.setParagraphAlignment?.(alignment)
    editor?.focusEditor?.()
    syncFormatFromEditor()
  }

  /**
   * Routes MText contextual ribbon item clicks to editor operations.
   *
   * The dispatcher owns the `mtext-` item id contract for text styles, fonts,
   * character formatting, paragraph tools, symbol insertion, and editor close.
   *
   * @param itemId Ribbon item id emitted by the MText contextual tab.
   * @returns `true` when the id belongs to the MText contextual ribbon.
   */
  const handleItem = (itemId: string) => {
    if (!itemId.startsWith(MTEXT_ITEM_PREFIX)) return false

    if (itemId.startsWith('mtext-style:')) {
      applyTextStyle(itemId.slice('mtext-style:'.length))
      return true
    }
    if (itemId.startsWith('mtext-font:')) {
      applyCurrentFormat({ fontFamily: itemId.slice('mtext-font:'.length) })
      return true
    }
    if (itemId.startsWith('mtext-format:')) {
      const [, field, state] = itemId.split(':')
      const active = state === 'on'
      if (
        field === 'bold' ||
        field === 'italic' ||
        field === 'underline' ||
        field === 'overline' ||
        field === 'strike'
      ) {
        handleFormatToggle(field, active)
        return true
      }
      if (field === 'superscript' || field === 'subscript') {
        handleScriptToggle(field, active)
        return true
      }
      if (field === 'stack') {
        handleStack()
        return true
      }
    }
    if (itemId === 'mtext-format:stack') {
      handleStack()
      return true
    }
    if (itemId === 'mtext-format:case') {
      const editor = getActiveEditor()
      editor?.toggleCase?.()
      editor?.focusEditor?.()
      syncFormatFromEditor()
      return true
    }
    if (itemId.startsWith('mtext-attachment:')) {
      const editor = getActiveEditor()
      editor?.setAttachmentPoint?.(
        itemId.slice('mtext-attachment:'.length)
      )
      editor?.focusEditor?.()
      return true
    }
    if (itemId.startsWith('mtext-list:')) {
      const value = itemId.slice('mtext-list:'.length)
      if (value === 'number') insertText('1. ')
      if (value === 'letter') insertText('a. ')
      if (value === 'bullet') insertText('\\U+2022 ')
      return true
    }
    if (itemId.startsWith('mtext-line-spacing:')) {
      const value = itemId.slice('mtext-line-spacing:'.length)
      if (value === 'clear') {
        const editor = getActiveEditor()
        editor?.clearLineSpacing?.()
        editor?.focusEditor?.()
      } else {
        const factor = normalizeNumber(value)
        if (factor != null) {
          const editor = getActiveEditor()
          editor?.setLineSpacingFactor?.(factor)
          editor?.focusEditor?.()
        }
      }
      return true
    }
    if (itemId.startsWith('mtext-paragraph-align:')) {
      handleParagraphAlignment(itemId.slice('mtext-paragraph-align:'.length))
      return true
    }
    if (itemId.startsWith('mtext-symbol:')) {
      const symbol = itemId.slice('mtext-symbol:'.length)
      if (symbol !== 'other') insertText(symbol)
      return true
    }
    if (itemId === 'mtext-close') {
      getActiveEditor()?.closeEditor()
      return true
    }

    return true
  }

  /**
   * Creates a compact ribbon toggle item for MText character formatting.
   *
   * @param id Stable ribbon item id and item id prefix.
   * @param label Localized command label.
   * @param tooltip Localized tooltip text.
   * @param icon Icon component shown by the toggle.
   * @param modelValue Current active state for the toggle.
   * @returns Ribbon item model configured as a small toggle button.
   */
  const createToggleItem = (
    id: string,
    label: string,
    tooltip: string,
    icon: Component,
    modelValue: boolean
  ): RibbonItemModel => ({
    id,
    type: 'toggle',
    label,
    tooltip,
    hideLabel: true,
    size: 'small',
    disabled: !activeEditor.value,
    props: {
      modelValue,
      activeIcon: icon,
      inactiveIcon: icon,
      activeLabel: label,
      inactiveLabel: label,
      activeValue: `${id}:on`,
      inactiveValue: `${id}:off`
    }
  })

  /**
   * Creates a compact ribbon push button for MText editor commands.
   *
   * @param id Stable ribbon item id.
   * @param label Localized command label.
   * @param tooltip Localized tooltip text.
   * @param icon Icon component shown by the button.
   * @returns Ribbon item model configured as a small icon button.
   */
  const createButtonItem = (
    id: string,
    label: string,
    tooltip: string,
    icon: Component
  ): RibbonItemModel => ({
    id,
    type: 'button',
    label,
    tooltip,
    hideLabel: true,
    size: 'small',
    disabled: !activeEditor.value,
    props: { icon }
  })

  /**
   * Builds the current MTEXT contextual ribbon tab model.
   *
   * The editor format is refreshed before construction so gallery, dropdown,
   * toggle, color, height, and paragraph controls reflect the current cursor or
   * selection state at render time.
   *
   * @param t Translation callback used for all user-facing labels.
   * @returns Ribbon tab model consumed by the ribbon renderer.
   */
  const buildContextualTab = (t: Translate): RibbonTabModel => {
    syncFormatFromEditor()

    const fontOptions = getFontOptions().map(fontName => ({
      label: fontName,
      value: `mtext-font:${fontName}`
    }))
    const disabled = !activeEditor.value
    const format = currentFormat.value

    return {
      id: MTEXT_CONTEXTUAL_TAB_ID,
      title: t('main.ribbon.tab.mtextEditorContext'),
      contextual: true,
      contextualMode: 'exclusive',
      contextualColor: '#9a6a22',
      contextualTitle: t('main.ribbon.mtext.contextTitle'),
      visible: isVisible.value,
      groups: [
        {
          id: 'mtext-style-group',
          title: t('main.ribbon.mtext.group.textStyle'),
          orientation: 'row',
          collections: [
            {
              id: 'mtext-style-main',
              layout: 'row',
              items: [
                {
                  id: 'mtext-style',
                  type: 'gallery',
                  tooltip: t('main.ribbon.mtext.tooltip.textStyle'),
                  size: 'large',
                  props: {
                    modelValue: `mtext-style:${getCurrentDatabase()?.textstyle ?? ''}`,
                    inlineItemLimit: 3,
                    categories: buildTextStyleGalleryCategories(
                      t('main.ribbon.mtext.field.textStyle')
                    )
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mtext-format-group',
          title: t('main.ribbon.mtext.group.format'),
          orientation: 'row',
          collections: [
            {
              id: 'mtext-format-column1',
              layout: 'column',
              rows: 3,
              items: [
                createToggleItem(
                  'mtext-format:bold',
                  t('main.ribbon.mtext.command.bold'),
                  t('main.ribbon.mtext.tooltip.bold'),
                  icons.bold,
                  format.bold
                ),
                createToggleItem(
                  'mtext-format:underline',
                  t('main.ribbon.mtext.command.underline'),
                  t('main.ribbon.mtext.tooltip.underline'),
                  icons.underline,
                  format.underline
                ),
                createToggleItem(
                  'mtext-format:superscript',
                  t('main.ribbon.mtext.command.superscript'),
                  t('main.ribbon.mtext.tooltip.superscript'),
                  icons.superscript,
                  format.script === 'superscript'
                )
              ]
            },
            {
              id: 'mtext-format-column2',
              layout: 'column',
              rows: 3,
              items: [
                createToggleItem(
                  'mtext-format:italic',
                  t('main.ribbon.mtext.command.italic'),
                  t('main.ribbon.mtext.tooltip.italic'),
                  icons.italic,
                  format.italic
                ),
                createToggleItem(
                  'mtext-format:overline',
                  t('main.ribbon.mtext.command.overline'),
                  t('main.ribbon.mtext.tooltip.overline'),
                  icons.overline,
                  format.overline
                ),
                createToggleItem(
                  'mtext-format:subscript',
                  t('main.ribbon.mtext.command.subscript'),
                  t('main.ribbon.mtext.tooltip.subscript'),
                  icons.subscript,
                  format.script === 'subscript'
                )
              ]
            },
            {
              id: 'mtext-format-column3',
              layout: 'column',
              rows: 3,
              items: [
                createToggleItem(
                  'mtext-format:strike',
                  t('main.ribbon.mtext.command.strikethrough'),
                  t('main.ribbon.mtext.tooltip.strikethrough'),
                  icons.strike,
                  format.strike
                ),
                createToggleItem(
                  'mtext-format:stack',
                  t('main.ribbon.mtext.command.stack'),
                  t('main.ribbon.mtext.tooltip.stack'),
                  icons.stack,
                  stackActive.value
                ),
                createButtonItem(
                  'mtext-format:case',
                  t('main.ribbon.mtext.command.toggleCase'),
                  t('main.ribbon.mtext.tooltip.toggleCase'),
                  icons.case
                )
              ]
            },
            {
              id: 'mtext-format-column4',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'mtext-font',
                  type: 'comboBox',
                  label: t('main.ribbon.mtext.field.font'),
                  tooltip: t('main.ribbon.mtext.tooltip.font'),
                  size: 'small',
                  disabled,
                  props: {
                    width: '154px',
                    modelValue: `mtext-font:${format.fontFamily}`,
                    emitValueOnChange: true,
                    options: fontOptions
                  }
                },
                {
                  id: 'mtext-color',
                  type: 'custom',
                  label: t('main.ribbon.mtext.field.color'),
                  tooltip: t('main.ribbon.mtext.tooltip.color'),
                  size: 'small',
                  disabled,
                  props: {
                    component: MlRibbonPropertyColorDropdown,
                    componentProps: {
                      modelValue: currentColor.value,
                      displayColor: currentColorDisplay.value,
                      placeholder: t('main.ribbon.mtext.field.color'),
                      controlWidth: '132px',
                      'onUpdate:modelValue': handleMTextColorChange
                    }
                  }
                },
                {
                  id: 'mtext-height',
                  type: 'custom',
                  label: t('main.ribbon.mtext.field.height'),
                  tooltip: t('main.ribbon.mtext.tooltip.height'),
                  size: 'small',
                  disabled,
                  props: {
                    component: MlRibbonMTextHeightSelect,
                    componentProps: {
                      modelValue: format.fontSize,
                      options: getHeightOptions(),
                      placeholder: t('main.ribbon.mtext.field.height'),
                      controlWidth: '132px',
                      'onUpdate:modelValue': handleFontHeightChange
                    }
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mtext-paragraph-group',
          title: t('main.ribbon.mtext.group.paragraph'),
          orientation: 'row',
          collections: [
            {
              id: 'mtext-paragraph-attachment',
              layout: 'row',
              items: [
                {
                  id: 'mtext-attachment',
                  type: 'dropdown',
                  label: t('main.ribbon.mtext.command.attachment'),
                  tooltip: t('main.ribbon.mtext.tooltip.attachment'),
                  size: 'large',
                  disabled,
                  props: {
                    icon: icons.align,
                    options: [
                      'TL',
                      'TC',
                      'TR',
                      'ML',
                      'MC',
                      'MR',
                      'BL',
                      'BC',
                      'BR'
                    ].map(value => ({
                      value: `mtext-attachment:${value}`,
                      label: t(`main.ribbon.mtext.attachment.${value}`)
                    }))
                  }
                }
              ]
            },
            {
              id: 'mtext-paragraph-tools',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'mtext-list',
                  type: 'dropdown',
                  label: t('main.ribbon.mtext.command.list'),
                  tooltip: t('main.ribbon.mtext.tooltip.list'),
                  hideLabel: true,
                  size: 'small',
                  disabled,
                  props: {
                    icon: icons.bullets,
                    options: [
                      {
                        value: 'mtext-list:off',
                        label: t('main.ribbon.mtext.list.off')
                      },
                      {
                        value: 'mtext-list:number',
                        label: t('main.ribbon.mtext.list.number')
                      },
                      {
                        value: 'mtext-list:letter',
                        label: t('main.ribbon.mtext.list.letter')
                      },
                      {
                        value: 'mtext-list:bullet',
                        label: t('main.ribbon.mtext.list.bullet')
                      },
                      {
                        value: 'mtext-list:start',
                        label: t('main.ribbon.mtext.list.start')
                      },
                      {
                        value: 'mtext-list:continue',
                        label: t('main.ribbon.mtext.list.continue')
                      },
                      {
                        value: 'mtext-list:auto',
                        label: t('main.ribbon.mtext.list.auto')
                      },
                      {
                        value: 'mtext-list:allow-list',
                        label: t('main.ribbon.mtext.list.allowList')
                      }
                    ]
                  }
                },
                {
                  id: 'mtext-line-spacing',
                  type: 'dropdown',
                  label: t('main.ribbon.mtext.command.lineSpacing'),
                  tooltip: t('main.ribbon.mtext.tooltip.lineSpacing'),
                  hideLabel: true,
                  size: 'small',
                  disabled,
                  props: {
                    icon: icons.lineSpacing,
                    options: [
                      { value: 'mtext-line-spacing:1', label: '1.0x' },
                      { value: 'mtext-line-spacing:1.5', label: '1.5x' },
                      { value: 'mtext-line-spacing:2', label: '2.0x' },
                      { value: 'mtext-line-spacing:2.5', label: '2.5x' },
                      {
                        value: 'mtext-line-spacing:more',
                        label: t('main.ribbon.mtext.lineSpacing.more')
                      },
                      {
                        value: 'mtext-line-spacing:clear',
                        label: t('main.ribbon.mtext.lineSpacing.clear')
                      }
                    ]
                  }
                },
                {
                  id: 'mtext-paragraph-align',
                  type: 'buttonGroup',
                  label: t('main.ribbon.mtext.command.paragraphAlignment'),
                  tooltip: t('main.ribbon.mtext.tooltip.paragraphAlignment'),
                  hideLabel: true,
                  size: 'small',
                  disabled,
                  props: {
                    wrap: false,
                    buttonSize: 'small',
                    iconSize: '16px',
                    options: [
                      {
                        value: 'mtext-paragraph-align:default',
                        label: '',
                        icon: icons.paragraphDefault,
                        tooltip: t('main.ribbon.mtext.paragraphAlign.default')
                      },
                      {
                        value: 'mtext-paragraph-align:left',
                        label: '',
                        icon: icons.left,
                        tooltip: t('main.ribbon.mtext.paragraphAlign.left')
                      },
                      {
                        value: 'mtext-paragraph-align:center',
                        label: '',
                        icon: icons.center,
                        tooltip: t('main.ribbon.mtext.paragraphAlign.center')
                      },
                      {
                        value: 'mtext-paragraph-align:right',
                        label: '',
                        icon: icons.right,
                        tooltip: t('main.ribbon.mtext.paragraphAlign.right')
                      },
                      {
                        value: 'mtext-paragraph-align:justified',
                        label: '',
                        icon: icons.justify,
                        tooltip: t('main.ribbon.mtext.paragraphAlign.justified')
                      },
                      {
                        value: 'mtext-paragraph-align:distributed',
                        label: '',
                        icon: icons.distributed,
                        tooltip: t(
                          'main.ribbon.mtext.paragraphAlign.distributed'
                        )
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mtext-insert-group',
          title: t('main.ribbon.mtext.group.insert'),
          orientation: 'row',
          collections: [
            {
              id: 'mtext-insert-main',
              layout: 'row',
              items: [
                {
                  id: 'mtext-symbol',
                  type: 'dropdown',
                  label: t('main.ribbon.mtext.command.symbol'),
                  tooltip: t('main.ribbon.mtext.tooltip.symbol'),
                  size: 'large',
                  disabled,
                  props: {
                    icon: icons.symbol,
                    options: [
                      {
                        value: 'mtext-symbol:%%d',
                        label: t('main.ribbon.mtext.symbol.degree')
                      },
                      {
                        value: 'mtext-symbol:%%p',
                        label: t('main.ribbon.mtext.symbol.plusMinus')
                      },
                      {
                        value: 'mtext-symbol:%%c',
                        label: t('main.ribbon.mtext.symbol.diameter')
                      },
                      {
                        value: 'mtext-symbol:\\U+2248',
                        label: t('main.ribbon.mtext.symbol.almostEqual')
                      },
                      {
                        value: 'mtext-symbol:\\U+2220',
                        label: t('main.ribbon.mtext.symbol.angle')
                      },
                      {
                        value: 'mtext-symbol:\\U+E100',
                        label: t('main.ribbon.mtext.symbol.boundary')
                      },
                      {
                        value: 'mtext-symbol:\\U+2104',
                        label: t('main.ribbon.mtext.symbol.centerLine')
                      },
                      {
                        value: 'mtext-symbol:\\U+0394',
                        label: t('main.ribbon.mtext.symbol.delta')
                      },
                      {
                        value: 'mtext-symbol:\\U+0278',
                        label: t('main.ribbon.mtext.symbol.electricalPhase')
                      },
                      {
                        value: 'mtext-symbol:\\U+E101',
                        label: t('main.ribbon.mtext.symbol.flowLine')
                      },
                      {
                        value: 'mtext-symbol:\\U+2261',
                        label: t('main.ribbon.mtext.symbol.identical')
                      },
                      {
                        value: 'mtext-symbol:\\U+2260',
                        label: t('main.ribbon.mtext.symbol.notEqual')
                      },
                      {
                        value: 'mtext-symbol:\\U+2126',
                        label: t('main.ribbon.mtext.symbol.ohm')
                      },
                      {
                        value: 'mtext-symbol:\\U+03A9',
                        label: t('main.ribbon.mtext.symbol.omega')
                      },
                      {
                        value: 'mtext-symbol:\\U+214A',
                        label: t('main.ribbon.mtext.symbol.propertyLine')
                      },
                      {
                        value: 'mtext-symbol:\\U+2082',
                        label: t('main.ribbon.mtext.symbol.subscriptTwo')
                      },
                      {
                        value: 'mtext-symbol:\\U+00B2',
                        label: t('main.ribbon.mtext.symbol.squared')
                      },
                      {
                        value: 'mtext-symbol:\\U+00B3',
                        label: t('main.ribbon.mtext.symbol.cubed')
                      },
                      {
                        value: 'mtext-symbol:\\~',
                        label: t('main.ribbon.mtext.symbol.nbsp')
                      },
                      {
                        value: 'mtext-symbol:other',
                        label: t('main.ribbon.mtext.symbol.other')
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'mtext-close-group',
          title: t('main.ribbon.mtext.group.close'),
          orientation: 'row',
          collections: [
            {
              id: 'mtext-close-main',
              layout: 'row',
              items: [
                {
                  id: 'mtext-close',
                  type: 'button',
                  label: t('main.ribbon.mtext.command.close'),
                  tooltip: t('main.ribbon.mtext.tooltip.close'),
                  size: 'large',
                  props: { icon: CircleClose }
                }
              ]
            }
          ]
        }
      ]
    }
  }

  /**
   * Handles command completion events exposed to the ribbon host.
   *
   * In addition to updating contextual command state, this releases editor
   * listeners when the MTEXT command itself finishes so stale input boxes do not
   * keep driving ribbon updates.
   *
   * @param args Command event payload raised by the CAD command manager.
   */
  const handleRibbonCommandEnded = (args: AcEdCommandEventArgs) => {
    handleCommandEnded(args)
    if (isMTextCommandGlobalName(args.command?.globalName)) {
      bindEditorEvents(null)
    }
  }

  return {
    isVisible,
    isCommandActive,
    handleCommandWillStart,
    handleCommandEnded: handleRibbonCommandEnded,
    handleItem,
    buildContextualTab
  }
}
