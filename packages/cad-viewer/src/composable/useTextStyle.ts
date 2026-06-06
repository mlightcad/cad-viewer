import { AcApDocManager, AcApFontUtil } from '@mlightcad/cad-simple-viewer'
import {
  type AcDbDatabase,
  type AcDbFontInfo,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcDbTextStyleTableRecord,
  DEFAULT_TEXT_STYLE
} from '@mlightcad/data-model'
import { computed, reactive, ref, watch } from 'vue'

/**
 * Editable fields of a text style as shown in the Text Style dialog (STYLE / ST).
 * Mirrors {@link AcDbTextStyleTableRecord} properties in a UI-friendly shape.
 */
export interface TextStyleFormState {
  /** Primary font file name or mesh font identifier (`fileName` / `textStyle.font`). */
  font: string
  /** Selected mesh font variant; equals {@link font} for SHX fonts. */
  fontStyle: string
  /** Whether a companion SHX big font is enabled for double-byte character support. */
  useBigFont: boolean
  /** Big font file name when {@link useBigFont} is true (`bigFontFileName`). */
  bigFont: string
  /** Default text height for new text entities (`textSize`). */
  textHeight: number
  /** Mirror text upside down (text generation flag bit 2; ignored when {@link vertical} is true). */
  upsideDown: boolean
  /** Mirror text backwards / right-to-left (text generation flag bit 1). */
  backwards: boolean
  /** Stack characters vertically (`isVertical`). */
  vertical: boolean
  /** Horizontal scale factor (`xScale`); minimum clamped to 0.01. */
  widthFactor: number
  /** Oblique angle in degrees (`obliquingAngle`). */
  obliqueAngle: number
}

/**
 * Select-option entry for font dropdowns in the Text Style dialog.
 */
export interface FontOption {
  /** Font identifier stored in the form (primary name from {@link AcDbFontInfo.name}). */
  value: string
  /** Display label, preferring the source file path when available. */
  label: string
  /** Font backend type: SHX vector font or mesh (TrueType) font. */
  type: 'shx' | 'mesh'
}

/**
 * Sample string used to preview the active text style in the dialog UI.
 */
export const TEXT_STYLE_PREVIEW = 'AaBbYyZz123'

/** Bit mask for backwards text in `textStyle.textGenerationFlag`. */
const BACKWARDS_FLAG = 2

/** Bit mask for upside-down text in `textStyle.textGenerationFlag`. */
const UPSIDE_DOWN_FLAG = 4

/**
 * Returns an empty {@link TextStyleFormState} with safe defaults for the dialog form.
 */
function createDefaultForm(): TextStyleFormState {
  return {
    font: '',
    fontStyle: '',
    useBigFont: false,
    bigFont: '',
    textHeight: 0,
    upsideDown: false,
    backwards: false,
    vertical: false,
    widthFactor: 1,
    obliqueAngle: 0
  }
}

/**
 * Collects unique, non-empty text style names from the drawing database.
 *
 * Deduplicates by exact name and prefers `record.name`, falling back to
 * `record.textStyle.name` when the table record name is unset.
 *
 * @param db - Active drawing database.
 * @returns Sorted list of style names as stored in the text style table.
 */
function listTextStyleNames(db: AcDbDatabase): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const record of db.tables.textStyleTable.newIterator()) {
    const raw = record.name ?? record.textStyle.name
    const name = typeof raw === 'string' ? raw.trim() : ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

/**
 * Coerces an unknown value to a finite number, falling back to `0`.
 *
 * @param value - Raw value from a database field or UI input.
 * @returns Finite numeric value, or `0` when conversion fails.
 */
function normalizeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Resolves a text style table record by name with case-insensitive fallback.
 *
 * Lookup order:
 * 1. Exact match via `textStyleTable.getAt`
 * 2. Case-insensitive scan of all table records
 *
 * @param db - Active drawing database.
 * @param name - Text style name to resolve.
 * @returns Matching table record, or `undefined` when not found or name is blank.
 */
function getTextStyleRecord(
  db: AcDbDatabase,
  name: string
): AcDbTextStyleTableRecord | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined

  const exact = db.tables.textStyleTable.getAt(trimmed)
  if (exact) return exact

  const upper = trimmed.toUpperCase()
  for (const record of db.tables.textStyleTable.newIterator()) {
    const recordName = record.name?.trim()
    if (recordName && recordName.toUpperCase() === upper) {
      return record
    }
  }
  return undefined
}

