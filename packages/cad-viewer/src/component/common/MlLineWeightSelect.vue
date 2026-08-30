<template>
  <div
    class="ml-lineweight-select"
    :class="{ 'ml-lineweight-select--compact': compact }"
  >
    <el-dropdown
      class="ml-lineweight-select__dropdown"
      trigger="click"
      :popper-class="popperClass"
      :disabled="props.disabled || !lineWeightItems.length"
      @command="onSelect"
    >
      <button
        type="button"
        class="ml-lineweight-select__trigger"
        :class="{ 'is-disabled': props.disabled }"
        :disabled="props.disabled"
      >
        <span class="ml-lineweight-select__value">
          <span
            v-if="currentPreviewWidth !== null"
            class="ml-lineweight-preview ml-lineweight-preview--btn"
            :style="{ '--ml-lineweight-height': currentPreviewWidth + 'px' }"
          />
          <span class="ml-lineweight-label">{{ currentLabel }}</span>
        </span>
        <el-icon class="ml-lineweight-caret">
          <ArrowDown />
        </el-icon>
      </button>

      <template #dropdown>
        <el-dropdown-menu class="ml-lineweight-menu">
          <el-dropdown-item
            v-for="item in lineWeightItems"
            :key="item.value"
            :command="item.value"
            class="ml-lineweight-item"
          >
            <span
              v-if="item.previewWidth !== null"
              class="ml-lineweight-preview"
              :style="{ '--ml-lineweight-height': item.previewWidth + 'px' }"
            />
            <span class="ml-lineweight-text">{{ item.label }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { AcGiLineWeight } from '@mlightcad/data-model'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon
} from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Render-ready line weight entry shown by the select control.
 */
interface LineWeightItem {
  /** Enum value written back to the CAD database. */
  value: AcGiLineWeight
  /** Display label shown in the dropdown list. */
  label: string
  /** Preview stroke thickness in CSS pixels, or `null` for symbolic values. */
  previewWidth: number | null
}

/**
 * Props accepted by the line weight select component.
 */
interface LineWeightSelectProps {
  /** Currently selected line weight value. */
  modelValue?: AcGiLineWeight
  /** Disables selection while the surrounding ribbon is unavailable. */
  disabled?: boolean
  /** Placeholder shown when no line weight can be resolved. */
  placeholder?: string
  /** When true, hide ByLayer / ByBlock / Default. */
  numericOnly?: boolean
  /**
   * Narrower trigger sized for numeric weights plus a stroke preview.
   */
  compact?: boolean
}

const props = withDefaults(defineProps<LineWeightSelectProps>(), {
  compact: false
})

const { locale } = useI18n()

const popperClass = computed(() =>
  props.compact
    ? 'ml-lineweight-popper ml-lineweight-popper--compact'
    : 'ml-lineweight-popper'
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcGiLineWeight): void
  (e: 'change', value: AcGiLineWeight): void
}>()

/**
 * Formats a line weight enum into the fixed label shown in the UI.
 *
 * @param value Line weight to describe.
 * @returns Human-readable text for the given enum member.
 */
function formatLabel(value: AcGiLineWeight): string {
  switch (value) {
    case AcGiLineWeight.ByLayer:
      return locale.value === 'ar' ? 'حسب الطبقة' : 'ByLayer'
    case AcGiLineWeight.ByBlock:
      return locale.value === 'ar' ? 'حسب الكتلة' : 'ByBlock'
    case AcGiLineWeight.ByLineWeightDefault:
      return locale.value === 'ar' ? 'افتراضي' : 'Default'
    default:
      return `${(value / 100).toFixed(2)} mm`
  }
}

/**
 * Converts a line weight into a clamped preview stroke thickness.
 *
 * @param value Line weight enum to visualize.
 * @returns Stroke height in CSS pixels, or `null` when no preview should be shown.
 */
function previewPx(value: AcGiLineWeight): number | null {
  if (value < 0) return null
  if (value === 0) return 1
  return Math.max(1, Math.min(6, value / 40))
}

/**
 * Sorts symbolic line weight values ahead of numeric widths while keeping
 * physical weights in ascending order.
 *
 * @param a First enum value to compare.
 * @param b Second enum value to compare.
 * @returns A sort order compatible with `Array.prototype.sort`.
 */
