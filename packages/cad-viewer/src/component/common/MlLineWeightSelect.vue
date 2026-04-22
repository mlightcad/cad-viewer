<template>
  <el-dropdown
    trigger="click"
    :disabled="props.disabled || !lineWeightItems.length"
    @command="onSelect"
  >
    <el-button class="ml-lineweight-btn" :disabled="props.disabled">
      <el-space>
        <span class="ml-lineweight-label">{{ currentLabel }}</span>
        <span
          v-if="currentPreviewWidth !== null"
          class="ml-lineweight-preview ml-lineweight-preview--btn"
          :style="{ height: currentPreviewWidth + 'px' }"
        />
        <el-icon class="ml-lineweight-caret">
          <ArrowDown />
        </el-icon>
      </el-space>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu class="ml-lineweight-menu">
        <el-dropdown-item
          v-for="item in lineWeightItems"
          :key="item.value"
          :command="item.value"
          class="ml-lineweight-item"
        >
          <el-space>
            <span class="ml-lineweight-text">{{ item.label }}</span>
            <span
              v-if="item.previewWidth !== null"
              class="ml-lineweight-preview"
              :style="{ height: item.previewWidth + 'px' }"
            />
          </el-space>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { AcGiLineWeight } from '@mlightcad/data-model'
import { computed } from 'vue'

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
  modelValue: AcGiLineWeight
  /** Disables selection while the surrounding ribbon is unavailable. */
  disabled?: boolean
}

const props = defineProps<LineWeightSelectProps>()

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
      return 'ByLayer'
    case AcGiLineWeight.ByBlock:
      return 'ByBlock'
    case AcGiLineWeight.ByLineWeightDefault:
      return 'Default'
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

const lineWeightItems = computed<LineWeightItem[]>(() =>
  Array.from(
    new Set(
      Object.values(AcGiLineWeight).filter(
        (v): v is AcGiLineWeight =>
          typeof v === 'number' && v !== AcGiLineWeight.ByDIPs
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

const resolvedModelValue = computed<AcGiLineWeight | undefined>(() =>
  lineWeightItems.value.some(item => item.value === props.modelValue)
    ? props.modelValue
    : lineWeightItems.value[0]?.value
)
const currentLabel = computed(() =>
  formatLabel(resolvedModelValue.value ?? props.modelValue)
)
const currentPreviewWidth = computed(() =>
  previewPx(resolvedModelValue.value ?? props.modelValue)
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
.ml-lineweight-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ml-lineweight-caret {
  font-size: 12px;
}

.ml-lineweight-menu {
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

.ml-lineweight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 160px;
}

.ml-lineweight-text,
.ml-lineweight-label {
  font-size: 13px;
}

.ml-lineweight-preview {
  width: 40px;
  background-color: currentColor;
  border-radius: 2px;
}

.ml-lineweight-preview--btn {
  width: 32px;
}
</style>