/**
 * Maps a {@link AcDbTextStyleTableRecord} into {@link TextStyleFormState} for editing.
 *
 * Applies the same clamps used when saving: non-negative height, minimum width factor
 * of 0.01, and upside-down only when the style is not vertical.
 *
 * @param record - Source text style table record.
 * @returns Populated form state reflecting the record's current values.
 */
function readTextStyleForm(
  record: AcDbTextStyleTableRecord
): TextStyleFormState {
  const flag = record.textStyle.textGenerationFlag ?? 0
  const font = record.fileName || record.textStyle.font || ''
  return {
    font,
    fontStyle: font,
    useBigFont: Boolean(record.bigFontFileName?.trim()),
    bigFont: record.bigFontFileName || '',
    textHeight: Math.max(0, normalizeNumber(record.textSize)),
    upsideDown: !record.isVertical && (flag & UPSIDE_DOWN_FLAG) !== 0,
    backwards: (flag & BACKWARDS_FLAG) !== 0,
    vertical: record.isVertical,
    widthFactor: Math.max(0.01, normalizeNumber(record.xScale) || 1),
    obliqueAngle: normalizeNumber(record.obliquingAngle)
  }
}

/**
 * Copies all fields from `next` into the reactive `form` object in place.
 *
 * Used to refresh the dialog form without replacing the reactive reference.
 *
 * @param form - Target reactive form state.
 * @param next - Source form values to apply.
 */
function applyFormState(form: TextStyleFormState, next: TextStyleFormState) {
  form.font = next.font
  form.fontStyle = next.fontStyle
  form.useBigFont = next.useBigFont
  form.bigFont = next.bigFont
  form.textHeight = next.textHeight
  form.upsideDown = next.upsideDown
  form.backwards = next.backwards
  form.vertical = next.vertical
  form.widthFactor = next.widthFactor
  form.obliqueAngle = next.obliqueAngle
}

/**
 * Writes {@link TextStyleFormState} values back onto a text style table record.
 *
 * Rebuilds `textGenerationFlag` from backwards/upside-down toggles and clears
 * `bigFontFileName` when big font is disabled.
 *
 * @param record - Target text style table record to mutate.
 * @param form - Form values to persist.
 */
function applyTextStyleForm(
  record: AcDbTextStyleTableRecord,
  form: TextStyleFormState
) {
  record.fileName = form.font.trim()
  record.textSize = Math.max(0, form.textHeight)
  record.xScale = Math.max(0.01, form.widthFactor)
  record.obliquingAngle = form.obliqueAngle
  record.isVertical = form.vertical

  let flag = 0
  if (form.backwards) flag |= BACKWARDS_FLAG
  if (form.upsideDown && !form.vertical) flag |= UPSIDE_DOWN_FLAG
  record.textStyle.textGenerationFlag = flag

  record.bigFontFileName = form.useBigFont ? form.bigFont.trim() : ''
}

/**
 * Builds sorted font dropdown options from available drawing fonts.
 *
 * Deduplicates by primary name (case-insensitive) and uses the first non-empty
 * alias from {@link AcDbFontInfo.name} as the option value.
 *
 * @param fontInfos - Font catalog from the editor (`avaiableFonts`).
 * @returns Options sorted by display label.
 */
function buildFontOptions(fontInfos: AcDbFontInfo[]): FontOption[] {
  const options: FontOption[] = []
  const seen = new Set<string>()

  for (const info of fontInfos) {
    const primary = info.name.find(n => n.trim())?.trim()
    if (!primary) continue
    const key = primary.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      value: primary,
      label: info.file || primary,
      type: info.type
    })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Builds big-font dropdown options limited to SHX fonts.
 *
 * Big fonts are only supported alongside SHX primary fonts in AutoCAD-style workflows.
 *
 * @param fontInfos - Font catalog from the editor.
 * @returns SHX font options suitable for the big-font selector.
 */
function buildBigFontOptions(fontInfos: AcDbFontInfo[]): FontOption[] {
  return buildFontOptions(fontInfos.filter(info => info.type === 'shx'))
}

/**
 * Finds font metadata for a given font name in the available font list.
 *
 * @param fontInfos - Font catalog from the editor.
 * @param fontName - Font name or alias to match (case-insensitive).
 * @returns Matching {@link AcDbFontInfo}, or `undefined` when not found.
 */
function findFontInfo(
  fontInfos: AcDbFontInfo[],
  fontName: string
): AcDbFontInfo | undefined {
  const target = fontName.trim().toLowerCase()
  if (!target) return undefined
  return fontInfos.find(info =>
    info.name.some(name => name.trim().toLowerCase() === target)
  )
}

