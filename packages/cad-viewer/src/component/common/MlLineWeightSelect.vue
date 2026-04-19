<template>
  <div class="ml-lineweight-select">
    <el-select
      :model-value="resolvedModelValue"
      :disabled="props.disabled || !lineWeightItems.length"
      class="ml-lineweight-select__control"
      style="width: 100%"
      @change="onSelect"
    >
      <template #label>
        <div class="ml-lineweight-item ml-lineweight-item--selected">
          <span
            v-if="props.leadingIcon"
            class="ml-lineweight-leading-icon"
            aria-hidden="true"
          >
            <component :is="props.leadingIcon" />
          </span>
          <span
            v-if="currentPreviewWidth !== null"
            class="ml-lineweight-preview"
            :style="{ height: currentPreviewWidth + 'px' }"
          />
          <span class="ml-lineweight-text">
            {{ currentLabel }}
          </span>
        </div>
      </template>

      <el-option
        v-for="item in lineWeightItems"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div class="ml-lineweight-item">
          <span
            v-if="item.previewWidth !== null"
            class="ml-lineweight-preview"
            :style="{ height: item.previewWidth + 'px' }"
          />
          <span class="ml-lineweight-text">{{ item.label }}</span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { AcGiLineWeight } from '@mlightcad/data-model'
import { type Component, computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineOptions({
  inheritAttrs: false
})

/**
 * Render-ready line weight entry shown by the select control.
 */
interface LineWeightItem {
  /** Enum value written back to the CAD database. */
  value: AcGiLineWeight
  /** Localized label displayed in the dropdown list. */
  label: string
  /** Preview stroke thickness in CSS pixels, or `null` for symbolic values. */
  previewWidth: number | null
}

/**
 * Props accepted by the line weight select component.
 */
interface LineWeightSelectProps {
  /** Currently selected line weight value. */
  modelValue: AcGiLineWeight
  /** Disables selection while the surrounding ribbon is unavailable. */
  disabled?: boolean
  /** Optional icon rendered before the selected value. */
  leadingIcon?: string | Component
}

const props = defineProps<LineWeightSelectProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcGiLineWeight): void
  (e: 'change', value: AcGiLineWeight): void
}>()

const { t } = useI18n()

/**
 * Formats a line weight enum into the localized label shown in the UI.
 *
 * @param value Line weight to describe.
 * @returns Human-readable text for the given enum member.
 */
function formatLabel(value: AcGiLineWeight): string {
  switch (value) {
    case AcGiLineWeight.ByLayer:
      return t('main.lineWeightSelect.byLayer')
    case AcGiLineWeight.ByBlock:
      return t('main.lineWeightSelect.byBlock')
    case AcGiLineWeight.ByDIPs:
      return t('main.lineWeightSelect.byDIPs')
    case AcGiLineWeight.ByLineWeightDefault:
      return t('main.lineWeightSelect.default')
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
  const specialOrder = [
    AcGiLineWeight.ByLayer,
    AcGiLineWeight.ByBlock,
    AcGiLineWeight.ByLineWeightDefault,
    AcGiLineWeight.ByDIPs
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

const lineWeightItems = computed<LineWeightItem[]>(() =>
  Array.from(
    new Set(
      Object.values(AcGiLineWeight).filter(
        (v): v is AcGiLineWeight => typeof v === 'number'
      )
    )
  )
    .sort(sortLineWeightValues)
    .map(v => ({
      value: v,
      label: formatLabel(v),
      previewWidth: previewPx(v)
    }))
)

const currentLabel = computed(() => formatLabel(props.modelValue))
const currentPreviewWidth = computed(() => previewPx(props.modelValue))
const resolvedModelValue = computed<AcGiLineWeight | undefined>(() =>
  lineWeightItems.value.some(item => item.value === props.modelValue)
    ? props.modelValue
    : lineWeightItems.value[0]?.value
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
  display: flex;
  width: 100%;
  min-width: 0;
}

.ml-lineweight-leading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.ml-lineweight-select__control {
  width: 100%;
  min-width: 0;
}

.ml-lineweight-select :deep(.el-select__wrapper),
.ml-lineweight-select :deep(.el-select__selection),
.ml-lineweight-select :deep(.el-select__selected-item),
.ml-lineweight-select :deep(.el-select__placeholder) {
  width: 100%;
  min-width: 0;
}

.ml-lineweight-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.ml-lineweight-item--selected {
  width: 100%;
}

.ml-lineweight-text {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-lineweight-preview {
  width: 40px;
  background-color: currentColor;
  border-radius: 2px;
  flex: 0 0 40px;
}
</style>
