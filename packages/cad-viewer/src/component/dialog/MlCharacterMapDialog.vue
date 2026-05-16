<template>
  <ml-base-dialog
    v-model="visible"
    :title="t('main.ribbon.mtext.characterMap.title')"
    :width="580"
    @ok="handleBaseOk"
    @cancel="handleBaseCancel"
  >
    <div class="ml-character-map-dialog__toolbar">
      <span class="ml-character-map-dialog__font-label">{{
        t('main.ribbon.mtext.characterMap.font')
      }}</span>
      <div class="ml-character-map-dialog__font-select">
        <ml-ribbon-font-select
          v-model="selectedFont"
          variant="plain"
          :options="fontOptions"
          :disabled="loading"
          :placeholder="t('main.ribbon.mtext.field.font')"
          control-width="100%"
        />
      </div>
    </div>

    <div v-loading="loading" class="ml-character-map-dialog__body">
      <div
        v-if="!gridCodes.length && !loading"
        class="ml-character-map-dialog__empty"
      >
        {{ t('main.ribbon.mtext.characterMap.noGlyphs') }}
      </div>
      <template v-else>
        <div
          class="ml-character-map-dialog__scroll"
          @scroll.passive="onGridScroll"
        >
          <div class="ml-character-map-dialog__grid">
            <button
              v-for="code in gridCodes"
              :key="code"
              type="button"
              class="ml-character-map-dialog__cell"
              :class="{ 'is-active': code === activeCode }"
              @click="onCellClick(code, $event)"
              @dblclick.prevent="insertAndClose(safeCharFromCode(code))"
            >
              <span
                v-if="fontKind === 'mesh'"
                class="ml-character-map-dialog__cell-ttf"
                :style="cellTtfStyle"
                >{{ safeCharFromCode(code) }}</span
              >
              <span
                v-else
                class="ml-character-map-dialog__cell-shx"
                v-html="cellShxSvg(code)"
              />
            </button>
          </div>
        </div>
      </template>
    </div>

    <div class="ml-character-map-dialog__inline-footer">
      <span class="ml-character-map-dialog__inline-footer-label">{{
        t('main.ribbon.mtext.characterMap.charsToCopy')
      }}</span>
      <el-input
        v-model="copyBuffer"
        class="ml-character-map-dialog__inline-footer-input"
        clearable
      />
      <el-button @click="appendActiveToBuffer">{{
        t('main.ribbon.mtext.characterMap.select')
      }}</el-button>
      <el-button @click="copyBufferToClipboard">{{
        t('main.ribbon.mtext.characterMap.copy')
      }}</el-button>
    </div>
  </ml-base-dialog>

  <Teleport to="body">
    <div
      v-show="magnifierDisplayed"
      class="ml-character-map-magnifier"
      :style="magnifierBoxStyle"
      aria-hidden="true"
    >
      <div
        v-if="fontKind === 'shx'"
        class="ml-character-map-magnifier__shx"
        v-html="magnifierShxSvg"
      />
      <div
        v-else
        class="ml-character-map-magnifier__ttf"
        :style="magnifierTtfStyle"
      >
        {{ activeChar }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Modal character map for MTEXT: browse glyphs for the selected drawing font,
 * copy to a buffer, or insert into the document. SHX fonts preview via stroke
 * SVG from {@link AcApFontUtil.createShxParserFont}; mesh (TTF/OTF) cells use the browser’s normal
 * text layout with `font-family` set to the loaded face (see template branches
 * `fontKind === 'mesh'` vs `'shx'`).
 */
import { AcApFontUtil, type ShxParserFont } from '@mlightcad/cad-simple-viewer'
import { useEventListener } from '@vueuse/core'
import { ElButton, ElInput, ElMessage, vLoading } from 'element-plus'
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlRibbonFontSelect from '../ribbon/MlRibbonFontSelect.vue'
import { expandTtfCharacterMapCodepoints } from './charMapTtfCodepoints'

/**
 * Public props for {@link MlCharacterMapDialog} (character map modal).
 *
 * @remarks
 * Parents typically bind `v-model` to `modelValue` and pass the same font name
 * list used by MTEXT so the dropdown stays consistent with the editor.
 */
export interface MlCharacterMapDialogProps {
  /**
   * Controls dialog visibility; use with `v-model` / `update:modelValue`.
   */
  modelValue: boolean
  /**
   * Display names for the font selector (drawing-resolved font families).
   */
  fontOptions: string[]
  /**
   * Font to pre-select when the dialog opens. When empty after trim, the first
   * entry in {@link MlCharacterMapDialogProps.fontOptions} is used.
   */
  initialFont?: string
}

/**
 * Payload for the `insert` event: text to place in the document and the font
 * family that should apply to that insertion.
 *
 * @remarks
 * `text` may contain multiple scalar characters if the user built a string in
 * the copy buffer; callers should apply `fontFamily` consistently with MTEXT
 * formatting rules.
 */
export interface MlCharacterMapInsertPayload {
  /**
   * Trimmed drawing font family name matching the user’s selection in the map.
   */
  fontFamily: string
  /**
   * UTF-16 string to insert (from grid selection, buffer, or combined picks).
   */
  text: string
}

/**
 * Emits supported by {@link MlCharacterMapDialog}.
 *
 * @remarks
 * - `update:modelValue` — standard dialog visibility sync.
 * - `insert` — user confirmed; parent should insert `payload.text` with `payload.fontFamily`.
 */
export type MlCharacterMapDialogEmits = {
  (e: 'update:modelValue', value: boolean): void
  (e: 'insert', payload: MlCharacterMapInsertPayload): void
}

/**
 * Fixed Unicode code-point list for mesh (TTF/OTF) grids; built once from
 * {@link expandTtfCharacterMapCodepoints}.
 */
const TTF_GRID_CODES = expandTtfCharacterMapCodepoints()

const props = withDefaults(defineProps<MlCharacterMapDialogProps>(), {
  initialFont: ''
})

const emit = defineEmits<MlCharacterMapDialogEmits>()

const { t } = useI18n()

/** Bridges `v-model` on the base dialog to `modelValue` / `update:modelValue`. */
const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

/** Current font display name from {@link MlRibbonFontSelect}. */
const selectedFont = ref('')
/** Characters queued for copy or insert from the footer row. */
const copyBuffer = ref('')
/** Selected grid code: SHX index or Unicode scalar depending on {@link fontKind}. */
const activeCode = ref<number | null>(null)
/** True while {@link loadGridForCurrentFont} runs (font load + classification). */
const loading = ref(false)
/**
 * Rendering mode for the grid and magnifier: `'shx'` stroke SVG vs `'mesh'` browser text.
 * Mirrors resolved engine type where non-SHX outline fonts are labeled `mesh`.
 */
const fontKind = ref<'shx' | 'mesh'>('mesh')
/** Glyph indices present in the loaded SHX font; unused (empty) for mesh fonts. */
const shxCodes = ref<number[]>([])

/** Parsed SHX font used only for SVG previews; released when switching fonts or closing. */
const shxWorkFont = shallowRef<ShxParserFont | null>(null)

/**
 * Releases native/parser resources held by {@link shxWorkFont} and clears the ref.
 */
function disposeShxWorkFont() {
  shxWorkFont.value?.release()
  shxWorkFont.value = null
}

/**
 * Code points rendered in the scroll grid: dynamic SHX keys or static TTF list.
 */
const gridCodes = computed(() =>
  fontKind.value === 'shx' ? shxCodes.value : TTF_GRID_CODES
)

/** UTF-16 string for the currently highlighted cell (empty when none). */
const activeChar = computed(() =>
  activeCode.value == null ? '' : safeCharFromCode(activeCode.value)
)

/**
 * Converts a scalar Unicode code point to a JavaScript string, guarding invalid
 * ranges and surrogate halves.
 *
 * @param code - Unicode scalar value (not UTF-16 code units).
 * @returns One code point as a string, or `''` if out of range or unrepresentable.
 */
function safeCharFromCode(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  if (code >= 0xd800 && code <= 0xdfff) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

/**
 * Builds a CSS `font-family` entry with minimal escaping for backslashes and quotes.
 *
 * @param name - Font family name as shown in the drawing.
 * @returns A quoted family token followed by `sans-serif` fallback.
 */
function cssFontStack(name: string) {
  const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}", sans-serif`
}

/** Inline style for mesh cells: forces `font-family` to the drawing’s loaded webfont. */
const cellTtfStyle = computed(() => ({
  fontFamily: cssFontStack(selectedFont.value)
}))

/** Larger `font-family` / size for the mesh magnifier preview. */
const magnifierTtfStyle = computed(() => ({
  fontFamily: cssFontStack(selectedFont.value),
  fontSize: '44px',
  lineHeight: '1.05'
}))

/**
 * Renders one SHX glyph as inline SVG for a grid cell using {@link shxWorkFont}.
 *
 * @param code - SHX character index from {@link shxCodes}.
 * @returns SVG markup string, or empty when the parser or shape is unavailable.
 */
function cellShxSvg(code: number): string {
  const font = shxWorkFont.value
  if (!font) return ''
  const shape = font.getCharShape(code, 13)
  return (
    shape?.toSVG({
      strokeWidth: '0.55',
      strokeColor: 'currentColor',
      isAutoFit: true
    }) ?? ''
  )
}

/** Enlarged SHX SVG for the teleported magnifier (`v-html` in template). */
const magnifierShxSvg = computed(() => {
  const font = shxWorkFont.value
  const code = activeCode.value
  if (!font || code == null) return ''
  const shape = font.getCharShape(code, 40)
  return (
    shape?.toSVG({
      strokeWidth: '0.75',
      strokeColor: 'currentColor',
      isAutoFit: true
    }) ?? ''
  )
})

/** Pixel width/height of the magnifier box (fixed positioning). */
const MAGNIFIER_SIZE = 76
/** Gap between magnifier and anchored cell when flipping above/below. */
const MAGNIFIER_GAP = 6

/** Last clicked grid cell element; drives loupe placement on scroll/resize. */
const magnifierAnchorEl = ref<HTMLElement | null>(null)
/** Inline `position: fixed` box coordinates for the magnifier overlay. */
const magnifierBoxStyle = ref<Record<string, string>>({})

/** True when a cell is active, anchored, and styles have been applied at least once. */
const magnifierDisplayed = computed(
  () =>
    activeCode.value != null &&
    magnifierAnchorEl.value != null &&
    magnifierBoxStyle.value.position === 'fixed'
)

/**
 * Positions the floating magnifier above the active cell when there is room,
 * otherwise below; clamps horizontally and vertically inside the viewport.
 *
 * @param anchor - The focused grid cell element used for anchor coordinates.
 */
function updateMagnifierPosition(anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect()
  const w = MAGNIFIER_SIZE
  const h = MAGNIFIER_SIZE
  let top = r.top - h - MAGNIFIER_GAP
  if (top < 8) {
    top = r.bottom + MAGNIFIER_GAP
  }
  let left = r.left + r.width / 2 - w / 2
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
  if (top + h > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - h - 8)
  }
  magnifierBoxStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: '2200'
  }
}