/**
 * Returns whether the given name is the built-in Standard text style.
 *
 * @param name - Text style name to check.
 */
function isStandardTextStyle(name: string): boolean {
  return name.trim().toLowerCase() === DEFAULT_TEXT_STYLE.toLowerCase()
}

/**
 * Creates a new text style table record initialized from the current or default template.
 *
 * Copies baseline geometry from the drawing's current `TEXTSTYLE` (or
 * {@link DEFAULT_TEXT_STYLE}) when available; otherwise uses hard-coded defaults
 * (`txt` font, width factor 1, last height 2.5).
 *
 * @param db - Active drawing database.
 * @param name - Name for the new text style record.
 * @returns New, unsaved {@link AcDbTextStyleTableRecord} ready to add to the table.
 */
function createDefaultTextStyleRecord(
  db: AcDbDatabase,
  name: string
): AcDbTextStyleTableRecord {
  const templateName = db.textstyle || DEFAULT_TEXT_STYLE
  const template = getTextStyleRecord(db, templateName)
  const base = template?.textStyle

  return new AcDbTextStyleTableRecord({
    name,
    standardFlag: 0,
    fixedTextHeight: 0,
    widthFactor: base?.widthFactor ?? 1,
    obliqueAngle: base?.obliqueAngle ?? 0,
    textGenerationFlag: 0,
    lastHeight: base?.lastHeight ?? 2.5,
    font: base?.font || 'txt',
    bigFont: '',
    extendedFont: base?.extendedFont || base?.font || 'txt'
  })
}

/**
 * Validates a proposed new text style name against AutoCAD naming rules and existing names.
 *
 * Rejects empty names, names containing `;`, `=`, `<`, `>`, `` ` ``, `\`, `/`, or `,`,
 * and names that already exist (case-insensitive).
 *
 * @param name - Proposed style name from the UI.
 * @param existing - Current style names in the drawing.
 */