function sortLineWeightValues(a: AcGiLineWeight, b: AcGiLineWeight) {
  const specialOrder: AcGiLineWeight[] = [
    AcGiLineWeight.ByLayer,
    AcGiLineWeight.ByBlock,
    AcGiLineWeight.ByLineWeightDefault
  ]
  const aIndex = specialOrder.indexOf(a)
  const bIndex = specialOrder.indexOf(b)

  if (aIndex !== -1 || bIndex !== -1) {
    return (
      (aIndex === -1 ? specialOrder.length : aIndex) -
      (bIndex === -1 ? specialOrder.length : bIndex)
    )
  }

  return a - b
}

const lineWeightItems = computed<LineWeightItem[]>(() => {
  const values = Array.from(
    new Set(
      Object.values(AcGiLineWeight).filter((v): v is AcGiLineWeight => {
        if (typeof v !== 'number') return false
        if (v === AcGiLineWeight.ByDIPs) return false
        if (v === 0) return false
        if (props.numericOnly) return v > 0
        return true
      })
    )
  )
  return values.sort(sortLineWeightValues).map(v => ({
    value: v,
    label: formatLabel(v),
    previewWidth: previewPx(v)
  }))
})

const selectedItem = computed<LineWeightItem | undefined>(() =>
  lineWeightItems.value.find(item => item.value === props.modelValue)
)
const currentLabel = computed(
  () => selectedItem.value?.label ?? props.placeholder ?? ''
)
const currentPreviewWidth = computed(
  () => selectedItem.value?.previewWidth ?? null
)

/**
 * Emits the chosen line weight through both the model and change channels.
 *
 * @param value Selected line weight enum.
 */
function onSelect(value: AcGiLineWeight) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.ml-lineweight-select {
  --ml-lineweight-caret-size: var(--el-font-size-base);
  display: flex;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.ml-lineweight-select__dropdown {
  display: flex;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.ml-lineweight-select__dropdown :deep(.el-tooltip__trigger) {
  display: flex;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.ml-lineweight-select__trigger {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  min-height: var(--ml-rb-compact-height, 28px);
  min-width: 0;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color var(--el-transition-duration),
    box-shadow var(--el-transition-duration);
}

.ml-lineweight-select__trigger:hover {
  border-color: var(--el-border-color-hover);
}

.ml-lineweight-select__trigger:focus-visible {
  outline: none;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.ml-lineweight-select__trigger.is-disabled {
  cursor: not-allowed;
  color: var(--el-disabled-text-color);
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-light);
}

.ml-lineweight-select__value {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.ml-lineweight-caret {
  flex: 0 0 auto;
  font-size: var(--ml-lineweight-caret-size);
  color: var(--el-text-color-placeholder);
}

.ml-lineweight-menu {
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

.ml-lineweight-label {
  font-size: 13px;
  min-width: 0;
}

.ml-lineweight-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  flex: 1 1 auto;
}

.ml-lineweight-select--compact .ml-lineweight-select__trigger {
  font-size: 12px;
  padding: 0 6px;
}

.ml-lineweight-select--compact .ml-lineweight-select__value {
  gap: 6px;
}

.ml-lineweight-select--compact .ml-lineweight-label {
  font-size: 12px;
}

.ml-lineweight-preview {
  position: relative;
  display: inline-flex;
  width: 52px;
  height: 14px;
  flex: 0 0 52px;
}

.ml-lineweight-select--compact .ml-lineweight-preview {
  width: 36px;
  flex-basis: 36px;
}

.ml-lineweight-preview::before {
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

:global(.ml-lineweight-popper .ml-lineweight-menu) {
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

:global(.ml-lineweight-popper .ml-lineweight-item) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 160px;
}

:global(.ml-lineweight-popper--compact .ml-lineweight-item) {
  gap: 6px;
  min-width: 148px;
}

:global(.ml-lineweight-popper--compact .ml-lineweight-preview) {
  width: 36px;
  flex: 0 0 36px;
}

:global(.ml-lineweight-popper .ml-lineweight-text) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 13px;
}
</style>