/**
 * Selects a code point and anchors the magnifier to the clicked cell.
 *
 * @param code - Active SHX index or Unicode scalar depending on {@link fontKind}.
 * @param ev - Click event; `currentTarget` supplies layout box for the loupe.
 */
function onCellClick(code: number, ev: MouseEvent) {
  activeCode.value = code
  const el = ev.currentTarget as HTMLElement | null
  magnifierAnchorEl.value = el
  void nextTick(() => {
    if (el && document.contains(el)) {
      updateMagnifierPosition(el)
    }
  })
}

/** Keeps the magnifier aligned with the active cell while the grid scrolls. */
function onGridScroll() {
  const el = magnifierAnchorEl.value
  if (el && document.contains(el)) {
    updateMagnifierPosition(el)
  }
}

/** Hides the magnifier by dropping anchor and inline positioning styles. */
function clearMagnifier() {
  magnifierAnchorEl.value = null
  magnifierBoxStyle.value = {}
}

/**
 * Hides the magnified preview when keyboard or programmatic focus moves to any
 * control other than a character grid cell (font field, copy row, dialog OK/Cancel, etc.).
 *
 * @param ev - Focus event whose target is tested against the grid cell selector.
 */
function onDocumentFocusIn(ev: Event) {
  if (!props.modelValue) return
  if (!magnifierAnchorEl.value) return
  const t = (ev as FocusEvent).target
  if (!t || !(t instanceof HTMLElement) || !t.isConnected) return
  if (t.closest('.ml-character-map-dialog__cell')) return
  clearMagnifier()
}