function isValidNewTextStyleName(name: string, existing: string[]): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/[;=<>`\\/,]/.test(trimmed)) return false
  const lower = trimmed.toLowerCase()
  return !existing.some(item => item.toLowerCase() === lower)
}

/**
 * Ensures fonts referenced by the form are loaded into the drawing for preview and regen.
 *
 * Loads the primary font and, when enabled, the big font asynchronously via
 * {@link AcApFontUtil.ensureDrawingFontLoaded}.
 *
 * @param form - Current form state whose fonts should be loaded.
 */
async function ensureFormFontsLoaded(form: TextStyleFormState) {
  if (form.font) {
    await AcApFontUtil.ensureDrawingFontLoaded(form.font)
  }
  if (form.useBigFont && form.bigFont) {
    await AcApFontUtil.ensureDrawingFontLoaded(form.bigFont)
  }
}

/**
 * Composable for the Text Style dialog (STYLE / ST command).
 *
 * Manages the text style list, current drawing text style, reactive edit form,
 * font option derivation, and CRUD operations against `textStyleTable`.
 *
 * @param editor - Document manager providing the active database and font catalog.
 * Defaults to {@link AcApDocManager.instance}.
 *
 * @returns Reactive state, computed UI helpers, and mutation handlers for the dialog.
 */
export function useTextStyle(editor: AcApDocManager = AcApDocManager.instance) {
  /** All text style names in the active drawing. */
  const styleNames = ref<string[]>([])
  /** Name of the style currently selected in the dialog list. */
  const selectedName = ref('')
  /** Name of the drawing's current TEXTSTYLE system variable. */
  const currentStyleName = ref('')
  /** Available fonts reported by the editor for dropdown population. */
  const fontInfos = ref<AcDbFontInfo[]>([])
  /** Reactive edit form for the selected text style. */
  const form = reactive<TextStyleFormState>(createDefaultForm())

  /** Returns the active document database, or `undefined` when no document is open. */
  const getDatabase = () => editor.curDocument?.database

  /** Primary font dropdown options derived from {@link fontInfos}. */
  const fontOptions = computed(() => buildFontOptions(fontInfos.value))
  /** Big-font dropdown options (SHX only). */
  const bigFontOptions = computed(() => buildBigFontOptions(fontInfos.value))

  /** Font metadata for the currently selected primary font. */
  const selectedFontInfo = computed(() =>
    findFontInfo(fontInfos.value, form.font)
  )

  /** Whether the font-style sub-selector is shown (mesh fonts expose multiple face names). */
  const fontStyleEnabled = computed(
    () => selectedFontInfo.value?.type === 'mesh'
  )

  /** Mesh font face names available for the selected primary font. */
  const fontStyleOptions = computed(() => {
    const info = selectedFontInfo.value
    if (!info || info.type !== 'mesh') return []
    return info.name.filter(Boolean)
  })

  /** Whether big-font controls are applicable (SHX primary font or no font selected yet). */
  const bigFontSupported = computed(
    () => selectedFontInfo.value?.type === 'shx' || !selectedFontInfo.value
  )

  /** Whether the selected style can be deleted (not Standard, not current, not the last style). */
  const canDelete = computed(() => {
    if (!selectedName.value) return false
    if (isStandardTextStyle(selectedName.value)) return false
    if (selectedName.value === currentStyleName.value) return false
    return styleNames.value.length > 1
  })

  /** Whether the selected list item is already the drawing's current text style. */
  const isSelectedCurrentStyle = computed(() => {
    if (!selectedName.value) return true
    return (
      selectedName.value.trim().toLowerCase() ===
      currentStyleName.value.trim().toLowerCase()
    )
  })

  /** Whether "Set Current" should be enabled for the selected style. */
  const canSetCurrent = computed(
    () => Boolean(selectedName.value) && !isSelectedCurrentStyle.value
  )

  /** Inline CSS properties for the dialog preview line ({@link TEXT_STYLE_PREVIEW}). */
  const previewStyle = computed(() => {
    const font = form.fontStyle || form.font
    const style: Record<string, string> = {
      fontFamily: font || 'sans-serif'
    }
    if (form.obliqueAngle) {
      style.fontStyle = 'oblique'
    }
    if (form.widthFactor !== 1) {
      style.transform = `scaleX(${form.widthFactor})`
      style.transformOrigin = 'center center'
    }
    if (form.vertical) {
      style.writingMode = 'vertical-rl'
    }
    return style
  })

  /**
   * Reloads {@link styleNames} and {@link currentStyleName} from the database.
   *
   * @param db - Database to read from; defaults to the active document database.
   */
  function refreshStyleList(db = getDatabase()) {
    if (!db) {
      styleNames.value = []
      return
    }
    styleNames.value = listTextStyleNames(db)
    currentStyleName.value = db.textstyle || ''
  }

  /**
   * Populates {@link form} from the text style record for `name`.
   *
   * Resets to defaults when the database or record is missing. Triggers font loading
   * for preview when a valid record is found.
   *
   * @param name - Text style name to load into the form.
   */
  function loadFormForSelection(name: string) {
    const db = getDatabase()
    if (!db || !name) {
      applyFormState(form, createDefaultForm())
      return
    }
    const record = getTextStyleRecord(db, name)
    if (!record) {
      applyFormState(form, createDefaultForm())
      return
    }
    applyFormState(form, readTextStyleForm(record))
    void ensureFormFontsLoaded(form)
  }

  /**
   * Selects a text style in the list and loads its properties into {@link form}.
   *
   * @param name - Style name to select.
   */
  function selectStyle(name: string) {
    selectedName.value = name
    loadFormForSelection(name)
  }

  /**
   * Handles primary font dropdown changes.
   *
   * For mesh fonts, sets {@link form.fontStyle} to the first available face.
   * Clears big-font settings when switching away from SHX. Ensures the font is loaded.
   *
   * @param font - New primary font name.
   */
  function handleFontChange(font: string) {
    const info = findFontInfo(fontInfos.value, font)
    if (info?.type === 'mesh') {
      form.fontStyle = info.name[0] || font
    } else {
      form.fontStyle = font
      if (form.useBigFont && info?.type !== 'shx') {
        form.useBigFont = false
        form.bigFont = ''
      }
    }
    void AcApFontUtil.ensureDrawingFontLoaded(font)
  }

  /**
   * Handles mesh font face (font style) selection.
   *
   * Updates both {@link form.font} and {@link form.fontStyle} to the chosen face
   * and loads the font for preview.
   *
   * @param style - Selected mesh font face name.
   */
  function handleFontStyleChange(style: string) {
    form.font = style
    void AcApFontUtil.ensureDrawingFontLoaded(style)
  }

  /**
   * Initializes dialog state when the Text Style dialog opens.
   *
   * Refreshes the font catalog, style list, and selects the drawing's current
   * TEXTSTYLE (or the first available style).
   */
  function openDialog() {
    const db = getDatabase()
    fontInfos.value = editor.avaiableFonts ?? []
    refreshStyleList(db)
    const initial = db?.textstyle || styleNames.value[0] || ''
    selectStyle(initial)
  }

  /**
   * Discards unsaved form edits by reloading the selected style from the database.
   */
  function revertForm() {
    loadFormForSelection(selectedName.value)
  }

  /**
   * Persists {@link form} onto the selected text style record and triggers a regen.
   *
   * @returns `true` when the style was saved; `false` if database, selection, or record is missing.
   */
  function saveSelectedStyle() {
    const db = getDatabase()
    if (!db || !selectedName.value) return false

    const record = getTextStyleRecord(db, selectedName.value)
    if (!record) return false

    applyTextStyleForm(record, form)
    void ensureFormFontsLoaded(form)
    editor.regen()
    return true
  }

  /**
   * Sets the selected style as the drawing's current TEXTSTYLE system variable.
   *
   * @returns `true` when TEXTSTYLE was updated; `false` when preconditions fail.
   */
  function setCurrentStyle() {
    const db = getDatabase()
    const name = selectedName.value.trim()
    if (!db || !name || !canSetCurrent.value) return false
    if (!getTextStyleRecord(db, name)) return false

    AcDbSysVarManager.instance().setVar(AcDbSystemVariables.TEXTSTYLE, name, db)
    currentStyleName.value = db.textstyle || name
    return true
  }

  /**
   * Adds a new text style with defaults cloned from the current template.
   *
   * @param name - Name for the new style; must pass {@link isValidNewTextStyleName}.
   * @returns `true` when the style was created and selected; `false` on validation failure.
   */
  function addStyle(name: string) {
    const db = getDatabase()
    if (!db || !isValidNewTextStyleName(name, styleNames.value)) {
      return false
    }
    db.tables.textStyleTable.add(createDefaultTextStyleRecord(db, name))
    refreshStyleList(db)
    selectStyle(name)
    return true
  }

  /**
   * Deletes the selected text style from the drawing.
   *
   * Cannot delete Standard, the current style, or the last remaining style.
   * After deletion, selects the current TEXTSTYLE or the first remaining style and regens.
   *
   * @returns `true` when the style was removed; `false` when deletion is not allowed.
   */
  function deleteSelectedStyle() {
    const db = getDatabase()
    const name = selectedName.value
    if (!db || !name || !canDelete.value) return false

    db.tables.textStyleTable.remove(name)
    refreshStyleList(db)
    const next = db.textstyle || styleNames.value[0] || ''
    selectStyle(next)
    editor.regen()
    return true
  }

  // Vertical text cannot be upside-down; clear the flag when vertical is enabled.
  watch(
    () => form.vertical,
    vertical => {
      if (vertical) {
        form.upsideDown = false
      }
    }
  )

  return {
    /** Preview sample string constant for the dialog. */
    TEXT_STYLE_PREVIEW,
    /** All text style names in the active drawing. */
    styleNames,
    /** Name of the style selected in the dialog list. */
    selectedName,
    /** Name of the drawing's current TEXTSTYLE. */
    currentStyleName,
    /** Available fonts from the editor. */
    fontInfos,
    /** Reactive form bound to the selected style's properties. */
    form,
    /** Primary font dropdown options. */
    fontOptions,
    /** Big-font dropdown options (SHX only). */
    bigFontOptions,
    /** Whether the mesh font-style sub-selector is visible. */
    fontStyleEnabled,
    /** Mesh font face names for the selected font. */
    fontStyleOptions,
    /** Whether big-font controls are enabled. */
    bigFontSupported,
    /** Whether the selected style may be deleted. */
    canDelete,
    /** Whether "Set Current" is enabled. */
    canSetCurrent,
    /** Inline CSS for the style preview line. */
    previewStyle,
    /** Initializes state when the dialog opens. */
    openDialog,
    /** Reloads the form from the database, discarding edits. */
    revertForm,
    /** Selects a style and loads it into the form. */
    selectStyle,
    /** Handles primary font selection changes. */
    handleFontChange,
    /** Handles mesh font face selection changes. */
    handleFontStyleChange,
    /** Saves form edits to the selected style record. */
    saveSelectedStyle,
    /** Sets the selected style as the drawing TEXTSTYLE. */
    setCurrentStyle,
    /** Creates a new text style with the given name. */
    addStyle,
    /** Deletes the selected text style. */
    deleteSelectedStyle,
    /**
     * Validates a proposed new style name against current drawing styles.
     *
     * @param name - Proposed style name.
     */
    isValidNewTextStyleName: (name: string) =>
      isValidNewTextStyleName(name, styleNames.value)
  }
}