const stopWinScroll = useEventListener(
  window,
  'scroll',
  () => {
    const el = magnifierAnchorEl.value
    if (el && document.contains(el)) {
      updateMagnifierPosition(el)
    }
  },
  { capture: true }
)

const stopResize = useEventListener(window, 'resize', () => {
  const el = magnifierAnchorEl.value
  if (el && document.contains(el)) {
    updateMagnifierPosition(el)
  }
})

const stopDocumentFocusIn = useEventListener(
  document,
  'focusin',
  onDocumentFocusIn,
  true
)

onUnmounted(() => {
  stopWinScroll()
  stopResize()
  stopDocumentFocusIn()
})

watch(
  () => props.modelValue,
  open => {
    if (open) {
      copyBuffer.value = ''
      activeCode.value = null
      clearMagnifier()
      selectedFont.value =
        props.initialFont?.trim() || props.fontOptions[0] || ''
    } else {
      clearMagnifier()
      disposeShxWorkFont()
    }
  }
)

/**
 * Loads the selected font, resolves SHX vs mesh, and prepares grid data.
 *
 * @remarks
 * For SHX: builds a parser from loaded bytes via {@link AcApFontUtil.createShxParserFont} and fills
 * {@link shxCodes} from the font manager. For mesh: clears SHX codes, waits on
 * {@link FontFaceSet} (`document.fonts.ready` / `load`) so cells paint with the
 * correct webfont when available.
 */
async function loadGridForCurrentFont() {
  if (!props.modelValue) return
  activeCode.value = null
  clearMagnifier()
  const trimmed = selectedFont.value.trim()
  if (!trimmed) {
    shxCodes.value = []
    fontKind.value = 'mesh'
    disposeShxWorkFont()
    return
  }
  loading.value = true
  disposeShxWorkFont()
  try {
    await AcApFontUtil.ensureDrawingFontLoaded(trimmed)
    await document.fonts.ready.catch(() => undefined)
    const resolved =
      AcApFontUtil.getFontType(trimmed) ??
      AcApFontUtil.getCatalogFontType(trimmed) ??
      'mesh'
    fontKind.value = resolved === 'shx' ? 'shx' : 'mesh'
    if (fontKind.value === 'shx') {
      const data = AcApFontUtil.getLoadedShxFontData(trimmed)
      if (data) {
        shxWorkFont.value = AcApFontUtil.createShxParserFont(data)
      }
      shxCodes.value = AcApFontUtil.getShxCodePoints(trimmed)
    } else {
      shxCodes.value = []
      try {
        await document.fonts.load(`18px ${cssFontStack(trimmed)}`)
      } catch {
        /* ignore */
      }
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, selectedFont.value] as const,
  () => {
    void loadGridForCurrentFont()
  }
)

/** Appends {@link activeChar} to the footer copy buffer when a cell is selected. */
function appendActiveToBuffer() {
  const ch = activeChar.value
  if (!ch) return
  copyBuffer.value += ch
}

/** Writes {@link copyBuffer} to the system clipboard; shows a warning toast on failure. */
async function copyBufferToClipboard() {
  try {
    await navigator.clipboard.writeText(copyBuffer.value)
  } catch {
    ElMessage({
      type: 'warning',
      message: t('main.ribbon.mtext.characterMap.copyFailed')
    })
  }
}

/**
 * Emits `insert` with the trimmed font name and closes the dialog.
 *
 * @param text - UTF-16 string to insert (usually one scalar from the grid).
 */
function insertAndClose(text: string) {
  if (!text || !selectedFont.value.trim()) return
  clearMagnifier()
  emit('insert', {
    fontFamily: selectedFont.value.trim(),
    text
  })
  emit('update:modelValue', false)
}

/** Inserts {@link copyBuffer} if non-empty, otherwise the active character. */
function insertFromBuffer() {
  const text = copyBuffer.value || activeChar.value
  if (!text) return
  insertAndClose(text)
}

/**
 * Base dialog OK: insert current buffer or active cell (same as former Insert button).
 *
 * @remarks Delegates to {@link insertFromBuffer}.
 */
function handleBaseOk() {
  insertFromBuffer()
}

/** Clears magnifier state and releases SHX parser resources on cancel. */
function handleBaseCancel() {
  clearMagnifier()
  disposeShxWorkFont()
}
</script>

<style scoped>
.ml-character-map-dialog__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.ml-character-map-dialog__font-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.ml-character-map-dialog__font-select {
  flex: 1 1 auto;
  min-width: 0;
}

.ml-character-map-dialog__body {
  min-height: 120px;
}

.ml-character-map-dialog__empty {
  padding: 24px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.ml-character-map-dialog__scroll {
  max-height: 280px;
  overflow: auto;
}

.ml-character-map-dialog__grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 2px;
  padding: 2px;
}

.ml-character-map-dialog__cell {
  box-sizing: border-box;
  height: 28px;
  padding: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 2px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-character-map-dialog__cell:hover {
  background: var(--el-fill-color-light);
}

.ml-character-map-dialog__cell.is-active {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -1px;
  z-index: 1;
}

.ml-character-map-dialog__cell-ttf {
  font-size: 15px;
  line-height: 1;
}

.ml-character-map-dialog__cell-shx {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-primary);
}

.ml-character-map-dialog__cell-shx :deep(svg) {
  max-width: 22px;
  max-height: 22px;
}

.ml-character-map-dialog__inline-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.ml-character-map-dialog__inline-footer-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.ml-character-map-dialog__inline-footer-input {
  flex: 1 1 160px;
  min-width: 120px;
}

.ml-character-map-magnifier {
  box-sizing: border-box;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-darker);
  border-radius: 2px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  color: var(--el-text-color-primary);
}

.ml-character-map-magnifier__shx {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-character-map-magnifier__shx :deep(svg) {
  max-width: 88%;
  max-height: 88%;
}

.ml-character-map-magnifier__ttf {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
